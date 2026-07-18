import { NextRequest } from "next/server";

// Same-origin proxy for remote images so html-to-image can bake them into the
// share card without tainting the canvas. Only allows known image hosts.
const ALLOW = /^https:\/\/(i\.pinimg\.com|upload\.wikimedia\.org|flagcdn\.com|.*\.amazonaws\.com)\//;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  if (!ALLOW.test(url)) return new Response("bad url", { status: 400 });
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) return new Response("fetch failed", { status: 502 });
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        "content-type": res.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new Response("error", { status: 502 });
  }
}
