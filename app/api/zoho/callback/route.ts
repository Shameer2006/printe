import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAndMarkOrderPaid } from "@/lib/orders";

// This route is hit by the customer's browser, so nothing in the query string can be
// trusted — anyone can open it with any order code. It therefore never marks an order
// PAID on the strength of `status=success`; it asks Zoho server-to-server whether the
// payment link for that order is actually paid, and records the result.

export const dynamic = "force-dynamic";

/** Zoho normally preserves our params, but fall back to its own if it does not. */
async function resolveOrderCode(searchParams: URLSearchParams): Promise<string | null> {
    const direct = searchParams.get("orderCode") || searchParams.get("reference_id");
    if (direct) return direct;

    const paymentLinkId = searchParams.get("payment_link_id");
    if (!paymentLinkId) return null;

    try {
        const snap = await getAdminDb()
            .collection("orders")
            .where("zoho_payment_link_id", "==", paymentLinkId)
            .limit(1)
            .get();
        return snap.empty ? null : snap.docs[0].id;
    } catch (error) {
        console.error("Zoho Callback: lookup by payment_link_id failed:", error);
        return null;
    }
}

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
    const orderCode = await resolveOrderCode(searchParams);
    const redirectUrl = new URL("/", req.url);

    if (!orderCode) {
        redirectUrl.searchParams.set("step", "payment");
        redirectUrl.searchParams.set("error", "We could not identify your order. Please contact support if you were charged.");
        return NextResponse.redirect(redirectUrl, 303);
    }

    // The vendor lookup doesn't depend on the verification outcome (or vice versa) —
    // run them concurrently instead of round-tripping twice in sequence, so a customer
    // who already had to wait through Zoho's checkout isn't kept waiting here too.
    const [result, vendorSlug] = await Promise.all([
        verifyAndMarkOrderPaid(orderCode, "zoho_callback"),
        getAdminDb()
            .collection("orders")
            .doc(orderCode)
            .get()
            .then((snap) => (snap.exists ? (snap.data()?.vendorSlug as string | undefined) : undefined))
            .catch((error) => {
                console.error(`Zoho Callback: vendor lookup failed for ${orderCode}:`, error);
                return undefined;
            }),
    ]);
    console.log(`Zoho Callback: order ${orderCode} → ${result.status}`);

    // Keep the customer inside the vendor storefront they ordered from.
    if (vendorSlug) redirectUrl.pathname = `/store/${vendorSlug}`;

    switch (result.status) {
        case "updated":
        case "already_paid":
            redirectUrl.searchParams.set("step", "complete");
            redirectUrl.searchParams.set("orderCode", orderCode);
            break;

        case "not_paid":
            // Only a cancelled or expired link means the payment will never arrive. A link
            // still sitting at `active` is the normal state for the few seconds between a
            // UPI approval and Zoho recording it — and the customer lands here inside that
            // window. Calling that a failed payment sent people back to the payment screen
            // with money already debited, and stopped the client from reconciling.
            if (result.terminal) {
                redirectUrl.searchParams.set("step", "payment");
                redirectUrl.searchParams.set("error", "Payment was not completed. Please try again.");
            } else {
                redirectUrl.searchParams.set("step", "complete");
                redirectUrl.searchParams.set("orderCode", orderCode);
                redirectUrl.searchParams.set("verify", "1");
            }
            break;

        default:
            // no_payment_link / verification_failed / order_not_found — we could not reach a
            // verdict. Show the order and let the client keep reconciling; the order stays
            // PENDING, so the machine will not print it until payment is confirmed.
            redirectUrl.searchParams.set("step", "complete");
            redirectUrl.searchParams.set("orderCode", orderCode);
            redirectUrl.searchParams.set("verify", "1");
            break;
    }

    return NextResponse.redirect(redirectUrl, 303);
}
