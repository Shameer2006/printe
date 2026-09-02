/**
 * Order History Manager using browser localStorage
 */

export interface StoredOrder {
  orderCode: string;
  createdAt: string;
  amount: number;
  mobileNumber: string;
  totalPages?: number;
  copies?: number;
  isColor?: boolean;
  printSide?: "single" | "double";
  printLayout?: "1-in-1" | "2-in-1" | "4-in-1";
  bindingId?: string;
  bindingName?: string;
  bindingOption?: string;
  bindingPrice?: number;
  isA4SheetsOnly?: boolean;
  storeName?: string;
  vendorSlug?: string;
  fileUrl?: string;
  subtotal?: number;
  platformFee?: number;
}

const STORAGE_KEY = "printeg_order_history";

/**
 * Get all stored orders from localStorage (sorted newest first)
 */
export function getOrderHistory(): StoredOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: StoredOrder[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Failed to read order history from localStorage:", error);
    return [];
  }
}

/**
 * Save or update an order in localStorage
 */
export function saveOrderToHistory(order: StoredOrder): void {
  if (typeof window === "undefined" || !order.orderCode) return;
  try {
    const history = getOrderHistory();
    const existingIndex = history.findIndex((o) => o.orderCode === order.orderCode);

    if (existingIndex >= 0) {
      // Update existing record
      history[existingIndex] = { ...history[existingIndex], ...order };
    } else {
      // Add new record to front
      history.unshift(order);
    }

    // Keep max 50 orders in local storage
    const trimmed = history.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to save order to history:", error);
  }
}

/**
 * Remove a specific order from history
 */
export function removeOrderFromHistory(orderCode: string): void {
  if (typeof window === "undefined" || !orderCode) return;
  try {
    const history = getOrderHistory();
    const filtered = history.filter((o) => o.orderCode !== orderCode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove order from history:", error);
  }
}

/**
 * Clear all stored order history
 */
export function clearOrderHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear order history:", error);
  }
}
