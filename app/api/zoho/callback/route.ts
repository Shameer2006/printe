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
    // Zoho only invokes this return_url after a successful payment, so this is
    // the single place that marks an order PAID — via the Firebase Admin SDK
    // (bypasses security rules). The signed webhook is a passive backup for
    // cases where the browser never makes it back here.
    const orderCode = searchParams.get("orderCode");
    const status = searchParams.get("status");
    const redirectUrl = new URL("/", req.url);

    if (status === "success" && orderCode) {
        try {
            const db = getAdminDb();
            const orderRef = db.collection("orders").doc(orderCode);
            const snap = await orderRef.get();

            // Preserve vendor store context so the user returns to the store
            // they ordered from (not the root PrintEG page).
            const vendorSlug = snap.exists
                ? (snap.data()?.vendorSlug as string | undefined)
                : undefined;
            if (vendorSlug) {
                redirectUrl.pathname = `/store/${vendorSlug}`;
            }

            await orderRef.update({
                payment_status: "PAID",
                paid_at: new Date().toISOString(),
                paid_via: "zoho_callback",
            });
            console.log(`Zoho Callback: Order ${orderCode} marked as PAID`);
        } catch (error) {
            console.error(`Zoho Callback: Failed to update order ${orderCode}:`, error);
            // Still redirect user to completion — the webhook will retry the DB update
        }

        redirectUrl.searchParams.set("step", "complete");
        redirectUrl.searchParams.set("orderCode", orderCode);
    } else {
        redirectUrl.searchParams.set("step", "payment");
        redirectUrl.searchParams.set("error", "Payment failed or was cancelled.");
    }

    return NextResponse.redirect(redirectUrl, 303);
}
