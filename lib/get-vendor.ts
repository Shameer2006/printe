import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Vendor } from "@/lib/types";

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  try {
    const vendorDoc = await getDoc(doc(db, "vendors", slug));
    if (!vendorDoc.exists()) return null;

    const data = vendorDoc.data() as Vendor;
    if (!data.isActive) return null;

    return { ...data, slug };
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return null;
  }
}
