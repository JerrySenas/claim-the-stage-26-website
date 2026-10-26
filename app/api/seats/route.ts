// app/api/seats/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { expireOverdueTickets } from "@/lib/expireTickets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Free seats whose 10-minute reservation has run out before showing the map.
    await expireOverdueTickets().catch((e) => console.error("expire failed", e));

    const client = await clientPromise;
    const db = client.db("seats"); // Uses the database from your connection string
    const collection = db.collection("seats"); // Replace with your actual collection name

    // Fetch seats. You may want to filter or project specific fields.
    const seatsFromDb = await collection.find({}).toArray();

    // Map MongoDB documents to the shape your frontend expects
    const seats = seatsFromDb.map((doc) => ({
      seatCode: doc.seatCode,
      tier: doc.tier,
      label: doc.label,
      status: doc.status,
      // Add these static fields if they are not stored in MongoDB:
      x: doc.x, // Replace with actual coordinate logic if not in DB
      y: doc.y,
    }));

    return NextResponse.json(seats);
  } catch (error) {
    console.error("Failed to fetch seats:", error);
    return NextResponse.json(
      { error: "Failed to load seat data" },
      { status: 500 }
    );
  }
}
