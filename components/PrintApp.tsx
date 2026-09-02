"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { PrintConfig } from "@/components/PrintConfig";
import { Completion } from "@/components/Completion";
import { AIDocumentGenerator } from "@/components/AIDocumentGenerator";
import { QRScanner } from "@/components/QRScanner";
import { Button } from "@/components/ui/button";
import { mergePDFs } from "@/lib/utils";
import { getAvailableShopOrderCode, getOrderDocRef } from "@/lib/orderCode";
import { calculateOrderPricing, getTieredPricePerSheet } from "@/lib/pricing";
import { saveOrderToHistory } from "@/lib/order-history";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { Loader2, ScanLine, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import heroImage from "../app/image.png";
import { useVendor } from "@/lib/vendor-context";
import { InAppBrowserBanner } from "@/components/InAppBrowserBanner";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { BindingSelection } from "@/components/BindingSelection";
import { tryOpenInChrome, isAndroid, isInAppBrowser } from "@/lib/browser-utils";

// --- Razorpay (commented out — kept for reference) ---
// declare global {
//   interface Window {
//     Razorpay: any;
//   }
// }

type Step = "upload" | "config" | "binding" | "complete";
type Mode = "upload" | "ai-doc" | "a4-sheet";

export default function PrintApp() {
  const { vendor, storeName, isPoweredBy } = useVendor();
  const searchParams = useSearchParams();


  const [step, setStep] = useState<Step>("upload");
  const [mode, setMode] = useState<Mode>("upload");
  const [a4Sheets, setA4Sheets] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [printSide, setPrintSide] = useState<"single" | "double">("single");
  const [printLayout, setPrintLayout] = useState<"1-in-1" | "2-in-1" | "4-in-1">("1-in-1");
  const [mobileNumber, setMobileNumber] = useState("");
  const [isColor, setIsColor] = useState(false);
  const [orderCode, setOrderCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAIDoc, setIsAIDoc] = useState(false);
  const [copies, setCopies] = useState(1);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const isSubmittingPaymentRef = useRef(false);

  // Auto-breakout to Chrome on Android if opened via Google Search Webview
  useEffect(() => {
    const urlStep = searchParams.get("step");
    const isPaymentReturn = !!urlStep || !!searchParams.get("orderCode");
    const isDismissed = sessionStorage.getItem("printeg_auto_chrome_attempted");

    if (!isPaymentReturn && !isDismissed && isAndroid() && isInAppBrowser()) {
      sessionStorage.setItem("printeg_auto_chrome_attempted", "true");
      tryOpenInChrome();
    }
  }, [searchParams]);

  // Read URL params set by the payment gateway callback redirect
  // Also handles mobile GPay fallback via Firestore real-time listener & localStorage recovery
  useEffect(() => {
    const urlStep = searchParams.get("step");
    const urlOrderCode = searchParams.get("orderCode");
    const urlError = searchParams.get("error");
    const vendorSlug = vendor?.slug;

    if (urlStep === "complete" && urlOrderCode) {
      // Normal redirect worked — show Completion and clean up
      setOrderCode(urlOrderCode);
      setStep("complete");
      const savedLinkId = localStorage.getItem("printeg_payment_link_id") || "";
      localStorage.removeItem("printeg_pending_order");
      localStorage.removeItem("printeg_payment_link_id");
      localStorage.removeItem("printeg_pending_time");
      window.history.replaceState({}, "", window.location.pathname);

      // Client-side fallback: directly update Firestore in case server-side Admin SDK failed
      (async () => {
        try {
          const orderRef = getOrderDocRef(db, urlOrderCode, vendorSlug);
          let snap = await getDoc(orderRef);
          let targetRef = orderRef;

          // Backwards compatibility fallback to root orders collection
          if (!snap.exists() && vendorSlug) {
            const rootRef = doc(db, "orders", urlOrderCode);
            const rootSnap = await getDoc(rootRef);
            if (rootSnap.exists()) {
              snap = rootSnap;
              targetRef = rootRef;
            }
          }

          if (snap.exists() && snap.data()?.payment_status !== "PAID") {
            await updateDoc(targetRef, {
              payment_status: "PAID",
              paid_at: new Date().toISOString(),
              paid_via: "client_fallback",
            });
            console.log(`Client fallback: Order ${urlOrderCode} marked as PAID`);
          }
        } catch (err) {
          console.warn("Client fallback Firestore update failed:", err);
        }
      })();

      // Also verify payment & update DB via server-side Admin SDK
      fetch("/api/zoho/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCode: urlOrderCode, paymentLinkId: savedLinkId, vendorSlug }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.verified) {
            console.warn("Server verify-payment returned not verified:", data);
          }
        })
        .catch((err) => console.error("Verify payment call failed:", err));

      return;
    }

    if (urlStep === "payment" && urlError) {
      toast.error(urlError);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    // --- Mobile GPay / PhonePe / WebView recovery via persistent localStorage ---
    const pendingCode = localStorage.getItem("printeg_pending_order");
    const pendingTime = parseInt(localStorage.getItem("printeg_pending_time") || "0");
    const isRecent = Date.now() - pendingTime < 15 * 60 * 1000; // 15 min TTL

    if (pendingCode && isRecent) {
      const savedLinkId = localStorage.getItem("printeg_payment_link_id") || "";

      const verifyPendingOrder = async () => {
        try {
          const targetOrderRef = getOrderDocRef(db, pendingCode, vendorSlug);
          let snap = await getDoc(targetOrderRef);
          if (!snap.exists() && vendorSlug) {
            const rootSnap = await getDoc(doc(db, "orders", pendingCode));
            if (rootSnap.exists()) snap = rootSnap;
          }

          if (snap.exists() && snap.data()?.payment_status === "PAID") {
            setOrderCode(pendingCode);
            setStep("complete");
            localStorage.removeItem("printeg_pending_order");
            localStorage.removeItem("printeg_payment_link_id");
            localStorage.removeItem("printeg_pending_time");
            return;
          }

          const res = await fetch("/api/zoho/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderCode: pendingCode, paymentLinkId: savedLinkId, vendorSlug }),
          });
          const data = await res.json();
          if (data.verified || data.paymentStatus === "PAID") {
            setOrderCode(pendingCode);
            setStep("complete");
            localStorage.removeItem("printeg_pending_order");
            localStorage.removeItem("printeg_payment_link_id");
            localStorage.removeItem("printeg_pending_time");
          }
        } catch (err) {
          console.warn("Background order verification check failed:", err);
        }
      };

      verifyPendingOrder();

      const targetOrderRef = getOrderDocRef(db, pendingCode, vendorSlug);
      const unsubscribe = onSnapshot(targetOrderRef, (snapshot) => {
        if (snapshot.exists() && snapshot.data()?.payment_status === "PAID") {
          setOrderCode(pendingCode);
          setStep("complete");
          localStorage.removeItem("printeg_pending_order");
          localStorage.removeItem("printeg_payment_link_id");
          localStorage.removeItem("printeg_pending_time");
          unsubscribe();
        }
      });

      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          verifyPendingOrder();
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleVisibilityChange);

      return () => {
        unsubscribe();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("focus", handleVisibilityChange);
      };
    } else if (pendingCode && !isRecent) {
      localStorage.removeItem("printeg_pending_order");
      localStorage.removeItem("printeg_payment_link_id");
      localStorage.removeItem("printeg_pending_time");
    }
  }, [vendor?.slug, searchParams]);

  // --- Razorpay checkout helper (commented out — kept for reference) ---
  // const openRazorpayCheckout = async (code: string, amount: number, mobile: string) => {
  //   const response = await fetch("/api/razorpay/create-order", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       orderCode: code,
  //       amount,
  //       mobileNumber: mobile,
  //     }),
  //   });
  //   const data = await response.json();
  //   if (!data.orderId) {
  //     throw new Error(data.error || "Failed to create payment order");
  //   }
  //   return new Promise<void>((resolve, reject) => {
  //     const options = {
  //       key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  //       amount: data.amount,
  //       currency: data.currency,
  //       name: storeName,
  //       description: `Order ${code}`,
  //       order_id: data.orderId,
  //       handler: async (response: any) => {
  //         try {
  //           const verifyRes = await fetch("/api/razorpay/verify", {
  //             method: "POST",
  //             headers: { "Content-Type": "application/json" },
  //             body: JSON.stringify({
  //               razorpay_order_id: response.razorpay_order_id,
  //               razorpay_payment_id: response.razorpay_payment_id,
  //               razorpay_signature: response.razorpay_signature,
  //               orderCode: code,
  //             }),
  //           });
  //           const verifyData = await verifyRes.json();
  //           if (verifyData.success) {
  //             resolve();
  //           } else {
  //             reject(new Error("Payment verification failed"));
  //           }
  //         } catch (err) {
  //           reject(err);
  //         }
  //       },
  //       prefill: { contact: mobile },
  //       theme: { color: vendor?.themeColor || "#000000" },
  //       modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
  //     };
  //     const rzp = new window.Razorpay(options);
  //     rzp.open();
  //   });
  // };

  // Zoho Payments helper — creates a payment link and redirects user
  const openZohoPayment = async (code: string, amount: number, mobile: string) => {
    const response = await fetch("/api/zoho/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderCode: code,
        amount,
        mobileNumber: mobile,
        vendorSlug: vendor?.slug,
      }),
    });

    const data = await response.json();

    if (!data.paymentUrl) {
      throw new Error(data.error || "Failed to create payment link");
    }

    // Save orderCode and paymentLinkId in localStorage for bulletproof cross-app persistence
    localStorage.setItem("printeg_pending_order", code);
    localStorage.setItem("printeg_pending_time", String(Date.now()));
    if (data.paymentLinkId) {
      localStorage.setItem("printeg_payment_link_id", data.paymentLinkId);
    }

    // Redirect user to Zoho's hosted payment page
    window.location.href = data.paymentUrl;
  };

  // Background upload ref
  const uploadPromiseRef = useRef<Promise<string> | null>(null);

  // Pricing logic
  const pagesPerSide = printLayout === "2-in-1" ? 2 : 1;
  const sidesPerSheet = printSide === "double" ? 2 : 1;
  const sheetsToPrint = Math.ceil(totalPages / (pagesPerSide * sidesPerSheet));
  const totalSheetsToPrint = sheetsToPrint * copies;

  const pricing = vendor?.pricing;
  const tieredResult = getTieredPricePerSheet(totalSheetsToPrint, {
    isColor,
    printSide,
    pricing,
  });
  const pricePerSheet = tieredResult.rate;
  const aiCharge = isAIDoc ? 3 : 0;
  const basePrintSubtotal = (totalSheetsToPrint * pricePerSheet) + aiCharge;
  const printPricing = calculateOrderPricing(basePrintSubtotal, { applyPlatformFee: true });
  const totalCost = basePrintSubtotal; // Pure shop base total for visual preview on page!

  const handleFilesChange = (newFiles: File[], pages: number) => {
    setFiles(newFiles);
    setTotalPages(pages);
  };

  const handleConfigChange = (config: {
    mobileNumber: string;
    isColor: boolean;
    printSide: "single" | "double";
    printLayout: "1-in-1" | "2-in-1" | "4-in-1";
  }) => {
    setMobileNumber(config.mobileNumber);
    setIsColor(config.isColor);
    setPrintSide(config.printSide);
    setPrintLayout(config.printLayout);
  };

  const canProceedToPayment = () => {
    return files.length > 0 && mobileNumber.length === 10 && totalPages > 0;
  };

  const handleContinue = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      const code = await getAvailableShopOrderCode(db, vendor?.slug);
      setOrderCode(code);
      setIsAIDoc(false);
      setStep("config");

      uploadPromiseRef.current = (async () => {
        try {
          const mergedPdf = await mergePDFs(files);
          const storageRef = ref(storage, `orders/${code}_${Date.now()}.pdf`);
          await uploadBytes(storageRef, mergedPdf);
          const url = await getDownloadURL(storageRef);
          return url;
        } catch (error) {
          throw error;
        }
      })();
    } catch (error) {
      console.error("Failed to initialize shop order session:", error);
      toast.error("Failed to start order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIProceed = async (blob: Blob, pages: number) => {
    setIsProcessing(true);
    try {
      const code = await getAvailableShopOrderCode(db, vendor?.slug);
      setOrderCode(code);
      setIsAIDoc(true);
      setStep("config");
      setTotalPages(pages);

      const file = new File([blob], "AI_Document.pdf", { type: "application/pdf" });
      setFiles([file]);

      uploadPromiseRef.current = (async () => {
        try {
          const storageRef = ref(storage, `orders/${code}_${Date.now()}.pdf`);
          await uploadBytes(storageRef, blob);
          const url = await getDownloadURL(storageRef);
          return url;
        } catch (error) {
          console.error("AI PDF upload failed:", error);
          throw error;
        } finally {
          setIsProcessing(false);
        }
      })();
    } catch (error) {
      console.error("Failed to start AI order session:", error);
      toast.error("Failed to start AI order. Please try again.");
      setIsProcessing(false);
    }
  };

  const buildOrderData = (code: string, extra: Record<string, any>) => {
    const base: Record<string, any> = {
      orderCode: code,
      mobileNumber,
      createdAt: new Date().toISOString(),
      payment_status: "PENDING",
      status: "pending",
      ...extra,
    };
    if (vendor?.slug) {
      base.vendorSlug = vendor.slug;
    }
    return base;
  };

  const handlePayment = async (bindingData?: {
    bindingId: string;
    bindingName: string;
    bindingOption: "standard" | "with_print" | "without_print";
    bindingPrice: number;
    totalAmount: number;
  }) => {
    if (!canProceedToPayment()) {
      toast.error("Please complete all fields before proceeding");
      return;
    }

    if (isSubmittingPaymentRef.current || isProcessing) return;
    isSubmittingPaymentRef.current = true;
    setIsProcessing(true);

    try {
      if (!uploadPromiseRef.current) {
        toast.error("File upload not started. Please try again.");
        setIsProcessing(false);
        return;
      }

      let fileUrl: string;
      try {
        fileUrl = await uploadPromiseRef.current;
      } catch (uploadError) {
        toast.error("Failed to upload file. Please try again.");
        setIsProcessing(false);
        return;
      }

      if (!orderCode) {
        throw new Error("Invalid order session. Please refresh and try again.");
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firestore write timeout after 30 seconds.')), 30000);
      });

      const selectedBinding = bindingData || {
        bindingId: "none",
        bindingName: "None (Loose Sheets)",
        bindingOption: "none" as const,
        bindingPrice: 0,
        totalAmount: printPricing.totalAmount,
      };

      const finalSubtotal = basePrintSubtotal + selectedBinding.bindingPrice;
      const finalPricing = calculateOrderPricing(finalSubtotal, { applyPlatformFee: true });

      const orderDocRef = getOrderDocRef(db, orderCode, vendor?.slug);
      const writePromise = setDoc(orderDocRef, buildOrderData(orderCode, {
        totalPages,
        copies,
        isColor,
        printSide,
        printLayout,
        bindingId: selectedBinding.bindingId,
        bindingName: selectedBinding.bindingName,
        bindingOption: selectedBinding.bindingOption,
        bindingPrice: selectedBinding.bindingPrice,
        subtotal: finalPricing.subtotal,
        platformFee: finalPricing.platformFee,
        platformFeeRate: finalPricing.platformFeeRate,
        vendorAmount: finalPricing.vendorAmount,
        amount: finalPricing.totalAmount,
        fileUrl,
      }));

      await Promise.race([writePromise, timeoutPromise]);

      // Save to local storage order history
      saveOrderToHistory({
        orderCode,
        createdAt: new Date().toISOString(),
        amount: finalPricing.totalAmount,
        mobileNumber,
        totalPages,
        copies,
        isColor,
        printSide,
        printLayout,
        bindingId: selectedBinding.bindingId,
        bindingName: selectedBinding.bindingName,
        bindingOption: selectedBinding.bindingOption,
        bindingPrice: selectedBinding.bindingPrice,
        storeName,
        vendorSlug: vendor?.slug,
        fileUrl,
        subtotal: finalPricing.subtotal,
        platformFee: finalPricing.platformFee,
      });

      // Pass final payment amount (with platform fee applied on checkout) to Zoho
      await openZohoPayment(orderCode, finalPricing.totalAmount, mobileNumber);
    } catch (error: any) {
      if (error.message !== "Payment cancelled") {
        toast.error("Failed to process order. Please try again.");
      }
      setIsProcessing(false);
    } finally {
      isSubmittingPaymentRef.current = false;
    }
  };

  const handleA4Payment = async () => {
    if (mobileNumber.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (a4Sheets < 1) {
      toast.error("Please enter a valid number of sheets");
      return;
    }

    if (isSubmittingPaymentRef.current || isProcessing) return;
    isSubmittingPaymentRef.current = true;
    setIsProcessing(true);

    try {
      const code = await getAvailableShopOrderCode(db, vendor?.slug);
      setOrderCode(code);
      const a4Price = pricing?.a4Sheet ?? 1;
      const a4Subtotal = a4Sheets * a4Price;
      const a4Pricing = calculateOrderPricing(a4Subtotal, { applyPlatformFee: true });

      const orderDocRef = getOrderDocRef(db, code, vendor?.slug);
      const writePromise = setDoc(orderDocRef, buildOrderData(code, {
        totalPages: a4Sheets,
        copies: 1,
        isColor: false,
        printSide: "single",
        printLayout: "1-in-1",
        subtotal: a4Pricing.subtotal,
        platformFee: a4Pricing.platformFee,
        platformFeeRate: a4Pricing.platformFeeRate,
        vendorAmount: a4Pricing.vendorAmount,
        amount: a4Pricing.totalAmount,
        fileUrl: "EMPTY_A4_SHEET",
        isA4SheetsOnly: true,
      }));

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000));
      await Promise.race([writePromise, timeoutPromise]);

      // Save to local storage order history
      saveOrderToHistory({
        orderCode: code,
        createdAt: new Date().toISOString(),
        amount: a4Pricing.totalAmount,
        mobileNumber,
        totalPages: a4Sheets,
        copies: 1,
        isColor: false,
        printSide: "single",
        printLayout: "1-in-1",
        isA4SheetsOnly: true,
        storeName,
        vendorSlug: vendor?.slug,
        subtotal: a4Pricing.subtotal,
        platformFee: a4Pricing.platformFee,
      });

      // await openRazorpayCheckout(code, a4Pricing.totalAmount, mobileNumber); // Razorpay (commented out)
      await openZohoPayment(code, a4Pricing.totalAmount, mobileNumber);

      // Note: setStep("complete") will happen after user returns from Zoho via callback redirect
      // setStep("complete");
    } catch (error: any) {
      if (error.message !== "Payment cancelled") {
        toast.error("Failed to process order.");
      }
      setIsProcessing(false);
    } finally {
      isSubmittingPaymentRef.current = false;
    }
  };

  // Base path for links — vendor-aware
  const basePath = vendor?.slug ? `/store/${vendor.slug}` : "";

  return (
    <main className="min-h-screen bg-transparent text-black flex flex-col relative">
      <InAppBrowserBanner />
      {/* QR Scanner Modal */}
      {showQRScanner && <QRScanner onClose={() => setShowQRScanner(false)} />}
      <div className="flex-1 flex flex-col justify-center items-center py-12 px-2">
        <div className={`w-full transition-all duration-500 ${step === 'upload' ? 'max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-0 items-center' : 'max-w-[400px]'}`}>

          {/* Left/Main Column */}
          <div className={`w-full max-w-[400px] mx-auto space-y-8 ${step === 'upload' ? 'order-1' : ''}`}>
            {/* Header */}
            <div className="flex flex-col items-center justify-center space-y-2 pt-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-black/20"
                style={{ backgroundColor: vendor?.themeColor || "#000000" }}
              >
                <span className="text-white font-bold text-2xl tracking-tighter">
                  {storeName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{storeName}</h1>
              {isPoweredBy ? (
                <span className="text-gray-400 text-xs font-medium">Powered by PrintEG</span>
              ) : (
                <h3 className="font-semibold text-lg">Print. Easy. Go</h3>
              )}
              {/* Action Buttons: QR Scanner & My Orders */}
              {step === "upload" && (
                <div className="flex items-center gap-2 pt-2">
                  {!isPoweredBy && (
                    <button
                      onClick={() => setShowQRScanner(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-semibold hover:bg-gray-800 active:scale-[0.97] transition-all shadow-md shadow-black/10"
                    >
                      <ScanLine className="h-3.5 w-3.5" />
                      Scan QR
                    </button>
                  )}
                  <Link
                    href="/orders"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-xl text-xs font-semibold hover:bg-gray-200 active:scale-[0.97] transition-all border border-gray-200"
                  >
                    <Clock className="h-3.5 w-3.5 text-gray-600" />
                    My Orders
                  </Link>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
              {step === "upload" && (
                <div className="space-y-6">
                  {/* Mode Toggle */}
                  <div className="flex items-center justify-center">
                    <div className="inline-flex bg-gray-100 rounded-2xl p-1 gap-1">
                      <button
                        onClick={() => setMode("upload")}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${mode === "upload"
                          ? "bg-white text-black shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                          }`}
                      >
                        📄 Upload PDF
                      </button>
                      <button
                        onClick={() => setMode("a4-sheet")}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${mode === "a4-sheet"
                          ? "bg-white text-black shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                          }`}
                      >
                        📝 A4 Blank Sheets
                      </button>
                    </div>
                  </div>

                  {/* Content based on mode */}
                  {mode === "upload" && (
                    <FileUpload onFilesChange={handleFilesChange} onContinue={handleContinue} totalPages={totalPages} />
                  )}
                  {mode === "a4-sheet" && (
                    <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Number of A4 Sheets (₹{pricing?.a4Sheet ?? 1} per sheet)</label>
                          <input
                            type="number"
                            min={1}
                            value={a4Sheets || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setA4Sheets(0);
                              } else {
                                setA4Sheets(parseInt(val) || 1);
                              }
                            }}
                            onBlur={() => {
                              if (a4Sheets < 1) setA4Sheets(1);
                            }}
                            className="w-full h-12 rounded-xl bg-white border border-gray-200 px-4 focus:ring-black focus:border-black outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Mobile Number *</label>
                          <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-black transition-all">
                            <div className="flex items-center justify-center px-4 bg-gray-50 border-r border-gray-200 text-gray-500 font-medium">
                              +91
                            </div>
                            <input
                              type="tel"
                              maxLength={10}
                              value={mobileNumber}
                              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                              placeholder="10-digit mobile number"
                              className="w-full h-12 bg-transparent px-4 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {a4Sheets >= 1 && (
                        <div className="bg-white rounded-xl p-4 space-y-2 border border-gray-200">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Sheets ({a4Sheets} × ₹{(pricing?.a4Sheet ?? 1).toFixed(2)})</span>
                            <span className="font-bold text-gray-900">₹{((a4Sheets || 0) * (pricing?.a4Sheet ?? 1)).toFixed(2)}</span>
                          </div>
                          <div className="h-px bg-gray-100 my-1" />
                          <div className="flex justify-between items-center text-base font-bold">
                            <span>Total Pay</span>
                            <span>₹{((a4Sheets || 0) * (pricing?.a4Sheet ?? 1)).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <Button
                          onClick={handleA4Payment}
                          disabled={mobileNumber.length !== 10 || isProcessing || a4Sheets < 1}
                          className="w-full h-14 text-lg font-bold rounded-2xl bg-black hover:bg-gray-800 text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Processing...
                            </span>
                          ) : (
                            `Pay ₹${((a4Sheets || 0) * (pricing?.a4Sheet ?? 1)).toFixed(2)}`
                          )}
                        </Button>
                        <p className="text-xs text-center text-gray-500 font-medium">
                          Note: You are purchasing plain, unprinted A4 sheets.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === "config" && (
                <PrintConfig
                  file={files.length > 0 ? files[0] : null}
                  totalPages={totalPages}
                  subtotal={printPricing.subtotal}
                  platformFee={printPricing.platformFee}
                  totalCost={totalCost}
                  pricePerSheet={pricePerSheet}
                  tierLabel={tieredResult.tierLabel}
                  isDiscounted={tieredResult.isDiscounted}
                  nextTierHint={tieredResult.nextTierHint}
                  sheetsToPrint={sheetsToPrint}
                  isAIDoc={isAIDoc}
                  copies={copies}
                  onCopiesChange={setCopies}
                  onConfigChange={handleConfigChange}
                  onBack={() => setStep("upload")}
                  onContinueToBinding={() => setStep("binding")}
                  hasBindingServices={vendor?.pricing?.binding?.enabled !== false}
                  onPayment={() => handlePayment()}
                  canProceed={canProceedToPayment()}
                  isProcessing={isProcessing}
                />
              )}

              {step === "binding" && (
                <BindingSelection
                  totalSheets={totalSheetsToPrint}
                  printSubtotal={basePrintSubtotal}
                  platformFee={printPricing.platformFee}
                  bindingConfig={vendor?.pricing?.binding}
                  onBack={() => setStep("config")}
                  onConfirm={(data) => handlePayment(data)}
                  isProcessing={isProcessing}
                />
              )}

              {step === "complete" && (
                <Completion
                  orderCode={orderCode}
                  mobileNumber={mobileNumber}
                  totalCost={totalCost}
                />
              )}
            </div>
          </div>

          {/* Right Column: Hero Image & Instructions (Only on Upload Step) */}
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center space-y-8 order-2 animate-in fade-in slide-in-from-right-8 duration-700">
              {/* Hero Image */}
              <div className="relative w-full max-w-md aspect-square">
                <Image
                  src={heroImage}
                  alt="Print Smart"
                  fill
                  sizes="(max-width: 768px) 100vw, 448px"
                  className="object-contain"
                  priority
                  placeholder="blur"
                />
              </div>
              {/* Slogan */}
              <h2 className="text-3xl font-bold tracking-tight text-center">Print smart. Print fast.</h2>

              {/* Instructions */}
              <div className="bg-gray-50 p-6 rounded-2xl w-full max-w-md space-y-4 border border-gray-100">
                <h3 className="font-semibold text-lg">How it works</h3>
                <ol className="space-y-4 text-gray-600">
                  <li className="flex gap-4 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold mt-0.5">1</span>
                    <span>Upload your PDF documents</span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold mt-0.5">2</span>
                    <span>Configure print settings (B&W/Color)</span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold mt-0.5">3</span>
                    <span>Pay securely & get your collection code</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      {step !== "complete" && (
        <footer className="w-full py-6 flex flex-col items-center gap-4 mt-auto border-t border-gray-100 bg-white/50 backdrop-blur-sm">
          {isPoweredBy && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 bg-black rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">P</span>
              </div>
              <span className="text-xs font-semibold text-gray-500">Powered by PrintEG</span>
            </div>
          )}
          <p className="text-center text-xs text-gray-400 font-medium">
            Simple • Fast • Secure
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
            <Link href="/orders" className="hover:text-black transition-colors font-semibold text-gray-600">
              My Orders
            </Link>
            <Link href="/about" className="hover:text-black transition-colors">
              About
            </Link>
            <Link href={basePath ? `${basePath}/contact` : "/contact"} className="hover:text-black transition-colors">
              Contact
            </Link>
            <Link href={basePath ? `${basePath}/privacy` : "/privacy"} className="hover:text-black transition-colors">
              Privacy
            </Link>
            <Link href={basePath ? `${basePath}/refund` : "/refund"} className="hover:text-black transition-colors">
              Refund
            </Link>
            <Link href={basePath ? `${basePath}/terms` : "/terms"} className="hover:text-black transition-colors">
              Terms
            </Link>
          </div>
        </footer>
      )}
      <PWAInstallPrompt storeName={storeName} />
    </main>
  );
}

export { PrintApp };
