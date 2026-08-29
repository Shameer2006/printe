/**
 * Pricing and Fee Utilities for PrintEG
 *
 * Every paid order carries two customer-borne charges on top of the shop's price:
 *
 *   Platform charge  a flat ₹0.20 on bills of ₹40 or less; 0.5% of the subtotal above that.
 *   Gateway charge   0.5% of the subtotal *plus the platform charge*, always.
 *
 * The order matters. The gateway bills us on the money it actually moves, which
 * includes the platform charge, so charging the gateway rate on the subtotal alone
 * would leave us absorbing the gateway's cut of our own fee on every order.
 */

/** Payment gateway charge, applied to the subtotal plus the platform charge. */
export const GATEWAY_FEE_RATE = 0.005; // 0.5%

/** Platform charge for bills above PLATFORM_FLAT_FEE_MAX_SUBTOTAL. */
export const PLATFORM_FEE_RATE = 0.005; // 0.5%

/** Platform charge for bills of PLATFORM_FLAT_FEE_MAX_SUBTOTAL or less. */
export const PLATFORM_FLAT_FEE = 0.2; // ₹0.20

/** Bills up to and including this amount pay the flat platform charge instead of the rate. */
export const PLATFORM_FLAT_FEE_MAX_SUBTOTAL = 40; // ₹40

export interface PricingBreakdown {
  subtotal: number;
  gatewayFeeRate: number;
  /** Amount the gateway rate is applied to: subtotal + platform charge. */
  gatewayFeeBase: number;
  gatewayFee: number;
  /** 0 when the flat platform charge applies. */
  platformFeeRate: number;
  platformFee: number;
  /** Flat charge applied instead of the rate, else 0. */
  platformFlatFee: number;
  vendorAmount: number;
  totalAmount: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Calculates the pricing breakdown for an order.
 *
 * @param subtotal - Base price of printing / sheets / services
 * @param options - Config options (e.g. applyFees: false to charge the subtotal alone)
 */
export function calculateOrderPricing(
  subtotal: number,
  options: { applyFees?: boolean } = { applyFees: true }
): PricingBreakdown {
  const roundedSubtotal = round2(subtotal);
  const applyFees = options.applyFees !== false;

  if (!applyFees || roundedSubtotal <= 0) {
    return {
      subtotal: roundedSubtotal,
      gatewayFeeRate: 0,
      gatewayFeeBase: 0,
      gatewayFee: 0,
      platformFeeRate: 0,
      platformFee: 0,
      platformFlatFee: 0,
      vendorAmount: roundedSubtotal,
      totalAmount: roundedSubtotal,
    };
  }

  const useFlatFee = roundedSubtotal <= PLATFORM_FLAT_FEE_MAX_SUBTOTAL;
  const platformFee = useFlatFee
    ? PLATFORM_FLAT_FEE
    : round2(roundedSubtotal * PLATFORM_FEE_RATE);

  // The gateway charges on everything it processes, our platform charge included.
  const gatewayFeeBase = round2(roundedSubtotal + platformFee);
  const gatewayFee = round2(gatewayFeeBase * GATEWAY_FEE_RATE);

  return {
    subtotal: roundedSubtotal,
    gatewayFeeRate: GATEWAY_FEE_RATE,
    gatewayFeeBase,
    gatewayFee,
    platformFeeRate: useFlatFee ? 0 : PLATFORM_FEE_RATE,
    platformFee,
    platformFlatFee: useFlatFee ? PLATFORM_FLAT_FEE : 0,
    vendorAmount: roundedSubtotal,
    totalAmount: round2(gatewayFeeBase + gatewayFee),
  };
}
