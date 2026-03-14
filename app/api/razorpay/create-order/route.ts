import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderCode, amount, mobileNumber } = body;

        if (!orderCode || !amount || !mobileNumber) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            console.error("Razorpay keys not configured");
            return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
        }

        // Create Razorpay order via their API
        const response = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Razorpay expects paise
                currency: "INR",
                receipt: orderCode,
                notes: {
                    orderCode,
                    mobileNumber,
                },
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error("Razorpay Order Creation Error:", data.error);
            return NextResponse.json({ error: data.error.description || "Failed to create order" }, { status: 500 });
        }

        return NextResponse.json({
            orderId: data.id,
            amount: data.amount,
            currency: data.currency,
        });

    } catch (error: any) {
        console.error("Razorpay Create Order Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
