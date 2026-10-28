import { getById } from "@/app/api/tickets/route";
import { ObjectId } from "mongodb";
import { displayName } from "@/lib/name";
import { notFound } from "next/navigation";
import PayButton from "./PayButton";
import Countdown from "./Countdown";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[#B19CD9]/30 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-xs font-bold uppercase tracking-widest text-[#B19CD9]">
        {label}
      </dt>
      <dd className="break-all text-base font-medium text-[#e8e4f0] sm:text-right">
        {children}
      </dd>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "border-green-500 text-green-400",
  pending: "border-yellow-500 text-yellow-400",
};

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) notFound();

  const ticket = await (await getById(id)).json();

  if (!ticket) notFound();

  const ticketId = ticket._id.toString();
  const seats: string[] = ticket.seats ?? [];
  const silver: number = ticket.silver ?? 0;
  // Older tickets have no expiresAt, so fall back to createdAt + 10 minutes.
  const expiresAt: string | null = ticket.expiresAt
    ? new Date(ticket.expiresAt).toISOString()
    : ticket.createdAt
      ? new Date(new Date(ticket.createdAt).getTime() + 10 * 60 * 1000).toISOString()
      : null;
  const items = [...seats, ...(silver > 0 ? [`Silver (standing) × ${silver}`] : [])];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-[#e8e4f0]">Your Ticket</h1>

      {/* Client details */}
      <div className="rounded-3xl border border-[#B19CD9] bg-black p-5 shadow-lg shadow-[#B19CD9]/20">
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#B19CD9]">
            Ticket details
          </span>
          <span
            className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
              STATUS_STYLE[ticket.status] ?? "border-neutral-500 text-neutral-400"
            }`}
          >
            {ticket.status}
          </span>
        </div>

        <dl>
          <Row label="Name">{displayName(ticket)}</Row>
          <Row label="Student Number">{ticket.studentNum || "—"}</Row>
          <Row label="Email">{ticket.email}</Row>
          <Row label="Ticket">{items.length ? items.join(", ") : "—"}</Row>
          <Row label="Price">
            <span className="text-xl font-bold">₱{ticket.price}</span>
          </Row>
          <Row label="Ticket ID">
            <span className="font-mono text-xs">{ticketId}</span>
          </Row>
        </dl>
      </div>

      {ticket.status === "pending" && expiresAt && (
        <Countdown expiresAt={expiresAt} />
      )}

      {ticket.status === "pending" && (
        <PayButton ticketId={ticketId} name={ticket.name} email={ticket.email} />
      )}

      {ticket.status === "confirmed" && (
        <div className="flex flex-col gap-3 rounded-3xl border border-[#B19CD9] bg-black p-5">
          <p className="text-sm font-medium text-green-400">
            Payment confirmed. See you at the show!
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/ticket/${ticketId}/image`}
            alt="E-ticket"
            className="w-full rounded-2xl border border-[#B19CD9]"
          />
          <a
            href={`/ticket/${ticketId}/image`}
            download={`ticket-${ticketId}.png`}
            className="w-full rounded-xl bg-[#B19CD9] px-4 py-3 text-center font-semibold text-[#1a0f2e] transition-colors hover:bg-[#c4b3e3]"
          >
            Download ticket
          </a>
        </div>
      )}
    </div>
  );
}
