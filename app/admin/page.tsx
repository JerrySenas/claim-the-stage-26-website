import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/*async function addSeatAction(formData: FormData) {
  "use server";
  const seatCode = formData.get("seatCode") as string;
  const price = Number(formData.get("price"));
  if (!seatCode || !Number.isFinite(price)) return;

  const client = await clientPromise;
  await client.db("seats").collection("seats").insertOne({
    seatCode,
    price,
    status: "available",
  });
  revalidatePath("/admin");
}*/

async function deleteTicketAction(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (!ObjectId.isValid(id)) return;

  const client = await clientPromise;
  await client.db("tickets").collection("tickets").deleteOne({
    _id: new ObjectId(id),
  });
  revalidatePath("/admin");
}

async function deleteSeatAction(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (!ObjectId.isValid(id)) return;

  const client = await clientPromise;
  await client.db("seats").collection("seats").deleteOne({
    _id: new ObjectId(id),
  });
  revalidatePath("/admin");
}

async function resetSeatsAction() {
  "use server";
  const client = await clientPromise;
  await client.db("seats").collection("seats").updateMany(
    {},
    { $set: { status: "available" } }
  );
  revalidatePath("/admin");
}

async function deleteAllTicketsAction() {
  "use server";
  const client = await clientPromise;
  await client.db("tickets").collection("tickets").deleteMany({});
  revalidatePath("/admin");
}

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ pw?: string; error?: string }>;
}) {
  const { pw, error } = await searchParams;
  const authed = pw === process.env.ADMIN_PASSWORD;

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm p-8">
        <h1 className="mb-6 text-2xl font-bold">Admin</h1>
        <form method="GET" className="space-y-4">
          <input
            type="password"
            name="pw"
            placeholder="Password"
            required
            autoFocus
            className="w-full rounded border px-3 py-2"
          />
          {error && <p className="text-sm text-red-600">Wrong password.</p>}
          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-4 py-2 text-white"
          >
            Enter
          </button>
        </form>
      </main>
    );
  }

  const client = await clientPromise;
  const seats = await client
    .db("seats")
    .collection("seats")
    .find({})
    .sort({ seatCode: 1 })
    .toArray();

  const tickets = await client
    .db("tickets")
    .collection("tickets")
    .find({})
    .sort({ _id: -1 })
    .toArray();

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-8">
      <h1 className="text-3xl font-bold">Admin / Testing</h1>

      <section className="rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-semibold">Seats ({seats.length})</h2>
        <div className="space-y-2">
          {seats.map((seat) => (
            <div key={seat._id.toString()} className="flex items-center justify-between rounded border p-3">
              <div>
                <strong>{seat.seatCode}</strong>
                <span className="ml-3">₱{seat.price}</span>
                <span className="ml-3 text-gray-500">{seat.status}</span>
              </div>
              <form action={deleteSeatAction}>
                <input type="hidden" name="id" value={seat._id.toString()} />
                <button type="submit" className="rounded bg-red-600 px-3 py-1 text-white">Delete</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-yellow-500 p-6">
        <h2 className="mb-2 text-xl font-semibold">Seat Testing</h2>
        <p className="mb-4 text-sm text-gray-600">Mark every seat as available.</p>
        <form action={resetSeatsAction}>
          <button type="submit" className="rounded bg-yellow-600 px-4 py-2 text-white">Reset All Seats</button>
        </form>
      </section>

      <section className="rounded-lg border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tickets ({tickets.length})</h2>
          <form action={deleteAllTicketsAction}>
            <button type="submit" className="rounded bg-red-700 px-4 py-2 text-white">Delete All Tickets</button>
          </form>
        </div>
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket._id.toString()} className="flex items-center justify-between rounded border p-4">
              <div>
                <div className="font-semibold">{ticket.name}</div>
                <div className="text-sm text-gray-500">{ticket.email}</div>
                <div className="text-sm">Seats: {ticket.seats.join(", ")}</div>
                <div className="text-sm">₱{ticket.price} — {ticket.status}</div>
                <div className="text-xs text-gray-400">{ticket._id.toString()}</div>
              </div>
              <form action={deleteTicketAction}>
                <input type="hidden" name="id" value={ticket._id.toString()} />
                <button type="submit" className="rounded bg-red-600 px-3 py-1 text-white">Delete</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
