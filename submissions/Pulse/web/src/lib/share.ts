// Encode a deck card into a compact, URL-safe slug so it can be shared as a
// link that unfurls (OG image + title) on X / Telegram / iMessage — no DB needed.

export type ShareCard = {
  q: string; // question
  y: number | null; // YES cents (0..100)
  h: string; // home name ("" for tournament props)
  a: string; // away name
  c: string; // competition
};

function b64urlEncode(s: string): string {
  const b64 = typeof Buffer !== "undefined" ? Buffer.from(s, "utf8").toString("base64") : btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return typeof Buffer !== "undefined"
    ? Buffer.from(b64, "base64").toString("utf8")
    : decodeURIComponent(escape(atob(b64)));
}

export function encodeShare(c: ShareCard): string {
  // positional array keeps the slug short
  return b64urlEncode(JSON.stringify([c.q, c.y, c.h, c.a, c.c]));
}

export function decodeShare(slug: string): ShareCard | null {
  try {
    const arr = JSON.parse(b64urlDecode(slug));
    if (!Array.isArray(arr)) return null;
    return { q: String(arr[0] ?? ""), y: arr[1] == null ? null : Number(arr[1]), h: String(arr[2] ?? ""), a: String(arr[3] ?? ""), c: String(arr[4] ?? "") };
  } catch {
    return null;
  }
}
