import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderCode, amount, mobileNumber } = body;

        if (!orderCode || !amount || !mobileNumber) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const merchantId = process.env.NEXT_PUBLIC_PHONEPE_MERCHANT_ID;
        const saltKey = process.env.PHONEPE_SALT_KEY;
        const saltIndex = process.env.PHONEPE_SALT_INDEX;
        const env = process.env.PHONEPE_ENV || "UAT";

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

        const payload = {
            merchantId: merchantId,
            merchantTransactionId: orderCode,
            merchantUserId: `MUID-${mobileNumber}`,
            amount: Math.round(amount * 100), // phonepe expects paise
            redirectUrl: `${baseUrl}/api/phonepe/status?id=${orderCode}`,
            redirectMode: "REDIRECT",
            callbackUrl: `${baseUrl}/api/phonepe/callback`,
            mobileNumber: mobileNumber,
            paymentInstrument: {
                type: "PAY_PAGE",
            },
        };

        const payloadString = JSON.stringify(payload);
        const base64EncodedPayload = Buffer.from(payloadString).toString("base64");

        const stringToSign = base64EncodedPayload + "/pg/v1/pay" + saltKey;
        const sha256 = crypto.createHash("sha256").update(stringToSign).digest("hex");
        const checksum = sha256 + "###" + saltIndex;

        const url = env === "PROD"
            ? "https://api.phonepe.com/apis/hermes/pg/v1/pay"
            : "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";

        const options = {
            method: "POST",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
                "X-VERIFY": checksum,
            },
            body: JSON.stringify({ request: base64EncodedPayload }),
        };

        const response = await fetch(url, options);
        const data = await response.json();

        if (data.success) {
            return NextResponse.json({
                redirectUrl: data.data.instrumentResponse.redirectInfo.url
            });
        } else {
            console.error("PhonePe Pay Initiation Error:", data);
            return NextResponse.json({ error: data.message || "Payment initiation failed" }, { status: 500 });
        }

    } catch (error: any) {
        console.error("PhonePe API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
