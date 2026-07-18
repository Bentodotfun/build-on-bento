import { createFileRoute } from "@tanstack/react-router";
import { getMockPool } from "@/lib/pools-mock";

export const Route = createFileRoute("/api/pools/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const backend = process.env.TRUTHMARKET_API_URL || "http://localhost:3000";
        if (backend) {
          try {
            const r = await fetch(
              `${backend.replace(/\/$/, "")}/pools/${encodeURIComponent(params.id)}`,
              { headers: { accept: "application/json" } },
            );
            if (r.ok) {
              const body = await r.text();
              return new Response(body, {
                status: 200,
                headers: {
                  "content-type": "application/json",
                  "cache-control": "public, max-age=15, s-maxage=30",
                },
              });
            }
          } catch {
            /* fall through to mock */
          }
        }
        const p = getMockPool(params.id);
        if (!p) return new Response("Not found", { status: 404 });
        return Response.json(p);
      },
    },
  },
});
