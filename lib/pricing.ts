export type Tier = "VIP" | "PLATINUM" | "GOLD";

export const TIER_PRICE: Record<Tier, number> = {
  VIP: 0,
  PLATINUM: 250,
  GOLD: 150,
};

export const SILVER_PRICE = 100;

export interface PricedSeat {
  tier: Tier;
  status?: string; // optional; only "available" seats are counted by default
}

export interface PricedSeat {
  tier: Tier;
  status?: string;
}

export interface SeatDoc extends PricedSeat {
  seatCode: string;
  label: string;
}

/**
 * Sums the price of the given seats using TIER_PRICE.
 * By default only counts seats with status "available"
 * (pass { onlyAvailable: false } to include all).
 */
export function totalPrice(
  seats: PricedSeat[],
  options: { onlyAvailable?: boolean } = {}
): number {
  const { onlyAvailable = true } = options;

  return seats.reduce((sum, seat) => {
    if (onlyAvailable && seat.status !== undefined && seat.status !== "available") {
      return sum;
    }
    return sum + (TIER_PRICE[seat.tier] ?? 0);
  }, 0);
}

/** Seat total + Silver standing tickets. */
export function grandTotal(seats: PricedSeat[], silver: number): number {
  return totalPrice(seats) + silver * SILVER_PRICE;
}