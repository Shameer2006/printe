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
  pricing?: {
    bw: number;
    color: number;
    doubleSided: number;
    a4Sheet: number;
  };
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
  subtotal: number;
  gatewayFee: number;
  gatewayFeeRate: number;
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

