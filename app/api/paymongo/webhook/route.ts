// app/api/paymongo/webhook/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// export async function POST(request: Request) {
//   const event = await request.json();

  
//   return NextResponse.json({ received: true });
// }

// import { NextResponse } from "next/server";
// import clientPromise from "@/lib/mongodb";
// import { ObjectId } from "mongodb";

export async function POST(request: Request) {
    const event = await request.json();
  const attrs = event.data?.attributes;
  const payment = attrs?.data;
  const paymentAttrs = payment?.attributes;

  console.log("[Webhook] Event type:", attrs?.type);
  console.log("[Webhook] Payment ID:", payment?.id);
  console.log(
    "[Webhook] Payment Intent ID:",
    paymentAttrs?.payment_intent_id
  );
  console.log("[Webhook] Payment status:", paymentAttrs?.status);
  console.log("[Webhook] Currency:", paymentAttrs?.currency);
  console.log("[Webhook] Amount:", paymentAttrs?.amount);
  console.log(
    "[Webhook] Metadata ticketId:",
    paymentAttrs?.metadata?.ticketId
  );
    
    if (event.data?.attributes?.type === "payment.paid") {
        console.log("[PayMongo] Payment paid event received");
        
        // Keep your existing ticket-confirmation logic here.
    }
    if (event.data?.attributes?.type === "payment.paid") {
      const ticketId = event.data.attributes.data?.attributes?.metadata?.ticketId;
    
      if (ticketId && ObjectId.isValid(ticketId)) {
        const client = await clientPromise;
        const ticketDB = client.db("tickets").collection("tickets");
        const seatDB = client.db("seats").collection("seats");
    
        const ticket = await ticketDB.findOneAndUpdate(
          { _id: new ObjectId(ticketId), status: "pending" },
          { $set: { status: "confirmed", paidAt: new Date() } },
          { returnDocument: "after" }
        );
    
        if (ticket) {
          await seatDB.updateMany(
            { seatCode: { $in: ticket.seats } },
            { $set: { status: "occupied" } }
          );
        }
      }
    }

  return NextResponse.json({ received: true });
}