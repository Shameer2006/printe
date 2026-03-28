import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
    try {
        const signingKey = process.env.ZOHO_SIGNING_KEY;

        if (!signingKey) {
            console.error("ZOHO_SIGNING_KEY not configured");
            return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
        }

        // Read raw body for signature verification
        const rawBody = await req.text();
        const receivedSignature = req.headers.get("x-zoho-webhook-signature") || "";

        // Verify HMAC-SHA256 signature
        const expectedSignature = crypto
            .createHmac("sha256", signingKey)
            .update(rawBody)
            .digest("hex");

        const isValid = crypto.timingSafeEqual(
            Buffer.from(receivedSignature),
            Buffer.from(expectedSignature)
        );

        if (!isValid) {
            console.error("Zoho Webhook: Invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }

        // Parse the verified payload
        const payload = JSON.parse(rawBody);
        const eventType = payload.event_type;

        if (eventType === "payment_link.paid") {
            const paymentLink = payload.data?.payment_link;
            const orderCode = paymentLink?.reference_id;
            const transactionId = paymentLink?.payment_id || paymentLink?.payment_link_id;

            if (orderCode) {
                const orderRef = doc(db, "orders", orderCode);
                await updateDoc(orderRef, {
                    payment_status: "PAID",
                    zoho_payment_id: transactionId,
                    zoho_payment_link_id: paymentLink?.payment_link_id,
                    paid_at: new Date().toISOString(),
                });

                console.log(`Zoho Webhook: Order ${orderCode} marked as PAID`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Zoho Webhook Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
