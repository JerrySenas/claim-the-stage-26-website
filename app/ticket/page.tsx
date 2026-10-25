"use client";

import { useEffect, useState } from "react";

interface Ticket {
  _id: string;
  name: string;
  studentNum: string;
  email: string;
  seats: string[];
  price: number;
  status: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = search.trim();

    // Nothing typed → clear results, don't hit the API
    if (!query) {
      setTickets([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/tickets?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Failed to fetch tickets");

        const data: Ticket[] = await response.json();
        setTickets(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error(err);
        setError("Could not load tickets. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const hasQuery = search.trim().length > 0;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Tickets</h1>

      <input
        type="search"
        placeholder="Search by name, email, student number, or ticket ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
      />

      {!hasQuery ? (
        <p className="text-gray-500">Type to search tickets.</p>
      ) : loading ? (
        <p>Loading tickets...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : tickets.length === 0 ? (
        <p className="text-gray-500">No tickets match your search.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <a
              key={ticket._id}
              href={`/ticket/${ticket._id}`}
              className="block rounded-lg border p-4 transition hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{ticket.name}</h2>
                <span className="text-sm text-gray-500">{ticket.status}</span>
              </div>
              <p className="text-sm text-gray-600">{ticket.email}</p>
              <p className="mt-2 text-sm">Student No: {ticket.studentNum}</p>
              <p className="mt-1 text-sm">Seats: {ticket.seats.join(", ")}</p>
              <p className="mt-1 font-medium">₱{ticket.price}</p>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}