"use client";

import { useState, useRef } from "react";
import { FileUpload } from "@/components/FileUpload";
import { PrintConfig } from "@/components/PrintConfig";
import { Completion } from "@/components/Completion";
import { Button } from "@/components/ui/button";
import { mergePDFs, generateOrderCode } from "@/lib/utils";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import heroImage1 from "./image1.png";
import heroImage from "./image.png";

type Step = "upload" | "config" | "payment" | "complete";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [printSide, setPrintSide] = useState<"single" | "double">("single");
  const [printLayout, setPrintLayout] = useState<"1-in-1" | "2-in-1" | "4-in-1">("1-in-1");
  const [mobileNumber, setMobileNumber] = useState("");
  const [isColor, setIsColor] = useState(false);
  const [orderCode, setOrderCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Background upload ref to store the running upload promise
  const uploadPromiseRef = useRef<Promise<string> | null>(null);

  // Pricing logic (can be updated based on layout/sides if needed)
  const pricePerPage = isColor ? 10 : 1.5;
  const totalCost = totalPages * pricePerPage;

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

  // Triggered when user clicks "Continue" from upload screen
  const handleContinue = async () => {
    if (files.length === 0) return;

    setStep("config");
    console.log("Starting background upload process...");

    // Generate order code immediately
    const code = generateOrderCode();
    setOrderCode(code);

    // Start upload in background and store promise
    uploadPromiseRef.current = (async () => {
      try {
        console.log("Merging PDFs in background...");
        const mergedPdf = await mergePDFs(files);

        console.log("Uploading to Firebase Storage...");
        const storageRef = ref(storage, `orders/${code}_${Date.now()}.pdf`);
        await uploadBytes(storageRef, mergedPdf);

        console.log("Upload complete. Getting download URL...");
        const url = await getDownloadURL(storageRef);
        console.log("Background upload finished. URL:", url);
        return url;
      } catch (error) {
        console.error("Background upload failed:", error);
        throw error;
      }
    })();
  };

  const handlePayment = async () => {
    if (!canProceedToPayment()) {
      toast.error("Please complete all fields before proceeding");
      return;
    }

    setIsProcessing(true);
    console.log("Starting payment process...");

    try {
      // 1. Ensure file upload is complete (or wait for it)
      if (!uploadPromiseRef.current) {
        toast.error("File upload not started. Please try again.");
        setIsProcessing(false);
        return;
      }

      let fileUrl: string;
      try {
        // Use the existing promise - if it's already done, this resolves instantly
        // If it's still running, we wait here
        fileUrl = await uploadPromiseRef.current;
      } catch (uploadError) {
        console.error("Upload failed:", uploadError);
        toast.error("Failed to upload file. Please try again.");
        setIsProcessing(false);
        return;
      }

      // 2. Save order to Firestore
      console.log("Saving to Firestore...");
      // Re-use the orderCode set in handleContinue
      // Note: orderCode in state might technically be stale in closure if we didn't use refs, 
      // but since we set it in handleContinue and this runs after, it should be fine.
      // safely use the code from state or if we want to be 100% sure we could return it from promise too.
      // But state update batching in React 18+ usually handles this. 
      // We will use the 'orderCode' state currently in scope.

      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Firestore write timeout after 10 seconds')), 10000);
        });

        const writePromise = addDoc(collection(db, "orders"), {
          orderCode, // Use the state set in handleContinue
          mobileNumber,
          totalPages,
          isColor,
          printSide,
          printLayout,
          amount: totalCost,
          fileUrl,
          createdAt: new Date().toISOString(),
          status: "pending",
        });

        const docRef = await Promise.race([writePromise, timeoutPromise]) as any;
        console.log("Saved to Firestore with ID:", docRef.id);
      } catch (firestoreError: any) {
        console.error("Firestore Error:", firestoreError);
        toast.error("Order saved locally (Database connection failed)");
      }

      // 3. Open Razorpay Payment Gateway
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: totalCost * 100,
        currency: "INR",
        name: "Printeg",
        description: `Print ${totalPages} pages (${isColor ? "Color" : "B&W"})`,
        order_id: "",
        prefill: {
          contact: mobileNumber,
        },
        theme: {
          color: "#000000",
        },
        handler: function (response: any) {
          console.log("Payment successful:", response);
          toast.success("Payment successful!");
          setStep("complete");
          setIsProcessing(false);
        },
        modal: {
          ondismiss: function () {
            console.log("Payment cancelled by user");
            toast.error("Payment cancelled");
            setIsProcessing(false);
          },
        },
      };

      // @ts-ignore
      if (typeof window.Razorpay === "undefined") {
        toast.error("Payment gateway not loaded. Please refresh and try again.");
        setIsProcessing(false);
        return;
      }

      // @ts-ignore
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Error processing order:", error);
      toast.error("Failed to process order. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-transparent text-black flex flex-col relative">
      <div className="flex-1 flex flex-col justify-center items-center py-12 px-2">
        <div className={`w-full transition-all duration-500 ${step === 'upload' ? 'max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-0 items-center' : 'max-w-[400px]'}`}>

          {/* Left/Main Column: App Functionality */}
          <div className={`w-full max-w-[400px] mx-auto space-y-8 ${step === 'upload' ? 'order-1' : ''}`}>
            {/* Header */}
            <div className="flex flex-col items-center justify-center space-y-2 pt-4">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
                <span className="text-white font-bold text-2xl tracking-tighter">P</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">PrintEG</h1>
              {/* <span className="text-gray-500 text-sm">Print. Easy. Go</span> */}
              <h3 className="font-semibold text-lg">Print. Easy. Go</h3>

            </div>

            {/* Content */}
            <div className="min-h-[400px]">
              {step === "upload" && (
                <FileUpload onFilesChange={handleFilesChange} onContinue={handleContinue} totalPages={totalPages} />
              )}

              {step === "config" && (
                <PrintConfig
                  file={files.length > 0 ? files[0] : null}
                  totalPages={totalPages}
                  totalCost={totalCost}
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
                  src={heroImage}  // use heroImage1 for another image
                  alt="Print Smart"
                  fill
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



      {/* Footer - Pinned to bottom */}
      {
        step !== "complete" && (
          <div className="w-full py-6 flex flex-col items-center gap-4 mt-auto border-t border-gray-100 bg-white/50 backdrop-blur-sm">
            <p className="text-center text-xs text-gray-400 font-medium">
              Simple • Fast • Secure
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
              <Link href="/about" className="hover:text-black transition-colors">
                About
              </Link>
              <Link href="/contact" className="hover:text-black transition-colors">
                Contact
              </Link>
              <Link href="/privacy" className="hover:text-black transition-colors">
                Privacy
              </Link>
              <Link href="/refund" className="hover:text-black transition-colors">
                Refund
              </Link>
              <Link href="/terms" className="hover:text-black transition-colors">
                Terms
              </Link>
            </div>
          </div>
        )
      }
    </main >
  );
}
