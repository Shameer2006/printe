import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Contact() {
    return (
        <main className="min-h-screen bg-transparent text-black py-8 px-4 flex justify-center">
            <div className="w-full max-w-[600px] space-y-8">
                <div className="flex flex-col items-center justify-center space-y-2 pt-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
                        <span className="text-white font-bold text-2xl tracking-tighter">P</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Contact Us</h1>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 space-y-8 border border-gray-100">
                    <p className="text-gray-600 leading-relaxed">
                        We are here to help! If you have any questions, concerns, or feedback regarding your print orders or our services, please reach out to us.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Merchant Name</h3>
                            <p className="text-gray-700 font-medium">Ramsee Ventures</p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Email Support</h3>
                            <a href="mailto:printeg.workspace@gmail.com" className="text-blue-600 hover:underline block">
                                printeg.workspace@gmail.com
                            </a>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Registered Address</h3>
                            <p className="text-gray-700 leading-relaxed">
                                Printeg HQ, <br />
                                Chennai, Tamil Nadu, <br />
                                India - 600001
                            </p>
                        </div>
                    </div>
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
