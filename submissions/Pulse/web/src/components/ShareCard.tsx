"use client";

import { forwardRef } from "react";
import type { FixtureDTO, Buyable } from "@/lib/types";
import { teamColor } from "@/lib/flags";
import { PulseLogo } from "./PulseLogo";

// A self-contained (no cross-origin images) share image, rendered off-screen and
// snapshotted to PNG. Pure CSS so html-to-image never taints the canvas.
export const ShareCard = forwardRef<
  HTMLDivElement,
  { fx: FixtureDTO; buyable: Buyable; amount: number; smart?: string | null }
>(function ShareCard({ fx, buyable, amount, smart }, ref) {
  const color = teamColor(fx.home.name);
  const cents = buyable.price != null ? Math.round(buyable.price * 100) : null;
  const payout = buyable.price ? (amount / buyable.price).toFixed(0) : null;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: -9999,
        top: 0,
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 84,
        color: "#fff",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        background: `radial-gradient(120% 90% at 20% 0%, ${color} 0%, ${color}cc 40%, #08090d 100%)`,
      }}
    >
      {/* dotted texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.1,
          backgroundImage: "radial-gradient(circle at 20% 10%, #fff 1px, transparent 2px)",
          backgroundSize: "34px 34px",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18 }}>
        <PulseLogo size={56} />
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
          Pulse
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 26, textTransform: "uppercase", letterSpacing: 4, opacity: 0.7 }}>
          {fx.away.name ? `${fx.home.name} vs ${fx.away.name}` : "World Cup 2026"}
        </div>
        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, marginTop: 18, maxWidth: 900 }}>
          {buyable.label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 40 }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              padding: "14px 30px",
              borderRadius: 999,
              background: buyable.outcome === "YES" ? "rgba(52,211,153,.22)" : "rgba(244,63,94,.22)",
              border: `2px solid ${buyable.outcome === "YES" ? "rgba(52,211,153,.6)" : "rgba(244,63,94,.6)"}`,
            }}
          >
            I&apos;m on {buyable.outcome}
          </div>
          {cents != null && <div style={{ fontSize: 46, fontWeight: 800 }}>@ {cents}¢</div>}
        </div>
        {smart && (
          <div style={{ fontSize: 32, marginTop: 34, opacity: 0.9 }}>
            <span style={{ color: "#4ade80" }}>●</span> smart money is on <b>{smart}</b>
          </div>
        )}
        {payout && (
          <div style={{ fontSize: 30, marginTop: 14, opacity: 0.75 }}>
            ${amount} → ${payout} if it hits
          </div>
        )}
      </div>

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30, opacity: 0.85 }}>
        <span>read the odds like the stars</span>
        <b>pulse.fun</b>
      </div>
    </div>
  );
});
