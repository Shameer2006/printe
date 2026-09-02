import { PriceTier, VendorPricing, BindingPricing, BindingItemConfig } from "./types";

export const PLATFORM_FEE_RATE = 0.08; // 8%

export const DEFAULT_BINDING_CONFIG: BindingPricing = {
  enabled: true,
  items: [
    {
      id: "spiral",
      name: "Spiral Binding",
      description: "Plastic coil with transparent protective front & back covers",
      enabled: true,
      type: "tiered",
      tiers: [
        { id: "1", minSheets: 1, maxSheets: 49, price: 20 },
        { id: "2", minSheets: 50, maxSheets: 80, price: 25 },
        { id: "3", minSheets: 81, maxSheets: null, price: 30 },
      ],
    },
    {
      id: "soft",
      name: "Soft Binding",
      description: "Booklet thermal softcover wrap binding for projects & reports",
      enabled: true,
      type: "flat",
      flatPrice: 15,
    },
    {
      id: "calico",
      name: "Calico Binding",
      description: "Hardcover cloth binding with gold lettering",
      enabled: true,
      type: "with_without_print",
      withPrintPrice: 40,
      withoutPrintPrice: 30,
    },
    {
      id: "chart",
      name: "Chart Bind",
      description: "Thick chart paper binding with strip",
      enabled: true,
      type: "with_without_print",
      withPrintPrice: 30,
      withoutPrintPrice: 25,
    },
  ],
};

export interface BindingCalculationResult {
  bindingId: string;
  bindingName: string;
  bindingOption: string;
  price: number;
  label: string;
}

/**
 * Calculates the exact binding price based on total physical sheets and binding options.
 */
export function calculateBindingCost(
  totalSheets: number,
  selectedBindingId: string,
  optionType: "standard" | "with_print" | "without_print" = "standard",
  bindingConfig?: BindingPricing
): BindingCalculationResult {
  if (selectedBindingId === "none" || !selectedBindingId) {
    return {
      bindingId: "none",
      bindingName: "None (Loose Sheets)",
      bindingOption: "none",
      price: 0,
      label: "No Binding (Loose Sheets)",
    };
  }

  const config = bindingConfig || DEFAULT_BINDING_CONFIG;
  if (!config.enabled) {
    return {
      bindingId: "none",
      bindingName: "None",
      bindingOption: "none",
      price: 0,
      label: "No Binding",
    };
  }

  const item = config.items?.find((i) => i.id === selectedBindingId && i.enabled);
  if (!item) {
    return {
      bindingId: "none",
      bindingName: "None",
      bindingOption: "none",
      price: 0,
      label: "No Binding",
    };
  }

  let price = 0;
  let label = item.name;

  if (item.type === "flat") {
    price = item.flatPrice ?? 15;
    label = item.name;
  } else if (item.type === "with_without_print") {
    if (optionType === "without_print") {
      price = item.withoutPrintPrice ?? 25;
      label = `${item.name} (Without Print)`;
    } else {
      price = item.withPrintPrice ?? 30;
      label = `${item.name} (With Print)`;
    }
  } else if (item.type === "tiered") {
    const tiers = item.tiers || [];
    const sorted = [...tiers].sort((a, b) => a.minSheets - b.minSheets);
    const matched = sorted.find((t) => {
      if (totalSheets < t.minSheets) return false;
      if (t.maxSheets !== null && t.maxSheets !== undefined && totalSheets > t.maxSheets) return false;
      return true;
    });
    price = matched ? matched.price : (sorted[sorted.length - 1]?.price ?? 25);
    const rangeStr = matched
      ? (matched.maxSheets ? `${matched.minSheets}–${matched.maxSheets} sheets` : `${matched.minSheets}+ sheets`)
      : "";
    label = rangeStr ? `${item.name} (${rangeStr})` : item.name;
  }

  return {
    bindingId: item.id,
    bindingName: item.name,
    bindingOption: optionType,
    price,
    label,
  };
}

export interface PricingBreakdown {
  subtotal: number;
  platformFeeRate: number;
  platformFee: number;
  vendorAmount: number;
  totalAmount: number;
}

