import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderCode, vendorSlug } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderCode) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keySecret) {
            console.error("Razorpay key secret not configured");
            return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
        }

        // Verify signature: HMAC-SHA256 of "order_id|payment_id" with key secret
        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        const isValid = expectedSignature === razorpay_signature;

        let orderRef = vendorSlug
            ? doc(db, "vendors", vendorSlug, "orders", orderCode)
            : doc(db, "orders", orderCode);

        if (isValid) {
            try {
                await updateDoc(orderRef, {
                    payment_status: "PAID",
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature,
                });
            } catch {
                if (vendorSlug) {
                    await updateDoc(doc(db, "orders", orderCode), {
                        payment_status: "PAID",
                        razorpay_order_id,
                        razorpay_payment_id,
                        razorpay_signature,
                    });
                }
            }

            return NextResponse.json({ success: true, verified: true });
        } else {
            try {
                await updateDoc(orderRef, {
                    payment_status: "FAILED",
                    failureReason: "Signature verification failed",
                });
            } catch {
                if (vendorSlug) {
                    await updateDoc(doc(db, "orders", orderCode), {
                        payment_status: "FAILED",
                        failureReason: "Signature verification failed",
                    });
                }
            }

            return NextResponse.json({ success: false, verified: false, error: "Payment verification failed" }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Razorpay Verify Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
