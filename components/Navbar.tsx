import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/book", label: "Book Tickets" },
  { href: "/ticket", label: "Search Ticket" },
  { href: "/admin", label: "Admin Page" },
];

export default function Navbar() {
  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="text-white text-xl font-bold">
          Claim the Stage 2026 Tickets
        </Link>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-300 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
