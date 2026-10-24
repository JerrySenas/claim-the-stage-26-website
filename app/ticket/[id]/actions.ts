"use server";

import { pay } from "@/app/api/tickets/route";

export async function createPaymentIntent(id: string) {
  return pay(id);
}