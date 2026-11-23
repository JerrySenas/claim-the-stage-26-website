// app/api/seats/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { RAW_LAYOUT_SEATS } from "@/lib/seatLayout";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("seats"); // Uses the database from your connection string
    const collection = db.collection("seats"); // Replace with your actual collection name

    // Fetch seats. You may want to filter or project specific fields.
    const seatsFromDb = await collection.find({}).toArray();

    // Use RAW_LAYOUT_SEATS as the source of truth for seat coordinates.
    const seats = seatsFromDb.map((doc) => {
      const layoutSeat = RAW_LAYOUT_SEATS.find(
        (seat) => seat.seatCode === doc.seatCode
      );

      return {
        seatCode: doc.seatCode,
        tier: doc.tier,
        label: doc.label,
        status: doc.status,
        x: layoutSeat?.x,
        y: layoutSeat?.y,
      };
    });

    return NextResponse.json(seats);
  } catch (error) {
    console.error("Failed to fetch seats:", error);
    return NextResponse.json(
      { error: "Failed to load seat data" },
      { status: 500 }
    );
  }
}
