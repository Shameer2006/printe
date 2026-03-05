"use client";

import { CheckCircle2 } from "lucide-react";

interface CompletionProps {
    orderCode: string;
    mobileNumber: string;
    totalCost: number;
}

export function Completion({ orderCode, mobileNumber, totalCost }: CompletionProps) {
    return (
        <div className="space-y-8 py-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Success Animation */}
            <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center mx-auto shadow-xl shadow-black/10">
                    <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Order Placed!</h2>
            </div>

            {/* Order Code - HUGE */}
            <div className="space-y-4">
                <div className="bg-gray-50 rounded-3xl p-10 border-2 border-dashed border-gray-300 text-center relative overflow-hidden group hover:border-black transition-colors">
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Order Code</p>
                    <p className="text-7xl font-bold tracking-tight text-gray-900 group-hover:scale-110 transition-transform duration-300">
                        {orderCode}
                    </p>
                </div>
                <p className="text-center text-sm text-gray-500 px-8">
                    Please show this code at the counter to collect your prints.
                </p>
            </div>

            {/* Minimal Details */}
            <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between text-base">
                    <span className="text-gray-500">Mobile Number</span>
                    <span className="font-bold font-mono">{mobileNumber}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between text-base">
                    <span className="text-gray-500">Amount Paid</span>
                    <span className="font-bold text-green-600">₹{totalCost.toFixed(2)}</span>
                </div>
            </div>

            {/* Done Button */}
            <div className="pt-4">
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
