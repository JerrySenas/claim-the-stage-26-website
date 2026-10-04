import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-xl font-bold">
          MongoDB Tickets
        </Link>
        <div className="space-x-4">
          <Link
            href="/admin"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Admin Page
          </Link>
          <Link
            href="/ticket"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Search Ticket
          </Link>
        </div>
      </div>
    </nav>
  );
}