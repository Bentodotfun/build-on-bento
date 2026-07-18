import { ImageResponse } from "next/og";
import { decodeShare } from "@/lib/share";
import { mediaFor } from "@/lib/media";
import { teamColor } from "@/lib/flags";

export const alt = "Pulse Swipe Sports";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ data: string }> }) {
  const { data } = await params;
  const card = decodeShare(data);
  const cents = card?.y != null ? Math.round(card.y) : null;
  const matchup = card?.h && card?.a ? `${card.h} vs ${card.a}` : card?.c || "World Cup 2026";
  const headline = card?.q && card.q.trim() ? card.q : matchup;
  const color = teamColor(card?.h || card?.q || "");
  const media = mediaFor([card?.h, card?.a, card?.q]);
  const still = media?.poster ?? media?.image ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          color: "#fff",
          fontFamily: "sans-serif",
          background: `linear-gradient(135deg, ${color} 0%, #0b0d12 68%)`,
        }}
      >
        {/* right-hand image panel — 736px source downscaled here → stays crisp */}
        {still && (
          <div style={{ position: "absolute", top: 0, right: 0, width: 500, height: 630, display: "flex" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={still} alt="" width={500} height={630} style={{ width: 500, height: 630, objectFit: "cover", objectPosition: "top center" }} />
            {/* fade the image into the gradient on its left edge */}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${color} 0%, rgba(11,13,18,0) 42%)` }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(8,9,13,0) 55%, rgba(8,9,13,.55) 100%)" }} />
          </div>
        )}

        {/* left content column */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56, width: 720, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 46, height: 46, borderRadius: 13, overflow: "hidden", background: "#000000" }}>
              <svg width="46" height="46" viewBox="0 0 24 24">
                <path d="M9 20 L9 13 L16 9 L9 6 L9 4" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <div style={{ fontSize: 27, fontWeight: 700 }}>Pulse</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 3, opacity: 0.72 }}>{matchup}</div>
            <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.03, letterSpacing: -1.5, marginTop: 14, maxWidth: 620, display: "flex" }}>{headline}</div>
            {cents != null && (
              <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                <div style={{ display: "flex", fontSize: 27, fontWeight: 800, padding: "10px 24px", borderRadius: 999, background: "rgba(52,211,153,.22)", border: "2px solid rgba(52,211,153,.55)" }}>
                  YES {cents}¢
                </div>
                <div style={{ display: "flex", fontSize: 27, fontWeight: 800, padding: "10px 24px", borderRadius: 999, background: "rgba(244,63,94,.22)", border: "2px solid rgba(244,63,94,.55)" }}>
                  NO {100 - cents}¢
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, opacity: 0.9 }}>pulse.fun</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
