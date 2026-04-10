/**
 * Calculate monthly bill for a coach based on their active client count.
 */
export function calculateMonthlyBill(
  activeClientCount: number,
  basePriceMonthly: number,
  includedClients: number,
  extraClientPrice: number
): number {
  const extraClients = Math.max(0, activeClientCount - includedClients);
  return basePriceMonthly + extraClients * extraClientPrice;
}
