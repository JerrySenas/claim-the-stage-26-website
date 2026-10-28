import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { PayMongo } from "josu-paymongo";
import { grandTotal, type SeatDoc } from "@/lib/pricing";
import { parseName, formatFullName } from "@/lib/name";

interface Seat {
  _id: string;
  seatCode: string;
}

// "Your Tickets" lookup: a client only gets their own tickets, and only by giving
// BOTH the email and student number they booked with. Listing everything is not allowed.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = (searchParams.get("email") ?? "").trim();
    const studentNum = (searchParams.get("studentNum") ?? "").trim() || "N/A";

    if (!email || (studentNum !== "N/A" && !/^[0-9]+$/.test(studentNum))) {
      return NextResponse.json(
        { error: "Enter the email and student number you booked with." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const tickets = await client
      .db("tickets")
      .collection("tickets")
      // strength 2 = case-insensitive, so Name@Gmail.com matches name@gmail.com
      .find({ email, studentNum }, { collation: { locale: "en", strength: 2 } })
      .sort({ createdAt: -1 })
      .project({ _id: 1, name: 1, studentNum: 1, email: 1, seats: 1, silver: 1, price: 1, status: 1, expiresAt: 1 })
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
    const email = formData.get("email");
    const seatsJSON = formData.get("seats");
    const studentNum = formData.get("studentNum");
    const silverValue = formData.get("silver") ?? "0";

    const parsedName = parseName({
      surname: formData.get("surname"),
      firstName: formData.get("firstName"),
      middleInitial: formData.get("middleInitial"),
    });
    if (!parsedName.ok) {
      return NextResponse.json({ error: parsedName.error }, { status: 400 });
    }

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof studentNum !== "string" ||
      typeof seatsJSON !== "string" ||
      typeof silverValue !== "string"
    ) {
      return NextResponse.json(
        { error: "Name, student number (digits only), email, and ticket are required." },
        { status: 400 }
      );
    }

    const studentNumTrimmed = studentNum.trim();
    if (studentNumTrimmed !== "" && !/^[0-9]+$/.test(studentNumTrimmed)) {
      return NextResponse.json(
        { error: "Student number must be digits only (leave blank if you're not a student)." },
        { status: 400 }
      );
    }
    const studentNumValue = studentNumTrimmed || "N/A";

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

    // One ticket per booking: exactly one seat, or exactly one Silver ticket.
    if (seatCodes.length + silver !== 1) {
      return NextResponse.json(
        { error: "You can only book one seat or one Silver ticket." },
        { status: 400 }
      );
    }

    // Release seats from overdue reservations so they can be booked again.
    //await expireOverdueTickets();

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
    // const db = client.db("tickets");
    // const currentTime = new Date()
    // const result = await db
    //     .collection("tickets")
    //     .insertOne({
    //         name: name,
    //         email: email,
    //         studentNum: studentNum,
    //         seats: seatCodes,
    //         createdOn: currentTime,
    //         expiresAt: new Date(currentTime.getTime() + 10 * 60 * 1000),
    //         price: totalPrice,
    //         status: "pending"
    //     })

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
      const now = new Date();
      const result = await ticketDB.insertOne({
        ...parsedName.value, // surname, firstName, middleInitial
        name: formatFullName(parsedName.value), // combined, for admin page and lookups
        email: email.trim(),
        studentNum: studentNumValue,
        seats: selectedSeats.map((seat) => seat.seatCode),
        silver,
        price: totalPrice,
        status: "pending",
        createdAt: now,
        // Past this time the ticket is marked "expired" (by /api/cron or the next
        // page load) and its held seats are made available again.
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
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

const paymongo = PayMongo.getInstance({
  secretKey: process.env.PAYMONGO_SECRET_KEY!,
});

export async function pay(id: string) {
  if (!ObjectId.isValid(id)) throw new Error("Invalid ticket ID");

  const client = await clientPromise;
  const ticket = await client
    .db("tickets")
    .collection("tickets")
    .findOne({ _id: new ObjectId(id), status: "pending" });

  if (!ticket) throw new Error("Ticket not found or already confirmed");

  const intent = await paymongo.paymentIntents.create({
    amount: ticket.price * 100, // PHP → centavos
    currency: "PHP",
    paymentMethodAllowed: ["qrph"], // GCash only for now
    description: `Ticket ${id}`,
    metadata: { ticketId: id }, // critical for webhook lookup
  });

  await client
    .db("tickets")
    .collection("tickets")
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { paymentIntentId: intent.id } }
    );

  return {
    clientKey: intent.attributes.client_key,
    paymentIntentId: intent.id,
  };
}
