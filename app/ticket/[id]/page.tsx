import { getById, pay } from "@/app/api/tickets/route";
import { ObjectId } from "mongodb";
import { notFound, redirect } from "next/navigation";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    notFound();
  }

  const ticket = await (await getById(id)).json();

  if (!ticket) {
    notFound();
  }

  async function onPay() {
    "use server";

    await pay(id);

    redirect("/");
  }

  return (
    <div>
      <div>Ticket ID: {ticket._id.toString()}</div>
      <div>Name: {ticket.name}</div>
      <div>Student Number: {ticket.studentNum}</div>
      <div>Email: {ticket.email}</div>
      <div>Seats: {ticket.seats.join(", ")}</div>
      <div>Price: ₱{ticket.price}</div>
      <div>Status: {ticket.status}</div>

      <form action={onPay}>
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Pay</button>
      </form>
    </div>
  );
}
