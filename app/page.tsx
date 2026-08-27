"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QRScannerLanding from "@/components/QRScannerLanding";
import PrintApp from "@/components/PrintApp";
import { VendorProvider } from "@/lib/vendor-context";

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // If arriving with ?vendor=slug or ?shop=slug, redirect to /store/slug
    const vendorParam = searchParams.get("vendor") || searchParams.get("shop");
    if (vendorParam) {
      router.replace(`/store/${vendorParam}`);
    }
  }, [searchParams, router]);

  // If payment return callback is present on root
  if (searchParams.get("step") === "complete" || searchParams.get("orderCode")) {
    return (
      <VendorProvider vendor={null}>
        <PrintApp />
      </VendorProvider>
    );
  }

  return <QRScannerLanding />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <HomePageContent />
    </Suspense>
  );
}
