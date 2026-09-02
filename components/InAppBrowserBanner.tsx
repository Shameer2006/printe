"use client";

import { useState, useEffect } from "react";
import { isInAppBrowser, isAndroid, getChromeIntentUrl } from "@/lib/browser-utils";
import { ExternalLink, X, ShieldAlert } from "lucide-react";

export function InAppBrowserBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [androidDevice, setAndroidDevice] = useState(false);

  useEffect(() => {
    // Check if in in-app browser (e.g. Google Search Webview, Instagram, etc.)
    const isApp = isInAppBrowser();
    const android = isAndroid();
    setAndroidDevice(android);

    // Don't show if user already dismissed it this session
    const isDismissed = sessionStorage.getItem("printeg_dismiss_inapp_banner");
    if (isApp && !isDismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("printeg_dismiss_inapp_banner", "true");
  };

  const handleOpenInChrome = () => {
    if (androidDevice) {
      const intentUrl = getChromeIntentUrl();
      window.location.href = intentUrl;
    } else {
      // Fallback for iOS or others: Copy link or prompt Safari
      navigator.clipboard?.writeText(window.location.href);
      alert("Link copied! Open Chrome or Safari and paste the link for best payment experience.");
    }
  };

  if (!showBanner) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900 animate-in slide-in-from-top duration-300 relative z-50">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
            <ShieldAlert size={16} />
          </div>
          <div>
            <p className="font-bold text-slate-900">
              In-App Browser Detected (Google Search / App)
            </p>
            <p className="text-slate-600">
              For instant 1-tap UPI payments (GPay/PhonePe) without duplicate prompts, open in Google Chrome.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleOpenInChrome}
            className="flex-1 sm:flex-none px-3.5 py-1.5 bg-black text-white font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <ExternalLink size={13} />
            {androidDevice ? "Open in Chrome" : "Copy Link"}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-amber-100/60 transition-colors"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
