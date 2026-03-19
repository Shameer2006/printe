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
