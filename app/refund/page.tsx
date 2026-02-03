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
                    <h1 className="text-2xl font-bold tracking-tight">Refund Policy</h1>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 space-y-6 border border-gray-100 text-sm text-gray-700">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-black">1. Cancellations</h2>
                        <p>
                            Due to the custom nature of printing, orders can only be cancelled within 15 minutes of placing the order or before the status changes to "Processing", whichever is earlier. To cancel, please contact our support team immediately.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-black">2. Refunds</h2>
                        <p>
                            We offer refunds in the following cases:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Double payment for the same order.</li>
                            <li>Order cancelled successfully within the allowed window.</li>
                            <li>Major defects in printing (e.g., blank pages, severe damage) verifiable by photo evidence.</li>
                        </ul>
                        <p className="mt-2">
                            We do not strictly offer refunds for user errors such as:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Uploading the wrong file.</li>
                            <li>Low-resolution images in the source file.</li>
                            <li>Spelling errors in your document.</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-black">3. Processing Refunds</h2>
                        <p>
                            Approved refunds will be processed within 5-7 business days and credited back to the original payment method.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-black">4. Contact Us</h2>
                        <p>
                            For refund requests, please email us at <a href="mailto:printeg.mailbox@gmail.com" className="text-blue-600 hover:underline">printeg.mailbox@gmail.com</a> with your Order ID and details of the issue.
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
