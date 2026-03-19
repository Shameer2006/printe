"use client";

import PrintApp from "@/components/PrintApp";
import { VendorProvider } from "@/lib/vendor-context";

export default function Home() {
  return (
    <VendorProvider vendor={null}>
      <PrintApp />
    </VendorProvider>
  );
}
