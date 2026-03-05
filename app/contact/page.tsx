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

                <div className="bg-gray-50 rounded-2xl p-6 space-y-6 border border-gray-100">
                    <p className="text-gray-600">
                        We are here to help! If you have any questions, concerns, or feedback, please feel free to reach out to us.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-gray-900">Email</h3>
                            <a href="mailto:printeg.workspace@gmail.com" className="text-blue-600 hover:underline">
                                printeg.workspace@gmail.com
                            </a>
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-900">Address</h3>
                            <p className="text-gray-600">
                                Printeg Operations<br />
                                Chennai, Tamil Nadu<br />
                                India
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
