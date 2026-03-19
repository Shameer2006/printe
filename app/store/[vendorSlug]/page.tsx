"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Vendor } from "@/lib/types";
import { VendorProvider } from "@/lib/vendor-context";
import PrintApp from "@/components/PrintApp";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function VendorStorePage() {
  const params = useParams();
  const vendorSlug = params.vendorSlug as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchVendor() {
      try {
        const vendorDoc = await getDoc(doc(db, "vendors", vendorSlug));
        if (!vendorDoc.exists() || !vendorDoc.data().isActive) {
          setNotFound(true);
        } else {
          setVendor({ ...vendorDoc.data() as Vendor, slug: vendorSlug });
        }
      } catch (error) {
        console.error("Error fetching vendor:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchVendor();
  }, [vendorSlug]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-gray-500 text-sm font-medium">Loading store...</p>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Store Not Found</h1>
          <p className="text-gray-500 max-w-sm">
            The store <strong>&quot;{vendorSlug}&quot;</strong> doesn&apos;t exist or is no longer active.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Go to PrintEG
          </Link>
        </div>
      </main>
    );
  }

  return (
    <VendorProvider vendor={vendor}>
      <PrintApp />
    </VendorProvider>
  );
}
