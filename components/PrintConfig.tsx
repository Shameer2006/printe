"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, X } from "lucide-react";

interface PrintConfigProps {
    file: File | null;
    totalPages: number;
    totalCost: number;
    onConfigChange: (config: {
        mobileNumber: string;
        isColor: boolean;
        printSide: "single" | "double";
        printLayout: "1-in-1" | "2-in-1" | "4-in-1";
    }) => void;
    onBack: () => void;
    onPayment: () => void;
    canProceed: boolean;
    isProcessing: boolean;
}

export function PrintConfig({
    file,
    totalPages,
    totalCost,
    onConfigChange,
    onBack,
    onPayment,
    canProceed,
    isProcessing
}: PrintConfigProps) {
    const [mobileNumber, setMobileNumber] = useState("");
    const [isColor, setIsColor] = useState(false);
    const [printSide, setPrintSide] = useState<"single" | "double">("single");
    const [printLayout, setPrintLayout] = useState<"1-in-1" | "2-in-1" | "4-in-1">("1-in-1");
    const [showPreview, setShowPreview] = useState(false);

    const handleMobileChange = (value: string) => {
        // Only allow numbers and limit to 10 digits
        const cleaned = value.replace(/\D/g, "").slice(0, 10);
        setMobileNumber(cleaned);
        onConfigChange({ mobileNumber: cleaned, isColor, printSide, printLayout });
    };

    const handleColorChange = (color: boolean) => {
        setIsColor(color);
        onConfigChange({ mobileNumber, isColor: color, printSide, printLayout });
    };

    const handleOptionChange = (type: "side" | "layout", value: string) => {
        if (type === "side") {
            const side = value as "single" | "double";
            setPrintSide(side);
            onConfigChange({ mobileNumber, isColor, printSide: side, printLayout });
        } else {
            const layout = value as "1-in-1" | "2-in-1" | "4-in-1";
            setPrintLayout(layout);
            onConfigChange({ mobileNumber, isColor, printSide, printLayout: layout });
        }
    };

    return (
        <>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="text-center space-y-1 relative">
                    <h3 className="text-xl font-bold tracking-tight">Configuration</h3>
                    <p className="text-sm text-gray-500">Customize your print settings</p>
                    {file && (
                        <div className="pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                onClick={() => setShowPreview(true)}
                            >
                                <Eye className="w-4 h-4 mr-1" />
                                Preview Document
                            </Button>
                        </div>
                    )}
                </div>


                {/* Print Type Selection */}
                <div className="space-y-4">
                    <label className="text-sm font-semibold text-gray-900 ml-1">Select Color Mode</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleColorChange(false)}
                            className={`relative h-32 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${!isColor
                                ? "border-black bg-gray-900 text-white shadow-lg shadow-black/10 scale-[1.02]"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${!isColor ? "border-white/20 bg-white/10" : "border-gray-200 bg-gray-50"}`}>
                                <span className="font-bold text-lg">Aa</span>
                            </div>
                            <span className="font-bold text-lg">B&W</span>
                        </button>
                        <button
                            onClick={() => handleColorChange(true)}
                            className={`relative h-32 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${isColor
                                ? "border-black bg-gray-900 text-white shadow-lg shadow-black/10 scale-[1.02]"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${isColor ? "border-white/20 bg-white/10" : "border-gray-200 bg-gray-50"}`}>
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
                            </div>
                            <span className="font-bold text-lg">Color</span>
                        </button>
                    </div>
                </div>

                {/* Phone Number Input */}
                <div className="space-y-4">
                    <label htmlFor="mobile" className="text-sm font-semibold text-gray-900 ml-1">
                        Phone Number
                    </label>
                    <div className="relative">
                        <Input
                            id="mobile"
                            type="tel"
                            placeholder="98765 43210"
                            value={mobileNumber}
                            onChange={(e) => handleMobileChange(e.target.value)}
                            maxLength={10}
                            className="h-14 pl-4 text-lg bg-gray-50 border-gray-200 focus:border-black rounded-xl transition-all"
                        />
                    </div>
                    {mobileNumber.length > 0 && mobileNumber.length < 10 && (
                        <p className="text-xs text-red-500 ml-1">
                            Please enter a valid 10-digit number
                        </p>
                    )}
                </div>

                {/* Print Options Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Print Sides */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-900 ml-1">Sides</label>
                        <div className="relative">
                            <select
                                className="w-full h-14 pl-4 pr-8 text-base bg-gray-50 border-2 border-gray-200 focus:border-black rounded-xl appearance-none transition-all outline-none"
                                onChange={(e) => handleOptionChange("side", e.target.value)}
                                value={printSide}
                            >
                                <option value="single">Single Side</option>
                                <option value="double">Double Side</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Print Layout */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-900 ml-1">Layout</label>
                        <div className="relative">
                            <select
                                className="w-full h-14 pl-4 pr-8 text-base bg-gray-50 border-2 border-gray-200 focus:border-black rounded-xl appearance-none transition-all outline-none"
                                onChange={(e) => handleOptionChange("layout", e.target.value)}
                                value={printLayout}
                            >
                                <option value="1-in-1">Normal (1-in-1)</option>
                                <option value="2-in-1">2-in-1</option>
                                <option value="4-in-1">4-in-1</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cost Summary - Cards */}
                <div className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Pages to print</span>
                        <span className="font-bold text-gray-900">{totalPages}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Rate per page</span>
                        <span className="font-bold text-gray-900">₹{isColor ? "10.00" : "1.50"}</span>
                    </div>
                    <div className="h-px bg-gray-200" />
                    <div className="flex justify-between items-center text-xl font-bold">
                        <span>Total Pay</span>
                        <span>₹{totalCost.toFixed(2)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={onBack}
                        className="flex-1 h-14 rounded-2xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-base font-bold"
                        disabled={isProcessing}
                    >
                        Back
                    </Button>
                    <Button
                        size="lg"
                        onClick={onPayment}
                        disabled={!canProceed || isProcessing}
                        className="flex-[2] h-14 rounded-2xl bg-black hover:bg-gray-800 text-white shadow-lg shadow-black/5 text-base font-bold"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Processing
                            </>
                        ) : (
                            `Pay ₹${totalCost.toFixed(2)}`
                        )}
                    </Button>
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && file && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="font-bold text-lg">Document Preview</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowPreview(false)}
                                className="rounded-full hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="flex-1 bg-gray-50 p-4">
                            <iframe
                                src={URL.createObjectURL(file)}
                                className="w-full h-full rounded-xl border border-gray-200 bg-white"
                                title="PDF Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
