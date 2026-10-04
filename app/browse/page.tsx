import TicketList from "@/components/TicketList";

export default function Browse() {
  return (
    <main className="container mx-auto p-4">
      <TicketList
        endpoint="/api/browse"
        title='Confirmed Tickets'
      />
    </main>
  );
}