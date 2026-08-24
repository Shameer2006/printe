"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, ScanLine } from "lucide-react";

interface QRScannerProps {
  onClose: () => void;
}

export function QRScanner({ onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const [error, setError] = useState<string>("");
  const [isStarting, setIsStarting] = useState(true);

  const safeStop = useCallback(async () => {
    if (scannerRef.current && isRunningRef.current) {
      try {
        isRunningRef.current = false;
        await scannerRef.current.stop();
      } catch {
        // Already stopped or not running — safe to ignore
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log("QR decoded:", decodedText);

          // Try to extract a /store/slug from the decoded text
          const storeMatch = decodedText.match(/\/store\/([a-zA-Z0-9_-]+)/);
          if (storeMatch) {
            safeStop();
            window.location.href = `/store/${storeMatch[1]}`;
            return;
          }

          // Validate full URLs: only allow internal domains (printeg.in, localhost)
          try {
            const url = new URL(decodedText);
            const isAllowedHost = 
              url.hostname === "printeg.in" || 
              url.hostname.endsWith(".printeg.in") || 
              url.hostname === "localhost" ||
              url.hostname === "127.0.0.1";

            if (isAllowedHost) {
              safeStop();
              window.location.href = url.pathname + url.search;
              return;
            } else {
              setError("External links are not supported for safety.");
              setTimeout(() => setError(""), 3000);
              return;
            }
          } catch {
            // Not a URL
          }

          setError("Could not find a valid PrintEG store link in this QR code.");
          setTimeout(() => setError(""), 3000);
        },
        () => {
          // Ignore scan failures (no QR found in frame)
        }
      )
      .then(() => {
        if (cancelled) {
          // Component unmounted before scanner started (React Strict Mode)
          scanner.stop().catch(() => {});
          return;
        }
        isRunningRef.current = true;
        setIsStarting(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setIsStarting(false);
        setError(
          err?.message?.includes("Permission")
            ? "Camera permission denied. Please allow camera access and try again."
            : "Unable to access camera. Please make sure your device has a camera."
        );
      });

    return () => {
      cancelled = true;
      safeStop();
    };
  }, [safeStop]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            <h2 className="font-bold text-lg">Scan Store QR Code</h2>
          </div>
          <button
            onClick={() => {
              safeStop();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scanner */}
        <div className="relative">
          <div id="qr-reader" className="w-full" />
          {isStarting && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500">Starting camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Info / Error */}
        <div className="p-4 space-y-2">
          {error ? (
            <p className="text-sm text-red-500 text-center font-medium">{error}</p>
          ) : (
            <p className="text-sm text-gray-500 text-center">
              Point your camera at a vendor&apos;s PrintEG QR code to open their store.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
