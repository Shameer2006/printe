import { NextRequest, NextResponse } from "next/server";

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
    // After payment, Zoho redirects with ?orderCode=...&status=...
    const orderCode = searchParams.get("orderCode");
    const status = searchParams.get("status");

    const redirectUrl = new URL("/", req.url);

    if (status === "success" && orderCode) {
        redirectUrl.searchParams.set("step", "complete");
        redirectUrl.searchParams.set("orderCode", orderCode);
    } else {
        redirectUrl.searchParams.set("step", "payment");
        redirectUrl.searchParams.set("error", "Payment failed or was cancelled.");
    }

    return NextResponse.redirect(redirectUrl, 303);
}
