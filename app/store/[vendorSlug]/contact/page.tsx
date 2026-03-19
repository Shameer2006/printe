"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Vendor } from "@/lib/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function VendorContact() {
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
      <div className="w-full max-w-[600px] space-y-8">
        <div className="flex flex-col items-center justify-center space-y-2 pt-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-black/20"
            style={{ backgroundColor: vendor?.themeColor || "#000000" }}
          >
            <span className="text-white font-bold text-2xl tracking-tighter">{storeName.charAt(0).toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Contact Us</h1>
          <span className="text-gray-400 text-xs font-medium">Powered by PrintEG</span>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 space-y-8 border border-gray-100">
          <p className="text-gray-600 leading-relaxed">
            We are here to help! If you have any questions, concerns, or feedback regarding your orders at <strong>{storeName}</strong>, please reach out to us. This platform&apos;s payment is secured by Zoho Pay.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Store Name</h3>
              <p className="text-gray-700 font-medium">{storeName}</p>
            </div>

            {vendor?.phone && (
              <div className="space-y-2">
                <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Phone</h3>
                <p className="text-gray-700 font-medium">{vendor.phone}</p>
              </div>
            )}

            {vendor?.email && (
              <div className="space-y-2">
                <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Email Support</h3>
                <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline block">
                  {vendor.email}
                </a>
              </div>
            )}

            {vendor?.address && (
              <div className="space-y-2 md:col-span-2">
                <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Address</h3>
                <p className="text-gray-700 leading-relaxed">{vendor.address}</p>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Platform Support</h3>
              <p className="text-gray-700 leading-relaxed">
                For platform-related issues, contact PrintEG at:<br />
                <a href="mailto:printeg.workspace@gmail.com" className="text-blue-600 hover:underline">printeg.workspace@gmail.com</a>
              </p>
            </div>
          </div>
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
