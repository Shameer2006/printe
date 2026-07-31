import { NextRequest, NextResponse } from "next/server";
import { getZohoAccessToken } from "@/lib/zoho-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderCode, amount, mobileNumber } = body;

        if (!orderCode || !amount || !mobileNumber) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
            amount: parseFloat(amount),
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

            // Store the payment link id on the order so the callback and
            // verify-payment endpoints can check the real payment status with Zoho.
            try {
                await updateDoc(doc(db, "orders", orderCode), {
                    zoho_payment_link_id: paymentLinkId,
                });
            } catch (err) {
                console.error("Failed to store zoho_payment_link_id on order:", err);
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
