/**
 * Zoho Payments API helpers — server-to-server payment truth.
 *
 * Neither the browser redirect (`return_url`) nor the webhook is reliable on its own:
 * the redirect can be lost when GPay/UPI takes over the browser, and the webhook is
 * silent if the signing key is misconfigured. Asking Zoho directly is the one channel
 * that always works, so it is the authority for whether an order is really paid.
 */

import { getZohoAccessToken } from "./zoho-auth";

const ZOHO_API_BASE = "https://payments.zoho.in/api/v1";

export interface ZohoPaymentLink {
    payment_link_id: string;
    reference_id?: string;
    /** active | paid | canceled | expired */
    status: string;
    amount?: string;
    amount_paid?: string;
    currency?: string;
    payments?: Array<{ payment_id: string; amount: string; status: string; date?: string }>;
}

function requireAccountId(): string {
    const accountId = process.env.ZOHO_PAYMENTS_ACCOUNT_ID;
    if (!accountId) {
        throw new Error("ZOHO_PAYMENTS_ACCOUNT_ID is not configured");
    }
    return accountId;
}

/**
 * Zoho returns `payment_links` as an object from the retrieve endpoint and as an array
 * from the list endpoint. Both shapes reach here, and an array assigned to a single-link
 * variable is the worst kind of bug: `status` reads as undefined, so a paid order looks
 * unpaid and stays PENDING. Normalise before anything inspects it.
 */
function normalizeLink(value: unknown, paymentLinkId: string): ZohoPaymentLink | null {
    if (!value) return null;

    if (Array.isArray(value)) {
        const match = value.find(
            (entry) => String((entry as ZohoPaymentLink)?.payment_link_id) === String(paymentLinkId)
        );
        return (match as ZohoPaymentLink) || null;
    }

    const link = value as ZohoPaymentLink;
    return link.payment_link_id ? link : null;
}

/**
 * Retrieve a payment link by id. Returns null when Zoho positively does not know the
 * link. Throws on auth/network failure so callers can distinguish "not paid" from
 * "could not check" — those must never be treated the same way.
 */
export async function fetchZohoPaymentLink(paymentLinkId: string): Promise<ZohoPaymentLink | null> {
    const accountId = requireAccountId();
    const accessToken = await getZohoAccessToken();

    const headers = {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
    };

    // Canonical REST shape first; the published spec also documents the retrieve
    // operation under the collection path, so try that form too.
    const candidates = [
        `${ZOHO_API_BASE}/paymentlinks/${encodeURIComponent(paymentLinkId)}?account_id=${accountId}`,
        `${ZOHO_API_BASE}/paymentlinks?account_id=${accountId}&payment_link_id=${encodeURIComponent(paymentLinkId)}`,
    ];

    const errors: string[] = [];
    // Only conclude "no such link" if a candidate said so and nothing else hit a
    // transport/auth problem. A 404 on the path form can mean the route is unsupported
    // rather than the link being unknown, and giving up there strands a paid order.
    let sawNotFound = false;
    let sawOtherFailure = false;

    for (const url of candidates) {
        const endpoint = url.split("?")[0];
        let response: Response;
        let text: string;
        try {
            response = await fetch(url, { method: "GET", headers, cache: "no-store" });
            text = await response.text();
        } catch (error) {
            errors.push(`${endpoint}: network error — ${error instanceof Error ? error.message : String(error)}`);
            sawOtherFailure = true;
            continue;
        }

        let data: { code?: number; message?: string; payment_links?: unknown };
        try {
            data = JSON.parse(text);
        } catch {
            errors.push(`${endpoint}: non-JSON response (HTTP ${response.status}): ${text.slice(0, 200)}`);
            sawOtherFailure = true;
            continue;
        }

        if (data.code === 0) {
            const link = normalizeLink(data.payment_links, paymentLinkId);
            if (link) return link;
            // Zoho answered successfully and this link simply is not in the result.
            errors.push(`${endpoint}: HTTP ${response.status} code 0 but no matching payment link in the response`);
            sawNotFound = true;
            continue;
        }

        // Keep the HTTP status and Zoho's own code in the message. "invalid oauth scope"
        // and "link not found" are diagnosed completely differently, and a bare
        // "verification failed" tells whoever is on support nothing at all.
        errors.push(
            `${endpoint}: HTTP ${response.status} zoho code ${data.code ?? "?"} — ${data.message || "no message"}`
        );
        if (response.status === 404) sawNotFound = true;
        else sawOtherFailure = true;
    }

    if (sawNotFound && !sawOtherFailure) return null;

    throw new Error(`Failed to retrieve Zoho payment link ${paymentLinkId}: ${errors.join(" | ")}`);
}

/** Zoho marks a link `paid` once the payment succeeds. */
export function isPaymentLinkPaid(link: ZohoPaymentLink): boolean {
    if (link.status?.toLowerCase() === "paid") return true;

    // Belt and braces: a succeeded payment on the link means the money moved even if
    // the link status lags.
    return Boolean(link.payments?.some((p) => p.status?.toLowerCase() === "succeeded"));
}

/**
 * True when Zoho can never turn this link into a payment. `active` is deliberately not
 * terminal — a link sits at `active` for the seconds between a UPI approval and Zoho
 * recording it, which is exactly when the customer lands back on our callback.
 */
export function isPaymentLinkTerminal(link: ZohoPaymentLink): boolean {
    const status = link.status?.toLowerCase();
    return status === "canceled" || status === "cancelled" || status === "expired";
}

/** The most recent successful payment id on a link, for support/reconciliation. */
export function latestPaymentId(link: ZohoPaymentLink): string | undefined {
    const succeeded = link.payments?.filter((p) => p.status?.toLowerCase() === "succeeded");
    if (succeeded?.length) return succeeded[succeeded.length - 1].payment_id;
    return link.payments?.length ? link.payments[link.payments.length - 1].payment_id : undefined;
}
