"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PayMongo } from "josu-paymongo";
import { createPaymentIntent as createPaymentIntentAction } from "./actions";

const paymongo = new PayMongo({
  publicKey: process.env.PAYMONGO_PUBLIC_KEY!,
});

type PayButtonProps = {
  ticketId: string;
  name: string;
  email: string;
};

export default function PayButton({ ticketId, name, email }: PayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handlePay() {
    setLoading(true);
    setError("");

    try {
      // 1. Server creates the Payment Intent, returns clientKey
      const { clientKey, paymentIntentId } = await createPaymentIntentAction(ticketId);

      // 2. Create payment method (GCash here; swap for "card" to accept cards)
      const method = await paymongo.paymentMethods.create({
        type: "gcash",
        billing: { name, email },
      });

      // 3. Attach to the intent
      const result = await paymongo.paymentIntents.attach(paymentIntentId, {
        paymentMethod: method.id,
        clientKey,
        returnUrl: `${window.location.origin}/ticket/${ticketId}`,
      });

      // 4. Redirect to PayMongo's authorization page if needed
      if (result.attributes.status === "awaiting_next_action") {
        window.location.href = result.attributes.next_action!.redirect.url;
        return;
      }

      // Card payments may succeed immediately
      if (result.attributes.status === "succeeded") {
        router.push("/"); // webhook will flip status to "confirmed"
      }
    } catch (e) {
      console.error(e);
      setError("Payment could not be started. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Redirecting to PayMongo…" : "Pay with GCash"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Server action import — declared in the "use server" file above