import { Firestore, doc, getDoc, setDoc } from "firebase/firestore";

export const ABANDONED_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Generates a random 4-digit numeric code between 1000 and 9999
 */
export function generateRandom4Digit(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Checks if an existing order document in Firestore is considered available for recycling.
 * A code can be reused if:
 * 1. Document does not exist (null/undefined)
 * 2. Print job is completed (status === 'completed' or printedStatus === 'Success')
 * 3. Order is abandoned (payment_status !== 'PAID' AND createdAt is older than 20 mins)
 */
export function isOrderCodeAvailable(orderData?: Record<string, any> | null): boolean {
  if (!orderData) return true;

  // 1. If already printed / completed -> Available to reuse
  if (orderData.status === "completed" || orderData.printedStatus === "Success") {
    return true;
  }

  // 2. If paid and waiting for physical print -> Busy, NEVER reuse
  if (orderData.payment_status === "PAID") {
    return false;
  }

  // 3. If pending / holding / unpaid -> Check if older than 20 minutes deadline
  if (orderData.createdAt) {
    const createdTime = new Date(orderData.createdAt).getTime();
    if (!isNaN(createdTime)) {
      const ageMs = Date.now() - createdTime;
      if (ageMs > ABANDONED_TIMEOUT_MS) {
        return true; // Abandoned > 20 minutes, safe to reclaim
      }
    }
  }

  return false; // Still within active reservation window
}

/**
 * Helper to get the Firestore document reference for an order (shop-scoped or root fallback)
 */
export function getOrderDocRef(db: Firestore, orderCode: string, shopSlug?: string) {
  if (shopSlug) {
    return doc(db, "vendors", shopSlug, "orders", orderCode);
  }
  return doc(db, "orders", orderCode);
}

/**
 * Finds, verifies, and reserves an available 4-digit order code for the specified shop in Firestore.
 * Ensures the code does not collide with active prints and recycles completed or expired (>20 min) codes.
 */
export async function getAvailableShopOrderCode(
  db: Firestore,
  shopSlug?: string
): Promise<string> {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateCode = generateRandom4Digit();
    const orderDocRef = getOrderDocRef(db, candidateCode, shopSlug);

    try {
      const snap = await getDoc(orderDocRef);

      if (!snap.exists() || isOrderCodeAvailable(snap.data())) {
        // Reserve the code in Firestore immediately with a 20-minute holding status
        const reservationData: Record<string, any> = {
          orderCode: candidateCode,
          status: "holding",
          payment_status: "PENDING",
          createdAt: new Date().toISOString(),
          reservedUntil: new Date(Date.now() + ABANDONED_TIMEOUT_MS).toISOString(),
        };
        if (shopSlug) {
          reservationData.vendorSlug = shopSlug;
        }

        await setDoc(orderDocRef, reservationData);
        return candidateCode;
      }
    } catch (error) {
      console.warn(`[getAvailableShopOrderCode] Check failed for ${candidateCode} (Shop: ${shopSlug}):`, error);
      // Fallback: return candidate to avoid blocking user checkout flow if Firestore read fails
      return candidateCode;
    }
  }

  // Fallback after maxAttempts
  return generateRandom4Digit();
}
