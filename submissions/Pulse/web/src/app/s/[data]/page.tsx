import type { Metadata } from "next";
import Link from "next/link";
import { decodeShare } from "@/lib/share";
import { mediaFor } from "@/lib/media";
import { teamColor } from "@/lib/flags";
import { PulseLogo } from "@/components/PulseLogo";

type Props = { params: Promise<{ data: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await params;
  const card = decodeShare(data);
  const cents = card?.y != null ? Math.round(card.y) : null;
  const matchup = card?.h && card?.a ? `${card.h} vs ${card.a}` : card?.c || "World Cup 2026";
  const q = card?.q && card.q.trim() ? card.q : matchup;
  const title = `${q}${cents != null ? ` · market says ${cents}%` : ""} · Pulse`;
  const description = card?.h && card?.a
    ? `${card.h} vs ${card.a}. Swipe live World Cup markets, see what smart money bet, back it in one tap.`
    : "Swipe live World Cup markets, see what smart money bet, and back it in one tap.";

  return {
    title,
    description,
    openGraph: { title, description, url: `/s/${data}`, type: "website", siteName: "Pulse" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharePage({ params }: Props) {
  const { data } = await params;
  const card = decodeShare(data);
  const cents = card?.y != null ? Math.round(card.y) : null;
  const matchup = card?.h && card?.a ? `${card.h} vs ${card.a}` : card?.c || "World Cup 2026";
  const q = card?.q && card.q.trim() ? card.q : matchup;
  const media = mediaFor([card?.h, card?.a, card?.q]);
  const still = media?.poster ?? media?.image ?? null;
  const color = teamColor(card?.h || card?.q || "");

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[540px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex items-center gap-2.5">
        <PulseLogo size={24} className="shadow-sm" />
        <span className="text-[15px] font-semibold tracking-tight">Pulse</span>
      </div>

      <div className="mt-8 w-full overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--shadow-lg)]">
        <div className="relative flex h-[300px] items-end justify-start overflow-hidden text-left" style={{ background: `linear-gradient(150deg, ${color} 0%, #0b0d12 75%)` }}>
          {still && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover [object-position:center_18%]" />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,9,13,.15) 0%, rgba(8,9,13,.05) 40%, rgba(8,9,13,.85) 100%)" }} />
          <div className="relative p-6">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/70">{matchup}</div>
            <div className="mt-1.5 text-[24px] font-extrabold leading-tight tracking-tight text-white">{q}</div>
          </div>
        </div>
        {cents != null && (
          <div className="flex justify-center gap-2.5 p-6">
            <div className="num rounded-full border border-good/40 bg-good/10 px-4 py-2 text-[15px] font-bold text-good">YES {cents}¢</div>
            <div className="num rounded-full border border-bad/40 bg-bad/10 px-4 py-2 text-[15px] font-bold text-bad">NO {100 - cents}¢</div>
          </div>
        )}
      </div>

      <Link href="/" className="mt-8 rounded-2xl bg-ink px-7 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90">
        Swipe the deck →
      </Link>
      <p className="mt-4 max-w-[320px] text-[13px] leading-relaxed text-muted">
        Live World Cup odds, real smart-money signals, one-tap trading on Bento.
      </p>
    </main>
  );
}
