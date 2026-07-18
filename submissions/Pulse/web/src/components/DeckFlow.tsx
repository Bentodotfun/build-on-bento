"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DeckCard, MatchInsight, Buyable } from "@/lib/types";
import { ReelCard, type TeamTile } from "./Reel";
import { BuySheet } from "./BuySheet";
import { ShareSheet } from "./ShareSheet";
import { ConnectButton } from "./ConnectButton";
import { BalancePill } from "./BalancePill";
import { PulseLogo } from "./PulseLogo";
import { kickoffLabel } from "@/lib/format";
import { mediaFor } from "@/lib/media";

type Phase = "loading" | "deck" | "empty";

export function DeckFlow() {
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [insight, setInsight] = useState<MatchInsight | null>(null);
  const [buy, setBuy] = useState<{ card: DeckCard; buyable: Buyable } | null>(null);
  const [shareOf, setShareOf] = useState<DeckCard | null>(null);
  const [tut, setTut] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    try {
      setSoundOn(localStorage.getItem("pulse.sound") === "1");
    } catch {}
  }, []);
  const toggleSound = () => {
    setSoundOn((v) => {
      const next = !v;
      try {
        localStorage.setItem("pulse.sound", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    try {
      setTut(!localStorage.getItem("pulse.swipetut"));
    } catch {}
  }, []);
  const seenTut = () => {
    if (!tut) return;
    try {
      localStorage.setItem("pulse.swipetut", "1");
    } catch {}
    setTut(false);
  };

  const card = cards[idx];

  // teams strip ("teams running up") — unique teams with their win %
  const teams = useMemo<TeamTile[]>(() => {
    const map = new Map<string, TeamTile>();
    for (const c of cards) {
      // only real nations (have a flag) — keeps players/empty out of the strip
      for (const s of [c.home, c.away]) if (s.name && s.iso && !map.has(s.name)) map.set(s.name, { name: s.name, iso: s.iso, yes: null });
      if (c.type === "winner" && c.yes != null) {
        const t = map.get(c.subject.name);
        if (t) t.yes = Math.round(c.yes);
      }
    }
    return [...map.values()];
  }, [cards]);

  useEffect(() => {
    fetch("/api/deck")
      .then((r) => r.json())
      .then((d) => {
        const c: DeckCard[] = d.cards ?? [];
        setCards(c);
        setPhase(c.length ? "deck" : "empty");
      })
      .catch(() => setPhase("empty"));
  }, []);

  // Legacy "smart money insight" fetch (`/api/match/[id]`) removed — it hit
  // the old pre-Bento backend (MARKET_API_BASE, unconfigured now) with no
  // timeout, taking 20-100+ seconds per call. Browsers cap concurrent
  // connections per host at ~6, so a few of these piling up on every card
  // change was starving out other requests — this is what looked like
  // "no card shows after skip." `insight` stays null; Reel.tsx's
  // buildBeats() already falls back cleanly to real Bento data
  // (card.yes / card.volume) when it's absent.

  // tap YES/NO → straight into the buy flow for that side (no reveal step)
  const onAnswer = (yes: boolean) => {
    if (!card) return;
    const side: Buyable["side"] =
      card.type === "winner" ? (card.subject.name === card.away.name ? "away" : "home") : card.type === "draw" ? "draw" : "btts";
    const q = card.question.replace(/\?$/, "");
    const buyable: Buyable = yes
      ? { side, label: q, conditionId: card.conditionId, tokenId: card.tokenId, price: card.yes != null ? card.yes / 100 : null, outcome: "YES", optionIndex: 0, collateralMode: card.collateralMode }
      : { side, label: `NO · ${q}`, conditionId: card.conditionId, tokenId: card.noTokenId ?? card.tokenId, price: card.yes != null ? (100 - card.yes) / 100 : null, outcome: "NO", optionIndex: 1, collateralMode: card.collateralMode };
    setBuy({ card, buyable });
  };

  const next = () => {
    seenTut();
    setInsight(null);
    setIdx((i) => i + 1);
  };

  const prev = () => {
    seenTut();
    setInsight(null);
    setIdx((i) => Math.max(0, i - 1));
  };

  // share → open the image popup for the current card
  const shareCard = () => {
    if (card) setShareOf(card);
  };

  // preload the next card's video so swiping feels instant
  const nextVideo = (() => {
    const n = cards[idx + 1];
    if (!n) return null;
    return mediaFor([n.subject.name, n.subject.team, n.home.name])?.video ?? null;
  })();

  const jumpToTeam = (name: string) => {
    const j = cards.findIndex((c) => c.home.name === name || c.away.name === name || c.subject.name === name);
    if (j >= 0) {
      setInsight(null);
      setIdx(j);
    }
  };

  if (phase === "loading") return <Shell><Skeleton /></Shell>;
  if (phase === "empty") return <Shell><Empty /></Shell>;
  if (idx >= cards.length) return <Shell><Header /><Done onRestart={() => setIdx(0)} /></Shell>;

  return (
    <Shell>
      <Header />
      <div className="mb-3 mt-4 flex w-full items-center justify-between px-1">
        <span className="text-[12px] uppercase tracking-[0.09em] text-muted">
          {card.kickoff ? `${card.competition} 2026 · ${kickoffLabel(card.kickoff)}` : `World Cup · ${card.competition}`}
        </span>
        <span className="num text-[12px] text-faint">{idx + 1} / {cards.length}</span>
      </div>

      <ReelCard key={card.key} card={card} insight={insight} teams={teams} tutorial={tut && idx === 0} soundOn={soundOn} onToggleSound={toggleSound} onAnswer={onAnswer} onSkip={next} onPrev={idx > 0 ? prev : undefined} onTeam={jumpToTeam} onShare={shareCard} />

      {nextVideo && <video src={nextVideo} preload="auto" muted playsInline style={{ display: "none" }} />}

      {buy && <BuySheet fx={fixtureFromCard(buy.card)} buyable={buy.buyable} onClose={() => setBuy(null)} />}
      {shareOf && <ShareSheet card={shareOf} onClose={() => setShareOf(null)} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col items-center px-5 pb-6">
      {children}
      <Footer />
    </div>
  );
}

function Footer() {
  const link = "underline decoration-line-strong underline-offset-2 hover:text-ink transition-colors";
  return (
    <footer className="flex flex-col items-center gap-3 border-t border-line pt-5 pb-2 text-center text-[11.5px] text-faint">
      <div>
        powered by{" "}
        <a href="https://bento.fun" target="_blank" rel="noreferrer" className={link}>
          bento.fun
        </a>
      </div>
    </footer>
  );
}

function fixtureFromCard(c: DeckCard) {
  return {
    id: c.fixtureId,
    competition: c.competition,
    kickoff: c.kickoff,
    home: c.home,
    away: c.away,
    odds: { home: null, draw: null, away: null, btts: null, volume: 0 },
    ticker: "",
  };
}

// ---------------------------------------------------------------- header ---

function Header() {
  return (
    <header className="flex w-full items-center justify-between pt-7 pb-1">
      <div className="flex items-center gap-2.5">
        <PulseLogo size={24} className="shadow-sm" />
        <span className="text-[15px] font-semibold tracking-tight">Pulse</span>
      </div>
      <div className="flex items-center gap-1.5">
        <a href="/portfolio" className="rounded-xl border border-line-strong px-2.5 py-1.5 text-[12.5px] font-semibold text-muted transition hover:border-ink hover:text-ink">
          Portfolio
        </a>
        <BalancePill />
        <ConnectButton />
      </div>
    </header>
  );
}

// -------------------------------------------------------- states ---

function Skeleton() {
  return (
    <div className="mt-10 w-full">
      <div className="h-[420px] w-full animate-pulse rounded-[26px] bg-line/70" />
    </div>
  );
}

function Empty() {
  return (
    <div className="mt-20 flex flex-col items-center gap-3 text-center">
      <div className="h-10 w-10 rounded-full border-2 border-line-strong" />
      <div className="text-[16px] font-semibold">The deck is empty</div>
      <div className="max-w-[280px] text-[13.5px] text-muted">No live markets right now. Come back near kickoff.</div>
    </div>
  );
}

function Done({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center gap-4 text-center">
      <PulseLogo size={48} className="shadow-sm" />
      <div className="text-[20px] font-bold tracking-tight">You&apos;ve seen every call</div>
      <div className="max-w-[280px] text-[14px] text-muted">More markets drop as kickoff nears. Check back for fresh cards.</div>
      <button onClick={onRestart} className="mt-2 rounded-2xl bg-ink px-6 py-3 text-[15px] font-semibold text-white hover:opacity-90">
        Back to the top →
      </button>
    </div>
  );
}
