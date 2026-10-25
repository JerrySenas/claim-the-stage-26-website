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

/**
 * One person = one email. Gmail ignores dots and "+tags" in the name part and
 * treats googlemail.com as gmail.com, so those variants count as the same address.
 */
function normalizeEmail(raw: string) {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return email;

  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    domain = "gmail.com";
    local = local.split("+")[0].replace(/\./g, "");
  }
  return `${local}@${domain}`;
}

let emailIndexReady: Promise<unknown> | undefined;
/** Backs up the check below: the database itself refuses a second ticket per email. */
function ensureEmailIndex(tickets: { createIndex: (...args: any[]) => Promise<unknown> }) {
  emailIndexReady ??= tickets
    .createIndex({ emailKey: 1 }, { unique: true, sparse: true })
    .catch((e) => console.log("Could not create unique emailKey index", e));
  return emailIndexReady;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const studentNum = formData.get("studentNum") as string;
    const seatsJSON = formData.get("seats") as string;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    let rawIDs: unknown;
    try {
      rawIDs = JSON.parse(seatsJSON);
    } catch {
      rawIDs = null;
    }
    // Exactly one seat per booking.
    if (
      !Array.isArray(rawIDs) ||
      rawIDs.length !== 1 ||
      typeof rawIDs[0] !== "string" ||
      !ObjectId.isValid(rawIDs[0])
    ) {
      return NextResponse.json(
        { error: "You can only book one seat." },
        { status: 400 }
      );
    }
    const seatID = new ObjectId(rawIDs[0]);

    const client = await clientPromise;
    const ticketDB = client.db("tickets").collection("tickets");
    const seatDB = client.db("seats").collection("seats");

    // One seat per email address.
    const emailKey = normalizeEmail(email);
    await ensureEmailIndex(ticketDB);
    const existing = await ticketDB.findOne({ emailKey });
    if (existing) {
      return NextResponse.json(
        { error: "This email address already has a ticket. Only one seat can be booked per email." },
        { status: 409 }
      );
    }

    // Take the seat only if it is still available, so it can't be booked twice.
    const seat = await seatDB.findOneAndUpdate(
      { _id: seatID, status: "available" },
      { $set: { status: "held" } },
      { returnDocument: "after" }
    );
    if (!seat) {
      return NextResponse.json(
        { error: "That seat is no longer available." },
        { status: 409 }
      );
    }

    const currentTime = new Date()
    try {
      const result = await ticketDB.insertOne({
        name: name.trim(),
        email: email.trim(),
        emailKey: emailKey,
        studentNum: studentNum,
        seats: [seat.seatCode],
        createdOn: currentTime,
        expiresAt: new Date(currentTime.getTime() + 10 * 60 * 1000),
        price: seat.price,
        status: "pending"
      })

      return NextResponse.json({ success: true, id: result.insertedId }, {status: 201});
    } catch (e) {
      // Ticket was not saved: give the seat back.
      await seatDB.updateOne({ _id: seatID, status: "held" }, { $set: { status: "available" } });
      // Two requests for the same email at once: the unique index stops the second.
      if ((e as { code?: number }).code === 11000) {
        return NextResponse.json(
          { error: "This email address already has a ticket. Only one seat can be booked per email." },
          { status: 409 }
        );
      }
      throw e;
    }
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
