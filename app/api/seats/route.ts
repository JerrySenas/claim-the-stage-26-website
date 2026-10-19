import { NextResponse } from "next/server";
import { getSeatMap } from "@/lib/seats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { seats, live } = await getSeatMap();
    return NextResponse.json(seats, {
      headers: { "x-seat-data": live ? "live" : "static" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch seats" },
      { status: 500 }
    );
  }
}
