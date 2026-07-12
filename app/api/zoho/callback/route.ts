import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getZohoAccessToken } from "@/lib/zoho-auth";

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
    // After payment, Zoho redirects the user back here with ?orderCode=...
    // The status query param is not trustworthy (we set it ourselves in the
    // redirect_url), so we verify the real payment status directly with Zoho
    // before marking the order as PAID in Firebase.
    const orderCode = searchParams.get("orderCode");
    const redirectUrl = new URL("/", req.url);

    if (orderCode) {
        try {
            const orderRef = doc(db, "orders", orderCode);
            const snap = await getDoc(orderRef);
            const paymentLinkId = snap.exists()
                ? (snap.data().zoho_payment_link_id as string | undefined)
                : undefined;

            // Preserve vendor store context so the user returns to the store
            // they ordered from (not the root PrintEG page).
            const vendorSlug = snap.exists()
                ? (snap.data().vendorSlug as string | undefined)
                : undefined;
            if (vendorSlug) {
                redirectUrl.pathname = `/store/${vendorSlug}`;
            }

            const accountId = process.env.ZOHO_PAYMENTS_ACCOUNT_ID;
            let isPaid = false;
            let transactionId: string | undefined;

            if (paymentLinkId && accountId) {
                const accessToken = await getZohoAccessToken();
                const statusUrl = `https://payments.zoho.in/api/v1/paymentlinks/${paymentLinkId}?account_id=${accountId}`;

                const statusResponse = await fetch(statusUrl, {
                    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
                });
                const statusData = await statusResponse.json();

                const link = statusData?.payment_link;
                if (link?.status === "paid") {
                    isPaid = true;
                    transactionId = link.payment_id;
                }
            }

            if (isPaid) {
                await updateDoc(orderRef, {
                    payment_status: "PAID",
                    ...(transactionId ? { zoho_payment_id: transactionId } : {}),
                    paid_at: new Date().toISOString(),
                });

                console.log(`Zoho Callback: Order ${orderCode} verified and marked as PAID`);

                redirectUrl.searchParams.set("step", "complete");
                redirectUrl.searchParams.set("orderCode", orderCode);
                return NextResponse.redirect(redirectUrl, 303);
            }
        } catch (error) {
            console.error("Zoho Callback verification error:", error);
        }
    }

    // Payment not verified as paid — send the user back to the payment step.
    redirectUrl.searchParams.set("step", "payment");
    redirectUrl.searchParams.set("error", "Payment failed or was cancelled.");
    return NextResponse.redirect(redirectUrl, 303);
}
