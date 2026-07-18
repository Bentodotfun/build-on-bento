"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { toPng } from "html-to-image";
import type { DeckCard } from "@/lib/types";
import { teamColor } from "@/lib/flags";
import { mediaFor } from "@/lib/media";
import { encodeShare } from "@/lib/share";
import { PulseLogo } from "./PulseLogo";

const WEB = "https://pulse.fun";

export function ShareSheet({ card, onClose }: { card: DeckCard; onClose: () => void }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<string | null>(null);

  const color = teamColor(card.subject.team ?? card.home.name);
  const media = mediaFor([card.subject.name, card.subject.team, card.home.name]);
  const still = media?.poster ?? media?.image ?? null;
  const bg = still ? `/api/img-proxy?url=${encodeURIComponent(still)}` : null;
  const cents = card.yes != null ? Math.round(card.yes) : null;

  // render the card to a PNG once the node (and its image) are ready
  useEffect(() => {
    let alive = true;
    const gen = async () => {
      const node = nodeRef.current;
      if (!node) return;
      // wait a tick for the bg image to load
      await new Promise((r) => setTimeout(r, bg ? 450 : 60));
      try {
        const dataUrl = await toPng(node, { width: 1080, height: 1080, pixelRatio: 1, cacheBust: true });
        if (alive) setImg(dataUrl);
      } catch {
        if (alive) setImg(null);
      }
    };
    gen();
    return () => {
      alive = false;
    };
  }, [bg]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // ask followers which side they'd take
  const sideQ = card.away.name
    ? `Which side you on — ${card.home.name} or ${card.away.name}?`
    : "YES or NO?";
  const text = `${card.question}${cents != null ? ` Market says ${cents}%.` : ""} ${sideQ} back your call on Pulse`;
  // a shareable link that unfurls (OG image + title) wherever it's pasted
  const shareUrl = `${WEB}/s/${encodeShare({
    q: card.question,
    y: cents,
    h: card.away.name ? card.home.name : "",
    a: card.away.name ?? "",
    c: card.competition,
  })}`;

  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const download = () => {
    if (!img) return;
    const a = document.createElement("a");
    a.href = img;
    a.download = "pulse-card.png";
    a.click();
  };

  const share = () => {
    track("share_card", { question: card.question });
    // always open X with the tweet + unfurling link prefilled
    window.open(
      `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener",
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center animate-fadein" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-t-[26px] border border-line bg-card p-5 shadow-[var(--shadow-lg)] sm:rounded-[26px] animate-rise" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[15px] font-semibold tracking-tight">Share your card</div>
          <button onClick={onClose} className="rounded-full px-2 py-1 text-[17px] leading-none text-faint hover:text-ink">✕</button>
        </div>

        {/* preview */}
        <div className="overflow-hidden rounded-2xl border border-line bg-wash">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="share card" className="w-full" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-[13px] text-muted">rendering…</div>
          )}
        </div>

        <div className="mt-4 flex gap-2.5">
          <button onClick={share} className="flex-1 rounded-2xl bg-ink py-3.5 text-[15px] font-semibold tracking-tight text-white transition hover:opacity-90">
            Share on X
          </button>
          <button onClick={copyLink} className="rounded-2xl border border-line-strong px-5 py-3.5 text-[14px] font-semibold text-ink transition hover:border-ink">
            {copied ? "Copied" : "Copy link"}
          </button>
          <button onClick={download} disabled={!img} title="Save image" className="rounded-2xl border border-line-strong px-5 py-3.5 text-[14px] font-semibold text-ink transition hover:border-ink disabled:opacity-60">
            Save
          </button>
        </div>
        <p className="mt-2.5 text-center text-[11.5px] text-faint">The link unfurls into this card wherever you paste it.</p>
      </div>

      {/* hidden render target (1080²) */}
      <div style={{ position: "fixed", left: -99999, top: 0 }}>
        <div
          ref={nodeRef}
          style={{
            width: 1080,
            height: 1080,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            overflow: "hidden",
            color: "#fff",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            background: `linear-gradient(165deg, ${color} 0%, ${shade(color)} 55%, #08090d 100%)`,
          }}
        >
          {bg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bg} alt="" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(8,9,13,.4) 0%, rgba(8,9,13,.05) 30%, rgba(8,9,13,.55) 62%, rgba(8,9,13,.96) 100%)" }} />

          {/* top brand */}
          <div style={{ position: "absolute", top: 64, left: 64, display: "flex", alignItems: "center", gap: 16 }}>
            <PulseLogo size={52} />
            <div style={{ display: "flex", gap: 10, fontSize: 30, fontWeight: 700 }}>
              <span>Pulse</span>
            </div>
          </div>

          {/* bottom content */}
          <div style={{ position: "relative", padding: 64 }}>
            <div style={{ fontSize: 26, textTransform: "uppercase", letterSpacing: 4, opacity: 0.75 }}>
              {card.away.name ? `${card.home.name} vs ${card.away.name}` : `World Cup 2026 · ${card.competition}`}
            </div>
            <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2, marginTop: 18, maxWidth: 940 }}>{card.question}</div>
            <div style={{ display: "flex", gap: 14, marginTop: 36 }}>
              <div style={{ fontSize: 34, fontWeight: 800, padding: "14px 28px", borderRadius: 999, background: "rgba(52,211,153,.22)", border: "2px solid rgba(52,211,153,.55)" }}>
                YES {cents != null ? `${cents}¢` : ""}
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, padding: "14px 28px", borderRadius: 999, background: "rgba(244,63,94,.22)", border: "2px solid rgba(244,63,94,.55)" }}>
                NO {cents != null ? `${100 - cents}¢` : ""}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 46, fontSize: 28, opacity: 0.85 }}>
              <span>read the odds like the stars</span>
              <b>pulse.fun</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function shade(color: string): string {
  if (color.startsWith("hsl")) return color.replace(/(\d+)%\)$/, (_m, l) => `${Math.max(0, Number(l) - 30)}%)`);
  const m = color.replace("#", "");
  if (m.length !== 6) return color;
  const n = parseInt(m, 16);
  const d = (v: number) => Math.max(0, v - 40);
  return `rgb(${d((n >> 16) & 255)} ${d((n >> 8) & 255)} ${d(n & 255)})`;
}
