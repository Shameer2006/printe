import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function About() {
    return (
        <main className="min-h-screen bg-transparent text-black py-8 px-4 flex justify-center">
            <div className="w-full max-w-[800px] space-y-8">
                <div className="flex flex-col items-center justify-center space-y-2 pt-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
                        <span className="text-white font-bold text-2xl tracking-tighter">P</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">About Us</h1>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 space-y-6 border border-gray-100 text-base text-gray-700 leading-relaxed">
                    <p>
                        Welcome to <strong>Printeg</strong>, a product of <strong>Ramsee Ventures</strong>, India's emerging solution for fast, reliable, and high-quality online printing services. We are dedicated to simplifying the document printing experience for students, professionals, and businesses.
                    </p>

                    <p>
                        At Printeg, we leverage technology to bridge the gap between digital documents and physical prints. Our platform allows you to upload, configure, and pay for your prints seamlessly through our <strong>Zoho Pay approved payment gateway</strong>, ensuring you spend less time in queues and more time on what matters.
                    </p>

                    <h2 className="text-xl font-bold text-black mt-4">Our Values</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Efficiency:</strong> Rapid processing to meet your urgent deadlines.</li>
                        <li><strong>Integrity:</strong> Transparent pricing with no hidden costs.</li>
                        <li><strong>Quality:</strong> Ensuring every print is crisp, clear, and professional.</li>
                        <li><strong>Security:</strong> Protecting your sensitive documents with industry-standard encryption.</li>
                    </ul>

                    <p className="mt-4 font-medium italic">
                        "Your documents, printed with care and delivered with speed."
                    </p>
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
