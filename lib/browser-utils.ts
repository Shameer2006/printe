/**
 * In-App Browser detection and Android Chrome Intent utilities for PrintEG
 */

export function isAndroid(): boolean {
  if (typeof window === "undefined" || !navigator.userAgent) return false;
  return /Android/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof window === "undefined" || !navigator.userAgent) return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Checks if the current page is running inside an In-App Browser
 * (Google Search App WebView, Instagram, Facebook, WhatsApp, etc.)
 */
export function isInAppBrowser(): boolean {
  if (typeof window === "undefined" || !navigator.userAgent) return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";

  // Common in-app browser user agent signatures:
  // - GSA: Google Search App for Android/iOS
  // - FBAV / FBAN: Facebook App
  // - Instagram: Instagram App
  // - Line, WhatsApp, Twitter, ByteLocale, TikTok
  // - wv: Android WebView signature
  const inAppSignatures = [
    /GSA\//i,                 // Google Search App
    /FBAN|FBAV/i,             // Facebook
    /Instagram/i,             // Instagram
    /Line\//i,                // Line
    /WhatsApp/i,              // WhatsApp
    /Twitter|TwitterAndroid/i,// Twitter / X
    /MicroMessenger/i,        // WeChat
    /Snapchat/i,              // Snapchat
    /; wv\)/i,                // Android System WebView indicator
    /Version\/.*Chrome/i,     // WebView with Chrome engine
  ];

  return inAppSignatures.some((sig) => sig.test(ua));
}

/**
 * Generates an Android Chrome Intent URL for the current or target URL
 */
export function getChromeIntentUrl(targetUrl?: string): string {
  if (typeof window === "undefined") return "";
  const urlObj = new URL(targetUrl || window.location.href);
  const host = urlObj.host;
  const path = urlObj.pathname + urlObj.search + urlObj.hash;

  return `intent://${host}${path}#Intent;scheme=https;package=com.android.chrome;end`;
}

/**
 * Attempts to automatically breakout from In-App browser to Chrome on Android
 */
export function tryOpenInChrome(): boolean {
  if (!isAndroid() || !isInAppBrowser()) return false;
  try {
    const intentUrl = getChromeIntentUrl();
    window.location.href = intentUrl;
    return true;
  } catch (err) {
    console.warn("Failed to launch Chrome intent:", err);
    return false;
  }
}
