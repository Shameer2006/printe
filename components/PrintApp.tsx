"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { PrintConfig } from "@/components/PrintConfig";
import { Completion } from "@/components/Completion";
import { AIDocumentGenerator } from "@/components/AIDocumentGenerator";
import { QRScanner } from "@/components/QRScanner";
import { Button } from "@/components/ui/button";
import { mergePDFs, generateOrderCode } from "@/lib/utils";
import { calculateOrderPricing } from "@/lib/pricing";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { Loader2, ScanLine } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import heroImage from "../app/image.png";
import { useVendor } from "@/lib/vendor-context";

// --- Razorpay (commented out — kept for reference) ---
// declare global {
//   interface Window {
//     Razorpay: any;
//   }
// }

type Step = "upload" | "config" | "payment" | "complete";
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

  // Read URL params set by the payment gateway callback redirect
  // Also handles mobile GPay fallback & session persistence across refreshes
  useEffect(() => {
    const urlStep = searchParams.get("step");
    const urlOrderCode = searchParams.get("orderCode");
    const urlError = searchParams.get("error");

    if (urlStep === "complete" && urlOrderCode) {
      // Normal redirect worked — show Completion, save to session, and clean up URL
      setOrderCode(urlOrderCode);
      setStep("complete");
      sessionStorage.setItem("printeg_completed_order", urlOrderCode);
      const savedLinkId = sessionStorage.getItem("printeg_payment_link_id") || "";
      sessionStorage.removeItem("printeg_pending_order");
      sessionStorage.removeItem("printeg_payment_link_id");
      window.history.replaceState({}, "", window.location.pathname);

      // Verify payment & update DB via server-side Admin SDK
      fetch("/api/zoho/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCode: urlOrderCode, paymentLinkId: savedLinkId }),
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

    // Check if user previously completed an order (persists across page reloads)
    const savedCompletedOrder = sessionStorage.getItem("printeg_completed_order");
    if (savedCompletedOrder) {
      setOrderCode(savedCompletedOrder);
      setStep("complete");
      return;
    }

    // --- Mobile GPay fallback ---
    // On mobile, GPay opens as a native app. When it returns to the browser,
    // Zoho's success page redirect often doesn't fire. We save the orderCode
    // to sessionStorage before leaving, then listen to Firestore here.
    const pendingCode = sessionStorage.getItem("printeg_pending_order");
    if (pendingCode) {
      // Actively verify with server first
      const savedLinkId = sessionStorage.getItem("printeg_payment_link_id") || "";
      fetch("/api/zoho/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCode: pendingCode, paymentLinkId: savedLinkId }),
      }).catch(() => {});

      // Then listen for the PAID status update in Firestore
      const unsubscribe = onSnapshot(doc(db, "orders", pendingCode), (snapshot) => {
        if (snapshot.exists() && snapshot.data()?.payment_status === "PAID") {
          setOrderCode(pendingCode);
          setStep("complete");
          sessionStorage.setItem("printeg_completed_order", pendingCode);
          sessionStorage.removeItem("printeg_pending_order");
          sessionStorage.removeItem("printeg_payment_link_id");
          unsubscribe();
        }
      });
      return unsubscribe; // Clean up listener on unmount
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      }),
    });

    const data = await response.json();

    if (!data.paymentUrl) {
      throw new Error(data.error || "Failed to create payment link");
    }

    // Save orderCode and paymentLinkId for verification after return
    sessionStorage.setItem("printeg_pending_order", code);
    if (data.paymentLinkId) {
      sessionStorage.setItem("printeg_payment_link_id", data.paymentLinkId);
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

  const pricing = vendor?.pricing;
  const pricePerSheet = isColor
    ? (pricing?.color ?? 10)
    : (printSide === "double" ? (pricing?.doubleSided ?? 2) : (pricing?.bw ?? 1.5));
  const aiCharge = isAIDoc ? 3 : 0;
  const basePrintSubtotal = (sheetsToPrint * pricePerSheet * copies) + aiCharge;
  const printPricing = calculateOrderPricing(basePrintSubtotal, { applyPlatformFee: true });
  const totalCost = printPricing.totalAmount;

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

    setIsAIDoc(false);
    setStep("config");

    const code = generateOrderCode();
    setOrderCode(code);

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
  };

  const handleAIProceed = async (blob: Blob, pages: number) => {
    setIsProcessing(true);
    setIsAIDoc(true);
    setStep("config");
    setTotalPages(pages);

    const code = generateOrderCode();
    setOrderCode(code);

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

  const handlePayment = async () => {
    if (!canProceedToPayment()) {
      toast.error("Please complete all fields before proceeding");
      return;
    }

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

      const writePromise = setDoc(doc(db, "orders", orderCode), buildOrderData(orderCode, {
        totalPages,
        copies,
        isColor,
        printSide,
        printLayout,
        subtotal: printPricing.subtotal,
        platformFee: printPricing.platformFee,
        platformFeeRate: printPricing.platformFeeRate,
        vendorAmount: printPricing.vendorAmount,
        amount: printPricing.totalAmount,
        fileUrl,
      }));

      await Promise.race([writePromise, timeoutPromise]);

      // await openRazorpayCheckout(orderCode, totalCost, mobileNumber); // Razorpay (commented out)
      await openZohoPayment(orderCode, totalCost, mobileNumber);

      // Note: setStep("complete") will happen after user returns from Zoho via callback redirect
      // setStep("complete");
    } catch (error: any) {
      if (error.message !== "Payment cancelled") {
        toast.error("Failed to process order. Please try again.");
      }
      setIsProcessing(false);
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

    setIsProcessing(true);

    try {
      const code = generateOrderCode();
      setOrderCode(code);
      const a4Price = pricing?.a4Sheet ?? 1;
      const a4Subtotal = a4Sheets * a4Price;
      const a4Pricing = calculateOrderPricing(a4Subtotal, { applyPlatformFee: false });

      const writePromise = setDoc(doc(db, "orders", code), buildOrderData(code, {
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

      // await openRazorpayCheckout(code, a4Pricing.totalAmount, mobileNumber); // Razorpay (commented out)
      await openZohoPayment(code, a4Pricing.totalAmount, mobileNumber);

      // Note: setStep("complete") will happen after user returns from Zoho via callback redirect
      // setStep("complete");
    } catch (error: any) {
      if (error.message !== "Payment cancelled") {
        toast.error("Failed to process order.");
      }
      setIsProcessing(false);
    }
  };

  // Base path for links — vendor-aware
  const basePath = vendor?.slug ? `/store/${vendor.slug}` : "";

  return (
    <main className="min-h-screen bg-transparent text-black flex flex-col relative">
      {/* <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" /> */}{/* Razorpay script (commented out) */}
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
              {/* QR Scanner button — only on root PrintEG page */}
              {!isPoweredBy && step === "upload" && (
                <button
                  onClick={() => setShowQRScanner(true)}
                  className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-2xl text-sm font-semibold hover:bg-gray-800 active:scale-[0.97] transition-all shadow-lg shadow-black/10"
                >
                  <ScanLine className="h-4 w-4" />
                  Scan Store QR
                </button>
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
                        onClick={() => setMode("ai-doc")}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${mode === "ai-doc"
                          ? "bg-white text-black shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                          }`}
                      >
                        ✨ AI Generator
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
                  {mode === "ai-doc" && (
                    <AIDocumentGenerator onProceed={handleAIProceed} />
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
                            `Pay ₹${a4Sheets * (pricing?.a4Sheet ?? 1)}`
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
                  sheetsToPrint={sheetsToPrint}
                  isAIDoc={isAIDoc}
                  copies={copies}
                  onCopiesChange={setCopies}
                  onConfigChange={handleConfigChange}
                  onBack={() => setStep("upload")}
                  onPayment={handlePayment}
                  canProceed={canProceedToPayment()}
                  isProcessing={isProcessing}
                />
              )}

              {step === "complete" && (
                <Completion
                  orderCode={orderCode}
                  mobileNumber={mobileNumber}
                  totalCost={totalCost}
                  onStartNewOrder={() => {
                    sessionStorage.removeItem("printeg_completed_order");
                    sessionStorage.removeItem("printeg_pending_order");
                    sessionStorage.removeItem("printeg_payment_link_id");
                    setOrderCode("");
                    setFiles([]);
                    setTotalPages(0);
                    setStep("upload");
                  }}
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
        <div className="w-full py-6 flex flex-col items-center gap-4 mt-auto border-t border-gray-100 bg-white/50 backdrop-blur-sm">
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
            <Link href={`${basePath}/about`} className="hover:text-black transition-colors">
              About
            </Link>
            <Link href={`${basePath}/contact`} className="hover:text-black transition-colors">
              Contact
            </Link>
            <Link href={`${basePath}/privacy`} className="hover:text-black transition-colors">
              Privacy
            </Link>
            <Link href={`${basePath}/refund`} className="hover:text-black transition-colors">
              Refund
            </Link>
            <Link href={`${basePath}/terms`} className="hover:text-black transition-colors">
              Terms
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
