// app/ticket/[id]/image/route.tsx
import { ImageResponse } from "next/og";
import { getById } from "@/app/api/tickets/route";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return new Response("Invalid ticket", { status: 400 });
    }

    const response = await getById(id);

    if (!response.ok) {
      return new Response("Ticket not found", { status: response.status });
    }

    const ticket = await response.json();

    if (!ticket || ticket.status !== "confirmed") {
      return new Response("Ticket not confirmed", { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const templateResponse = await fetch(`${origin}/ticket.svg`);

    if (!templateResponse.ok) {
    return new Response("Could not load ticket template", {
        status: 500,
    });
    }

    const templateSvg = await templateResponse.text();

    const templateData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    templateSvg
    )}`;

    const seatLabels = ticket.seats.length > 0
      ? ticket.seats.join(", ")
      : "N/A (Silver)";

    const seatSection = ticket.seats.length > 0
    ? ticket.seats[0].slice(0, 2)
    : "SILVER";

    return new ImageResponse(
      (
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "1200px",
            height: "630px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          {/* Ticket template background */}
          <img
            src={templateData}
            width={1200}
            height={630}
            style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "1200px",
                height: "630px",
            }}
            />
          <div
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              left: 22,
              top: 130,
              width: 400,
              color: "#111111",
              fontSize: 24,
              gap: 28,
            }}
          >
            <div style={{ display: "flex", top: 65 }}>
              <span>{ticket.name}</span>
            </div>

            <div style={{ display: "flex", top: 70 }}>
              <span>{ticket.studentNum}</span>
            </div>

            <div style={{ display: "flex", top: 70 }}>
              <span>
                {ticket.createdAt
                  ? new Date(ticket.createdAt).toLocaleString("en-PH", {
                      timeZone: "Asia/Manila",
                    })
                  : ""}
              </span>
            </div>

            <div style={{ display: "flex", top: 70 }}>
              <span>{ticket._id.toString()}</span>
            </div>

            <div style={{ display: "flex", top: 80 }}>
              <span>{seatSection}</span>
            </div>

            <div style={{ display: "flex", top: 87 }}>
              <span>{seatLabels}</span>
            </div>

            <div style={{ display: "flex", top: 95 }}>
              <span>₱{ticket.price}</span>
            </div>
          </div>

          {/* Details on the dark right panel */}
          <div
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              left: 535,
              top: 155,
              width: 610,
              color: "#ffffff",
              fontSize: 24,
              gap: 30,
            }}
          >
            <div style={{ display: "flex", top: 130 }}>
              {ticket.name}
            </div>

            <div style={{ display: "flex", top: 130 }}>
              {ticket._id.toString()}
            </div>

            <div style={{ display: "flex", top: 130 }}>
                {seatSection}
            </div>

            <div style={{ display: "flex", top: 70, left: 300 }}>
                {seatLabels}
            </div>

            <div style={{ display: "flex", top: 70 }}>
              ₱{ticket.price}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("Ticket image generation failed:", error);

    return new Response("Failed to generate ticket image", {
      status: 500,
    });
  }
}