"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/", label: "Home" },
  { href: "/book", label: "Book Tickets" },
  { href: "/ticket", label: "Search Ticket" },
  { href: "/admin", label: "Admin" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-black">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4">
        <Link href="/" aria-label="Claim the Stage 2026 – Home" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Claim the Stage, Battle of the Bands 2026"
            width={1400}
            height={240}
            unoptimized
            priority
            className="h-15 w-auto"
          />
        </Link>

        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
          {links.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "rounded-full px-4 py-1.5 uppercase tracking-widest transition-colors",
                  active
                    ? "bg-white text-black"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
