import { NextResponse } from "next/server";
import { checkAdminConnection } from "@/lib/firebase-admin";
import { getZohoAccessToken, getLastGrantedScope } from "@/lib/zoho-auth";

/**
 * Deployment health check — confirms the pieces the payment flow depends on are
 * actually configured in *this* environment. Hit it right after a deploy:
 *
 *   GET /api/health
 *
 * Reports presence of config only, never values.
 */

export const dynamic = "force-dynamic";

/**
 * Creating a payment link needs ZohoPay.payments.CREATE; reading one back to confirm it
 * was paid needs ZohoPay.payments.READ. A refresh token minted with only CREATE sails
 * through checkout and then fails every verification — which looks exactly like "orders
 * stay PENDING for no reason". Check the granted scope rather than inferring it.
 */
async function checkZohoAuth() {
    try {
        await getZohoAccessToken();
        const scope = getLastGrantedScope();
        return {
            ok: true,
            scope,
            // Null means the token was served from cache, so no scope was reported this call.
            canReadPaymentLinks: scope === null ? null : scope.includes("ZohoPay.payments.READ"),
        };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function GET() {
    const [firebaseAdmin, zohoAuth] = await Promise.all([checkAdminConnection(), checkZohoAuth()]);

    const env = {
        ZOHO_CLIENT_ID: Boolean(process.env.ZOHO_CLIENT_ID),
        ZOHO_CLIENT_SECRET: Boolean(process.env.ZOHO_CLIENT_SECRET),
        ZOHO_REFRESH_TOKEN: Boolean(process.env.ZOHO_REFRESH_TOKEN),
        ZOHO_PAYMENTS_ACCOUNT_ID: Boolean(process.env.ZOHO_PAYMENTS_ACCOUNT_ID),
        ZOHO_SIGNING_KEY: Boolean(process.env.ZOHO_SIGNING_KEY),
        CRON_SECRET: Boolean(process.env.CRON_SECRET),
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || null,
    };

    const missing = Object.entries(env)
        .filter(([key, value]) => key !== "NEXT_PUBLIC_BASE_URL" && value === false)
        .map(([key]) => key);

    const ok = firebaseAdmin.ok && zohoAuth.ok && missing.length === 0;

    return NextResponse.json(
        { ok, firebaseAdmin, zohoAuth, env, missing },
        { status: ok ? 200 : 503 }
    );
}
