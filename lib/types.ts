export interface PriceTier {
  id?: string;
  minPages: number;         // e.g., 1
  maxPages: number | null;  // e.g., 10 (null for 41+)
  bwRate: number;           // Single side B&W (₹)
  doubleSidedRate: number;  // Double sided B&W (₹)
  colorRate?: number;       // Color (₹)
}

export interface SpiralRangeTier {
  id?: string;
  minSheets: number;        // e.g. 1
  maxSheets: number | null; // e.g. 49 (null for 81+)
  price: number;            // e.g. 20
}

export interface BindingItemConfig {
  id: string;               // 'spiral' | 'soft' | 'calico' | 'chart' | custom
  name: string;             // e.g. 'Spiral Binding'
  description?: string;     // e.g. 'Plastic coil with transparent protective covers'
  enabled: boolean;         // Shopkeeper can turn ON/OFF to add/remove
  type: 'tiered' | 'flat' | 'with_without_print';
  tiers?: SpiralRangeTier[]; // For 'tiered' (Spiral)
  flatPrice?: number;       // For 'flat' (Soft)
  withPrintPrice?: number;  // For 'with_without_print' (Calico, Chart)
  withoutPrintPrice?: number;// For 'with_without_print' (Calico, Chart)
}

export interface BindingPricing {
  enabled: boolean;         // Global toggle for store binding services
  items: BindingItemConfig[];
}

export interface VendorPricing {
  bw: number;
  color: number;
  doubleSided: number;
  a4Sheet: number;
  enableTiers?: boolean;
  tiers?: PriceTier[];
  binding?: BindingPricing;
}

export interface Vendor {
  slug: string;
  storeName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  logo?: string;
  themeColor?: string;
  isActive: boolean;
  createdAt: string;
  pricing?: VendorPricing;
}

export interface OrderData {
  orderCode: string;
  mobileNumber: string;
  createdAt: string;
  payment_status: "PENDING" | "PAID" | "FAILED";
  status: string;
  vendorSlug?: string;
  totalPages?: number;
  copies?: number;
  isColor?: boolean;
  printSide?: "single" | "double";
  printLayout?: "1-in-1" | "2-in-1" | "4-in-1";
  bindingId?: string;
  bindingName?: string;
  bindingOption?: string;
  bindingPrice?: number;
  subtotal: number;
  platformFee: number;
  platformFeeRate: number;
  vendorAmount: number;
  amount: number;
  fileUrl: string;
  isA4SheetsOnly?: boolean;
  zoho_payment_link_id?: string;
  zoho_payment_id?: string;
  paid_at?: string;
  paid_via?: string;
}

