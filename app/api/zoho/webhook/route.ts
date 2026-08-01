import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { markOrderPaid, verifyAndMarkOrderPaid } from "@/lib/orders";

export const dynamic = "force-dynamic";

// Diagnostics: records every webhook hit to Firestore so the flow can be inspected from
// the Firebase console. Also mirrors to the server log, because if the Admin SDK itself
// is misconfigured this write is the first thing to fail — and an empty debug collection
// would otherwise look identical to "Zoho never called us".
async function logWebhookDebug(entry: Record<string, unknown>) {
    console.log("Zoho Webhook:", JSON.stringify(entry).slice(0, 2000));
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

function verifySignature(rawBody: string, headerValue: string, signingKey: string): boolean {
    let timestamp = "";
    let receivedSignature = "";

    // Zoho Payments uses a Stripe-like signature: t=12345,v=abcdef...
    for (const part of headerValue.split(",")) {
        const [key, ...valueParts] = part.split("=");
        const value = valueParts.join("="); // Handle '=' in the value
        if (key === "t") timestamp = value;
        if (key === "v" || key === "v1") receivedSignature = value;
    }

    // Fallback for older Zoho APIs that just send the raw signature
    if (!receivedSignature) receivedSignature = headerValue;
    if (!receivedSignature) return false;

    // Try both payload framings — which one applies depends on the account's webhook version.
    const candidates = timestamp ? [`${timestamp}.${rawBody}`, rawBody] : [rawBody];

    return candidates.some((payload) => {
        const expected = crypto.createHmac("sha256", signingKey).update(payload).digest("hex");
        if (receivedSignature.length !== expected.length) return false;
        return crypto.timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expected));
    });
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const headerValue = req.headers.get("x-zoho-webhook-signature") || "";

    try {
        const signingKey = process.env.ZOHO_SIGNING_KEY;
        const signatureValid = signingKey ? verifySignature(rawBody, headerValue, signingKey) : false;

        // Parse the payload regardless. When the signature checks out we can act on its
        // contents directly; when it does not, the payload is still a useful *hint* that
        // some order changed — we just re-verify it against Zoho before believing it.
        let payload: {
            event_type?: string;
            event_object?: { payment_links?: Record<string, unknown> };
        };
        try {
            payload = JSON.parse(rawBody);
        } catch {
            await logWebhookDebug({ error: "Body is not valid JSON", rawBodyPreview: rawBody.slice(0, 3000) });
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const eventType = payload.event_type;
        const paymentLink = payload.event_object?.payment_links as
            | { reference_id?: string; payment_link_id?: string; payments?: Array<{ payment_id?: string }> }
            | undefined;
        const orderCode = paymentLink?.reference_id;
        const payments = paymentLink?.payments;
        const transactionId = payments?.length
            ? payments[payments.length - 1]?.payment_id
            : paymentLink?.payment_link_id;

        await logWebhookDebug({
            signatureValid,
            signingKeyConfigured: Boolean(signingKey),
            eventType,
            orderCode: orderCode || null,
            rawBodyPreview: rawBody.slice(0, 3000),
        });

        if (!orderCode) {
            // Nothing actionable, but acknowledge so Zoho stops retrying.
            return NextResponse.json({ success: true, note: "No reference_id in payload" });
        }

        if (signatureValid) {
            if (eventType === "payment_link.paid") {
                const result = await markOrderPaid(orderCode, "zoho_webhook", {
                    zohoPaymentId: transactionId,
                    zohoPaymentLinkId: paymentLink?.payment_link_id,
                });
                console.log(`Zoho Webhook: order ${orderCode} → ${result.status}`);
            }
            return NextResponse.json({ success: true });
        }

        // Signature failed (commonly a wrong or missing ZOHO_SIGNING_KEY). Do not trust the
        // body — ask Zoho directly. If the payment is real, the order still gets marked PAID.
        console.error("Zoho Webhook: signature invalid — falling back to server-side verification");
        const result = await verifyAndMarkOrderPaid(orderCode, "zoho_webhook");
        await logWebhookDebug({ signatureFallbackResult: result.status, orderCode });

        return NextResponse.json({ success: true, verified: result.status }, { status: 200 });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Zoho Webhook Error:", error);
        await logWebhookDebug({
            error: message,
            headerValue,
            rawBodyPreview: rawBody.slice(0, 3000),
        });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
