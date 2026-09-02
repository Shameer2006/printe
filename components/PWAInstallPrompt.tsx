"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Check } from "lucide-react";
import { isIOS } from "@/lib/browser-utils";

interface PWAInstallPromptProps {
  storeName?: string;
}

export function PWAInstallPrompt({ storeName }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (PWA installed)
    const isApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isApp) {
      setIsStandalone(true);
      return;
    }

    // Check if dismissed previously
    const isDismissed = localStorage.getItem("printeg_pwa_dismissed");
    if (isDismissed) return;

    // Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // iOS check: If on iOS Safari and not standalone
    if (isIOS() && !isApp && !isDismissed) {
      // Show prompt after a slight delay
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setTimeout(() => setShowPrompt(false), 2000);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem("printeg_pwa_dismissed", "true");
  };

  if (isStandalone || !showPrompt) return null;

  const appTitle = storeName ? `${storeName} App` : "PrintEG App";

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex items-start gap-3.5 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
            <Smartphone size={20} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white truncate">
                Install {appTitle}
              </h4>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Add to Home Screen for fast 1-tap printing, zero payment loops & instant receipts.
            </p>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstallClick}
                disabled={installed}
                className="px-3.5 py-1.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
              >
                {installed ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    Installed!
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Download App
                  </>
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base">Install on iPhone / iPad</h3>
              <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-black">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">1</span>
                <span>Tap the <strong>Share</strong> button at the bottom of Safari.</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">3</span>
                <span>Tap <strong>Add</strong> in the top right.</span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 bg-black text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
