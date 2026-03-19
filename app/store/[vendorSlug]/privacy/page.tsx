"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Vendor } from "@/lib/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function VendorPrivacy() {
  const params = useParams();
  const vendorSlug = params.vendorSlug as string;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVendor() {
      try {
        const vendorDoc = await getDoc(doc(db, "vendors", vendorSlug));
        if (vendorDoc.exists()) {
          setVendor({ ...vendorDoc.data() as Vendor, slug: vendorSlug });
        }
      } catch (error) {
        console.error("Error fetching vendor:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchVendor();
  }, [vendorSlug]);

  const storeName = vendor?.storeName || vendorSlug;
  const basePath = `/store/${vendorSlug}`;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-black py-8 px-4 flex justify-center">
      <div className="w-full max-w-[800px] space-y-8">
        <div className="flex flex-col items-center justify-center space-y-2 pt-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-black/20"
            style={{ backgroundColor: vendor?.themeColor || "#000000" }}
          >
            <span className="text-white font-bold text-2xl tracking-tighter">{storeName.charAt(0).toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
          <span className="text-gray-400 text-xs font-medium">Powered by PrintEG</span>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 space-y-6 border border-gray-100 text-sm text-gray-700 leading-relaxed">
          <p>Last updated: March 19, 2026</p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-black">1. Overview</h2>
            <p>
              <strong>{storeName}</strong>, powered by PrintEG (a product of Ramsee Ventures), is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our A4 sheet dispenser and printing services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-black">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Personal Information:</strong> Mobile number, which is used for order identification and communication.</li>
              <li><strong>Order Content:</strong> PDF documents and images you upload are temporarily stored to fulfill your print request.</li>
              <li><strong>Payment Information:</strong> We do not store your credit card or bank details. This platform&apos;s payment is secured by Zoho Pay.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-black">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Process and fulfill your printing orders.</li>
              <li>Provide customer support and respond to your requests.</li>
              <li>Send transaction-related communications.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-black">4. Security</h2>
            <p>
              We implement a variety of security measures to maintain the safety of your personal information. Your documents are stored in secure environments and are only accessible by authorized personnel during the fulfillment process.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-black">5. Contact Information</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:<br />
              <strong>Email:</strong> <a href="mailto:printeg.workspace@gmail.com" className="text-blue-600 hover:underline">printeg.workspace@gmail.com</a>
            </p>
          </section>
        </div>

        <div className="flex justify-center">
          <Link href={basePath}>
            <Button variant="outline" className="rounded-xl">Back to Store</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
