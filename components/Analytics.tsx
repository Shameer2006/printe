"use client";

import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

/**
 * The Google tag (gtag.js).
 *
 * Loaded through next/script with `afterInteractive` rather than as raw tags in
 * <head>, so the analytics request is queued behind hydration instead of
 * competing with the upload and pricing code for the first paint.
 *
 * Page views for client-side navigations come from GA4's enhanced measurement
 * ("page changes based on browser history events"), which is on by default —
 * sending them from here as well would double-count every route change.
 */
export function Analytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
