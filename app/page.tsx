"use client";

import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { PrintConfig } from "@/components/PrintConfig";
import { Completion } from "@/components/Completion";
import Link from "next/link";
import { mergePDFs } from "@/lib/utils";
// Ensure this path points to your firebase.ts file
import { db, storage } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";

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

  // Pricing logic
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

  // --- SAFE CODE GENERATOR ---
  // If network is blocked, this will skip the collision check instead of crashing
  const generateUniqueCode = async () => {
    let code = "";
    // Generate code immediately
    code = Math.floor(1000 + Math.random() * 9000).toString();

    try {
      // Try to check for duplicate (Collision Check)
      const docRef = doc(db, "orders", code);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // If duplicate found, try again (Recursive)
        return generateUniqueCode();
      }
    } catch (error) {
      // IF OFFLINE: Ignore the error and trust the random number
      // This allows the app to work even if collision check fails
      console.warn("Network check skipped:", error);
    }

    return code;
  };

  const handlePayment = async () => {
    if (!canProceedToPayment()) {
      toast.error("Please complete all fields before proceeding");
      return;
    }

    setIsProcessing(true);
    console.log("Starting payment process...");

    try {
      // 1. Merge PDFs
      console.log("Merging PDFs...");
      const mergedPdf = await mergePDFs(files);

      // 2. Generate Unique Code (Collision Checked)
      const code = await generateUniqueCode();
      setOrderCode(code);
      console.log("Generated Secure Code:", code);

      // 3. Upload to Firebase Storage
      console.log("Uploading to Storage...");
      const storageRef = ref(storage, `orders/${code}_${Date.now()}.pdf`);
      await uploadBytes(storageRef, mergedPdf);
      const fileUrl = await getDownloadURL(storageRef);
      console.log("File URL obtained:", fileUrl);

      // 4. SAVE TO DATABASE (Initial Ticket)
      // We save BEFORE payment to ensure the DB connection is working.
      console.log("Creating Order Ticket...");

      try {
        // Add timeout to detect if Firestore is hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Firestore operation timed out after 10 seconds - client appears to be offline')), 10000);
        });

        const writePromise = setDoc(doc(db, "orders", code), {
          orderCode: code,
          mobileNumber: mobileNumber,
          totalPages: totalPages,
          amount: totalCost,
          fileUrl: fileUrl,
          createdAt: new Date().toISOString(),

          // Status Flags
          status: "pending",
          payment_status: "PENDING", // Not valid yet

          // Print Settings (Flat Structure for Pi)
          isColor: isColor,
          printSide: printSide,
          printLayout: printLayout
        });

        await Promise.race([writePromise, timeoutPromise]);

        console.log("✅ Order Ticket Created Successfully!");
      } catch (firestoreError: any) {
        console.error("❌ FIRESTORE WRITE FAILED:", firestoreError);
        console.error("Error code:", firestoreError.code);
        console.error("Error message:", firestoreError.message);
        console.error("Full error:", firestoreError);

        // Provide specific error message
        let errorMsg = "Failed to save order to database.";
        if (firestoreError.message?.includes('timeout') || firestoreError.message?.includes('offline')) {
          errorMsg = "Database connection failed - Firestore appears to be offline. Please check your internet connection or disable browser extensions (ad blockers).";
        }

        toast.error(errorMsg);
        setIsProcessing(false);
        return; // Exit early - do NOT proceed to payment
      }

      console.log("Order Ticket Created. Opening Payment Gateway...");

      // 5. Open Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(totalCost * 100), // Razorpay needs integer paise
        currency: "INR",
        name: "Printeg",
        description: `Print ${totalPages} pages`,
        prefill: {
          contact: mobileNumber,
        },
        theme: {
          color: "#000000",
        },
        handler: async function (response: any) {
          console.log("Payment Success:", response);

          // 6. UPDATE STATUS TO PAID
          // Only now is the code valid for the machine
          try {
            await updateDoc(doc(db, "orders", code), {
              payment_status: "PAID",
              payment_id: response.razorpay_payment_id,
              paidAt: new Date().toISOString()
            });

            toast.success("Payment Successful! Code Active.");
            setStep("complete");
          } catch (err) {
            console.error("Payment recorded but DB update failed", err);
            // Even if this fails, the initial doc exists, so support can fix it manually
            toast.warning("Payment received. If code doesn't work, show Payment ID: " + response.razorpay_payment_id);
            setStep("complete");
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            console.log("Payment cancelled");
            toast.error("Payment cancelled");
            setIsProcessing(false);
          },
        },
      };

      // @ts-ignore
      if (typeof window.Razorpay === "undefined") {
        throw new Error("Razorpay SDK not loaded");
      }

      // @ts-ignore
      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error("Critical Error:", error);
      // If the error is network related (DB blocked), alert the user
      toast.error("Connection Error: Could not save order. Please check your internet or disable AdBlocker.");
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
            <FileUpload
              onFilesChange={handleFilesChange}
              onContinue={() => setStep("config")}
              totalPages={totalPages}
            />
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
          <div className="space-y-4 pt-8 pb-4">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-500 font-medium">
              <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
              <Link href="/refund" className="hover:text-black transition-colors">Refund</Link>
              <Link href="/shipping" className="hover:text-black transition-colors">Shipping</Link>
              <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
              <Link href="/about" className="hover:text-black transition-colors">About</Link>
              <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
            </div>
            <p className="text-center text-xs text-gray-400 font-medium">
              Simple • Fast • Secure
            </p>
          </div>
        )}
      </div>
    </main>
  );
}