import { NextRequest, NextResponse } from "next/server";
import { getZohoAccessToken } from "@/lib/zoho-auth";
import { getAdminDb } from "@/lib/firebase-admin";

// Temporary diagnostics: records every verify-payment call to Firestore so we
// can confirm from the Firebase console whether the frontend even reaches this
// endpoint after a Zoho redirect, and what Zoho's live status check returns.
// Safe to delete this collection/helper once the payment flow is confirmed working.
async function logVerifyDebug(entry: Record<string, any>) {
    try {
        const db = getAdminDb();
        await db.collection("zoho_webhook_debug").add({
            receivedAt: new Date().toISOString(),
            source: "verify-payment",
            ...entry,
        });
    } catch (err) {
        console.error("Verify Payment: failed to write debug log:", err);
    }
}

/**
 * POST /api/zoho/verify-payment
 *
 * Actively checks with Zoho's API whether a payment link has been paid,
 * then updates Firestore via Admin SDK (bypasses security rules).
 *
 * Body: { orderCode: string, paymentLinkId?: string }
 */
export async function POST(req: NextRequest) {
    let orderCode: string | undefined;
    let paymentLinkId: string | undefined;

    try {
        ({ orderCode, paymentLinkId } = await req.json());

        if (!orderCode) {
            return NextResponse.json({ error: "Missing orderCode" }, { status: 400 });
        }

        const accountId = process.env.ZOHO_PAYMENTS_ACCOUNT_ID;
        if (!accountId) {
            await logVerifyDebug({ orderCode, error: "ZOHO_PAYMENTS_ACCOUNT_ID not configured" });
            return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
        }

        const db = getAdminDb();
        const orderRef = db.collection("orders").doc(orderCode);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            await logVerifyDebug({ orderCode, error: "Order not found" });
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const orderData = orderSnap.data();

        // Already paid — skip Zoho call
        if (orderData?.payment_status === "PAID") {
            await logVerifyDebug({ orderCode, alreadyPaid: true });
            return NextResponse.json({ verified: true, alreadyPaid: true });
        }

        // Get the paymentLinkId from the request, the order, or skip Zoho check
        const linkId = paymentLinkId || orderData?.zoho_payment_link_id;

        if (linkId) {
            // Verify with Zoho API
            const accessToken = await getZohoAccessToken();
            const url = `https://payments.zoho.in/api/v1/paymentlinks/${linkId}?account_id=${accountId}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Zoho-oauthtoken ${accessToken}`,
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            await logVerifyDebug({
                orderCode,
                linkId,
                httpStatus: response.status,
                zohoResponsePreview: JSON.stringify(data).slice(0, 3000),
            });

            if (data.code === 0 && data.payment_links) {
                const linkStatus = data.payment_links.status;

                if (linkStatus === "paid") {
                    // Payment confirmed by Zoho — update Firestore via Admin SDK
                    await orderRef.update({
                        payment_status: "PAID",
                        paid_at: new Date().toISOString(),
                        paid_via: "zoho_verify",
                        zoho_payment_link_id: linkId,
                    });

                    console.log(`Verify Payment: Order ${orderCode} confirmed PAID via Zoho API`);
                    return NextResponse.json({ verified: true });
                } else {
                    return NextResponse.json({
                        verified: false,
                        zohoStatus: linkStatus,
                        message: `Payment link status: ${linkStatus}`,
                    });
                }
            } else {
                console.error("Zoho API error:", data);
                return NextResponse.json({
                    verified: false,
                    error: data.message || "Failed to check payment status",
                });
            }
        }

        // No paymentLinkId available — mark as paid based on callback trust
        // (Zoho only redirects to return_url on successful payments)
        await logVerifyDebug({ orderCode, noLinkId: true });
        await orderRef.update({
            payment_status: "PAID",
            paid_at: new Date().toISOString(),
            paid_via: "callback_trust",
        });

        console.log(`Verify Payment: Order ${orderCode} marked PAID (callback trust, no linkId)`);
        return NextResponse.json({ verified: true });

    } catch (error: any) {
        console.error("Verify Payment Error:", error);
        await logVerifyDebug({ orderCode, error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
