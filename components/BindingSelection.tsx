"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Layers, FileText, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { BindingPricing, BindingItemConfig } from "@/lib/types";
import { calculateBindingCost, DEFAULT_BINDING_CONFIG } from "@/lib/pricing";

interface BindingSelectionProps {
  totalSheets: number;
  printSubtotal: number;
  platformFee: number;
  bindingConfig?: BindingPricing;
  onBack: () => void;
  onConfirm: (bindingData: {
    bindingId: string;
    bindingName: string;
    bindingOption: "standard" | "with_print" | "without_print";
    bindingPrice: number;
    totalAmount: number;
  }) => void;
  isProcessing: boolean;
}

export function BindingSelection({
  totalSheets,
  printSubtotal,
  platformFee,
  bindingConfig,
  onBack,
  onConfirm,
  isProcessing,
}: BindingSelectionProps) {
  const [selectedBindingId, setSelectedBindingId] = useState<string>("none");
  const [calicoOption, setCalicoOption] = useState<"with_print" | "without_print">("with_print");
  const [chartOption, setChartOption] = useState<"with_print" | "without_print">("with_print");

  const config = bindingConfig || DEFAULT_BINDING_CONFIG;
  const enabledItems = (config.items || []).filter((item) => item.enabled);

  // Determine current option type for the selected item
  let currentOption: "standard" | "with_print" | "without_print" = "standard";
  if (selectedBindingId === "calico") {
    currentOption = calicoOption;
  } else if (selectedBindingId === "chart") {
    currentOption = chartOption;
  }

  const bindingCostResult = calculateBindingCost(
    totalSheets,
    selectedBindingId,
    currentOption,
    config
  );

  const bindingPrice = bindingCostResult.price;
  const subtotalWithBinding = printSubtotal + bindingPrice;
  // Calculate platform fee on total
  const calculatedFee = Math.round(subtotalWithBinding * 0.08 * 100) / 100;
  const totalPayable = Math.round((subtotalWithBinding + calculatedFee) * 100) / 100;

  const handleProceed = () => {
    onConfirm({
      bindingId: bindingCostResult.bindingId,
      bindingName: bindingCostResult.bindingName,
      bindingOption: currentOption,
      bindingPrice,
      totalAmount: totalPayable,
    });
  };

  const getBindingIcon = (id: string) => {
    switch (id) {
      case "spiral":
        return <Layers className="text-blue-600" size={20} />;
      case "soft":
        return <BookOpen className="text-emerald-600" size={20} />;
      case "calico":
        return <Sparkles className="text-amber-600" size={20} />;
      case "chart":
        return <FileText className="text-indigo-600" size={20} />;
      default:
        return <BookOpen className="text-slate-600" size={20} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Title Banner */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Binding & Finishing
        </h2>
        <p className="text-xs text-slate-500">
          Choose a binding style for your <span className="font-bold text-slate-800">{totalSheets} physical sheets</span>
        </p>
      </div>

      {/* Binding Cards Grid */}
      <div className="space-y-3">
        {/* Option 0: None */}
        <div
          onClick={() => setSelectedBindingId("none")}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
            selectedBindingId === "none"
              ? "border-black bg-slate-50 shadow-md ring-2 ring-black/5"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              selectedBindingId === "none" ? "bg-black text-white" : "bg-slate-100 text-slate-500"
            }`}>
              📄
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">No Binding (Loose Sheets)</h3>
              <p className="text-xs text-slate-500">Standard loose printed pages without binding</p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-black text-sm text-slate-900">FREE</span>
          </div>
        </div>

        {/* Enabled Shop Bindings */}
        {enabledItems.map((item) => {
          const isSelected = selectedBindingId === item.id;
          
          // Calculate display rate for this item
          let displayRate = "₹0";
          if (item.type === "flat") {
            displayRate = `₹${item.flatPrice || 0}`;
          } else if (item.type === "tiered") {
            const itemCost = calculateBindingCost(totalSheets, item.id, "standard", config);
            displayRate = `₹${itemCost.price}`;
          } else if (item.type === "with_without_print") {
            const opt = item.id === "calico" ? calicoOption : chartOption;
            const price = opt === "with_print" ? (item.withPrintPrice || 0) : (item.withoutPrintPrice || 0);
            displayRate = `₹${price}`;
          }

          return (
            <div
              key={item.id}
              onClick={() => setSelectedBindingId(item.id)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-3 ${
                isSelected
                  ? "border-black bg-slate-50/70 shadow-md ring-2 ring-black/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? "bg-white shadow-sm border border-slate-200" : "bg-slate-50"
                  }`}>
                    {getBindingIcon(item.id)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      {item.name}
                      {isSelected && <CheckCircle2 size={15} className="text-emerald-600" />}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-base text-slate-900">{displayRate}</span>
                </div>
              </div>

              {/* Sub-options for Calico */}
              {isSelected && item.id === "calico" && (
                <div className="pt-2 border-t border-slate-200/60 flex gap-2 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setCalicoOption("with_print")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      calicoOption === "with_print"
                        ? "bg-black text-white border-black shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    With Cover Print (₹{item.withPrintPrice || 40})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalicoOption("without_print")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      calicoOption === "without_print"
                        ? "bg-black text-white border-black shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Without Print (₹{item.withoutPrintPrice || 30})
                  </button>
                </div>
              )}

              {/* Sub-options for Chart Bind */}
              {isSelected && item.id === "chart" && (
                <div className="pt-2 border-t border-slate-200/60 flex gap-2 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setChartOption("with_print")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      chartOption === "with_print"
                        ? "bg-black text-white border-black shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    With Cover Print (₹{item.withPrintPrice || 30})
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartOption("without_print")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      chartOption === "without_print"
                        ? "bg-black text-white border-black shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Without Print (₹{item.withoutPrintPrice || 25})
                  </button>
                </div>
              )}

              {/* Tier Breakdown hint for Spiral */}
              {isSelected && item.id === "spiral" && item.tiers && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium animate-in fade-in duration-200">
                  <span>Matched rate for {totalSheets} sheets:</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {bindingCostResult.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bill Breakdown Summary */}
      <div className="bg-gray-50 rounded-2xl p-6 space-y-3 border border-gray-100">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 font-medium">Document Printing</span>
          <span className="font-bold text-gray-900">₹{printSubtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Binding Service</span>
            {selectedBindingId !== "none" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {bindingCostResult.bindingName}
              </span>
            )}
          </div>
          <span className="font-bold text-gray-900">₹{bindingPrice.toFixed(2)}</span>
        </div>

        <div className="h-px bg-gray-200 my-1" />

        <div className="flex justify-between items-center text-xl font-bold">
          <span>Total Pay</span>
          <span className="text-emerald-700">₹{totalPayable.toFixed(2)}</span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          className="flex-1 h-14 rounded-2xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-base font-bold"
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={handleProceed}
          disabled={isProcessing}
          className="flex-[2] h-14 rounded-2xl bg-black hover:bg-gray-800 text-white shadow-lg shadow-black/5 text-base font-bold"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ₹${totalPayable.toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  );
}