export interface TierPricingResult {
  rate: number;
  matchedTier?: PriceTier;
  tierLabel?: string;
  isDiscounted: boolean;
  baseRate: number;
  nextTierHint?: string;
}

/**
 * Calculates the unit rate per sheet based on total volume and vendor pricing tiers.
 */
export function getTieredPricePerSheet(
  totalSheets: number,
  options: {
    isColor: boolean;
    printSide: "single" | "double";
    pricing?: VendorPricing;
  }
): TierPricingResult {
  const { isColor, printSide, pricing } = options;
  const baseRate = isColor
    ? (pricing?.color ?? 10)
    : (printSide === "double" ? (pricing?.doubleSided ?? 2) : (pricing?.bw ?? 1.5));

  if (pricing?.enableTiers === false) {
    return {
      rate: baseRate,
      baseRate,
      isDiscounted: false,
    };
  }

  const tiers = pricing?.tiers;
  if (!tiers || tiers.length === 0) {
    return {
      rate: baseRate,
      baseRate,
      isDiscounted: false,
    };
  }

  // Sort tiers ascending by minPages
  const sortedTiers = [...tiers].sort((a, b) => a.minPages - b.minPages);

  // Find the matching tier
  const matched = sortedTiers.find((t) => {
    if (totalSheets < t.minPages) return false;
    if (t.maxPages !== null && t.maxPages !== undefined && totalSheets > t.maxPages) return false;
    return true;
  });

  if (!matched) {
    return {
      rate: baseRate,
      baseRate,
      isDiscounted: false,
    };
  }

  let rate = baseRate;
  if (isColor) {
    rate = matched.colorRate ?? baseRate;
  } else if (printSide === "double") {
    rate = matched.doubleSidedRate ?? baseRate;
  } else {
    rate = matched.bwRate ?? baseRate;
  }

  const tierLabel = matched.maxPages
    ? `${matched.minPages}–${matched.maxPages} pages`
    : `${matched.minPages}+ pages`;

  // Look for next tier discount hint if customer is close
  let nextTierHint: string | undefined = undefined;
  const currentTierIndex = sortedTiers.indexOf(matched);
  if (currentTierIndex >= 0 && currentTierIndex < sortedTiers.length - 1) {
    const nextTier = sortedTiers[currentTierIndex + 1];
    const diff = nextTier.minPages - totalSheets;
    if (diff > 0 && diff <= 15) {
      const nextRate = isColor
        ? (nextTier.colorRate ?? (pricing?.color ?? 10))
        : (printSide === "double" ? (nextTier.doubleSidedRate ?? (pricing?.doubleSided ?? 2)) : (nextTier.bwRate ?? (pricing?.bw ?? 1.5)));
      if (nextRate < rate) {
        nextTierHint = `Add ${diff} more sheet${diff > 1 ? 's' : ''} to get ₹${nextRate.toFixed(2)}/sheet bulk rate!`;
      }
    }
  }

  return {
    rate,
    baseRate,
    matchedTier: matched,
    tierLabel,
    isDiscounted: rate < baseRate,
    nextTierHint,
  };
}

/**
 * Calculates pricing breakdown including 8% platform fee where applicable.
 * 
 * @param subtotal - Base price of printing / sheets / services
 * @param options - Config options (e.g. applyPlatformFee: false for A4 blank sheets)
 */
export function calculateOrderPricing(
  subtotal: number,
  options: { applyPlatformFee?: boolean } = { applyPlatformFee: true }
): PricingBreakdown {
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const applyFee = options.applyPlatformFee !== false;

  if (!applyFee || roundedSubtotal <= 0) {
    return {
      subtotal: roundedSubtotal,
      platformFeeRate: 0,
      platformFee: 0,
      vendorAmount: roundedSubtotal,
      totalAmount: roundedSubtotal,
    };
  }

  const fee = Math.round(roundedSubtotal * PLATFORM_FEE_RATE * 100) / 100;
  const total = Math.round((roundedSubtotal + fee) * 100) / 100;

  return {
    subtotal: roundedSubtotal,
    platformFeeRate: PLATFORM_FEE_RATE,
    platformFee: fee,
    vendorAmount: roundedSubtotal,
    totalAmount: total,
  };
}
