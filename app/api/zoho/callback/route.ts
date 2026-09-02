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
    // After payment, Zoho redirects with ?orderCode=...&vendorSlug=...&status=...
    const orderCode = searchParams.get("orderCode");
    const vendorSlug = searchParams.get("vendorSlug");
    const statusValues = searchParams.getAll("status");
    const paymentStatus = searchParams.get("payment_status");
    
    const isSuccess = 
        statusValues.includes("success") || 
        statusValues.includes("paid") || 
        statusValues.includes("succeeded") || 
        paymentStatus === "paid" || 
        paymentStatus === "succeeded";

    // Determine the correct redirect base path
    const redirectUrl = vendorSlug 
        ? new URL(`/store/${vendorSlug}`, req.url)
        : new URL("/", req.url);

    if (isSuccess && orderCode) {
        // Mark the order as PAID using Firebase Admin SDK (bypasses security rules)
        try {
            const db = getAdminDb();
            let orderRef = vendorSlug
                ? db.collection("vendors").doc(vendorSlug).collection("orders").doc(orderCode)
                : db.collection("orders").doc(orderCode);

            let orderSnap = await orderRef.get();

            // Fallback check to root orders if vendor doc not found
            if (!orderSnap.exists && vendorSlug) {
                const rootRef = db.collection("orders").doc(orderCode);
                const rootSnap = await rootRef.get();
                if (rootSnap.exists) {
                    orderRef = rootRef;
                    orderSnap = rootSnap;
                }
            }

            if (orderSnap.exists) {
                const currentData = orderSnap.data();
                // Only update if not already PAID (idempotent)
                if (currentData?.payment_status !== "PAID") {
                    await orderRef.update({
                        payment_status: "PAID",
                        paid_at: new Date().toISOString(),
                        paid_via: "zoho_callback",
                    });
                    console.log(`Zoho Callback: Order ${orderCode} (Shop: ${vendorSlug || "global"}) marked as PAID`);
                } else {
                    console.log(`Zoho Callback: Order ${orderCode} already PAID, skipping update`);
                }
            } else {
                console.error(`Zoho Callback: Order ${orderCode} NOT FOUND in Firestore`);
            }
        } catch (error) {
            console.error(`Zoho Callback: Failed to update order ${orderCode}:`, error);
        }

        redirectUrl.searchParams.set("step", "complete");
        redirectUrl.searchParams.set("orderCode", orderCode);
    } else {
        redirectUrl.searchParams.set("step", "payment");
        redirectUrl.searchParams.set("error", "Payment failed or was cancelled.");
    }

    return NextResponse.redirect(redirectUrl, 303);
}

