"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Countdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const end = new Date(expiresAt).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [end]);

  useEffect(() => {
    if (left === 0) router.refresh();
  }, [left, router]);

  if (left === null) return null;

  const total = Math.ceil(left / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  const urgent = total <= 120;

  if (left === 0) {
    return (
      <div className="w-full rounded-2xl border border-red-500 bg-black p-4 text-center text-red-400">
        Your reservation has expired. Please book your ticket again.
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-2xl border bg-black p-4 text-center ${
        urgent ? "border-red-500" : "border-[#652DC1]"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[#652DC1]/70">
        Reservation expires in
      </p>
      <p
        className={`font-mono text-4xl font-bold tabular-nums ${
          urgent ? "text-red-400" : "text-[#652DC1]"
        }`}
        aria-live="off"
      >
        {mm}:{ss}
      </p>
      <p className="mt-1 text-sm text-neutral-400">
        Pay before the timer runs out or your seat will be released.
      </p>
    </div>
  );
}
