import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Zap } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SentimentChip } from "@/components/SentimentChip";
import { StatusBadge } from "@/components/StatusBadge";
import { InstallCTA } from "@/components/InstallCTA";
import type { PoolDetail } from "@/lib/pools-types";

export const Route = createFileRoute("/pools/$id")({
  component: PoolDetailPage,
  notFoundComponent: PoolNotFound,
});

function PoolNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto flex flex-1 max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-6xl">🕳️</p>
        <h1 className="mt-4 font-display text-4xl font-black">Market not found</h1>
        <p className="mt-2 text-ink/70">
          This pool doesn't exist or has been removed.
        </p>
        <Link
          to="/pools"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-electric px-5 py-3 font-display font-bold text-electric-foreground ink-border hard-shadow-sm"
        >
          <ArrowLeft className="size-4" /> Browse pools
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

function PoolDetailPage() {
  const { id } = Route.useParams();

  const { data, isLoading, isError } = useQuery<PoolDetail>({
    queryKey: ["pool", id],
    queryFn: async () => {
      const r = await fetch(`/api/pools/${id}`);
      if (r.status === 404) throw notFound();
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const { data: aiAnalysis, isLoading: aiLoading } = useQuery({
    queryKey: ["pool-ai-analysis", id],
    queryFn: async () => {
      const r = await fetch(`/api/markets/${id}/ai-analysis`);
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!id,
  });

  if (isError) return <PoolNotFound />;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-8 md:py-12">
        <Link
          to="/pools"
          className="mb-6 inline-flex items-center gap-1.5 font-mono text-sm text-ink/60 hover:text-electric"
        >
          <ArrowLeft className="size-4" /> All pools
        </Link>

        {isLoading || !data ? (
          <div className="h-96 animate-pulse rounded-3xl bg-card ink-border" />
        ) : (
          <>
            <div className="rounded-3xl bg-card p-6 ink-border hard-shadow md:p-10">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <StatusBadge status={data.status} />
                <SentimentChip sentiment={data.sentiment} />
                <span className="font-mono text-xs text-ink/60">
                  Vol ${data.volume.toLocaleString()}
                </span>
              </div>

              <h1 className="font-display text-3xl font-black leading-tight md:text-5xl">
                {data.claim}
              </h1>

              <OddsBar oddsTrue={data.oddsTrue} />

              <div className="mt-8 rounded-2xl bg-lilac p-5 ink-border">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-electric">
                  Original tweet · {data.sourceAuthor}
                </p>
                <p className="mt-3 text-lg text-ink/90">"{data.tweetText}"</p>
                <a
                  href={data.sourceTweetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-electric hover:underline"
                >
                  View on X <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>

            <section className="mt-10">
              <h2 className="mb-4 font-display text-2xl font-black">
                Why the AI thinks so
              </h2>
              <p className="mb-6 text-ink/70">
                Everything Anakin found while pricing this market.
              </p>
              <p className="mb-6 rounded-xl bg-card p-4 italic ink-border hard-shadow-sm">
                "{data.hookLine}"
              </p>
              <div className="space-y-4">
                {data.context.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-card p-5 ink-border hard-shadow-sm"
                  >
                    <p className="font-display text-lg font-bold">{c.title}</p>
                    <p className="mt-2 text-ink/80">{c.body}</p>
                    {c.sourceName && (
                      <p className="mt-3 font-mono text-xs text-ink/50">
                        Source: {c.sourceName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {aiLoading ? (
              <section className="mt-10 space-y-4">
                <div className="h-32 animate-pulse rounded-3xl bg-card ink-border" />
              </section>
            ) : aiAnalysis ? (
              <section className="mt-10 rounded-3xl bg-lilac p-6 ink-border hard-shadow md:p-10">
                <div className="mb-6 flex items-center gap-2">
                  <Zap className="size-5 text-electric" />
                  <h2 className="font-display text-2xl font-black">AI Analysis</h2>
                </div>
                <p className="mb-4 text-ink/80">{aiAnalysis.analysis}</p>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div className="rounded-xl bg-card/50 p-3">
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                      Confidence
                    </p>
                    <p className="mt-1 font-display text-xl font-black">
                      {aiAnalysis.confidence}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-card/50 p-3">
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                      Risk Level
                    </p>
                    <p className="mt-1 font-display text-xl font-black capitalize">
                      {aiAnalysis.riskLevel}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="mt-12 space-y-6">
              <div className="rounded-3xl bg-card p-6 ink-border hard-shadow md:p-10">
                <h2 className="mb-6 font-display text-2xl font-black">Pool Details</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-xl bg-lilac p-4">
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                      Participants
                    </p>
                    <p className="mt-2 font-display text-2xl font-black">
                      {data.participants ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-lilac p-4">
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                      Yes Votes
                    </p>
                    <p className="mt-2 font-display text-2xl font-black text-verdict-green">
                      {data.yesVotes ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-lilac p-4">
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                      No Votes
                    </p>
                    <p className="mt-2 font-display text-2xl font-black text-verdict-red">
                      {data.noVotes ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-lilac p-4">
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                      Total Volume
                    </p>
                    <p className="mt-2 font-display text-2xl font-black">
                      ${data.totalVolume?.toLocaleString() ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  // Manually trigger AI analysis fetch
                  const r = await fetch(`/api/markets/${id}/ai-analysis`);
                  if (r.ok) {
                    const analysis = await r.json();
                    // Trigger refetch by invalidating the query
                    window.location.reload();
                  }
                }}
                disabled={aiLoading}
                className="w-full rounded-xl bg-electric px-6 py-3 font-display font-bold text-electric-foreground ink-border hard-shadow-sm hover:hard-shadow transition-all disabled:opacity-50"
              >
                {aiLoading ? 'Analyzing...' : aiAnalysis ? 'Refresh Analysis' : 'Get AI Analysis'}
              </button>

              {aiAnalysis && (
                <div className="rounded-3xl bg-lilac p-6 ink-border hard-shadow md:p-10">
                  <div className="mb-6 flex items-center gap-2">
                    <Zap className="size-5 text-electric" />
                    <h2 className="font-display text-2xl font-black">AI Analysis</h2>
                  </div>
                  <p className="mb-4 text-ink/80 leading-relaxed">{aiAnalysis.analysis}</p>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-card/50 p-3">
                      <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                        Confidence
                      </p>
                      <p className="mt-1 font-display text-xl font-black">
                        {aiAnalysis.confidence}%
                      </p>
                    </div>
                    <div className="rounded-xl bg-card/50 p-3">
                      <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                        Risk Level
                      </p>
                      <p className="mt-1 font-display text-xl font-black capitalize">
                        {aiAnalysis.riskLevel}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-3xl bg-zap p-8 text-center ink-border hard-shadow md:p-10">
                <p className="font-display text-2xl font-bold">
                  Place your bet on Bento
                </p>
                <p className="mt-2 text-ink/70">
                  Trade your prediction on the testnet prediction market.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  {data.bentoMarketId && (
                    <a
                      href={`https://testnet.bento.fun/market/${data.bentoMarketId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-electric px-6 py-3 font-display font-bold text-electric-foreground ink-border hard-shadow-sm hover:hard-shadow transition-all"
                    >
                      Open on Bento <ExternalLink className="size-4" />
                    </a>
                  )}
                  <InstallCTA size="lg" />
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function OddsBar({ oddsTrue }: { oddsTrue: number }) {
  const truePct = Math.round(oddsTrue * 100);
  const falsePct = 100 - truePct;
  return (
    <div className="mt-8">
      <div className="mb-2 flex justify-between font-mono text-xs font-bold uppercase tracking-widest">
        <span className="text-verdict-green">True · {truePct}%</span>
        <span className="text-verdict-red">False · {falsePct}%</span>
      </div>
      <div className="flex h-10 overflow-hidden rounded-xl ink-border">
        <div
          className="bg-verdict-green transition-all duration-500"
          style={{ width: `${truePct}%` }}
        />
        <div
          className="bg-verdict-red transition-all duration-500"
          style={{ width: `${falsePct}%` }}
        />
      </div>
    </div>
  );
}
