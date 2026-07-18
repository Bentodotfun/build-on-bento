"use client";

// Resolve a real image for a team or player. Priority handled by the caller:
//   1. /edits/<slug>.jpg override (set server-side on the card)
//   2. Wikimedia photo (this module) — reliable, hotlinkable, CORS-open
//   3. gradient + flag fallback (in the component)

const mem = new Map<string, string | null>();

export async function resolveImage(kind: "team" | "player" | "match", name: string): Promise<string | null> {
  if (!name) return null;
  const key = `${kind}:${name}`;
  if (mem.has(key)) return mem.get(key) ?? null;

  if (typeof window !== "undefined") {
    const ls = localStorage.getItem(`img:${key}`);
    if (ls !== null) {
      const v = ls || null;
      mem.set(key, v);
      return v;
    }
  }

  const titles =
    kind === "team"
      ? [`${name} national football team`, `${name} national under-23 football team`]
      : kind === "player"
        ? [name]
        : [];

  let found: string | null = null;
  for (const t of titles) {
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`);
      if (!r.ok) continue;
      const j = await r.json();
      const src: string | undefined = j?.originalimage?.source ?? j?.thumbnail?.source;
      // skip tiny icons
      if (src && !/\.svg(\?|$)/i.test(src)) {
        found = src;
        break;
      }
    } catch {
      /* offline / blocked — fall through */
    }
  }

  mem.set(key, found);
  if (typeof window !== "undefined") localStorage.setItem(`img:${key}`, found ?? "");
  return found;
}
