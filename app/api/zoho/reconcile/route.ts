import { NextRequest, NextResponse } from "next/server";
import { verifyAndMarkOrderPaid } from "@/lib/orders";

/**
 * Payment reconciliation — the safety net.
 *
 * The completion screen calls this when an order is still PENDING after the redirect,
 * and support can call it by hand for a stuck order. It takes only an order code and
 * asks Zoho server-to-server whether that payment link is paid, so a caller cannot use
 * it to mark anything paid that Zoho does not confirm.
 */

export const dynamic = "force-dynamic";

async function reconcile(orderCode: string | null) {
    if (!orderCode) {
        return NextResponse.json({ error: "orderCode is required" }, { status: 400 });
    }

    const result = await verifyAndMarkOrderPaid(orderCode, "zoho_reconcile");
    const paid = result.status === "updated" || result.status === "already_paid";

    // A failure to *check* is not a failure to pay — surface it as 503 so the client
    // knows to retry rather than concluding the payment did not happen.
    const httpStatus =
        result.status === "verification_failed" ? 503 :
        result.status === "order_not_found" ? 404 :
        200;

    console.log(`Zoho Reconcile: order ${orderCode} → ${result.status}`);
    return NextResponse.json({ paid, ...result }, { status: httpStatus });
}

export async function POST(req: NextRequest) {
    let orderCode: string | null = null;
    try {
        const body = await req.json();
        orderCode = typeof body?.orderCode === "string" ? body.orderCode : null;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return reconcile(orderCode);
}

export async function GET(req: NextRequest) {
    return reconcile(req.nextUrl.searchParams.get("orderCode"));
}
