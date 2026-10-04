"use client"; 

import { useEffect, useState } from "react";
import { ObjectId } from "mongodb";

interface Ticket {
  _id: ObjectId;
  name: string;
  seats: Array<String>;
  status: string;
}

interface TicketProps {
  ticket: Ticket;
}

const Ticket = (props: TicketProps) => (
  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
      {props.ticket.name}
    </td>
    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
      {props.ticket.seats.map((seat, index) => (
        <span key={index}>{seat}</span>
      ))}
    </td>
    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
      {props.ticket.status}
    </td>
  </tr>
);

interface TicketListProps {
  endpoint: string;
  title: string;
}

export default function TicketList({ endpoint, title }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getTickets() {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          const message = `An error occurred: ${response.statusText}`;
          console.error(message);
          return;
        }
        const tickets = await response.json();
        setTickets(tickets);
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setLoading(false);
      }
    }
    getTickets();
  }, [endpoint]);

  function ticketList() {
    return tickets.map((ticket) => {
      return <Ticket ticket={ticket} key={ticket._id.toString()} />;
    });
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <>
      <h3 className="text-lg font-semibold p-4">{title}</h3>
      <div className="border rounded-lg overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Name
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Seats
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {ticketList()}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}


