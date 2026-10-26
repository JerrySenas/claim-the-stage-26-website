import { NextResponse } from "next/server";
import { expireOverdueTickets } from "@/lib/expireTickets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const expiredCount = await expireOverdueTickets();
    return NextResponse.json({ ok: true, expiredCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to process expired tickets" },
      { status: 500 }
    );
  }
}
