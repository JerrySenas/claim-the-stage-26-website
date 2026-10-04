import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { console } from "inspector";

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const seatsJSON = formData.get("seats") as string;
    const rawIDs = JSON.parse(seatsJSON);
    const seatIDs = rawIDs.map((id:string) => new ObjectId(id))

    const client = await clientPromise;

    const seat_db = client.db("seats");
    await seat_db.collection("seats")
        .updateMany(
            {_id: {$in: seatIDs}},
            {$set: {status: "held"}}
        );

    const selected_seats = await seat_db
        .collection("seats")
        .find({
            _id: { $in: seatIDs }
        }).toArray();
    const totalPrice = selected_seats.reduce((total, current) => total + current.price, 0);
    const seatCodes = selected_seats.map((seat) => seat.seatCode);
    
    const db = client.db("tickets");
    const result = await db
        .collection("tickets")
        .insertOne({
            name: name,
            email: email,
            seats: seatCodes,
            price: totalPrice,
            status: "pending"
        })

    return NextResponse.json({ success: true, id: result.insertedId }, {status: 201});
  } catch(e) {
    console.log(e)
    return NextResponse.json(
      { error: "Failed to create ticker" },
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

