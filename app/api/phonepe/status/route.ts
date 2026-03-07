import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    // PhonePe redirects the user's browser here via POST with form data
    try {
        const formData = await req.formData();
        const transactionId = formData.get("transactionId");
        const code = formData.get("code");

        // We can rely on the webhook (/api/phonepe/callback) for the actual DB update.
        // This endpoint just directs the user back to the app UI.

        const redirectUrl = new URL("/", req.url);

        if (code === "PAYMENT_SUCCESS") {
            redirectUrl.searchParams.set("step", "complete");
            redirectUrl.searchParams.set("orderCode", transactionId as string);
        } else {
            // Payment failed or pending
            redirectUrl.searchParams.set("step", "payment");
            redirectUrl.searchParams.set("error", "Payment failed or was cancelled.");
        }

        return NextResponse.redirect(redirectUrl, 303);

    } catch (error) {
        console.error("PhonePe Status Redirect Error:", error);
        return NextResponse.redirect(new URL("/?error=redirect-failed", req.url), 303);
    }
}

export async function GET(req: NextRequest) {
    // Fallback if PhonePe redirects via GET
    const searchParams = req.nextUrl.searchParams;
    const orderCode = searchParams.get("id");

    const redirectUrl = new URL("/", req.url);
    if (orderCode) {
        redirectUrl.searchParams.set("step", "complete");
        redirectUrl.searchParams.set("orderCode", orderCode);
    }

    return NextResponse.redirect(redirectUrl, 303);
}
