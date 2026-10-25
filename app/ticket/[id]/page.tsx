import { getById } from "@/app/api/tickets/route";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import PayButton from "./PayButton";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) notFound();

  const ticket = await (await getById(id)).json();

  if (!ticket) notFound();

  return (
    <div className="flex flex-col gap-2 p-4">
      <div>Ticket ID: {ticket._id.toString()}</div>
      <div>Name: {ticket.name}</div>
      <div>Student Number: {ticket.studentNum}</div>
      <div>Email: {ticket.email}</div>
      <div>Seats: {ticket.seats.join(", ")}</div>
      <div>Price: ₱{ticket.price}</div>
      <div>
        Status:{" "}
        <span
          className={
            ticket.status === "confirmed"
              ? "text-green-600"
              : ticket.status === "pending"
                ? "text-yellow-600"
                : "text-gray-500"
          }
        >
          {ticket.status}
        </span>
      </div>

      {ticket.status === "pending" && (
        <PayButton
          ticketId={ticket._id.toString()}
          name={ticket.name}
          email={ticket.email}
        />
      )}

      {ticket.status === "confirmed" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-green-600">
            Payment confirmed. See you at the show!
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/ticket/${ticket._id.toString()}/image`}
            alt="E-ticket"
            className="w-full max-w-2xl rounded-lg border"
          />
          <a
            href={`/ticket/${ticket._id.toString()}/image`}
            download={`ticket-${ticket._id.toString()}.png`}
            className="w-fit rounded bg-green-600 px-4 py-2 text-white"
          >
            Download ticket
          </a>
        </div>
      )}
    </div>
  );
}