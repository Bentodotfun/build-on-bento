import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Pulse swipe sports, see what the smart money bet, back it in one tap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#fff",
          fontFamily: "sans-serif",
          background: "radial-gradient(120% 90% at 15% 0%, #2a3a8c 0%, #182357 42%, #08090d 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", width: 64, height: 64, borderRadius: 18, overflow: "hidden", background: "#000000" }}>
            <svg width="64" height="64" viewBox="0 0 24 24">
              <path d="M9 20 L9 13 L16 9 L9 6 L9 4" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 34, fontWeight: 700 }}>
            <span>Pulse</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 74, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>
            Swipe Sports. Bet with the smart money.
          </div>
          <div style={{ fontSize: 34, marginTop: 28, opacity: 0.82, maxWidth: 940 }}>
            Live markets that create and resolve at match tempo. Tap YES/NO, back it in one signature on Bento.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {["Real odds", "Real markets", "One-tap on Bento"].map((t) => (
            <div key={t} style={{ fontSize: 26, fontWeight: 600, padding: "12px 26px", borderRadius: 999, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)" }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
