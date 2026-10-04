import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("seats");
    const seats = await db
      .collection("seats")
      .find({})
      .toArray();

    return NextResponse.json(seats);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch seats" },
      { status: 500 }
    );
  }
}

