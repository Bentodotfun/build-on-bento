"use client";

import { useEffect, useState } from "react";
import { PulseLogo } from "./PulseLogo";

const KEY = "pulse.seen.v2";

const STEPS = [
  { n: "01", t: "See the smart money", d: "Every card shows what on-chain whales actually bet — win rates, stake sizes, live." },
  { n: "02", t: "Call it", d: "Swipe Sports. Tap YES or NO on match winners, Golden Boot, reach-the-final." },
  { n: "03", t: "Back it in one tap", d: "Sign in with your wallet in one signature. Real markets on Bento." },
];

export function Onboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {}
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-wash px-6 animate-fadein">
      <div className="w-full max-w-[420px] text-ink">
        <div className="flex items-center gap-2.5">
          <PulseLogo size={28} className="shadow-sm" />
          <span className="text-[16px] font-semibold tracking-tight">Pulse</span>
        </div>

        <h1 className="mt-7 text-[34px] font-extrabold leading-[1.05] tracking-tight text-balance">
          Swipe Sports.
          <br />
          Bet with the smart money.
        </h1>

        <div className="mt-8 flex flex-col gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-4">
              <span className="num shrink-0 text-[13px] font-bold text-faint">{s.n}</span>
              <div>
                <div className="text-[15.5px] font-semibold tracking-tight">{s.t}</div>
                <div className="mt-0.5 text-[13.5px] leading-relaxed text-muted">{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="mt-9 w-full rounded-2xl bg-ink py-4 text-[15px] font-bold tracking-tight text-white transition hover:opacity-90"
        >
          Start swiping →
        </button>
        <p className="mt-3 text-center text-[11.5px] text-faint">Live odds &amp; on-chain data. You can lose your stake.</p>
      </div>
    </div>
  );
}
