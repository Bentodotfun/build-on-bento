import { createFileRoute } from "@tanstack/react-router";
import { getMockPools } from "@/lib/pools-mock";

export const Route = createFileRoute("/api/pools")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const searchParams = url.searchParams; // pass all params through
        const backend = process.env.TRUTHMARKET_API_URL || "http://localhost:3000";

        if (backend) {
          try {
            const backendUrl = new URL(`${backend.replace(/\/$/, "")}/pools`);
            // Forward all original query params to the backend
            for (const [key, value] of searchParams) {
              backendUrl.searchParams.set(key, value);
            }
            const r = await fetch(backendUrl.toString(), {
              headers: { accept: "application/json" },
            });
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

        const status = searchParams.get("status") ?? "all";
        return Response.json(getMockPools(status), {
          headers: { "cache-control": "public, max-age=15, s-maxage=30" },
        });
      },
    },
  },
});
