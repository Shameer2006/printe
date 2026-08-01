import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";

// Temporary diagnostics: records every webhook hit to Firestore so we can
// confirm from the Firebase console whether Zoho is calling this endpoint
// at all, whether the signature check passes, and what payload it sends.
// Safe to delete this collection/helper once the payment flow is confirmed working.
async function logWebhookDebug(entry: Record<string, any>) {
    try {
        const db = getAdminDb();
        await db.collection("zoho_webhook_debug").add({
            receivedAt: new Date().toISOString(),
            ...entry,
        });
    } catch (err) {
        console.error("Zoho Webhook: failed to write debug log:", err);
    }
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const headerValue = req.headers.get("x-zoho-webhook-signature") || "";

    try {
        const signingKey = process.env.ZOHO_SIGNING_KEY;

        if (!signingKey) {
            console.error("ZOHO_SIGNING_KEY not configured");
            await logWebhookDebug({
                error: "ZOHO_SIGNING_KEY not configured",
                headerValue,
                rawBodyPreview: rawBody.slice(0, 3000),
            });
            return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
        }

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
            await logWebhookDebug({
                signatureValid: false,
                headerValue,
                timestamp,
                receivedSignature,
                rawBodyPreview: rawBody.slice(0, 3000),
            });
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }

        // Parse the verified payload
        const payload = JSON.parse(rawBody);
        const eventType = payload.event_type;
        const paymentLink = payload.event_object?.payment_links;
        const orderCode = paymentLink?.reference_id;
        const payments = paymentLink?.payments;
        const transactionId = payments?.length
            ? payments[payments.length - 1]?.payment_id
            : paymentLink?.payment_link_id;

        await logWebhookDebug({
            signatureValid: true,
            eventType,
            orderCode: orderCode || null,
            rawBodyPreview: rawBody.slice(0, 3000),
        });

        if (eventType === "payment_link.paid" && orderCode) {
            const db = getAdminDb();
            const orderRef = db.collection("orders").doc(orderCode);
            await orderRef.update({
                payment_status: "PAID",
                zoho_payment_id: transactionId,
                zoho_payment_link_id: paymentLink?.payment_link_id,
                paid_at: new Date().toISOString(),
                paid_via: "zoho_webhook",
            });

            console.log(`Zoho Webhook: Order ${orderCode} marked as PAID`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Zoho Webhook Error:", error);
        await logWebhookDebug({
            error: error.message,
            headerValue,
            rawBodyPreview: rawBody.slice(0, 3000),
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
