import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const signingKey = process.env.ZOHO_SIGNING_KEY;

        if (!signingKey) {
            console.error("ZOHO_SIGNING_KEY not configured");
            return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
        }

        // Read raw body for signature verification
        const rawBody = await req.text();
        const headerValue = req.headers.get("x-zoho-webhook-signature") || "";

        let timestamp = "";
        let receivedSignature = "";

        // Zoho Payments uses a Stripe-like signature: t=12345,v=abcdef...
        const parts = headerValue.split(",");
        for (const part of parts) {
            const [key, ...valueParts] = part.split("=");
            const value = valueParts.join("="); // Handle '=' in the value
            if (key === "t") timestamp = value;
            if (key === "v" || key === "v1") receivedSignature = value;
        }

        // Fallback for older Zoho APIs that just send the raw signature
        if (!receivedSignature) {
            receivedSignature = headerValue;
        }

        const payloadToSign = timestamp ? `${timestamp}.${rawBody}` : rawBody;

        // Verify HMAC-SHA256 signature
        const expectedSignature = crypto
            .createHmac("sha256", signingKey)
            .update(payloadToSign)
            .digest("hex");

        let isValid = false;
        if (receivedSignature.length === expectedSignature.length) {
            isValid = crypto.timingSafeEqual(
                Buffer.from(receivedSignature),
                Buffer.from(expectedSignature)
            );
        }

        if (!isValid) {
            console.error(`Zoho Webhook: Invalid signature. Expected: ${expectedSignature}, Received: ${receivedSignature}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }

        // Parse the verified payload
        const payload = JSON.parse(rawBody);
        const eventType = payload.event_type;

        console.log(`Zoho Webhook received event: ${eventType}`);

        if (eventType === "payment_link.paid") {
            const paymentLink = payload.data?.payment_link;
            const rawRefId = (paymentLink?.reference_id || "").trim();
            const transactionId = paymentLink?.payment_id || paymentLink?.payment_link_id;

            if (rawRefId) {
                let vendorSlug: string | undefined;
                let orderCode = rawRefId;

                if (rawRefId.includes("__")) {
                    const parts = rawRefId.split("__");
                    vendorSlug = parts[0];
                    orderCode = parts[1];
                }

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

                if (!orderSnap.exists) {
                    console.error(`Zoho Webhook: Order ${orderCode} (Shop: ${vendorSlug || "global"}) NOT FOUND in Firestore`);
                    return NextResponse.json({ success: true, warning: "Order not found" });
                }

                // Idempotency check: skip if already paid
                if (orderSnap.data()?.payment_status === "PAID") {
                    console.log(`Zoho Webhook: Order ${orderCode} already PAID, skipping`);
                    return NextResponse.json({ success: true, alreadyPaid: true });
                }

                await orderRef.update({
                    payment_status: "PAID",
                    zoho_payment_id: transactionId,
                    zoho_payment_link_id: paymentLink?.payment_link_id,
                    paid_at: new Date().toISOString(),
                    paid_via: "zoho_webhook",
                });

                console.log(`Zoho Webhook: Order ${orderCode} (Shop: ${vendorSlug || "global"}) marked as PAID`);
            } else {
                console.warn("Zoho Webhook: payment_link.paid event but no reference_id found in payload");
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Zoho Webhook Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
