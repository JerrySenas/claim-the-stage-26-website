"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PayMongo } from "josu-paymongo";
import { createPaymentIntent as createPaymentIntentAction } from "./actions";

const paymongo = new PayMongo({
  publicKey: process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY,
});

type PayButtonProps = {
  ticketId: string;
  name: string;
  email: string;
};

export default function PayButton({
  ticketId,
  name,
  email,
}: PayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrImage, setQrImage] = useState("");
  const router = useRouter();

  async function handlePay() {
    setLoading(true);
    setError("");
    setQrImage("");

    try {
      // 1. Create the Payment Intent on the server.
      const { clientKey, paymentIntentId } =
        await createPaymentIntentAction(ticketId);

      // 2. Create a QR Ph payment method.
      const method = await paymongo.paymentMethods.create({
        type: "qrph",
      });

      // 3. Attach the method to the Payment Intent.
      const result = await paymongo.paymentIntents.attach(
        paymentIntentId,
        {
          paymentMethod: method.id,
          clientKey,
        }
      );

      const attrs = result.attributes;

      // 4. QR Ph requires the customer to scan the QR code.
      if (attrs.status === "awaiting_next_action") {
        const nextAction = attrs.next_action as unknown as {
          code?: {
            image_url?: string;
          };
        } | null;

        const imageUrl = nextAction?.code?.image_url;

        if (!imageUrl) {
          console.error(
            "[QR Ph] Missing QR image URL in next_action",
            attrs.next_action
          );

          throw new Error("PayMongo did not return a QR code.");
        }

        setQrImage(imageUrl);
        setLoading(false);
        return;
      }

      // Handle an intent that has already succeeded.
      if (attrs.status === "succeeded") {
        router.push(`/ticket/${ticketId}`);
        router.refresh();
        return;
      }

      throw new Error(`Unexpected payment status: ${attrs.status}`);
    } catch (e) {
      console.error("[QR Ph payment error]", e);
      setError(
        "Unable to generate your QR code. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {!qrImage && (
        <button
          type="button"
          onClick={handlePay}
          disabled={loading}
          className="w-full rounded-xl bg-[#652DC1] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#7a45d6] disabled:opacity-50"
        >
          {loading ? "Generating QR code..." : "Pay with QR Ph"}
        </button>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {qrImage && (
        <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-[#652DC1] bg-black p-4">
          <h2 className="text-lg font-semibold text-[#652DC1]">
            Scan to Pay
          </h2>

          <p className="text-center text-sm text-neutral-400">
            Open GCash, Maya, or a participating banking app
            and scan this QR code to complete your payment.
          </p>

          <img
            src={qrImage}
            alt="QR Ph payment QR code"
            className="h-64 w-64 rounded-xl bg-white object-contain p-2"
          />

          <p className="text-sm text-neutral-400">
            Complete payment before the QR code expires.
          </p>

          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-xl border border-[#652DC1] px-4 py-2 text-[#652DC1] hover:bg-[#652DC1]/10"
          >
            I've paid — Check ticket status
          </button>
        </div>
      )}
    </div>
  );
}
