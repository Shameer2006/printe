import { NextRequest, NextResponse } from "next/server";
import { getZohoAccessToken } from "@/lib/zoho-auth";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderCode, amount, mobileNumber, vendorSlug } = body;

        if (!orderCode || !amount || !mobileNumber) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const accountId = process.env.ZOHO_PAYMENTS_ACCOUNT_ID;
        if (!accountId) {
            console.error("ZOHO_PAYMENTS_ACCOUNT_ID not configured");
            return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
        }

        const accessToken = await getZohoAccessToken();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        // Composite reference_id if vendor is present to allow shop identification in webhooks
        const referenceId = vendorSlug ? `${vendorSlug}__${orderCode}` : orderCode;

        // Zoho Payments API v1 - exact structure from official docs
        const payload: any = {
            amount: parseFloat(Number(amount).toFixed(2)),
            currency: "INR",
            phone: mobileNumber,
            phone_country_code: "IN",
            reference_id: referenceId,
            description: `PrintEG Order - ${orderCode}`,
        };

        // Always send return_url — Zoho requires a public HTTPS URL (not localhost)
        const publicBase = (baseUrl && !baseUrl.includes('localhost'))
            ? baseUrl
            : "https://www.printeg.in"; // fallback for local dev testing on production
        payload.return_url = `${publicBase}/api/zoho/callback?orderCode=${orderCode}&vendorSlug=${vendorSlug || ""}&status=success`;

        const url = `https://payments.zoho.in/api/v1/paymentlinks?account_id=${accountId}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Zoho-oauthtoken ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.code === 0 && data.payment_links) {
            // Save the payment link ID back into the Firestore order for reliable verification
            try {
                const { getAdminDb } = await import("@/lib/firebase-admin");
                const adminDb = getAdminDb();
                if (vendorSlug) {
                    await adminDb.collection("vendors").doc(vendorSlug).collection("orders").doc(orderCode).update({
                        zoho_payment_link_id: data.payment_links.payment_link_id,
                    }).catch(() => {});
                } else {
                    await adminDb.collection("orders").doc(orderCode).update({
                        zoho_payment_link_id: data.payment_links.payment_link_id,
                    }).catch(() => {});
                }
            } catch (err) {
                console.warn("Failed to save payment_link_id to Firestore order:", err);
                // Non-fatal — the client also saves it to sessionStorage
            }

            return NextResponse.json({
                paymentUrl: data.payment_links.url,
                paymentLinkId: data.payment_links.payment_link_id,
            });
        } else {
            console.error("Zoho Payment Link Creation Error:", data);
            return NextResponse.json(
                { error: data.message || "Failed to create payment link" },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error("Zoho Create Payment Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
