import clientPromise from "@/lib/mongodb";

export const RESERVATION_MS = 10 * 60 * 1000;

/**
 * Expires every pending ticket whose 10 minutes are up and frees its seats.
 * Safe to call as often as you like (it is atomic per ticket), so it is run
 * whenever seats or tickets are read/written instead of relying only on the
 * cron job. Expired tickets are kept, with status "expired".
 */
export async function expireOverdueTickets(): Promise<number> {
  const client = await clientPromise;
  const tickets = client.db("tickets").collection("tickets");
  const seats = client.db("seats").collection("seats");

  const now = new Date();
  const cutoff = new Date(now.getTime() - RESERVATION_MS);

  // Older tickets have no expiresAt, so fall back to createdAt + 10 minutes.
  const overdue = {
    status: "pending",
    $or: [
      { expiresAt: { $lte: now } },
      { expiresAt: { $exists: false }, createdAt: { $lte: cutoff } },
    ],
  };

  let count = 0;
  for (;;) {
    // Claim one ticket at a time so two requests never release the same one twice.
    const ticket = await tickets.findOneAndUpdate(
      overdue,
      { $set: { status: "expired", expiredAt: now } },
      { returnDocument: "before" }
    );
    if (!ticket) break;

    const codes: string[] = ticket.seats ?? [];
    if (codes.length > 0) {
      await seats.updateMany(
        { seatCode: { $in: codes }, status: "held" },
        { $set: { status: "available" } }
      );
    }
    count++;
  }
  return count;
}
