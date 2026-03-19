"use client";

import { createContext, useContext, ReactNode } from "react";
import { Vendor } from "./types";

interface VendorContextType {
  vendor: Vendor | null;
  storeName: string;
  isPoweredBy: boolean; // true when viewing a vendor store (not root)
}

const VendorContext = createContext<VendorContextType>({
  vendor: null,
  storeName: "PrintEG",
  isPoweredBy: false,
});

export function VendorProvider({
  vendor,
  children,
}: {
  vendor: Vendor | null;
  children: ReactNode;
}) {
  const value: VendorContextType = {
    vendor,
    storeName: vendor?.storeName || "PrintEG",
    isPoweredBy: !!vendor,
  };

  return (
    <VendorContext.Provider value={value}>{children}</VendorContext.Provider>
  );
}

export function useVendor() {
  return useContext(VendorContext);
}
