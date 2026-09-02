import { GATEWAY_FEE_RATE, PLATFORM_FEE_RATE, type PricingBreakdown } from "@/lib/pricing";

interface MoneyProps {
  value: number;
  /** Sizing / weight for the rupee digits. */
  className?: string;
  /** Sizing for the ₹ symbol and the paise, relative to the rupee digits. */
  subClassName?: string;
}

/**
 * Renders an amount with the currency symbol and the paise held visually
 * subordinate to the rupee digits, so a price reads as its whole-rupee figure
 * first. The full amount is still announced to screen readers.
 */
export function Money({
  value,
  className = "",
  subClassName = "text-[0.6em] opacity-55",
}: MoneyProps) {
  const safe = Number.isFinite(value) ? value : 0;
  const [rupees, paise] = safe.toFixed(2).split(".");

  return (
    <span className={`inline-flex items-baseline tabular-nums ${className}`}>
      <span aria-hidden="true" className="inline-flex items-baseline">
        <span className={`${subClassName} mr-[0.08em]`}>₹</span>
        {rupees}
        <span className={`${subClassName} ml-[0.04em]`}>.{paise}</span>
      </span>
      <span className="sr-only">₹{safe.toFixed(2)}</span>
    </span>
  );
}

const asPercent = (rate: number) => `${(rate * 100).toFixed(1).replace(/\.0$/, "")}%`;

/**
 * The two customer-borne charges, disclosed in full but kept typographically
 * quiet so the eye settles on the order itself and the amount due.
 */
export function FeeLines({ pricing }: { pricing: PricingBreakdown }) {
  if ((pricing.gatewayFee || 0) <= 0 && (pricing.platformFee || 0) <= 0) return null;

  const platformNote =
    (pricing.platformFlatFee || 0) > 0
      ? "flat"
      : asPercent(pricing.platformFeeRate || PLATFORM_FEE_RATE);

  return (
    <div className="space-y-1 text-[11px] leading-tight text-gray-400">
      <div className="flex justify-between items-center">
        <span title="Charged by the payment gateway on the amount it processes — the print cost plus the platform charge.">
          Gateway charge{" "}
          <span className="text-gray-300">
            ({asPercent(pricing.gatewayFeeRate || GATEWAY_FEE_RATE)})
          </span>
        </span>
        <Money value={pricing.gatewayFee || 0} className="font-medium" />
      </div>
      <div className="flex justify-between items-center">
        <span title="Keeps the PrintEG platform running.">
          Platform charge <span className="text-gray-300">({platformNote})</span>
        </span>
        <Money value={pricing.platformFee} className="font-medium" />
      </div>
    </div>
  );
}
