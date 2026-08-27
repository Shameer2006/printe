"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, ArrowRight, Store, AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QRScannerLanding() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const isMountedRef = useRef(true);

  const [cameraActive, setCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string>("");
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");

  const navigateToStore = useCallback((slug: string) => {
    router.push(`/store/${slug}`);
  }, [router]);

  const safeStopCamera = useCallback(async () => {
    if (scannerRef.current && isRunningRef.current) {
      isRunningRef.current = false;
      try {
        await scannerRef.current.stop();
      } catch {
        // silent ignore
      }
    }
    if (isMountedRef.current) {
      setCameraActive(false);
    }
  }, []);

  const handleDecodedText = useCallback((decodedText: string) => {
    const raw = decodedText.trim();
    console.log("QR Scanned:", raw);

    // 1. Match /store/slug in URL or path
    const storeMatch = raw.match(/\/store\/([a-zA-Z0-9_-]+)/i);
    if (storeMatch) {
      safeStopCamera();
      navigateToStore(storeMatch[1]);
      return;
    }

    // 2. Match ?vendor=slug query parameter
    const vendorMatch = raw.match(/[?&]vendor=([a-zA-Z0-9_-]+)/i);
    if (vendorMatch) {
      safeStopCamera();
      navigateToStore(vendorMatch[1]);
      return;
    }

    // 3. Match printeg:slug format
    if (raw.toLowerCase().startsWith("printeg:")) {
      const slug = raw.split(":")[1]?.trim();
      if (slug) {
        safeStopCamera();
        navigateToStore(slug);
        return;
      }
    }

    // 4. Match plain slug (e.g. "sri-ganesh-xerox")
    if (/^[a-zA-Z0-9_-]{2,50}$/.test(raw) && !raw.includes(".") && !raw.includes("/")) {
      safeStopCamera();
      navigateToStore(raw);
      return;
    }

    // 5. If it's a URL within printeg domain, navigate to its path
    if (raw.includes("printeg")) {
      try {
        const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
        safeStopCamera();
        window.location.href = url.pathname;
        return;
      } catch {
        // continue
      }
    }

    // 6. Generic valid URL fallback
    try {
      const url = new URL(raw);
      safeStopCamera();
      window.location.href = url.href;
      return;
    } catch {
      // not a valid URL
    }

    setCameraError("Could not detect a valid shop QR code.");
    setTimeout(() => {
      if (isMountedRef.current) setCameraError("");
    }, 3000);
  }, [safeStopCamera, navigateToStore]);

  // Keep a stable ref to callback to prevent scanner restarts on re-renders
  const handleDecodedRef = useRef(handleDecodedText);
  useEffect(() => {
    handleDecodedRef.current = handleDecodedText;
  }, [handleDecodedText]);

  const startScanner = useCallback(() => {
    if (!isMountedRef.current) return;
    setIsStartingCamera(true);
    setCameraError("");

    // Create single scanner instance
    if (!scannerRef.current) {
      try {
        scannerRef.current = new Html5Qrcode("landing-qr-reader");
      } catch (err) {
        console.warn("Error creating Html5Qrcode instance:", err);
      }
    }

    const scanner = scannerRef.current;
    if (!scanner) return;

    // If already running, do nothing
    if (isRunningRef.current) {
      setIsStartingCamera(false);
      setCameraActive(true);
      return;
    }

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          handleDecodedRef.current(decodedText);
        },
        () => {
          // ignore scan frame ticks
        }
      )
      .then(() => {
        if (!isMountedRef.current) {
          scanner.stop().catch(() => {});
          return;
        }
        isRunningRef.current = true;
        setIsStartingCamera(false);
        setCameraActive(true);
      })
      .catch((err: any) => {
        if (!isMountedRef.current) return;
        setIsStartingCamera(false);
        setCameraActive(false);
        // Suppress benign AbortError from React Dev Hot-Reloading
        if (err?.name === "AbortError" || err?.message?.includes("play()")) {
          return;
        }
        setCameraError(
          err?.message?.includes("Permission")
            ? "Camera permission denied."
            : "Camera unavailable. Enter shop name below."
        );
      });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    startScanner();

    return () => {
      isMountedRef.current = false;
      if (scannerRef.current && isRunningRef.current) {
        isRunningRef.current = false;
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [startScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError("");

    const clean = manualCode
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (!clean || clean.length < 2) {
      setManualError("Please enter a valid shop name");
      return;
    }

    safeStopCamera();
    navigateToStore(clean);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center space-y-6">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black text-2xl mx-auto shadow-md shadow-black/10">
            P
          </div>
          <h1 className="text-xl font-bold tracking-tight">PrintEG</h1>
          <p className="text-xs text-slate-500 font-medium">Scan shop QR code to start printing</p>
        </div>

        {/* Live Camera Scanner Box */}
        <div className="w-full bg-white rounded-3xl p-3.5 border border-slate-200 shadow-xl relative overflow-hidden">
          <div className="relative aspect-square w-full bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
            {/* HTML5 QR Camera Element */}
            <div id="landing-qr-reader" className="w-full h-full object-cover" />

            {/* Target Reticle & Laser Scan Line */}
            {cameraActive && !isStartingCamera && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="relative w-44 h-44 sm:w-48 sm:h-48">
                  {/* Corner Target Brackets */}
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-3 border-l-3 border-emerald-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-3 border-r-3 border-emerald-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-3 border-l-3 border-emerald-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-3 border-r-3 border-emerald-400 rounded-br-xl" />

                  {/* Animated Scanning Laser Line */}
                  <div
                    className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse"
                    style={{
                      animation: "scanLaser 2s ease-in-out infinite alternate",
                      top: "50%"
                    }}
                  />
                </div>
              </div>
            )}

            {/* Camera Starting Overlay */}
            {isStartingCamera && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center text-white space-y-2">
                <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-300">Starting Camera...</p>
              </div>
            )}

            {/* Camera Error Fallback View */}
            {!isStartingCamera && !cameraActive && (
              <div className="absolute inset-0 bg-slate-900 p-4 flex flex-col items-center justify-center text-center text-white space-y-2">
                <Camera size={22} className="text-rose-400" />
                <p className="text-xs text-rose-300 font-medium">{cameraError || "Camera not available"}</p>
                <button
                  type="button"
                  onClick={startScanner}
                  className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1 mt-1 active:scale-95"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Shop Name Bar */}
        <div className="w-full">
          <form onSubmit={handleManualSubmit} className="space-y-1">
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Enter Shop Name or Code..."
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  if (manualError) setManualError("");
                }}
                className={`w-full pl-11 pr-14 py-3.5 bg-white border rounded-2xl text-sm font-bold text-slate-900 shadow-sm outline-none transition-all ${
                  manualError ? "border-rose-500 focus:ring-2 focus:ring-rose-200" : "border-slate-200 focus:ring-2 focus:ring-black"
                }`}
              />
              <button
                type="submit"
                className="absolute right-2 top-2 bottom-2 px-3.5 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center transition-all active:scale-95 shadow-sm"
              >
                <ArrowRight size={16} />
              </button>
            </div>
            {manualError && (
              <p className="text-rose-500 text-xs pl-2 font-semibold flex items-center gap-1">
                <AlertCircle size={12} /> {manualError}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* CSS Animation for laser & QR reader styling */}
      <style jsx global>{`
        #landing-qr-reader {
          border: none !important;
          width: 100% !important;
          height: 100% !important;
        }
        #landing-qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1rem !important;
        }
        #landing-qr-reader img,
        #landing-qr-reader span,
        #landing-qr-reader a {
          display: none !important;
        }
        @keyframes scanLaser {
          0% {
            top: 15%;
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: 85%;
            opacity: 0.8;
          }
        }
      `}</style>
    </main>
  );
}
