/**
 * Loyalty points rules.
 * Earn: 1 point per 10 EGP spent on a DELIVERED order (never on cancelled/refunded).
 * Redeem: 100 points = 20 EGP off (5 points = 1 EGP), minimum 100 points per redemption.
 */

export const EARN_EGP_PER_POINT = 10;
export const REDEEM_POINTS_PER_EGP = 5; // 5 points = 1 EGP
export const MIN_REDEEM_POINTS = 100;

/** Points earned for a delivered order of the given total (EGP). */
export function computeEarnedPoints(orderTotal: number): number {
  return Math.floor(orderTotal / EARN_EGP_PER_POINT);
}

/** EGP discount value for redeeming a given number of points. */
export function computeRedemptionValue(points: number): number {
  return Math.floor(points / REDEEM_POINTS_PER_EGP);
}
