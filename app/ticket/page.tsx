"use client";

import { useEffect, useState } from "react";

interface Ticket {
  _id: string;
  name: string;
  email: string;
  seats: string[];
  price: number;
  status: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      try {
        const response = await fetch("/api/tickets");

        if (!response.ok) {
          throw new Error("Failed to fetch tickets");
        }

        const data = await response.json();

        setTickets(
          data.map((ticket: Ticket) => ({
            ...ticket,
            _id: ticket._id.toString(),
          }))
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadTickets();
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    const query = search.toLowerCase();

    return (
      ticket.name.toLowerCase().includes(query) ||
      ticket.email.toLowerCase().includes(query) ||
      ticket._id.toLowerCase().includes(query) ||
      ticket.seats.some((seat) =>
        seat.toLowerCase().includes(query)
      )
    );
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-3xl font-bold">
        Tickets
      </h1>

      <input
        type="search"
        placeholder="Search by name, email, seat, or ticket ID..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="mb-6 w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
      />

      {loading ? (
        <p>Loading tickets...</p>
      ) : filteredTickets.length === 0 ? (
        <p className="text-gray-500">
          No tickets found.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <a
              key={ticket._id}
              href={`/ticket/${ticket._id}`}
              className="block rounded-lg border p-4 transition hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  {ticket.name}
                </h2>

                <span className="text-sm text-gray-500">
                  {ticket.status}
                </span>
              </div>

              <p className="text-sm text-gray-600">
                {ticket.email}
              </p>

              <p className="mt-2 text-sm">
                Seats: {ticket.seats.join(", ")}
              </p>

              <p className="mt-1 font-medium">
                ₱{ticket.price}
              </p>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
