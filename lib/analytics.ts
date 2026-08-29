/**
 * Google Analytics 4.
 *
 * The tag itself is injected by `components/Analytics.tsx`. This module is the
 * only thing the rest of the app talks to, so no component has to care whether
 * gtag actually loaded.
 *
 * It very often has not. Ad blockers, privacy browsers and flaky campus wifi all
 * block googletagmanager, and this app runs on college networks — so every call
 * here is a silent no-op when the tag is missing. Analytics must never be able to
 * break a print order.
 */

/** Falls back to the property's own ID so the tag works without any env setup. */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-QZW8654MZH";

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Sends a GA4 event. Silently does nothing if the tag never loaded. */
export function track(event: string, params: GtagParams = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    window.gtag("event", event, params);
  } catch {
    // Analytics is never worth an exception in a payment or upload path.
  }
}

const ONCE_KEY = "printeg_ga_sent";
const ONCE_LIMIT = 30;

/**
 * Sends an event at most once per key, surviving reloads.
 *
 * The completion screen is reached by a gateway redirect and is routinely
 * reloaded or reopened from history, which would otherwise report the same
 * purchase several times and inflate revenue.
 */
export function trackOnce(key: string, event: string, params: GtagParams = {}): void {
  if (typeof window === "undefined") return;

  let sent: string[] = [];
  try {
    const raw = window.localStorage.getItem(ONCE_KEY);
    if (raw) sent = JSON.parse(raw) as string[];
    if (!Array.isArray(sent)) sent = [];
  } catch {
    sent = []; // Private mode or corrupt value — fall back to sending.
  }

  if (sent.includes(key)) return;

  track(event, params);

  try {
    // Keep only the most recent keys; this list is a de-dupe guard, not history.
    const next = [...sent, key].slice(-ONCE_LIMIT);
    window.localStorage.setItem(ONCE_KEY, JSON.stringify(next));
  } catch {
    // Nothing to do — worst case the event repeats on a reload.
  }
}
