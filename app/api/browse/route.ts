import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("tickets");
    
    const query = {
      status: "confirmed",
    };
    
    const tickets = await db
      .collection("tickets")
      .find(query)
      .toArray();

    return NextResponse.json(tickets);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}