// app/api/paymongo/webhook/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  const event = await request.json();
  const attrs = event.data?.attributes;

  if (attrs?.type !== "payment.paid") {
    return NextResponse.json({ received: true });
  }

  const payment = attrs.data;
  const paymentAttrs = payment?.attributes;
  const ticket_id = paymentAttrs?.metadata?.ticket_id;

  const client = await clientPromise;
  const ticketDB = client.db("tickets").collection("tickets");
  const seatDB = client.db("seats").collection("seats");

  const ticket = await ticketDB.findOne({_id: new ObjectId(ticket_id)});
  if (!ticket) {
    return
  }

  console.log(ticket._id)
  console.log(ticket.price)

  // Verify amount and currency against your trusted ticket price.
  const expectedAmount = Math.round(ticket.price * 100);

  if (
    paymentAttrs.amount !== expectedAmount ||
    paymentAttrs.currency !== "PHP"
  ) {
    console.error("[PayMongo] Amount or currency mismatch");
    return NextResponse.json(
      { error: "Payment validation failed" },
      { status: 400 }
    );
  }

  const updated = await ticketDB.updateOne(
    { _id: ticket._id },
    { $set: { status: "confirmed", paidAt: new Date() } }
  );

  if (updated.modifiedCount === 1) {
    await seatDB.updateMany(
      { seatCode: { $in: ticket.seats } },
      { $set: { status: "occupied" } }
    );
  }

  return NextResponse.json({ received: true });
}