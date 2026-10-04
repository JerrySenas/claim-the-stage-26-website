import TicketList from "@/components/TicketList";
import SeatList from "@/components/SeatGrid";

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <SeatList
        endpoint="/api/seats"
        title="All Seats"
      />
    </main>
  );
}