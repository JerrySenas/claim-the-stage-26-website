import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function addSeat(
  seatCode: string,
  price: number
) {
  const client = await clientPromise;
  const db = client.db("seats");

  return db.collection("seats").insertOne({
    seatCode,
    price,
    status: "available",
  });
}

export async function deleteTicket(id: string) {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid ticket ID");
  }

  const client = await clientPromise;
  const db = client.db("tickets");

  return db.collection("tickets").deleteOne({
    _id: new ObjectId(id),
  });
}

export async function deleteSeat(id: string) {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid seat ID");
  }

  const client = await clientPromise;
  const db = client.db("seats");

  return db.collection("seats").deleteOne({
    _id: new ObjectId(id),
  });
}

export async function resetSeats() {
  const client = await clientPromise;
  const db = client.db("seats");

  return db.collection("seats").updateMany(
    {},
    {
      $set: {
        status: "available",
      },
    }
  );
}

export async function deleteAllTickets() {
  const client = await clientPromise;
  const db = client.db("tickets");

  return db.collection("tickets").deleteMany({});
}
