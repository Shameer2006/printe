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
                        Welcome to <strong>Printeg</strong>, your go-to solution for fast, reliable, and high-quality online printing services. We understand the hassle of traditional printing shops—long queues, confusing pricing, and travel time. Printeg was built to solve this.
                    </p>

                    <p>
                        Our mission is to make printing accessible to everyone, everywhere. Whether you are a student needings notes printed, a professional needing reports, or a business needing marketing materials, we've got you covered.
                    </p>

                    <h2 className="text-xl font-bold text-black mt-4">Why Choose Printeg?</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Convenience:</strong> Upload your documents from the comfort of your home.</li>
                        <li><strong>Quality:</strong> We use high-grade paper and top-quality printers for crisp output.</li>
                        <li><strong>Pricing:</strong> Affordable rates with no hidden charges.</li>
                        <li><strong>Speed:</strong> Quick processing and reliable delivery.</li>
                    </ul>

                    <p className="mt-4">
                        Thank you for choosing Printeg. We look forward to serving you!
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
