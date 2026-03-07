import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const responseData = body.response;

        if (!responseData) {
            return NextResponse.json({ error: "No response data" }, { status: 400 });
        }

        const decodedResponse = Buffer.from(responseData, 'base64').toString('utf-8');
        const parsedResponse = JSON.parse(decodedResponse);

        // Verify the checksum (x-verify header)
        const receivedChecksum = req.headers.get("x-verify");
        const saltKey = process.env.PHONEPE_SALT_KEY || "";
        const saltIndex = process.env.PHONEPE_SALT_INDEX || "1";

        const stringToSign = responseData + saltKey;
        const expectedChecksum = crypto.createHash("sha256").update(stringToSign).digest("hex") + "###" + saltIndex;

        if (receivedChecksum !== expectedChecksum) {
            console.error("Invalid Checksum");
            return NextResponse.json({ error: "Invalid Checksum" }, { status: 400 });
        }

        const orderCode = parsedResponse.data.merchantTransactionId;

        // Update database according to the response
        if (orderCode) {
            const orderRef = doc(db, "orders", orderCode);

            if (parsedResponse.success && parsedResponse.code === "PAYMENT_SUCCESS") {
                await updateDoc(orderRef, {
                    payment_status: "PAID",
                    transaction_id: parsedResponse.data.transactionId,
                    paymentInstrument: parsedResponse.data.paymentInstrument
                });
            } else {
                await updateDoc(orderRef, {
                    payment_status: "FAILED",
                    transaction_id: parsedResponse.data.transactionId,
                    failureReason: parsedResponse.message
                });
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("PhonePe Webhook Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
