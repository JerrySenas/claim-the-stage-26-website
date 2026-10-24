import SeatList from "@/components/SeatGrid";

export const metadata = { title: "Book Tickets | Claim the Stage" };

export default function Book() {
  return (
    <main className="container mx-auto p-4">
      <SeatList
        endpoint="/api/seats"
        title="Book your tickets"
      />
    </main>
  );
}
