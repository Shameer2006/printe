/**
 * Order payment-state transitions.
 *
 * Every path that can mark an order PAID goes through here — the Zoho browser callback,
 * the signed webhook, and the reconcile endpoint — so the transition is written exactly
 * one way: idempotently, with an audit trail, using the Admin SDK.
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";
import {
    fetchZohoPaymentLink,
    isPaymentLinkPaid,
    isPaymentLinkTerminal,
    latestPaymentId,
} from "./zoho-payments";

export type PaidSource = "zoho_callback" | "zoho_webhook" | "zoho_reconcile" | "manual";

/**
 * Order codes are four digits because a customer reads one out at the counter, which
 * leaves only 9000 of them. At a few hundred orders a collision is not a curiosity, it
 * is expected — and the client used to `setDoc` the code straight into Firestore with no
 * merge, so a new order silently overwrote an existing one: `payment_status` went back
 * to PENDING and `zoho_payment_link_id` was wiped, leaving a real payment unverifiable.
 *
 * Codes are therefore allocated here, inside a transaction that refuses to touch a live
 * order. A code is only recycled once its order is a day old — long past collection.
 */
const CODE_REUSE_AFTER_MS = 24 * 60 * 60 * 1000;
const CODE_ALLOCATION_ATTEMPTS = 25;

function randomCode(digits: 4 | 5): string {
    const min = 10 ** (digits - 1);
    return Math.floor(min + Math.random() * (9 * min)).toString();
}

function isStale(data: FirebaseFirestore.DocumentData, now: number): boolean {
    const createdAt = Date.parse(data.createdAt);
    if (!Number.isFinite(createdAt)) return false; // Unknown age — treat as live.
    return now - createdAt > CODE_REUSE_AFTER_MS;
}

export interface CreateOrderResult {
    orderCode: string;
}

/**
 * Create an order under a code that is guaranteed not to belong to a live order.
 *
 * `fields` is the order payload minus the code and the payment state — the payment
 * state is set here so no caller can create an order that is already PAID.
 */
export async function createOrder(fields: Record<string, unknown>): Promise<CreateOrderResult> {
    const db = getAdminDb();
    const now = Date.now();
    const createdAt = new Date(now).toISOString();

    for (let attempt = 0; attempt < CODE_ALLOCATION_ATTEMPTS; attempt++) {
        // Widen to five digits only if four-digit space is genuinely exhausted. A longer
        // code is an inconvenience at the counter; overwriting a live order is not.
        const code = randomCode(attempt < CODE_ALLOCATION_ATTEMPTS - 5 ? 4 : 5);
        const orderRef = db.collection("orders").doc(code);

        const claimed = await db.runTransaction(async (tx) => {
            const snap = await tx.get(orderRef);

            if (snap.exists) {
                const data = snap.data() || {};
                if (!isStale(data, now)) return false;

                // Recycling the code, but the old order is still someone's record of a
                // payment. Keep it before the document is reused.
                tx.set(db.collection("orders_archive").doc(), {
                    ...data,
                    archivedAt: createdAt,
                    archivedFromCode: code,
                });
            }

            tx.set(orderRef, {
                ...fields,
                orderCode: code,
                createdAt,
                payment_status: "PENDING",
                status: "pending",
            });

            return true;
        });

        if (claimed) return { orderCode: code };
    }

    throw new Error("Could not allocate a free order code after repeated attempts");
}

export interface PaidDetails {
    zohoPaymentId?: string;
    zohoPaymentLinkId?: string;
    amountPaid?: string | number;
}

export type MarkPaidResult =
    | { status: "updated"; orderCode: string }
    | { status: "already_paid"; orderCode: string }
    | { status: "order_not_found"; orderCode: string };

/**
 * Flip an order to PAID. Safe to call repeatedly and concurrently — the callback,
 * the webhook and a client-triggered reconcile routinely race each other, and the
 * first one to land wins without the others clobbering `paid_at` or `paid_via`.
 */
export async function markOrderPaid(
    orderCode: string,
    source: PaidSource,
    details: PaidDetails = {}
): Promise<MarkPaidResult> {
    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(orderCode);
    const now = new Date().toISOString();

    const result = await db.runTransaction(async (tx): Promise<MarkPaidResult> => {
        const snap = await tx.get(orderRef);

        if (!snap.exists) {
            return { status: "order_not_found", orderCode };
        }

        const data = snap.data() || {};

        // Late-arriving identifiers are still worth storing on an already-paid order,
        // but the original paid_at / paid_via must not be overwritten.
        const identifiers: Record<string, unknown> = {};
        if (details.zohoPaymentId && !data.zoho_payment_id) {
            identifiers.zoho_payment_id = details.zohoPaymentId;
        }
        if (details.zohoPaymentLinkId && !data.zoho_payment_link_id) {
            identifiers.zoho_payment_link_id = details.zohoPaymentLinkId;
        }

        const event = {
            at: now,
            source,
            event: data.payment_status === "PAID" ? "paid_confirmed_again" : "marked_paid",
        };

        if (data.payment_status === "PAID") {
            tx.update(orderRef, {
                ...identifiers,
                payment_events: FieldValue.arrayUnion(event),
            });
            return { status: "already_paid", orderCode };
        }

        tx.update(orderRef, {
            ...identifiers,
            payment_status: "PAID",
            paid_at: now,
            paid_via: source,
            ...(details.amountPaid !== undefined ? { amount_paid: details.amountPaid } : {}),
            payment_events: FieldValue.arrayUnion(event),
        });

        return { status: "updated", orderCode };
    });

    if (result.status === "order_not_found") {
        // Money may have moved for an order we cannot find. Never let that vanish into
        // a log line on a serverless host — record it where support can see it.
        await db
            .collection("orphan_payments")
            .add({ orderCode, source, details, recordedAt: now })
            .catch((err) => console.error("Failed to record orphan payment:", err));
    }

    return result;
}

