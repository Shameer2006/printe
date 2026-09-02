"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileText,
  Layers,
  Sparkles,
  RefreshCw,
  ShoppingBag
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getOrderHistory, removeOrderFromHistory, StoredOrder } from "@/lib/order-history";
import { getOrderDocRef } from "@/lib/orderCode";
import { Button } from "@/components/ui/button";

interface LiveOrderStatus {
  payment_status?: string;
  status?: string;
  amount?: number;
  paid_at?: string;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, LiveOrderStatus>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "delivered">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadingCode, setDownloadingCode] = useState<string | null>(null);

  // Load orders from localStorage
  const loadOrders = useCallback(async () => {
    const stored = getOrderHistory();
    setOrders(stored);
    setIsLoading(false);

    // Fetch latest status from Firestore for each order
    const statusMap: Record<string, LiveOrderStatus> = {};
    await Promise.all(
      stored.map(async (order) => {
        try {
          const orderDocRef = getOrderDocRef(db, order.orderCode, order.vendorSlug);
          let snap = await getDoc(orderDocRef);

          // Fallback check to root orders collection
          if (!snap.exists() && order.vendorSlug) {
            const rootSnap = await getDoc(doc(db, "orders", order.orderCode));
            if (rootSnap.exists()) {
              snap = rootSnap;
            }
          }

          if (snap.exists()) {
            const data = snap.data();
            statusMap[order.orderCode] = {
              payment_status: data.payment_status,
              status: data.status,
              amount: data.amount,
              paid_at: data.paid_at,
            };
          }
        } catch (err) {
          console.warn(`Failed to fetch live status for ${order.orderCode}:`, err);
        }
      })
    );
    setLiveStatuses(statusMap);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setIsRefreshing(false);
    toast.success("Order statuses updated");
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Order Code ${code} copied!`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleDeleteOrder = (code: string) => {
    removeOrderFromHistory(code);
    setOrders((prev) => prev.filter((o) => o.orderCode !== code));
    toast.success(`Order ${code} removed from history`);
  };

  const handleDownloadReceipt = async (order: StoredOrder) => {
    setDownloadingCode(order.orderCode);
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([350, 500]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const orderDate = new Date(order.createdAt);
      const dateStr = orderDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const timeStr = orderDate.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const w = page.getWidth();
      const black = rgb(0, 0, 0);
      const gray = rgb(0.45, 0.45, 0.45);

      // Title
      page.drawText(order.storeName || "PrintEG", { x: 30, y: 460, size: 20, font: fontBold, color: black });

      page.drawLine({ start: { x: 30, y: 425 }, end: { x: w - 30, y: 425 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

      // Order Code
      const orderLabel = "ORDER COLLECTION CODE";
      const labelWidth = fontBold.widthOfTextAtSize(orderLabel, 12);
      page.drawText(orderLabel, { x: (w - labelWidth) / 2, y: 395, size: 12, font: fontBold, color: gray });

      const codeWidth = fontBold.widthOfTextAtSize(order.orderCode, 70);
      page.drawText(order.orderCode, { x: (w - codeWidth) / 2, y: 315, size: 70, font: fontBold, color: black });

      // Details
      let y = 260;
      const dateText = `Date: ${dateStr}`;
      const dateWidth = font.widthOfTextAtSize(dateText, 11);
      page.drawText(dateText, { x: (w - dateWidth) / 2, y, size: 11, font, color: black });

      y -= 18;
      const detailsText = `Time: ${timeStr} | Rs. ${order.amount.toFixed(2)}`;
      const detailsWidth = font.widthOfTextAtSize(detailsText, 11);
      page.drawText(detailsText, { x: (w - detailsWidth) / 2, y, size: 11, font, color: black });

      if (order.mobileNumber) {
        y -= 18;
        const phoneText = `Mobile: +91 ${order.mobileNumber}`;
        const phoneWidth = font.widthOfTextAtSize(phoneText, 11);
        page.drawText(phoneText, { x: (w - phoneWidth) / 2, y, size: 11, font, color: gray });
      }

      // Divider
      page.drawLine({ start: { x: 30, y: y - 20 }, end: { x: w - 30, y: y - 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

      // Footer
      const footerText = "Show this code at the counter to collect your prints.";
      const footerWidth = font.widthOfTextAtSize(footerText, 10);
      page.drawText(footerText, { x: (w - footerWidth) / 2, y: y - 45, size: 10, font, color: gray });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PrintEG_Receipt_${order.orderCode}.pdf`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 100);

      toast.success("Receipt downloaded");
    } catch (err) {
      console.error("Failed to generate receipt:", err);
      toast.error("Failed to generate receipt PDF");
    } finally {
      setDownloadingCode(null);
    }
  };

  // Helper to get status badge config
  const getStatusBadge = (order: StoredOrder) => {
    const live = liveStatuses[order.orderCode];
    const paymentStatus = live?.payment_status || "PENDING";
    const deliveryStatus = live?.status || "pending";

    if (deliveryStatus === "delivered" || deliveryStatus === "completed") {
      return {
        label: "Delivered / Collected",
        className: "bg-green-100 text-green-800 border-green-200",
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        isDelivered: true,
      };
    }

    if (deliveryStatus === "ready") {
      return {
        label: "Ready for Pickup",
        className: "bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse",
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        isDelivered: false,
      };
    }

    if (deliveryStatus === "processing" || deliveryStatus === "printing") {
      return {
        label: "Printing...",
        className: "bg-blue-100 text-blue-800 border-blue-200",
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        isDelivered: false,
      };
    }

    if (paymentStatus === "PAID") {
      return {
        label: "Order Placed / In Queue",
        className: "bg-blue-50 text-blue-700 border-blue-200",
        icon: <Clock className="w-3.5 h-3.5" />,
        isDelivered: false,
      };
    }

    return {
      label: "Payment Pending",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      isDelivered: false,
    };
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    const badge = getStatusBadge(order);
    if (filter === "delivered") return badge.isDelivered;
    if (filter === "active") return !badge.isDelivered;
    return true;
  });

  return (
    <main className="min-h-screen bg-gray-50/50 text-black py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
              <p className="text-xs text-gray-500 font-medium">Saved on this device</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="rounded-xl border-gray-200 text-xs font-semibold gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filter Tabs */}
        {orders.length > 0 && (
          <div className="flex bg-gray-100/80 p-1 rounded-2xl gap-1">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === "all" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === "active" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Active / Ready
            </button>
            <button
              onClick={() => setFilter("delivered")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === "delivered" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Delivered
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500 font-medium">Loading your orders...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && orders.length === 0 && (
          <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-gray-900">No Orders Found</h2>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                Orders you place on this browser will appear here with their collection codes and live status.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-black text-white text-sm font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-md active:scale-95"
            >
              Start New Print
            </Link>
          </div>
        )}

        {/* Orders List */}
        {!isLoading && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const badge = getStatusBadge(order);
              const isCopied = copiedCode === order.orderCode;
              const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={order.orderCode}
                  className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-5 transition-all hover:border-gray-300"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">
                        {order.storeName || "PrintEG Store"}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-400 font-medium">{formattedDate}</span>
                    </div>

                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.className}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>
                  </div>

                  {/* Hero Code Box */}
                  <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                        Collection Code
                      </span>
                      <span className="text-3xl font-black tracking-wider text-gray-900 font-mono">
                        {order.orderCode}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyCode(order.orderCode)}
                      className="h-10 px-4 rounded-xl border-gray-300 bg-white hover:bg-gray-100 font-bold text-xs gap-1.5"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-600" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Specs & Amount */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50/50 p-3.5 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Items</span>
                      <span className="font-semibold text-gray-800">
                        {order.isA4SheetsOnly
                          ? `${order.totalPages || 1} Blank A4 Sheets`
                          : `${order.totalPages || 1} Pages • ${order.isColor ? "Color" : "B&W"} • ${order.copies || 1} Copy`}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-gray-400 block mb-0.5">Amount Paid</span>
                      <span className="font-bold text-sm text-gray-900">
                        ₹{order.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadReceipt(order)}
                      disabled={downloadingCode === order.orderCode}
                      className="flex-1 h-10 rounded-xl border-gray-200 text-xs font-bold gap-1.5 hover:bg-gray-50"
                    >
                      {downloadingCode === order.orderCode ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-gray-600" />
                      )}
                      Download Receipt
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteOrder(order.orderCode)}
                      title="Remove from history"
                      className="h-10 w-10 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
