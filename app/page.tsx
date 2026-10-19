import Link from "next/link";
import { EVENT, TICKET_TYPES } from "@/lib/event";

export default function Home() {
  return (
    <main className="container mx-auto space-y-6 p-4">
      <section className="rounded-2xl bg-neutral-900 p-8 text-center text-neutral-100 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">
          {EVENT.tagline}
        </p>
        <h1 className="mt-2 text-4xl font-bold sm:text-6xl">{EVENT.name}</h1>
        <p className="mt-4 text-lg text-neutral-300">
          {EVENT.dateLabel} · {EVENT.venue}
        </p>
        <Link
          href="/book"
          className="mt-8 inline-block rounded-lg bg-amber-400 px-6 py-3 font-semibold text-amber-950 hover:bg-amber-300"
        >
          Book tickets
        </Link>
      </section>

      <section className="rounded-2xl bg-neutral-900 p-6 text-neutral-100">
        <h2 className="mb-4 text-xl font-semibold">Showtimes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {EVENT.shows.map((show) => (
            <div key={show.name} className="rounded-lg border border-neutral-700 p-4">
              <p className="font-semibold">Battle of the Bands: {show.name}</p>
              <p className="text-neutral-300">
                {EVENT.dateLabel} · {show.time}
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                {show.bookable ? "Tickets available on this site" : "Not bookable on this site yet"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-neutral-900 p-6 text-neutral-100">
        <h2 className="mb-4 text-xl font-semibold">Tickets</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TICKET_TYPES.map((t) => (
            <div key={t.name} className="rounded-lg border border-neutral-700 p-4">
              <p className="font-semibold">{t.name}</p>
              <p className="text-2xl font-bold text-amber-400">
                {t.price === null ? "Reserved" : `₱${t.price}`}
              </p>
              <p className="mt-2 text-sm text-neutral-400">{t.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-neutral-900 p-6 text-neutral-100">
        <h2 className="mb-4 text-xl font-semibold">How to book</h2>
        <ol className="list-decimal space-y-2 pl-5 text-neutral-300">
          <li>Open the <Link href="/book" className="text-amber-400 underline">Book Tickets</Link> tab.</li>
          <li>Pick your seats on the map, or choose how many Silver standing tickets you want.</li>
          <li>Enter your name and email and submit.</li>
          <li>Pay for your ticket to confirm it.</li>
        </ol>
      </section>
    </main>
  );
}
