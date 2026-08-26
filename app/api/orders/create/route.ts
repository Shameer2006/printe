import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/orders";

/**
 * Order creation.
 *
 * This exists so the order code is allocated server-side. The client used to pick a
 * random four-digit code and write it straight to Firestore, which meant a collision
 * overwrote a live order — resetting a paid order to PENDING and destroying the
 * payment link id needed to verify it. Allocation is transactional in `createOrder`.
 */

export const dynamic = "force-dynamic";

/** Only these fields are accepted; anything else the client sends is discarded. */
const ALLOWED_FIELDS = [
    "mobileNumber",
    "totalPages",
    "copies",
    "isColor",
    "printSide",
    "printLayout",
    "amount",
    "fileUrl",
    "vendorSlug",
    "isA4SheetsOnly",
] as const;

export async function POST(req: NextRequest) {
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const mobileNumber = typeof body.mobileNumber === "string" ? body.mobileNumber : "";
    const amount = Number(body.amount);
    const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : "";

    if (!/^\d{10}$/.test(mobileNumber)) {
        return NextResponse.json({ error: "A valid 10-digit mobile number is required" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "A valid amount is required" }, { status: 400 });
    }
    if (!fileUrl) {
        return NextResponse.json({ error: "fileUrl is required" }, { status: 400 });
    }

    const fields: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
        if (body[key] !== undefined) fields[key] = body[key];
    }
    fields.amount = amount;

    try {
        const { orderCode } = await createOrder(fields);
        return NextResponse.json({ orderCode });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Order creation failed:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
