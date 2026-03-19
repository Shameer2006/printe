"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Vendor } from "@/lib/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function VendorTerms() {
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
          <h1 className="text-2xl font-bold tracking-tight">Terms and Conditions</h1>
          <span className="text-gray-400 text-xs font-medium">Powered by PrintEG</span>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 space-y-6 border border-gray-100 text-sm text-gray-700 leading-relaxed text-left">
          <p>
            This document is an electronic record in terms of Information Technology Act, 2000 and rules there under as applicable and the amended provisions pertaining to electronic records in various statutes as amended by the Information Technology Act, 2000.
          </p>
          <p>
            This document is published in accordance with the provisions of Rule 3 (1) of the Information Technology (Intermediaries guidelines) Rules, 2011 that require publishing the rules and regulations, privacy policy and Terms of Use for access or usage of domain name <strong>https://printeg.in/</strong> (&apos;Website&apos;), including the related mobile site and mobile application (hereinafter referred to as &apos;Platform&apos;).
          </p>
          <p>
            The Platform is owned by <strong>Ramsee Ventures</strong> (Contact: 9944563016) with its registered office at <strong>Chennai</strong>. The store <strong>{storeName}</strong> operates on this Platform powered by PrintEG.
          </p>
          <p>
            Your use of the Platform and services and tools are governed by the following terms and conditions (&ldquo;Terms of Use&rdquo;). These Terms of Use relate to your use of our website, A4 sheet dispenser services, goods (as applicable) or printing services (as applicable) (collectively, &apos;Services&apos;).
          </p>
          <p className="font-bold uppercase text-black text-xs md:text-sm tracking-wide">
            ACCESSING, BROWSING OR OTHERWISE USING THE PLATFORM INDICATES YOUR AGREEMENT TO ALL THE TERMS AND CONDITIONS UNDER THESE TERMS OF USE, SO PLEASE READ THE TERMS OF USE CAREFULLY BEFORE PROCEEDING.
          </p>
          <ol className="list-decimal pl-5 space-y-3">
            <li>To access and use the Services, you agree to provide true, accurate and complete information to us during and after registration.</li>
            <li>Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials offered on this website or through the Services, for any specific purpose.</li>
            <li>Your use of our Services and the Platform is solely and entirely at your own risk and discretion.</li>
            <li>The contents of the Platform and the Services are proprietary to us and are licensed to us.</li>
            <li>You acknowledge that unauthorized use of the Platform and/or the Services may lead to action against you.</li>
            <li>You agree to pay us the charges associated with availing the Services. This platform&apos;s payment is secured by Zoho Pay.</li>
            <li>You agree not to use the Platform and/or Services for any purpose that is unlawful, illegal or forbidden.</li>
            <li>These Terms and any dispute or claim shall be governed by and construed in accordance with the laws of India.</li>
            <li>All disputes shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu.</li>
          </ol>
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
