/**
 * Pricing and Platform Fee Utilities for PrintEG
 */

export const PLATFORM_FEE_RATE = 0.08; // 8%

export interface PricingBreakdown {
  subtotal: number;
  platformFeeRate: number;
  platformFee: number;
  vendorAmount: number;
  totalAmount: number;
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
