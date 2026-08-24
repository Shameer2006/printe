"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, Copy, Check, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CompletionProps {
    orderCode: string;
    mobileNumber: string;
    totalCost: number;
}

export function Completion({ orderCode, mobileNumber: initialMobile, totalCost: initialCost }: CompletionProps) {
    const [copied, setCopied] = useState(false);
    const [mobileNumber, setMobileNumber] = useState(initialMobile);
    const [totalCost, setTotalCost] = useState(initialCost);
    const [subtotal, setSubtotal] = useState<number | undefined>(undefined);
    const [platformFee, setPlatformFee] = useState<number | undefined>(undefined);
    const [isLoadingData, setIsLoadingData] = useState(!initialMobile);
    const [isGenerating, setIsGenerating] = useState(false);
    const hasDownloaded = useRef(false);

    useEffect(() => {
        const fetchOrderData = async () => {
            if (initialMobile) return; // We already have it (no redirect happened)

            try {
                const orderDoc = await getDoc(doc(db, "orders", orderCode));
                if (orderDoc.exists()) {
                    const data = orderDoc.data();
                    setMobileNumber(data.mobileNumber || "");
                    setTotalCost(data.amount || 0);
                    if (typeof data.subtotal === "number") setSubtotal(data.subtotal);
                    if (typeof data.platformFee === "number") setPlatformFee(data.platformFee);
                }
            } catch (error) {
                console.error("Error fetching order data:", error);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchOrderData();
    }, [orderCode, initialMobile]);

    const generateReceiptPDF = useCallback(async (isAuto = false) => {
        // Prevent double auto-download in Strict Mode
        if (isAuto && hasDownloaded.current) return;
        if (isAuto) hasDownloaded.current = true;
        if (isLoadingData) return; // Wait for data before generating

        setIsGenerating(true);
        try {
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([350, 500]);
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            const now = new Date();
            const dateStr = now.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            });
            const timeStr = now.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });

            const w = page.getWidth();
            const black = rgb(0, 0, 0);
            const gray = rgb(0.45, 0.45, 0.45);

            // Title
            page.drawText("PrintEG", { x: 30, y: 460, size: 22, font: fontBold, color: black });

            page.drawLine({ start: { x: 30, y: 420 }, end: { x: w - 30, y: 420 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

            // Order Code - VERY BIG & CENTERED
            const orderLabel = "ORDER CODE";
            const labelWidth = fontBold.widthOfTextAtSize(orderLabel, 14);
            page.drawText(orderLabel, { x: (w - labelWidth) / 2, y: 390, size: 14, font: fontBold, color: gray });

            const codeWidth = fontBold.widthOfTextAtSize(orderCode, 80);
            page.drawText(orderCode, { x: (w - codeWidth) / 2, y: 300, size: 80, font: fontBold, color: black });

            // Details
            let y = 250;
            const dateText = `Date: ${dateStr}`;
            const dateWidth = font.widthOfTextAtSize(dateText, 12);
            page.drawText(dateText, { x: (w - dateWidth) / 2, y, size: 12, font, color: black });

            y -= 20;
            const detailsText = `Time: ${timeStr} | Rs. ${totalCost.toFixed(2)}`;
            const detailsWidth = font.widthOfTextAtSize(detailsText, 12);
            page.drawText(detailsText, { x: (w - detailsWidth) / 2, y, size: 12, font, color: black });

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
            a.download = `PrintEG_Receipt_${orderCode}.pdf`;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                a.remove();
                URL.revokeObjectURL(url);
            }, 100);

            if (!isAuto) {
                toast.success("Receipt downloaded successfully");
            }
        } catch (error) {
            console.error("PDF Generation Error:", error);
            if (!isAuto) toast.error("Failed to generate receipt PDF");
        } finally {
            setIsGenerating(false);
        }
    }, [orderCode, mobileNumber, totalCost, isLoadingData]);

    // Auto-download receipt on mount
    useEffect(() => {
        if (!isLoadingData) {
            generateReceiptPDF(true);
        }
    }, [generateReceiptPDF, isLoadingData]);

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(orderCode);
            setCopied(true);
            toast.success("Order code copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy code.");
        }
    };

    return (
        <div className="space-y-8 py-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Success Animation */}
            <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center mx-auto shadow-xl shadow-black/10">
                    <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Order Placed!</h2>
            </div>

            {/* Order Code - Clickable to copy */}
            <div className="space-y-4">
                <div
                    onClick={handleCopyCode}
                    className="bg-gray-50 rounded-3xl p-10 border-2 border-dashed border-gray-300 text-center relative overflow-hidden group hover:border-black transition-colors cursor-pointer active:scale-[0.98]"
                >
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Order Code</p>
                    <p className="text-7xl font-bold tracking-tight text-gray-900 group-hover:scale-110 transition-transform duration-300">
                        {orderCode}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-400">
                        {copied ? (
                            <>
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="text-green-500">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-4 w-4" />
                                <span>Tap to copy</span>
                            </>
                        )}
                    </div>
                </div>
                <p className="text-center text-sm text-gray-500 px-8">
                    Show this code at the counter to collect your prints.
                </p>
            </div>

            {/* Minimal Details */}
            <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between text-base">
                    <span className="text-gray-500">Mobile Number</span>
                    <span className="font-bold font-mono">
                        {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : mobileNumber}
                    </span>
                </div>
                {platformFee !== undefined && platformFee > 0 && (
                    <>
                        <div className="h-px bg-gray-100" />
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-medium text-gray-700">₹{(subtotal ?? (totalCost - platformFee)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Platform Fee (8%)</span>
                            <span className="font-medium text-gray-700">₹{platformFee.toFixed(2)}</span>
                        </div>
                    </>
                )}
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between text-base">
                    <span className="text-gray-500">Amount Paid</span>
                    <span className="font-bold text-green-600">
                        {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : `₹${totalCost.toFixed(2)}`}
                    </span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
                <button
                    onClick={() => generateReceiptPDF(false)}
                    disabled={isGenerating || isLoadingData}
                    className="w-full h-12 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {isGenerating ? "Generating..." : "Download Receipt"}
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full h-14 rounded-2xl bg-gray-900 text-white font-bold hover:bg-black transition-colors"
                >
                    Start New Order
                </button>
            </div>
        </div>
    );
}
