import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAndMarkOrderPaid } from "@/lib/orders";

/**
 * Sweep for orders that are still PENDING and ask Zoho about each one.
 *
 * The callback, the webhook and the client-side reconcile all have blind spots — a lost
 * redirect, a wrong signing key, a customer who closed the tab. Every one of those ends
 * the same way: money taken, order stuck at PENDING, nobody notified. This runs on a
 * schedule so resolution does not depend on anyone being present.
 *
 * Runs unattended, so it is authenticated by a shared secret rather than a session:
 *   Authorization: Bearer $CRON_SECRET   (Vercel Cron sends this automatically)
 *   ?secret=$CRON_SECRET                 (for external schedulers that cannot set headers)
 *
 * Scheduling: Vercel's Hobby plan caps crons at one run per day, so vercel.json only
 * carries a daily backstop. Because this looks back MAX_AGE_MS, a daily pass still
 * recovers anything the live channels missed — just slowly. For minutes-level recovery,
 * point a free external scheduler at the ?secret= form.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Newer than this and the customer is probably still paying; older and Zoho has expired the link. */
const MIN_AGE_MS = 60 * 1000;
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_ORDERS_PER_RUN = 50;

function isAuthorized(req: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;

    const header = req.headers.get("authorization") || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    return bearer === secret || req.nextUrl.searchParams.get("secret") === secret;
}

async function sweep() {
    const db = getAdminDb();
    const now = Date.now();

    // Filter and order on `createdAt` alone. Firestore indexes every single field
    // automatically, so this needs no deployed composite index — whereas adding an
    // equality filter on payment_status to an ordered query would, and a sweep that
    // fails on a missing index is a sweep that silently protects nothing.
    // createdAt is an ISO-8601 string, which sorts lexicographically by time.
    const snap = await db
        .collection("orders")
        .where("createdAt", ">=", new Date(now - MAX_AGE_MS).toISOString())
        .orderBy("createdAt", "desc")
        .limit(500)
        .get();

    const candidates = snap.docs
        .filter((doc) => {
            const data = doc.data();
            if (data.payment_status !== "PENDING") return false;
            if (!data.zoho_payment_link_id) return false;
            const createdAt = Date.parse(data.createdAt);
            // Skip orders where the customer may still be on the Zoho page.
            return Number.isFinite(createdAt) && now - createdAt > MIN_AGE_MS;
        })
        .slice(0, MAX_ORDERS_PER_RUN);

    const results: Record<string, number> = {};
    const resolved: string[] = [];

    for (const doc of candidates) {
        const result = await verifyAndMarkOrderPaid(doc.id, "zoho_reconcile");
        results[result.status] = (results[result.status] || 0) + 1;
        if (result.status === "updated") resolved.push(doc.id);
    }

    if (resolved.length) {
        console.log(`Zoho Sweep: recovered ${resolved.length} paid order(s): ${resolved.join(", ")}`);
    }

    return {
        scannedRecentOrders: snap.size,
        checked: candidates.length,
        recovered: resolved.length,
        recoveredOrders: resolved,
        byStatus: results,
    };
}

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json(
            { error: "Unauthorized. Set CRON_SECRET and send it as a Bearer token." },
            { status: 401 }
        );
    }

    try {
        return NextResponse.json({ ok: true, ...(await sweep()) });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Zoho Sweep failed:", error);
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}

export const POST = GET;
