"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { GRID_COLS, GRID_ROWS, SILVER_AREA, SILVER_PRICE, type Tier } from "@/lib/seatLayout";
import { grandTotal, TIER_PRICE } from "@/lib/pricing";
import { MI_PATTERN, NAME_MAX, NAME_PATTERN, parseName } from "@/lib/name";

type SeatStatus = "available" | "held" | "occupied" | "reserved";

interface Seat {
  seatCode: string;
  tier: Tier;
  x: number;
  y: number;
  label: string;
  status: SeatStatus;
}

const CELL = 32; // px, seat size
const GAP = 4; // px

const TIER_STYLE: Record<Tier, string> = {
  PLATINUM: "bg-slate-200 text-slate-900 hover:bg-white",
  GOLD: "bg-amber-400 text-amber-950 hover:bg-amber-300",
  VIP: "bg-fuchsia-900 text-fuchsia-200",
};

const place = (x: number, y: number, w = 1, h = 1) => ({
  gridColumn: `${x + 1} / span ${w}`,
  gridRow: `${y + 1} / span ${h}`,
});

const Label = ({
  x,
  y,
  w = 1,
  className,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  className?: string;
  children: ReactNode;
}) => (
  <div
    style={place(x, y, w)}
    className={clsx(
      "flex items-center justify-center text-[10px] font-bold uppercase tracking-widest",
      className
    )}
  >
    {children}
  </div>
);

interface SeatButtonProps {
  seat: Seat;
  selected: boolean;
  onClick: () => void;
}

