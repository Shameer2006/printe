import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Refund() {
    return (
        <main className="min-h-screen bg-transparent text-black py-8 px-4 flex justify-center">
            <div className="w-full max-w-[800px] space-y-8">
                <div className="flex flex-col items-center justify-center space-y-2 pt-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
                        <span className="text-white font-bold text-2xl tracking-tighter">P</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Refund & Cancellation Policy</h1>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 space-y-6 border border-gray-100 text-sm text-gray-700 leading-relaxed">
                    <p>Last updated: March 07, 2026</p>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">1. Cancellation Policy</h2>
                        <p>
                            Due to the customized nature of printing and the automated nature of A4 sheet dispensing, orders can only be cancelled before they enter the "Processing" or "Dispensing" stage.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Cancellations requested within 15 minutes of order placement are typically accepted for printing.</li>
                            <li>Once the printing process has started or A4 sheets have been dispensed, the order cannot be cancelled or modified.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">2. Refund Eligibility</h2>
                        <p>
                            Refunds are processed only under the following specific circumstances:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Defects:</strong> If the physical print has significant manufacturing defects (e.g., blank pages, incorrect paper size) or if A4 sheets are damaged during dispensing.</li>
                            <li><strong>Double Payment:</strong> If multiple payments were deducted for a single order due to a technical glitch.</li>
                            <li><strong>Non-fulfillment:</strong> If we are unable to fulfill your order or dispense sheets for any operational reason.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">3. Non-Refundable Items</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>User errors (e.g., spelling mistakes in AI documents, incorrect quantity of A4 sheets selected).</li>
                            <li>Orders that have already been collected, dispatched, or dispensed from the machine.</li>
                            <li>AI-generated document fees once the generation is complete.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">4. Refund Process</h2>
                        <p>
                            To request a refund, please email us with your Order ID and photographic evidence of the defect (if applicable). Approved refunds will be initiated within 5-7 business days and credited to the original payment method used during the transaction.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">5. Contact Us</h2>
                        <p>
                            For cancellation or refund requests, please contact us at:<br />
                            <strong>Email:</strong> <a href="mailto:printeg.workspace@gmail.com" className="text-blue-600 hover:underline">printeg.workspace@gmail.com</a>
                        </p>
                    </section>
                </div>

                <div className="flex justify-center">
                    <Link href="/">
                        <Button variant="outline" className="rounded-xl">Back to Home</Button>
                    </Link>
                </div>
            </div>
        </main>
    );
}
