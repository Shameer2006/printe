import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;

    // --- OAuth Authorization Code Flow ---
    // When Zoho redirects after user approves OAuth, it sends ?code=...
    const authCode = searchParams.get("code");
    if (authCode) {
        // Display the code so the user can copy it for token exchange
        return new NextResponse(
            `<html>
                <head><title>Zoho OAuth Code</title></head>
                <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
                    <h2>✅ Authorization Successful!</h2>
                    <p>Copy this code and use it to get your refresh token:</p>
                    <pre style="background: #f1f1f1; padding: 16px; border-radius: 8px; word-break: break-all; font-size: 14px;">${authCode}</pre>
                    <p style="color: #888; font-size: 13px;">⚠️ This code expires in ~2 minutes. Use it immediately.</p>
                </body>
            </html>`,
            { headers: { "Content-Type": "text/html" } }
        );
    }

    // --- Payment Callback Flow ---
    // After payment, Zoho redirects with ?orderCode=...&status=...
    const orderCode = searchParams.get("orderCode");
    const statusValues = searchParams.getAll("status");
    const paymentStatus = searchParams.get("payment_status");
    
    const isSuccess = 
        statusValues.includes("success") || 
        statusValues.includes("paid") || 
        statusValues.includes("succeeded") || 
        paymentStatus === "paid" || 
        paymentStatus === "succeeded";

    // Determine redirect destination base URL
    const redirectUrl = new URL("/", req.url);

    if (isSuccess && orderCode) {
        try {
            const db = getAdminDb();
            const orderRef = db.collection("orders").doc(orderCode);
            const orderSnap = await orderRef.get();

            if (orderSnap.exists) {
                const orderData = orderSnap.data();
                const linkId = orderData?.zoho_payment_link_id;
                const accountId = process.env.ZOHO_PAYMENTS_ACCOUNT_ID;

                // If not already paid and we have linkId + accountId, verify with Zoho API
                if (orderData?.payment_status !== "PAID" && linkId && accountId) {
                    try {
                        const { getZohoAccessToken } = await import("@/lib/zoho-auth");
                        const accessToken = await getZohoAccessToken();
                        const verifyRes = await fetch(
                            `https://payments.zoho.in/api/v1/paymentlinks/${linkId}?account_id=${accountId}`,
                            {
                                headers: {
                                    "Authorization": `Zoho-oauthtoken ${accessToken}`,
                                    "Content-Type": "application/json",
                                },
                            }
                        );
                        const verifyData = await verifyRes.json();
                        if (verifyData.code === 0 && verifyData.payment_links?.status === "paid") {
                            await orderRef.update({
                                payment_status: "PAID",
                                paid_at: new Date().toISOString(),
                                paid_via: "zoho_callback_verified",
                            });
                            console.log(`Zoho Callback: Order ${orderCode} verified and marked PAID`);
                        }
                    } catch (verifyErr) {
                        console.warn("Zoho Callback: Live verification failed, relying on webhook:", verifyErr);
                    }
                }

                // Check if the order belongs to a vendor store
                const vendorSlug = orderData?.vendorSlug;
                if (vendorSlug) {
                    const storeRedirectUrl = new URL(`/store/${vendorSlug}`, req.url);
                    storeRedirectUrl.searchParams.set("step", "complete");
                    storeRedirectUrl.searchParams.set("orderCode", orderCode);
                    return NextResponse.redirect(storeRedirectUrl, 303);
                }
            }
        } catch (error) {
            console.error(`Zoho Callback error for order ${orderCode}:`, error);
        }

        redirectUrl.searchParams.set("step", "complete");
        redirectUrl.searchParams.set("orderCode", orderCode);
    } else {
        redirectUrl.searchParams.set("step", "payment");
        redirectUrl.searchParams.set("error", "Payment was not completed.");
    }

    return NextResponse.redirect(redirectUrl, 303);
}

