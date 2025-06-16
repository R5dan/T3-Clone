// app/api/stream/route.js
import { EventEmitter } from "events";

// Simulate an external data source (could be database changes, websocket, etc.)
const dataEmitter = new EventEmitter();

// Simulate external process sending data
setInterval(() => {
  dataEmitter.emit("newData", {
    id: Date.now(),
    message: `Update at ${new Date().toISOString()}`,
    value: Math.random(),
  });
}, 2000);

export async function GET(request) {
  const encoder = new TextEncoder();

  // Get search params for filtering/configuration
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";

  const stream = new ReadableStream({
    start(controller) {
      console.log("Stream started");

      // Send initial message
      const initialData = { type: "connected", timestamp: Date.now() };
      if (format === "sse") {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`),
        );
      } else {
        controller.enqueue(encoder.encode(JSON.stringify(initialData) + "\n"));
      }

      // Listen for external data
      const dataHandler = (data) => {
        try {
          const payload = { type: "update", ...data };
          if (format === "sse") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
            );
          } else {
            controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));
          }
        } catch (error) {
          console.error("Error sending data:", error);
          controller.error(error);
        }
      };

      // Register listener
      dataEmitter.on("newData", dataHandler);

      // Handle client disconnect
      const cleanup = () => {
        console.log("Cleaning up stream");
        dataEmitter.off("newData", dataHandler);
      };

      // Store cleanup function for cancel handler
      controller.cleanup = cleanup;
    },

    cancel() {
      console.log("Stream cancelled");
      if (this.cleanup) {
        this.cleanup();
      }
    },
  });

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (format === "sse") {
    headers["Content-Type"] = "text/event-stream";
    headers["Cache-Control"] = "no-cache";
    headers["Connection"] = "keep-alive";
  } else {
    headers["Content-Type"] = "application/json";
    headers["Transfer-Encoding"] = "chunked";
  }

  return new Response(stream, { headers });
}

// You can also create a POST endpoint to trigger data
export async function POST(request) {
  const body = await request.json();

  // Emit data to all connected streams
  dataEmitter.emit("newData", {
    id: Date.now(),
    message: body.message || "Manual trigger",
    source: "api",
    data: body,
  });

  return Response.json({ success: true, message: "Data sent to streams" });
}
