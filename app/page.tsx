"use client";

import { useState } from "react";
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

  const handlePayment = async () => {
    if (!canProceedToPayment()) {
      toast.error("Please complete all fields before proceeding");
      return;
    }

    setIsProcessing(true);
    console.log("Starting payment process...");

    try {
      // Merge PDFs
      console.log("Merging PDFs...");
      const mergedPdf = await mergePDFs(files);
      console.log("PDFs merged.");

      // Generate order code
      const code = generateOrderCode();
      setOrderCode(code);
      console.log("Order code generated:", code);

      // Upload to Firebase Storage
      console.log("Starting Firebase Storage upload...");
      const storageRef = ref(storage, `orders/${code}_${Date.now()}.pdf`);
      await uploadBytes(storageRef, mergedPdf);
      console.log("Upload complete. Getting download URL...");
      const fileUrl = await getDownloadURL(storageRef);
      console.log("Download URL obtained:", fileUrl);

      // Save order to Firestore
      console.log("Saving to Firestore...");


      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Firestore write timeout after 10 seconds')), 10000);
        });

        const writePromise = addDoc(collection(db, "orders"), {
          orderCode: code,
          mobileNumber,
          totalPages,
          isColor,
          printSide,    // Added
          printLayout,  // Added
          amount: totalCost,
          fileUrl,
          createdAt: new Date().toISOString(),
          status: "pending",
        });

        const docRef = await Promise.race([writePromise, timeoutPromise]) as any;
        console.log("Saved to Firestore with ID:", docRef.id);
      } catch (firestoreError: any) {
        console.error("Firestore Error:", firestoreError);
        // Don't block the user flow if Firestore fails, just log it
        toast.error("Order saved locally (Database connection failed)");
      }


      // Open Razorpay Payment Gateway
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: totalCost * 100, // Razorpay accepts amount in paise (smallest currency unit)
        currency: "INR",
        name: "Printeg",
        description: `Print ${totalPages} pages (${isColor ? "Color" : "B&W"})`,
        order_id: "", // Leave empty for test mode
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

      // @ts-ignore - Razorpay is loaded via script tag
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
    <main className="min-h-screen bg-transparent text-black py-8 px-4 flex justify-center">
      <div className="w-full max-w-[400px] space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center justify-center space-y-2 pt-4">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
            <span className="text-white font-bold text-2xl tracking-tighter">P</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PrintEG</h1>
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {step === "upload" && (
            <FileUpload onFilesChange={handleFilesChange} onContinue={() => setStep("config")} totalPages={totalPages} />
          )}

          {step === "config" && (
            <PrintConfig
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

        {/* Footer */}
        {step !== "complete" && (
          <div className="flex flex-col items-center gap-4">
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
        )}
      </div>
    </main>
  );
}
