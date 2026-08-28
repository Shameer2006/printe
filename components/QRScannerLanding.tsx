"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, ArrowRight, Store, AlertCircle, RefreshCw, MapPin, CheckCircle2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface RegisteredStore {
  id: string;
  shopName: string;
  slug: string;
  location?: string;
}

export default function QRScannerLanding() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isTransitioningRef = useRef(false);
  const isScanningRef = useRef(false);
  const isMountedRef = useRef(true);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string>("");
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Registered Stores from Firestore
  const [allStores, setAllStores] = useState<RegisteredStore[]>([]);

  // Fetch registered stores in real-time from both clients and vendors collections
  useEffect(() => {
    const unsubscribeClients = onSnapshot(query(collection(db, "clients")), (snapshot) => {
      const clientStores: RegisteredStore[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.shopName && (d.status === "active" || !d.status)) {
          const rawSlug = d.slug || docSnap.id;
          const cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
          clientStores.push({
            id: docSnap.id,
            shopName: d.shopName,
            slug: cleanSlug,
            location: d.location || "",
          });
        }
      });

      setAllStores((prev) => {
        const existingIds = new Set(clientStores.map((s) => s.slug));
        const merged = [...clientStores, ...prev.filter((p) => !existingIds.has(p.slug))];
        return merged;
      });
    }, (err) => {
      console.warn("Could not load clients for autocomplete:", err);
    });

    const unsubscribeVendors = onSnapshot(query(collection(db, "vendors")), (snapshot) => {
      const vendorStores: RegisteredStore[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.storeName && (d.isActive === true || d.isActive === undefined)) {
          const rawSlug = d.slug || docSnap.id;
          const cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
          vendorStores.push({
            id: docSnap.id,
            shopName: d.storeName,
            slug: cleanSlug,
            location: d.location || "",
          });
        }
      });

      setAllStores((prev) => {
        const existingSlugs = new Set(prev.map((s) => s.slug));
        const newVendors = vendorStores.filter((v) => !existingSlugs.has(v.slug));
        return [...prev, ...newVendors];
      });
    }, (err) => {
      console.warn("Could not load vendors for autocomplete:", err);
    });

    return () => {
      unsubscribeClients();
      unsubscribeVendors();
    };
  }, []);

  const navigateToStore = useCallback((slug: string) => {
    router.push(`/store/${slug}`);
  }, [router]);

  const safeStopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    if (isTransitioningRef.current) {
      await new Promise((r) => setTimeout(r, 200));
    }

    try {
      if (scanner.isScanning) {
        isTransitioningRef.current = true;
        await scanner.stop();
        isTransitioningRef.current = false;
        isScanningRef.current = false;
      }
    } catch {
      isTransitioningRef.current = false;
      isScanningRef.current = false;
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

  const startScanner = useCallback(async () => {
    if (!isMountedRef.current) return;
    if (isTransitioningRef.current || isScanningRef.current) return;

    const el = document.getElementById("landing-qr-reader");
    if (!el) return;

    setIsStartingCamera(true);
    setCameraError("");

    if (!scannerRef.current) {
      try {
        scannerRef.current = new Html5Qrcode("landing-qr-reader");
      } catch (err) {
        console.warn("Could not create Html5Qrcode:", err);
        return;
      }
    }

    const scanner = scannerRef.current;
    if (!scanner) return;

    if (scanner.isScanning) {
      setIsStartingCamera(false);
      setCameraActive(true);
      return;
    }

    isTransitioningRef.current = true;
    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          handleDecodedRef.current(decodedText);
        },
        () => {}
      );
      isTransitioningRef.current = false;
      isScanningRef.current = true;

      if (!isMountedRef.current) {
        if (scanner.isScanning) {
          scanner.stop().catch(() => {});
        }
        return;
      }

      setIsStartingCamera(false);
      setCameraActive(true);
    } catch (err: any) {
      isTransitioningRef.current = false;
      isScanningRef.current = false;
      if (!isMountedRef.current) return;

      setIsStartingCamera(false);
      setCameraActive(false);

      if (err?.name === "AbortError" || err?.message?.includes("play()") || err?.message?.includes("transition")) {
        return;
      }
      setCameraError(
        err?.message?.includes("Permission")
          ? "Camera permission denied."
          : "Camera unavailable. Enter shop name below."
      );
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    startScanner();

    return () => {
      isMountedRef.current = false;
      const scanner = scannerRef.current;
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [startScanner]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Case-insensitive matching filter
  const matchingStores = useMemo(() => {
    const clean = manualCode.trim().toLowerCase();
    if (!clean) return [];

    return allStores.filter((store) => {
      const name = (store.shopName || "").toLowerCase();
      const slug = (store.slug || "").toLowerCase();
      const loc = (store.location || "").toLowerCase();

      return name.includes(clean) || slug.includes(clean) || loc.includes(clean);
    }).slice(0, 6);
  }, [manualCode, allStores]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError("");

    // If there is an exact or first matching store, use its slug
    if (matchingStores.length > 0) {
      const topMatch = matchingStores[0];
      safeStopCamera();
      navigateToStore(topMatch.slug);
      return;
    }

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

  const handleSelectStore = (store: RegisteredStore) => {
    setManualCode(store.shopName);
    setIsFocused(false);
    safeStopCamera();
    navigateToStore(store.slug);
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

        {/* Shop Name Bar with Live Case-Insensitive Autocomplete */}
        <div ref={searchContainerRef} className="w-full relative">
          <form onSubmit={handleManualSubmit} className="space-y-1">
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Enter Shop Name or Code..."
                value={manualCode}
                onFocus={() => setIsFocused(true)}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setIsFocused(true);
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

          {/* Autocomplete Dropdown */}
          {isFocused && manualCode.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {matchingStores.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Available Shops</span>
                    <span>{matchingStores.length} found</span>
                  </div>
                  {matchingStores.map((store) => (
                    <button
                      key={store.slug}
                      type="button"
                      onClick={() => handleSelectStore(store)}
                      className="w-full text-left p-3 rounded-xl hover:bg-slate-100/90 active:bg-slate-200 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-black group-hover:text-white flex items-center justify-center text-slate-700 transition-colors">
                          <Store size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-black flex items-center gap-1.5">
                            {store.shopName}
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            {store.location && (
                              <span className="flex items-center gap-0.5 text-slate-500">
                                <MapPin size={10} /> {store.location} •
                              </span>
                            )}
                            <span>/store/{store.slug}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-black transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-xs font-semibold text-slate-600">No registered store matching &quot;{manualCode}&quot;</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Press Enter to attempt direct store lookup</p>
                </div>
              )}
            </div>
          )}
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