const SeatButton = ({ seat, selected, onClick }: SeatButtonProps) => {
  const bookable = seat.status === "available";
  const price = TIER_PRICE[seat.tier] ?? 0;
  const state =
    seat.status === "occupied"
      ? "Booked"
      : seat.status === "held"
        ? "Reserved by another buyer"
        : seat.status === "reserved"
          ? "Reserved (not for sale)"
          : `₱${price}`;

  return (
    <button
      type="button"
      disabled={!bookable}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${seat.tier} seat ${seat.label}, ${state}`}
      title={`${seat.tier} ${seat.label} (${seat.seatCode}) · ${state}`}
      style={place(seat.x, seat.y)}
      className={clsx(
        "flex items-center justify-center rounded-md text-[9px] font-semibold leading-none transition-colors",
        {
          "bg-blue-500 text-white ring-2 ring-blue-300": selected,
          [TIER_STYLE[seat.tier]]: !selected && (bookable || seat.status === "reserved"),
          "cursor-not-allowed bg-orange-500 text-orange-950":
            !selected && seat.status === "held",
          "cursor-not-allowed bg-neutral-700 text-neutral-500 line-through":
            !selected && seat.status === "occupied",
          "cursor-not-allowed opacity-60": seat.status === "reserved",
        }
      )}
    >
      {seat.label}
    </button>
  );
};

const LegendItem = ({ className, children }: { className: string; children: ReactNode }) => (
  <span className="flex items-center gap-2">
    <span className={clsx("inline-block h-4 w-4 rounded", className)} />
    {children}
  </span>
);

interface SeatListProps {
  endpoint: string;
  title: string;
}

export default function SeatList({ endpoint, title }: SeatListProps) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [offline, setOffline] = useState(false);
  const [silver, setSilver] = useState(0);
  const router = useRouter();

  const loadSeats = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        console.error(`An error occurred: ${response.statusText}`);
        setMessage("Could not load the seat map. Please refresh the page.");
        return;
      }
      const data: Seat[] = await response.json();
      const isOffline = response.headers.get("x-seat-data") === "static";
      setOffline(isOffline);
      if (isOffline) setMessage("The booking database can't be reached, so live availability is unavailable and booking is disabled.");
      setSeats(data);
      // Drop any selected seat that is no longer available.
      setSelected((current) => {
        const free = new Set(
          data.filter((s) => s.status === "available").map((s) => s.seatCode)
        );
        return new Set([...current].filter((code) => free.has(code)));
      });
    } catch (error) {
      console.error("Error fetching seats:", error);
      setMessage("Could not load the seat map. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    loadSeats();
  }, [loadSeats]);

  const selectedSeats = useMemo(
    () => seats.filter((seat) => selected.has(seat.seatCode)),
    [seats, selected]
  );
  const totalPrice =
    grandTotal(selectedSeats, silver);
  const ticketLines = [
    { tier: "PLATINUM" as Tier, name: "Platinum" },
    { tier: "GOLD" as Tier, name: "Gold" },
  ]
    .map(({ tier, name }) => {
      const list = selectedSeats.filter((s) => s.tier === tier);
      return {
        name,
        labels: list.map((s) => s.label),
        subtotal: list.reduce((t, s) => t + TIER_PRICE[s.tier], 0),
      };
    })
    .filter((line) => line.labels.length > 0);

  const remaining = useMemo(() => {
    const count = (tier: Tier) =>
      seats.filter((s) => s.tier === tier && s.status === "available").length;
    return { PLATINUM: count("PLATINUM"), GOLD: count("GOLD") };
  }, [seats]);

  // One ticket per booking: either one seat or one Silver (standing) ticket.
  function toggleSilver() {
    setMessage("");
    if (silver === 1) {
      setSilver(0);
    } else {
      setSilver(1);
      setSelected(new Set());
    }
  }

  function toggle(seat: Seat) {
    if (seat.status !== "available") return;
    setMessage("");
    // Picking a seat replaces any other seat (or the Silver ticket);
    // clicking the selected seat again unselects it.
    setSilver(0);
    setSelected((current) =>
      current.has(seat.seatCode) ? new Set() : new Set([seat.seatCode])
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedSeats.length + silver !== 1) {
      setMessage("Please select one seat or one Silver ticket.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.append("seats", JSON.stringify(selectedSeats.map((seat) => seat.seatCode)));
    formData.append("silver", String(silver));

    setSubmitting(true);
    try {
      const response = await fetch("/api/tickets", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setMessage(
            `${data.error ?? "Some seats are no longer available."} Seat map updated; please choose again.`
          );
          await loadSeats();
        } else {
          setMessage(data.error ?? "Failed to create ticket.");
        }
        return;
      }
      setLoading(true);
      router.push(`/ticket/${data.id}`);
    } catch (error) {
      console.error(error);
      setMessage("Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  const width = GRID_COLS * CELL + (GRID_COLS - 1) * GAP;

  return (
    <>
      <h3 className="text-lg font-semibold p-4">{title}</h3>
      <div className="rounded-lg border bg-neutral-900 p-4 text-neutral-100">
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <LegendItem className="bg-slate-200">Platinum ₱250 ({remaining.PLATINUM} left)</LegendItem>
          <LegendItem className="bg-amber-400">Gold ₱150 ({remaining.GOLD} left)</LegendItem>
          <LegendItem className="border border-dashed border-neutral-400 bg-neutral-800">Silver ₱100 (standing)</LegendItem>
          <LegendItem className="bg-fuchsia-900 opacity-60">VIP (reserved)</LegendItem>
          <LegendItem className="bg-blue-500">Your selection</LegendItem>
          <LegendItem className="bg-orange-500">On hold</LegendItem>
          <LegendItem className="bg-neutral-700">Booked</LegendItem>
        </div>

        <div className="overflow-x-auto pb-2">
          <div
            className="mx-auto grid"
            style={{
              width,
              gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL}px)`,
              gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL}px)`,
              gap: GAP,
            }}
          >
            <Label x={6} y={0} w={17} className="rounded-md bg-neutral-700 text-sm text-neutral-200">
              Stage
            </Label>

            <Label x={0} y={1} w={5} className="text-amber-400">Gold</Label>
            <Label x={24} y={1} w={5} className="text-amber-400">Gold</Label>

            <Label x={5} y={4} w={1} className="text-fuchsia-300">VIP</Label>
            <Label x={5} y={8} w={1} className="text-slate-300">Plat.</Label>
            <Label x={5} y={15} w={1} className="text-amber-400">Gold</Label>

            <Label x={11} y={11} className="text-neutral-400">Gate</Label>
            <Label x={17} y={11} className="text-neutral-400">Gate</Label>
            <Label x={11} y={18} className="text-neutral-400">Gate</Label>
            <Label x={17} y={18} className="text-neutral-400">Gate</Label>

            <div
              style={place(SILVER_AREA.x, SILVER_AREA.y, SILVER_AREA.w, SILVER_AREA.h)}
              className={clsx(
                "flex items-center justify-center gap-4 rounded-md border-2 px-3",
                silver > 0
                  ? "border-blue-400 bg-blue-500/30"
                  : "border-dashed border-neutral-500 bg-neutral-800"
              )}
            >
              <div className="text-center text-xs font-bold uppercase tracking-widest text-neutral-200">
                Silver · ₱{SILVER_PRICE} · Standing
                <div className="text-[10px] font-normal normal-case tracking-normal text-neutral-400">
                  No seat number · one ticket per booking
                </div>
              </div>
              <button
                type="button"
                aria-pressed={silver === 1}
                aria-label={silver === 1 ? "Remove Silver ticket" : "Add one Silver ticket"}
                onClick={toggleSilver}
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-md text-2xl font-bold leading-none transition-colors",
                  silver === 1
                    ? "bg-blue-500 text-white ring-2 ring-blue-300"
                    : "bg-neutral-700 text-neutral-100 hover:bg-neutral-600"
                )}
              >
                {silver === 1 ? "✓" : "+"}
              </button>
            </div>

            {seats.map((seat) => (
              <SeatButton
                key={seat.seatCode}
                seat={seat}
                selected={selected.has(seat.seatCode)}
                onClick={() => toggle(seat)}
              />
            ))}
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-neutral-400">
          Seat numbers on the left and right Gold blocks count from the aisle side (1) outward.
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-[#652DC1] bg-black p-5 text-[#652DC1]">
        <h4 className="mb-3 text-sm font-bold uppercase tracking-widest">Your tickets</h4>

        {ticketLines.length === 0 && silver === 0 ? (
          <p className="mb-4 text-sm opacity-70">Nothing selected yet.</p>
        ) : (
          <ul className="mb-4 space-y-1 text-sm">
            {ticketLines.map((line) => (
              <li key={line.name} className="flex justify-between gap-4">
                <span>
                  <span className="font-semibold">{line.name}:</span>{" "}
                  {line.labels.join(", ")}
                </span>
                <span>₱{line.subtotal}</span>
              </li>
            ))}
            {silver > 0 && (
              <li className="flex justify-between gap-4">
                <span>
                  <span className="font-semibold">Silver (standing):</span> ×{silver}
                </span>
                <span>₱{silver * SILVER_PRICE}</span>
              </li>
            )}
            <li className="flex justify-between gap-4 border-t border-[#E03FD8] pt-2 font-bold">
              <span>Total</span>
              <span>₱{totalPrice}</span>
            </li>
          </ul>
        )}

        <p className={clsx("mb-3 text-sm text-red-500", { hidden: message === "" })}>{message}</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_5rem]">
            <label className="block text-sm font-semibold">
              Surname
              <input type="text" name="surname" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toLocaleUpperCase("en"); }} required maxLength={NAME_MAX} autoComplete="family-name" pattern={NAME_PATTERN} title="Capital letters (A-Z, Ñ) and spaces only" className="mt-1 uppercase w-full rounded-lg border border-[#E03FD8] bg-black px-3 py-2 font-normal text-[#E03FD8] focus:outline-none focus:ring-2 focus:ring-[#652DC1]" />
            </label>
            <label className="block text-sm font-semibold">
              First name
              <input type="text" name="firstName" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toLocaleUpperCase("en"); }} required maxLength={NAME_MAX} autoComplete="given-name" pattern={NAME_PATTERN} title="Capital letters (A-Z, Ñ) and spaces only" className="mt-1 uppercase w-full rounded-lg border border-[#E03FD8] bg-black px-3 py-2 font-normal text-[#E03FD8] focus:outline-none focus:ring-2 focus:ring-[#652DC1]" />
            </label>
            <label className="block text-sm font-semibold">
              M.I.
              <input type="text" name="middleInitial" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toLocaleUpperCase("en"); }} maxLength={2} pattern={MI_PATTERN} title="1-2 letters (optional)" placeholder="Optional" className="mt-1 uppercase w-full rounded-lg border border-[#E03FD8] bg-black px-3 py-2 font-normal text-[#E03FD8] placeholder:text-[#E03FD8]/40 focus:outline-none focus:ring-2 focus:ring-[#652DC1]" />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Student Number
            <input type="text" name="studentNum" inputMode="numeric" pattern="[0-9]*" required className="mt-1 w-full rounded-lg border border-[#E03FD8] bg-black px-3 py-2 font-normal text-[#E03FD8] focus:outline-none focus:ring-2 focus:ring-[#652DC1]" />
          </label>
          <label className="block text-sm font-semibold">
            Email
            <input type="email" name="email" required className="mt-1 w-full rounded-lg border border-[#E03FD8] bg-black px-3 py-2 font-normal text-[#E03FD8] focus:outline-none focus:ring-2 focus:ring-[#652DC1]" />
          </label>
          <button
            type="submit"
            disabled={submitting || offline || (selectedSeats.length === 0 && silver === 0)}
            className="w-full rounded-lg bg-[#E03FD8] px-4 py-2 font-semibold text-[#8B9FEE] hover:bg-[#7A3FE0] disabled:opacity-50"
          >
            {submitting ? "Booking..." : "Submit"}
          </button>
        </form>
      </div>
    </>
  );
}
