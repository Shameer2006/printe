import { NextRequest, NextResponse } from "next/server";
import { getZohoAccessToken } from "@/lib/zoho-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderCode } = body;

        if (!orderCode) {
            return NextResponse.json({ error: "orderCode is required" }, { status: 400 });
        }

        // Price the link from the stored order, not from the request body. The browser
        // supplies neither the amount nor the number here, so a tampered request cannot
        // create a ₹1 link for a ₹100 order — and reconciliation compares the payment
        // against this same figure.
        const orderRef = getAdminDb().collection("orders").doc(orderCode);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const order = orderSnap.data() || {};
        const amount = Number(order.amount);
        const mobileNumber = order.mobileNumber;

        if (!Number.isFinite(amount) || amount <= 0 || !mobileNumber) {
            return NextResponse.json({ error: "Order is missing an amount or mobile number" }, { status: 400 });
        }

        const accountId = process.env.ZOHO_PAYMENTS_ACCOUNT_ID;
        if (!accountId) {
            console.error("ZOHO_PAYMENTS_ACCOUNT_ID not configured");
            return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
        }

        const accessToken = await getZohoAccessToken();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        // Zoho Payments API v1 - exact structure from official docs
        const payload: any = {
            amount,
            currency: "INR",
            phone: mobileNumber,
            phone_country_code: "IN",
            reference_id: orderCode,
            description: `PrintEG Order - ${orderCode}`,
        };

        // Always send return_url — Zoho requires a public HTTPS URL (not localhost)
        const publicBase = (baseUrl && !baseUrl.includes('localhost'))
            ? baseUrl
            : "https://www.printeg.in"; // fallback for local dev testing on production
        payload.return_url = `${publicBase}/api/zoho/callback?orderCode=${orderCode}&status=success`;

        const url = `https://payments.zoho.in/api/v1/paymentlinks?account_id=${accountId}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Zoho-oauthtoken ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.code === 0 && data.payment_links) {
            const paymentLinkId = data.payment_links.payment_link_id;

            // Store the payment link id on the order BEFORE handing the customer to Zoho.
            // Reconciliation looks the payment up by this id, so an order without it cannot
            // be confirmed as paid if the redirect and the webhook both fail. Better to fail
            // here than to take money we cannot reconcile.
            try {
                await orderRef.set({ zoho_payment_link_id: paymentLinkId }, { merge: true });
            } catch (err) {
                console.error("Failed to store zoho_payment_link_id on order:", err);
                return NextResponse.json(
                    { error: "Could not prepare the order for payment. Please try again." },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                paymentUrl: data.payment_links.url,
                paymentLinkId,
            });
        } else {
            console.error("Zoho Payment Link Creation Error:", data);
            return NextResponse.json(
                { error: data.message || "Failed to create payment link" },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error("Zoho Create Payment Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
