import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Privacy() {
    return (
        <main className="min-h-screen bg-transparent text-black py-8 px-4 flex justify-center">
            <div className="w-full max-w-[800px] space-y-8">
                <div className="flex flex-col items-center justify-center space-y-2 pt-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
                        <span className="text-white font-bold text-2xl tracking-tighter">P</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 space-y-6 border border-gray-100 text-sm text-gray-700 leading-relaxed">
                    <p>Last updated: March 07, 2026</p>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">1. Overview</h2>
                        <p>
                            Printeg, a product of Ramsee Ventures ("we," "us," or "our"), is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our A4 sheet dispenser and printing services.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">2. Information We Collect</h2>
                        <p>We collect information that you provide directly to us when you use our services:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Personal Information:</strong> Mobile number, which is used for order identification and communication.</li>
                            <li><strong>Order Content:</strong>
                                <ul className="list-circle pl-5 mt-1 space-y-1">
                                    <li>For printing services: PDF documents and images you upload. These are temporarily stored and used solely to fulfill your print request.</li>
                                    <li>For A4 sheet dispensing: No document content is collected or stored. We only record the number of sheets purchased.</li>
                                </ul>
                            </li>
                            <li><strong>Payment Information:</strong> We do not store your credit card or bank details. This platform's payment is secured by Zoho Pay.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">3. How We Use Your Information</h2>
                        <p>We use the collected information to:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Process and fulfill your printing orders.</li>
                            <li>Provide customer support and respond to your requests.</li>
                            <li>Send transaction-related communications.</li>
                            <li>Comply with legal obligations.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">4. Data Retention</h2>
                        <p>
                            We retain your uploaded files only for as long as necessary to complete your order and ensure quality. Typically, uploaded files are automatically deleted from our servers after the order is collected or after a short retention period for reprint requests.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">5. Third-Party Disclosures</h2>
                        <p>
                            We do not sell or rent your personal information. We may share information with service providers who assist us in our operations (e.g., payment processors). These parties are obligated to keep your information confidential.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">6. Security</h2>
                        <p>
                            We implement a variety of security measures to maintain the safety of your personal information. Your documents are stored in secure environments and are only accessible by authorized personnel during the fulfillment process.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-black">7. Contact Information</h2>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us at:<br />
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
