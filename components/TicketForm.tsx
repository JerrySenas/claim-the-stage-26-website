"use client"; 

import { useEffect, useState } from "react";
import { ObjectId } from "mongodb";
import clsx from "clsx";

interface Seat {
  _id: ObjectId;
  seatCode: string;
  name: string;
  price: number;
  status: string;
  selected: boolean
}

interface SeatProps {
  seat: Seat;
  onClick: () => void;
}

const Seat = ({seat, onClick}: SeatProps) => (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold text-white",
        {
            "bg-blue-500": seat.selected,
            "bg-white": !seat.selected && seat.status === "available",
            "bg-gray-500": !seat.selected && seat.status === "occupied"
        }
      )}
    >
        {seat.seatCode}
    </button>
);

interface SeatListProps {
  endpoint: string;
  title: string;
}

export default function SeatList({ endpoint, title }: SeatListProps) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getSeats() {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          const message = `An error occurred: ${response.statusText}`;
          console.error(message);
          return;
        }
        const seats = await response.json();
        setSeats(seats.map((seat: Seat) => ({
            ...seat,
            selected: false,
        })));
      } catch (error) {
        console.error("Error fetching seats:", error);
      } finally {
        setLoading(false);
      }
    }
    getSeats();
  }, [endpoint]);

  function seatList() {
    return seats.map((seat) => {
      return <Seat
        seat={seat}
        key={seat._id.toString()}
        onClick={() => {
            if (seat.status !== "available") return;

            setSeats((currentSeats) => 
            currentSeats.map((currentSeats) => 
                currentSeats._id.toString() === seat._id.toString() ? {...currentSeats, selected: !currentSeats.selected} : currentSeats)
          )
        }}
        />;
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

          <div className="grid grid-cols-5 gap-2">
            {seatList()}
          </div>

        </div>
      </div>
    </>
  );
}


