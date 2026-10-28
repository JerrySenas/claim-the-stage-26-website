"use client";

import { useState, type FormEvent } from "react";

interface Ticket {
  _id: string;
  name: string;
  studentNum: string;
  email: string;
  seats: string[];
  silver?: number;
  price: number;
  status: string;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "border-green-500 text-green-400",
  pending: "border-yellow-500 text-yellow-400",
  expired: "border-red-500 text-red-400",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-[#B19CD9] bg-black px-3 py-2 font-normal text-[#B19CD9] placeholder:text-[#B19CD9]/40 focus:outline-none focus:ring-2 focus:ring-[#B19CD9]";

export default function YourTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const studentNum = String(form.get("studentNum") ?? "").trim();

    setLoading(true);
    setError("");
    setTickets(null);
    try {
      const params = new URLSearchParams({ email, studentNum });
      const response = await fetch(`/api/tickets?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not load your tickets.");
        return;
      }
      setTickets(data);
    } catch (err) {
      console.error(err);
      setError("Could not load your tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold text-[#B19CD9]">Your Tickets</h1>

      <form
        onSubmit={onSubmit}
        className="mb-6 flex flex-col gap-3 rounded-3xl border border-[#B19CD9] bg-black p-5 text-sm font-semibold text-[#B19CD9]"
      >
        <p className="font-normal text-neutral-400">
          Enter the email and student number you booked with to see your tickets.
        </p>
        <label>
          Student Number
          <input type="text" name="studentNum" placeholder="Leave blank for non-SDCA students" inputMode="numeric" pattern="[0-9]*" className={inputClass} />
        </label>
        <label>
          Email
          <input type="email" name="email" required className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#B19CD9] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#e8e4f0] disabled:opacity-50"
        >
          {loading ? "Searching..." : "Show my tickets"}
        </button>
      </form>

      {error && <p className="text-red-400">{error}</p>}

      {tickets && tickets.length === 0 && (
        <p className="text-neutral-400">
          No tickets found for that email and student number.
        </p>
      )}

      {tickets && tickets.length > 0 && (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const items = [
              ...ticket.seats,
              ...((ticket.silver ?? 0) > 0 ? [`Silver × ${ticket.silver}`] : []),
            ];
            return (
              <a
                key={ticket._id}
                href={`/ticket/${ticket._id}`}
                className="block rounded-3xl border border-[#B19CD9] bg-black p-5 transition-colors hover:bg-[#B19CD9]/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-[#B19CD9]">{ticket.name}</h2>
                  <span
                    className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      STATUS_STYLE[ticket.status] ?? "border-neutral-500 text-neutral-400"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#B19CD9]">Ticket: {items.join(", ") || "—"}</p>
                <p className="mt-1 text-lg font-bold text-[#B19CD9]">₱{ticket.price}</p>
                <p className="mt-1 text-xs text-neutral-400">
                  {ticket.status === "pending" ? "Tap to pay before it expires" : "Tap to view"}
                </p>
              </a>
            );
          })}
        </div>
      )}
    </main>
  );
}
