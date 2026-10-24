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
    
    console.log("[PayMongo] Webhook received:", {
        eventId: event.data?.id,
        eventType: event.data?.attributes?.type,
    });
    
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