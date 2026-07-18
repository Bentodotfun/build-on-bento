"use client";

import { useEffect, useRef, useState } from "react";
import type { DeckCard, MatchInsight } from "@/lib/types";
import { teamColor, monogram } from "@/lib/flags";
import { money } from "@/lib/format";
import { resolveImage } from "@/lib/img";
import { mediaFor, type Media } from "@/lib/media";

// ---- team tile used in the running strip ("teams running up") ----
export type TeamTile = { name: string; iso: string | null; yes: number | null };

// -------------------------------------------------------------- CountUp ---

function CountUp({ to, format, dur = 850 }: { to: number; format: (n: number) => string; dur?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    const tick = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return <>{format(v)}</>;
}

// -------------------------------------------------------------- Marquee ---

export function Marquee({ children, dur = 32, reverse = false }: { children: React.ReactNode; dur?: number; reverse?: boolean }) {
  return (
    <div style={{ overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          width: "max-content",
          animation: `marquee ${dur}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        <div style={{ display: "flex", flexShrink: 0, flexWrap: "nowrap", whiteSpace: "nowrap" }}>{children}</div>
        <div style={{ display: "flex", flexShrink: 0, flexWrap: "nowrap", whiteSpace: "nowrap" }} aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- beats ---

type Beat = { kicker: string; value?: React.ReactNode; label?: string; text?: string };

function buildBeats(card: DeckCard, insight: MatchInsight | null): Beat[] {
  const beats: Beat[] = [];
  if (insight?.smartPick) {
    beats.push({
      kicker: "Smart money",
      value: <CountUp to={insight.smartPick.confidenceUsd} format={(n) => money(n)} />,
      label: `loaded on ${insight.smartPick.team}`,
    });
  }
  if (insight && insight.track.resolved > 0) {
    beats.push({
      kicker: "Track record",
      value: (
        <>
          <CountUp to={insight.track.correct} format={(n) => String(Math.round(n))} />/{insight.track.resolved}
        </>
      ),
      label: "sharp calls that hit this World Cup",
    });
    if (insight.track.roi)
      beats.push({
        kicker: "Avg return",
        value: <CountUp to={insight.track.roi} format={(n) => `+${Math.round(n)}%`} />,
        label: "on their on-chain bets",
      });
  }
  const top = insight?.smartMoney?.[0];
  if (top) {
    beats.push({
      kicker: "Sharpest wallet",
      value: <CountUp to={top.winRate} format={(n) => `${Math.round(n)}%`} />,
      label: `win rate — ${top.name} sent ${money(top.amount)}`,
    });
  }
  if (card.yes != null) {
    beats.push({
      kicker: "The market",
      value: <CountUp to={card.yes} format={(n) => `${n.toFixed(0)}%`} />,
      label: "reads it right now",
    });
  }
  if (card.volume) {
    beats.push({
      kicker: "In play",
      value: <CountUp to={card.volume} format={(n) => money(n)} />,
      label: "wagered on this market",
    });
  }
  if (card.yes != null && card.yes > 0) {
    const mult = 100 / card.yes;
    beats.push({
      kicker: "Potential payout",
      value: <CountUp to={mult} format={(n) => `${n.toFixed(1)}x`} />,
      label: "on a winning YES",
    });
  }
  if (!beats.length) beats.push({ kicker: "Reading the odds", value: "···", label: "" });
  return beats.slice(0, 4);
}

// -------------------------------------------------------------- media hook ---

function lastName(full: string) {
  const p = (full || "").trim().split(/\s+/);
  return p.length > 1 ? p[p.length - 1] : full;
}

function useSubjectMedia(card: DeckCard): { video?: string; image: string | null; poster?: string } {
  const isPlayer = card.subject.kind === "player";
  const primaryName = isPlayer ? card.subject.name : card.subject.team ?? card.home.name;

  const manifest: Media | null = mediaFor([
    card.subject.name,
    isPlayer ? lastName(card.subject.name) : null,
    card.subject.team,
    card.home.name,
  ]);

  const [wiki, setWiki] = useState<string | null>(card.edit ?? manifest?.image ?? null);

  useEffect(() => {
    if (card.edit || manifest?.video || manifest?.image) {
      setWiki(card.edit ?? manifest?.image ?? null);
      return;
    }
    let active = true;
    setWiki(null);
    resolveImage(isPlayer ? "player" : "team", primaryName).then((u) => {
      if (active) setWiki(u);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.key]);

  return { video: manifest?.video, image: card.edit ?? manifest?.image ?? wiki, poster: manifest?.poster };
}

// -------------------------------------------------------------- ReelCard ---

export function ReelCard({
  card,
  insight,
  teams,
  tutorial,
  soundOn,
  onToggleSound,
  onAnswer,
  onSkip,
  onPrev,
  onTeam,
  onShare,
}: {
  card: DeckCard;
  insight: MatchInsight | null;
  teams: TeamTile[];
  tutorial?: boolean;
  soundOn?: boolean;
  onToggleSound?: () => void;
  onAnswer: (yes: boolean) => void;
  onSkip: () => void;
  onPrev?: () => void;
  onTeam?: (name: string) => void;
  onShare?: () => void;
}) {
  const color = teamColor(card.subject.team ?? card.home.name);
  const beats = buildBeats(card, insight);
  const [i, setI] = useState(0);
  const media = useSubjectMedia(card);

  useEffect(() => {
    setI(0);
  }, [card.key, insight]);

  useEffect(() => {
    if (beats.length <= 1) return;
    const id = setInterval(() => setI((p) => (p + 1) % beats.length), 2800);
    return () => clearInterval(id);
  }, [beats.length, card.key]);

  const beat = beats[Math.min(i, beats.length - 1)] ?? beats[0];
  const ticker = insight?.smartMoney ?? [];

  // haptics + buttery imperative swipe (no React re-render during drag)
  const start = useRef<{ x: number; y: number } | null>(null);
  const dxRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Set the DOM `muted` property directly (React's attr is unreliable → browser
  // blocks the first autoplay) and kick playback so it starts immediately.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !soundOn;
    v.play().catch(() => {
      // unmuted autoplay may be blocked until a gesture — fall back to muted
      if (soundOn) {
        v.muted = true;
        v.play().catch(() => {});
      }
    });
  }, [soundOn, media.video]);
  const skipStamp = useRef<HTMLDivElement>(null);
  const backStamp = useRef<HTMLDivElement>(null);
  const done = useRef(false); // a card can only fly off once
  const buzz = (ms = 12) => {
    try {
      (navigator as unknown as { vibrate?: (n: number) => void }).vibrate?.(ms);
    } catch {}
  };
  const answer = (yes: boolean) => {
    buzz(15);
    onAnswer(yes);
  };

  const paint = (x: number, spring: boolean) => {
    const el = cardRef.current;
    if (el) {
      el.style.transition = spring ? "transform .34s cubic-bezier(.22,.61,.36,1), opacity .34s ease" : "none";
      el.style.transform = `translateX(${x}px) rotate(${x * 0.035}deg)`;
      el.style.opacity = String(1 - Math.min(Math.abs(x) / 1100, 0.22));
    }
    // Right swipe = skip, left swipe = back.
    if (skipStamp.current) skipStamp.current.style.opacity = String(x > 18 ? Math.min(x / 105, 1) : 0);
    if (backStamp.current) backStamp.current.style.opacity = String(x < -18 ? Math.min(-x / 105, 1) : 0);
  };
  const flyOff = (dir: 1 | -1, go: () => void) => {
    if (done.current) return;
    done.current = true;
    buzz();
    const el = cardRef.current;
    if (el) {
      el.style.transition = "transform .3s cubic-bezier(.4,0,.7,.2), opacity .3s ease-out";
      el.style.transform = `translateX(${dir * 720}px) rotate(${dir * 12}deg)`;
      el.style.opacity = "0";
    }
    setTimeout(go, 240);
  };
  const doSkip = () => flyOff(1, onSkip);
  const doPrev = () => onPrev && flyOff(-1, onPrev);

  const onTouchStart = (e: React.TouchEvent) => {
    if (done.current) return;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current) return;
    const t = e.touches[0];
    const ddx = t.clientX - start.current.x;
    const ddy = t.clientY - start.current.y;
    if (Math.abs(ddx) > Math.abs(ddy)) {
      dxRef.current = ddx;
      paint(ddx, false);
    }
  };
  const onTouchEnd = () => {
    if (!start.current) return;
    start.current = null;
    const d = dxRef.current;
    dxRef.current = 0;
    // Right swipe (d > 0) = skip, left swipe (d < 0) = back.
    if (Math.abs(d) > 85) flyOff(d > 0 ? 1 : -1, d > 0 ? onSkip : () => onPrev?.());
    else paint(0, true);
  };

  // one-time coach: nudge the card so users learn it swipes
  useEffect(() => {
    if (!tutorial) return;
    const timers = [
      setTimeout(() => paint(-74, true), 700),
      setTimeout(() => paint(0, true), 1050),
      setTimeout(() => paint(74, true), 1400),
      setTimeout(() => paint(0, true), 1750),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorial]);

  return (
    <div className="w-full animate-pop">
      <div className="relative w-full">
        {/* ambient light behind the card — a soft glow on each side, revealed as it swipes */}
        <div
          className="pointer-events-none absolute top-1/2 -left-10 h-[75%] w-44 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`, opacity: 0.55 }}
        />
        <div
          className="pointer-events-none absolute top-1/2 -right-10 h-[75%] w-44 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`, opacity: 0.55 }}
        />
      <div
        ref={cardRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative z-[1] flex min-h-[560px] w-full flex-col overflow-hidden rounded-[26px] text-white shadow-[var(--shadow-lg)]"
        style={{
          background: `linear-gradient(165deg, ${color} 0%, ${shade(color, -34)} 50%, #08090d 100%)`,
          willChange: "transform",
          touchAction: "pan-y",
        }}
      >
        {/* swipe stamps */}
        <div ref={backStamp} className="pointer-events-none absolute left-6 top-1/2 z-20 -translate-y-1/2 -rotate-12 rounded-xl border-[3px] border-white/80 px-4 py-2 text-[24px] font-extrabold uppercase tracking-wide opacity-0" style={{ textShadow: "0 2px 10px rgba(0,0,0,.5)" }}>
          Back
        </div>
        <div ref={skipStamp} className="pointer-events-none absolute right-6 top-1/2 z-20 -translate-y-1/2 rotate-12 rounded-xl border-[3px] border-white/80 px-4 py-2 text-[24px] font-extrabold uppercase tracking-wide opacity-0" style={{ textShadow: "0 2px 10px rgba(0,0,0,.5)" }}>
          Skip
        </div>
        {/* full-bleed media */}
        {media.video ? (
          <video
            key={media.video}
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src={media.video}
            poster={media.poster}
            autoPlay
            muted={!soundOn}
            loop
            playsInline
          />
        ) : media.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={media.image} src={media.image} alt={card.subject.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          // no media → big ghosted flag over the gradient
          <div className="absolute inset-0 flex items-center justify-center opacity-25">
            {card.subject.iso ? (
              <div className="h-64 w-64 overflow-hidden rounded-full blur-[1px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://flagcdn.com/w320/${card.subject.iso}.png`} alt="" className="h-full w-full object-cover" style={{ transform: "scale(1.6)" }} />
              </div>
            ) : (
              <div className="text-[120px] font-black tracking-tighter">{monogram(card.subject.name)}</div>
            )}
          </div>
        )}

        {/* legibility scrims */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,9,13,.55) 0%, rgba(8,9,13,.05) 26%, rgba(8,9,13,.35) 62%, rgba(8,9,13,.94) 100%)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: "radial-gradient(circle at 20% 10%, #fff .6px, transparent 1.4px)", backgroundSize: "16px 16px" }} />

        {/* content over media */}
        <div className="relative z-10 flex flex-1 flex-col p-5">
          {/* story progress */}
          <div className="flex gap-1">
            {beats.map((_, k) => (
              <span key={k} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                <span className="block h-full bg-white" style={{ width: k <= i ? "100%" : "0%", transition: k === i ? "width 2.6s linear" : "none" }} />
              </span>
            ))}
          </div>

          {/* matchup */}
          <div className="mt-2.5 flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-1.5 font-medium text-white/85 drop-shadow">
              {card.away.name ? (
                <>
                  {miniFlag(card.home.iso, card.home.name)} {short(card.home.name)}
                  <span className="text-white/50">vs</span>
                  {short(card.away.name)} {miniFlag(card.away.iso, card.away.name)}
                </>
              ) : (
                <>
                  {card.subject.iso && miniFlag(card.subject.iso, card.subject.name)} {card.subject.name}
                </>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="hidden rounded-full bg-black/35 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/85 backdrop-blur sm:inline-block">{typeLabel(card.type)}</span>
              {media.video && onToggleSound && (
                <button
                  onClick={onToggleSound}
                  aria-label={soundOn ? "Mute" : "Unmute"}
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/35 text-white/85 backdrop-blur transition hover:bg-black/55"
                >
                  {soundOn ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                      <line x1="22" y1="9" x2="16" y2="15" />
                      <line x1="16" y1="9" x2="22" y2="15" />
                    </svg>
                  )}
                </button>
              )}
              {onShare && (
                <button
                  onClick={onShare}
                  aria-label="Share"
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/35 text-white/85 backdrop-blur transition hover:bg-black/55"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
                    <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* social proof */}
          {(card.volume || insight?.smartCount) && (
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              {card.volume ? (
                <span className="rounded-full bg-black/30 px-2.5 py-1 text-white/75 backdrop-blur">
                  <b className="num text-white/95">{money(card.volume)}</b> in play
                </span>
              ) : null}
              {insight?.smartCount ? (
                <span className="rounded-full bg-black/30 px-2.5 py-1 text-white/75 backdrop-blur">
                  <span className="text-emerald-400">●</span> <b className="num text-white/95">{insight.smartCount}</b> whales in
                </span>
              ) : null}
            </div>
          )}

          {/* glass chip — rotates through the data beats (incl. the live-form stat on props) */}
          <div className="flex flex-1 items-center justify-center py-6">
            <div
              key={i}
              className="beat-in flex max-w-[300px] flex-col items-center rounded-[22px] border border-white/40 bg-white/15 px-6 py-4 text-center backdrop-blur-2xl"
              style={{ boxShadow: "0 8px 34px -10px rgba(0,0,0,.5), inset 0 1px 0 0 rgba(255,255,255,.5), inset 0 -1px 0 0 rgba(255,255,255,.1)" }}
            >
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/75" style={{ textShadow: "0 1px 8px rgba(0,0,0,.5)" }}>
                {beat.kicker}
              </div>
              {beat.text ? (
                <div className="mt-2 text-[15px] font-semibold leading-snug text-white text-balance" style={{ textShadow: "0 1px 12px rgba(0,0,0,.55)" }}>
                  {beat.text}
                </div>
              ) : (
                <>
                  <div className="num mt-0.5 text-[42px] font-extrabold leading-none tracking-[-0.04em]" style={{ textShadow: "0 2px 18px rgba(0,0,0,.55)" }}>
                    {beat.value}
                  </div>
                  {beat.label && (
                    <div className="mt-1 max-w-[210px] text-[12px] font-semibold text-white text-balance" style={{ textShadow: "0 1px 10px rgba(0,0,0,.5)" }}>
                      {beat.label}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* question + choice */}
          <h2 className="mb-3 text-center text-[25px] font-extrabold leading-[1.08] tracking-tight text-balance" style={{ textShadow: "0 2px 16px rgba(0,0,0,.6)" }}>
            {card.question}
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => answer(true)}
              className="rounded-2xl border border-emerald-300/40 bg-emerald-400/25 py-4 text-[18px] font-extrabold tracking-tight backdrop-blur-md transition hover:-translate-y-px hover:bg-emerald-400/40 active:translate-y-0"
            >
              YES {card.yes != null && <span className="num text-[13px] font-semibold text-white/70">{Math.round(card.yes)}¢</span>}
            </button>
            <button
              onClick={() => answer(false)}
              className="rounded-2xl border border-rose-300/40 bg-rose-500/25 py-4 text-[18px] font-extrabold tracking-tight backdrop-blur-md transition hover:-translate-y-px hover:bg-rose-500/40 active:translate-y-0"
            >
              NO {card.yes != null && <span className="num text-[13px] font-semibold text-white/70">{100 - Math.round(card.yes)}¢</span>}
            </button>
          </div>
        </div>

        {/* live smart-money ticker pinned to bottom */}
        {ticker.length > 0 && (
          <div className="relative z-10 border-t border-white/10 bg-black/40 py-2 backdrop-blur">
            <Marquee dur={30} reverse>
              {ticker.map((s, k) => (
                <span key={k} className="mx-4 inline-flex items-center gap-2 whitespace-nowrap text-[12px] text-white/75">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                  <b className="font-semibold text-white/95">{s.name}</b> {s.outcome.toLowerCase() === "yes" ? "backed" : "faded"}{" "}
                  <span className="num text-white/95">{money(s.amount)}</span>
                  <span className="text-white/45"> · win {s.winRate}%</span>
                </span>
              ))}
            </Marquee>
          </div>
        )}
      </div>

        {/* one-time finger-swipe coach */}
        {tutorial && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <div className="relative flex items-center justify-center" style={{ animation: "swipefinger 1.9s ease-in-out infinite" }}>
              <span className="absolute h-16 w-16 rounded-full bg-white/50" style={{ animation: "swipepulse 1.9s ease-in-out infinite" }} />
              <span className="relative h-11 w-11 rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,.45)] ring-2 ring-black/10" />
            </div>
          </div>
        )}
      </div>

      {/* teams running up — clickable strip beneath the pin */}
      <div className="mt-2.5 overflow-hidden rounded-2xl border border-line bg-card py-2 shadow-sm">
        <Marquee dur={26}>
          {teams.map((t, k) => (
            <button
              key={k}
              onClick={() => onTeam?.(t.name)}
              className="mx-1.5 flex items-center gap-2 rounded-full bg-wash px-3 py-1.5 transition hover:bg-line-strong/60"
            >
              {miniFlag(t.iso, t.name, 18)}
              <span className="text-[12px] font-semibold text-ink">{t.name}</span>
              {t.yes != null && <span className="num text-[12px] text-muted">{t.yes}%</span>}
            </button>
          ))}
        </Marquee>
      </div>

      {/* nav */}
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={doPrev}
          disabled={!onPrev}
          className="flex-1 rounded-2xl border border-line-strong py-3 text-[14px] font-medium text-muted transition enabled:hover:border-ink enabled:hover:text-ink disabled:opacity-40"
        >
          ← Prev
        </button>
        <button onClick={doSkip} className="flex-1 rounded-2xl border border-dashed border-line-strong py-3 text-[14px] font-medium text-muted transition hover:border-ink hover:text-ink">
          Skip →
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- helpers ---

function typeLabel(t: DeckCard["type"]) {
  return t === "winner" ? "Match winner" : t === "draw" ? "The draw" : t === "btts" ? "Both to score" : "Player prop";
}
function short(name: string) {
  return name.length > 11 ? name.slice(0, 10) + "…" : name;
}
function miniFlag(iso: string | null, name: string, size = 16) {
  const w = Math.round(size * 1.33); // real flag ratio, rectangular
  if (!iso)
    return (
      <span className="inline-grid place-items-center rounded-[2px] bg-white/20 text-[8px] font-bold" style={{ width: w, height: size }}>
        {monogram(name).slice(0, 2)}
      </span>
    );
  return (
    <span className="inline-flex overflow-hidden rounded-[2px] ring-1 ring-white/25" style={{ width: w, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://flagcdn.com/w80/${iso}.png`} alt={name} className="h-full w-full object-cover" />
    </span>
  );
}

/** darken/lighten a hex or hsl color roughly for the gradient tail */
function shade(color: string, amt: number): string {
  if (color.startsWith("hsl")) {
    return color.replace(/(\d+)%\)$/, (_m, l) => `${Math.max(0, Math.min(100, Number(l) + amt))}%)`);
  }
  const m = color.replace("#", "");
  if (m.length !== 6) return color;
  const n = parseInt(m, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r} ${g} ${b})`;
}
