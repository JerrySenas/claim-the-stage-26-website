import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { console } from "inspector";
import { grandTotal, type SeatDoc } from "@/lib/pricing";

interface Seat {
  _id: string;
  seatCode: string;
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("tickets");
    const tickets = await db
      .collection("tickets")
      .find({})
      .toArray();

    return NextResponse.json(tickets);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function getById(id:string) {
    try {
        const client = await clientPromise;
        const db = client.db("tickets").collection("tickets");
        const ticket = await db.findOne(
            {_id: new ObjectId(id)}
        )
        return NextResponse.json(ticket);
    } catch (e) {
        console.log(e)
        return NextResponse.json(
            { error: "Failed to create ticker" },
            { status: 500 }
        );
    }
}

const SILVER_PRICE = 100;
const SILVER_MAX = 6000; // Set this to your actual configured limit.

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = formData.get("name");
    const email = formData.get("email");
    const seatsJSON = formData.get("seats");
    const silverValue = formData.get("silver") ?? "0";

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof seatsJSON !== "string" ||
      typeof silverValue !== "string"
    ) {
      return NextResponse.json(
        { error: "Name, email, seats, and silver are required." },
        { status: 400 }
      );
    }

    let seatCodes: unknown;
    try {
      seatCodes = JSON.parse(seatsJSON);
    } catch {
      return NextResponse.json(
        { error: "Invalid seat selection." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(seatCodes) ||
      !seatCodes.every(
        (code) => typeof code === "string" && code.length > 0
      ) ||
      new Set(seatCodes).size !== seatCodes.length
    ) {
      return NextResponse.json(
        { error: "Invalid or duplicate seat selection." },
        { status: 400 }
      );
    }

    const silver = Number(silverValue);

    if (
      !Number.isSafeInteger(silver) ||
      silver < 0 ||
      silver > SILVER_MAX
    ) {
      return NextResponse.json(
        { error: "Invalid Silver ticket quantity." },
        { status: 400 }
      );
    }

    if (seatCodes.length === 0 && silver === 0) {
      return NextResponse.json(
        { error: "Select at least one seat or Silver ticket." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const seatDB = client.db("seats").collection<SeatDoc>("seats");
    const ticketDB = client.db("tickets").collection("tickets");

    const selectedSeats = await seatDB
      .find({ seatCode: { $in: seatCodes }, status: "available" })
      .toArray();
    
    if (selectedSeats.length !== seatCodes.length) {
      return NextResponse.json(
        { error: "Some seats are no longer available." },
        { status: 409 }
      );
    }

    // Price is computed while seats are still "available".
    const totalPrice = grandTotal(selectedSeats, silver);

    const claimedCodes: string[] = [];
    for (const seat of selectedSeats) {
      const result = await seatDB.updateOne(
        { _id: seat._id, status: "available" },
        { $set: { status: "held" } }
      );

      if (result.modifiedCount !== 1) {
        await seatDB.updateMany(
          { seatCode: { $in: claimedCodes }, status: "held" },
          { $set: { status: "available" } }
        );
        return NextResponse.json(
          { error: "Some seats are no longer available." },
          { status: 409 }
        );
      }
      claimedCodes.push(seat.seatCode);
    }

    try {
      const result = await ticketDB.insertOne({
        name: name.trim(),
        email: email.trim(),
        seats: selectedSeats.map((seat) => seat.seatCode),
        silver,
        price: totalPrice,
        status: "pending",
        createdAt: new Date(),
      });

      return NextResponse.json(
        { success: true, id: result.insertedId.toString() },
        { status: 201 }
      );
    } catch (error) {
      await seatDB.updateMany(
        { seatCode: { $in: claimedCodes }, status: "held" },
        { $set: { status: "available" } }
      );
      throw error;
    }
  } catch (error) {
    console.error("Failed to create ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket." },
      { status: 500 }
    );
  }
}


export async function pay(id: string) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid ticket ID");
    }

    const client = await clientPromise;

    const ticketDB = client
      .db("tickets")
      .collection("tickets");

    const seatDB = client
      .db("seats")
      .collection("seats");

    const ticket = await ticketDB.findOneAndUpdate(
      {
        _id: new ObjectId(id),
        status: "pending",
      },
      {
        $set: {
          status: "confirmed",
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (!ticket) {
      throw new Error("Ticket not found or already confirmed");
    }

    await seatDB.updateMany(
      {
        seatCode: {
          $in: ticket.seats,
        },
      },
      {
        $set: {
          status: "occupied",
        },
      }
    );

    return ticket;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

