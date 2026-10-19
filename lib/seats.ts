import {
  BOOKABLE_TIERS,
  BOOKED_SEATS,
  LAYOUT_SEATS,
  TIER_PRICE,
  type LayoutSeat,
  type Tier,
} from "@/lib/seatLayout";

export type SeatStatus = "available" | "held" | "occupied" | "reserved";

export interface SeatView extends LayoutSeat {
  price: number;
  status: SeatStatus;
}

const layoutByCode = new Map<string, LayoutSeat>(
  LAYOUT_SEATS.map((seat) => [seat.seatCode, seat])
);
const bookedSet = new Set(BOOKED_SEATS);

export function getLayoutSeat(seatCode: string) {
  return layoutByCode.get(seatCode);
}

export function isBookableTier(tier: Tier) {
  return BOOKABLE_TIERS.includes(tier);
}

export async function seatsCollection() {
  // Loaded lazily so a missing MONGODB_URI is a catchable error, not a crash on import.
  const { default: clientPromise } = await import("@/lib/mongodb");
  const client = await clientPromise;
  return client.db("seats").collection("seats");
}

let indexReady: Promise<unknown> | undefined;
/** Makes sure a seat code can only exist once in the database. */
export function ensureSeatIndex() {
  indexReady ??= seatsCollection()
    .then((seats) => seats.createIndex({ seatCode: 1 }, { unique: true }))
    .catch((e) => {
      // e.g. old duplicate documents; booking still works, atomically per document
      console.error("Could not create unique seatCode index", e);
    });
  return indexReady;
}

/**
 * The seat map shown on the website: every seat of the venue layout, with its
 * live status. Seats booked and paid before this system (BOOKED_SEATS) are
 * always "occupied", whatever the database says.
 */
export async function getSeatMap(): Promise<{ seats: SeatView[]; live: boolean }> {
  // If the database can't be reached the layout is still returned (so the map
  // can be viewed), but `live` is false and nothing should be bookable.
  const dbStatus = new Map<string, string>();
  let live = true;
  try {
    const seats = await seatsCollection();
    const docs = await seats
      .find({}, { projection: { seatCode: 1, status: 1 } })
      .toArray();
    for (const doc of docs) dbStatus.set(doc.seatCode as string, doc.status as string);
  } catch (e) {
    console.error("Seat database unavailable, serving static layout", e);
    live = false;
  }

  const seats = LAYOUT_SEATS.map((seat) => {
    let status: SeatStatus = "available";
    if (!isBookableTier(seat.tier)) status = "reserved";
    else if (bookedSet.has(seat.seatCode)) status = "occupied";
    else if (dbStatus.get(seat.seatCode) === "occupied") status = "occupied";
    else if (dbStatus.get(seat.seatCode) === "held") status = "held";

    return { ...seat, price: TIER_PRICE[seat.tier], status };
  });
  return { seats, live };
}

export type HoldResult =
  | { ok: true; seatCodes: string[]; totalPrice: number }
  | { ok: false; error: string; unavailable: string[] };

/**
 * Atomically holds the given seats. Either every seat is held, or none is.
 */
export async function holdSeats(requested: unknown): Promise<HoldResult> {
  if (
    !Array.isArray(requested) ||
    requested.length === 0 ||
    requested.length > 10 ||
    requested.some((code) => typeof code !== "string")
  ) {
    return { ok: false, error: "Select between 1 and 10 seats.", unavailable: [] };
  }

  const codes = [...new Set(requested as string[])];
  const unavailable: string[] = [];
  let totalPrice = 0;

  for (const code of codes) {
    const seat = getLayoutSeat(code);
    if (!seat || !isBookableTier(seat.tier) || bookedSet.has(code)) {
      unavailable.push(code);
    } else {
      totalPrice += TIER_PRICE[seat.tier];
    }
  }
  if (unavailable.length > 0) {
    return { ok: false, error: "Some seats are not available.", unavailable };
  }

  await ensureSeatIndex();
  const seats = await seatsCollection();
  const held: string[] = [];

  for (const code of codes) {
    const seat = getLayoutSeat(code)!;
    // Create the seat document if this seat was never touched before.
    await seats.updateOne(
      { seatCode: code },
      {
        $setOnInsert: {
          seatCode: code,
          price: TIER_PRICE[seat.tier],
          status: "available",
        },
      },
      { upsert: true }
    );
    // Only succeeds if the seat is still free: this is what prevents double booking.
    const result = await seats.updateOne(
      { seatCode: code, status: "available" },
      { $set: { status: "held" } }
    );
    if (result.modifiedCount === 1) held.push(code);
    else unavailable.push(code);
  }

  if (unavailable.length > 0) {
    if (held.length > 0) {
      await seats.updateMany(
        { seatCode: { $in: held }, status: "held" },
        { $set: { status: "available" } }
      );
    }
    return {
      ok: false,
      error: "Some seats were just taken by someone else.",
      unavailable,
    };
  }

  return { ok: true, seatCodes: codes, totalPrice };
}

export async function releaseSeats(seatCodes: string[]) {
  const seats = await seatsCollection();
  await seats.updateMany(
    { seatCode: { $in: seatCodes }, status: "held" },
    { $set: { status: "available" } }
  );
}
