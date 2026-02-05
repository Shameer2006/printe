import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Terms() {
    return (
        <main className="min-h-screen bg-transparent text-black py-8 px-4 flex justify-center">
            <div className="w-full max-w-[800px] space-y-8">
                <div className="flex flex-col items-center justify-center space-y-2 pt-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
                        <span className="text-white font-bold text-2xl tracking-tighter">P</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Terms and Conditions</h1>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 space-y-6 border border-gray-100 text-sm text-gray-700">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-black">1. Agreement to Terms</h2>
                        <p>
                            By accessing or using our website, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you disagree with any part of the terms, then you may not access the Service.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-black">2. Service Description</h2>
                        <p>
                            Printeg provides online document printing services. Users can upload PDF documents, configure print settings, and pay for printing services. We endeavor to provide high-quality prints but cannot guarantee exact color matching due to screen calibration differences.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-black">3. User Responsibilities</h2>
                        <p>
                            You represent and warrant that you own or have the necessary licenses, rights, consents, and permissions to authorize Printeg to print the content you upload. You verify that your content does not violate any laws or third-party rights.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-black">4. Payments</h2>
                        <p>
                            Payment must be made in full before any printing work begins. We use third-party payment processors (Razorpay) and are not responsible for errors or issues arising from their services.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-black">5. Content Restrictions</h2>
                        <p>
                            We reserve the right to refuse to print any material that we believe to be illegal, offensive, or inappropriate.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-black">6. Refund and Cancellation</h2>
                        <p>
                            Reference our Refund Policy for details on cancellations and refunds.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-black">7. Contact Us</h2>
                        <p>
                            If you have any questions about these Terms, please contact us at <a href="mailto:printeg.mailbox@gmail.com" className="text-blue-600 hover:underline">printeg.mailbox@gmail.com</a>.
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
