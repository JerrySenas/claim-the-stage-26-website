/**
 * Event details shown on the home page. Taken from the "Reference" tab of the
 * ticketing workbook. Edit here to change the home page.
 */
export const EVENT = {
  name: "Claim the Stage",
  tagline: "Battle of the Bands",
  venue: "NOMO - Parking Lot",
  dateLabel: "November 25, 2026",
  description:
    "Welcome to a pioneered music competition organized within St. Dominic College of Asia, providing a local concert for different student bands to compete to be “the best band” within St. Dominic College of Asia!",
  shows: [
    { name: "College", time: "4:00 PM", bookable: true },
  ],
};

export const TICKET_TYPES = [
  { name: "Silver", price: 100, note: "Standing area. Reusable placemats or carriable and foldable chairs are recommended for the audience." },
  { name: "Gold", price: 150, note: "Assigned seats in the centre and both side blocks." },
  { name: "Platinum", price: 250, note: "Assigned seats, It has the highest opportunity for face-to-face interactions with the bands that will perform, offering the highest entertainment value." },
  { name: "VIP", price: null, note: "Front rows by the stage. Reserved, unfortunately not sold online." },
] as const;