export type VerifyResult =
    | { status: "updated"; orderCode: string }
    | { status: "already_paid"; orderCode: string }
    | { status: "order_not_found"; orderCode: string }
    | { status: "no_payment_link"; orderCode: string }
    /** `terminal` distinguishes a cancelled/expired link from one Zoho has not settled yet. */
    | { status: "not_paid"; orderCode: string; linkStatus: string; terminal: boolean }
    | { status: "verification_failed"; orderCode: string; error: string };

/**
 * Write the outcome of a verification attempt onto the order.
 *
 * Without this every failure mode looks identical from the outside — the order just sits
 * at PENDING — and the actual reason ("invalid oauth scope", "link not found", a
 * Firestore permission error) exists only as a console line on a serverless host that
 * nobody reads. Whoever opens the order in the Firebase console should be able to see
 * why it did not resolve.
 */
async function recordVerificationAttempt(
    orderCode: string,
    source: PaidSource,
    result: VerifyResult
): Promise<void> {
    // A paid order already carries its own audit trail via payment_events.
    if (result.status === "updated" || result.status === "already_paid") return;

    const attempt: Record<string, unknown> = {
        at: new Date().toISOString(),
        source,
        status: result.status,
    };
    if ("error" in result) attempt.error = result.error.slice(0, 1500);
    if ("linkStatus" in result) attempt.linkStatus = result.linkStatus;

    try {
        await getAdminDb()
            .collection("orders")
            .doc(orderCode)
            .update({
                last_verification: attempt,
                verification_attempts: FieldValue.increment(1),
            });
    } catch (error) {
        // The order may not exist, or Firestore itself may be the thing that is broken —
        // either way this is diagnostics, never a reason to fail the caller.
        console.error(`Could not record verification attempt for ${orderCode}:`, error);
    }
}

/**
 * Ask Zoho whether this order was actually paid, then record it.
 *
 * This is the authoritative check. It does not trust redirect query params or client
 * input — the only thing the caller supplies is an order code, and the answer comes
 * from a server-to-server call to Zoho.
 */
export async function verifyAndMarkOrderPaid(
    orderCode: string,
    source: PaidSource = "zoho_reconcile"
): Promise<VerifyResult> {
    const result = await runVerification(orderCode, source);
    await recordVerificationAttempt(orderCode, source, result);
    return result;
}

async function runVerification(orderCode: string, source: PaidSource): Promise<VerifyResult> {
    // getAdminDb() throws when credentials are missing, so it belongs inside the guard —
    // a misconfigured deployment must surface as a retryable result, not a 500 page in
    // the customer's face right after they paid.
    let orderRef;
    let snap;
    try {
        orderRef = getAdminDb().collection("orders").doc(orderCode);
        snap = await orderRef.get();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { status: "verification_failed", orderCode, error: `Firestore read failed: ${message}` };
    }

    if (!snap.exists) return { status: "order_not_found", orderCode };

    const data = snap.data() || {};
    if (data.payment_status === "PAID") return { status: "already_paid", orderCode };

    const paymentLinkId = data.zoho_payment_link_id as string | undefined;
    if (!paymentLinkId) return { status: "no_payment_link", orderCode };

    let link;
    try {
        link = await fetchZohoPaymentLink(paymentLinkId);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { status: "verification_failed", orderCode, error: message };
    }

    if (!link) {
        return { status: "verification_failed", orderCode, error: "Zoho does not recognise this payment link" };
    }

    // The link must belong to this order — guards against a mixed-up id on the order doc.
    if (link.reference_id && link.reference_id !== orderCode) {
        return {
            status: "verification_failed",
            orderCode,
            error: `Payment link ${paymentLinkId} references order ${link.reference_id}, not ${orderCode}`,
        };
    }

    if (!isPaymentLinkPaid(link)) {
        return {
            status: "not_paid",
            orderCode,
            linkStatus: link.status || "unknown",
            terminal: isPaymentLinkTerminal(link),
        };
    }

    // Record an amount mismatch rather than refusing — the money has already moved, and
    // a support-visible flag is more useful than a stuck order.
    const expected = Number(data.amount);
    const paid = Number(link.amount_paid ?? link.amount);
    if (Number.isFinite(expected) && Number.isFinite(paid) && Math.abs(expected - paid) > 0.01) {
        await orderRef
            .update({ amount_mismatch: { expected, paid, detectedAt: new Date().toISOString() } })
            .catch(() => undefined);
    }

    try {
        const marked = await markOrderPaid(orderCode, source, {
            zohoPaymentId: latestPaymentId(link),
            zohoPaymentLinkId: paymentLinkId,
            amountPaid: link.amount_paid ?? link.amount,
        });

        if (marked.status === "order_not_found") return { status: "order_not_found", orderCode };
        return marked;
    } catch (error) {
        // Zoho confirmed the payment but we could not record it. Retryable — the customer's
        // client and the webhook will both try again.
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to record confirmed payment for ${orderCode}:`, error);
        return { status: "verification_failed", orderCode, error: `Confirmed paid but write failed: ${message}` };
    }
}
