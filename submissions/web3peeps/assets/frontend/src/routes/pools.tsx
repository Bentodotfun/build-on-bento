import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PoolCard } from "@/components/PoolCard";
import { InstallCTA } from "@/components/InstallCTA";
import type { PoolSummary } from "@/lib/pools-types";

export const Route = createFileRoute("/pools")({
  head: () => ({
    meta: [
      { title: "Live Pools — Dibs" },
      {
        name: "description",
        content:
          "Browse live prediction markets on X tweets. Real-time odds, AI sentiment, and full resolution history.",
      },
      { property: "og:title", content: "Live Pools — Dibs" },
      {
        property: "og:description",
        content: "Live prediction markets on X tweets with AI sentiment.",
      },
    ],
  }),
  component: PoolsPage,
});

type Filter = "all" | "open" | "resolved";

function PoolsPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading } = useQuery<PoolSummary[]>({
    queryKey: ["pools", filter],
    queryFn: async () => {
      const r = await fetch(`/api/pools?status=${filter}&refresh=true`);
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const pools = data ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <section className="border-b-2 border-ink bg-lilac">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-electric">
            Live markets
          </p>
          <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">
            The timeline, priced.
          </h1>
          <p className="mt-3 max-w-xl text-ink/70">
            Real pools running right now. Odds update live. AI sentiment updates
            with them.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        {/* Filter bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-xl bg-card p-1 ink-border hard-shadow-sm">
            {(["all", "open", "resolved"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 font-display text-sm font-bold capitalize transition-colors ${
                  filter === f
                    ? "bg-ink text-paper"
                    : "text-ink/70 hover:text-ink"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="font-mono text-xs text-ink/60">
            {isLoading ? "Loading…" : `${pools.length} market${pools.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl bg-card ink-border"
              />
            ))}
          </div>
        ) : pools.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            layout
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {pools.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                >
                  <PoolCard pool={p} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 rounded-3xl bg-ink p-8 text-center md:p-12">
          <h2 className="font-display text-3xl font-black text-paper md:text-4xl">
            See a tweet worth pricing?
          </h2>
          <p className="mt-2 text-paper/70">
            The extension puts a market on any tweet in one tap.
          </p>
          <div className="mt-6 flex justify-center">
            <InstallCTA size="lg" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl bg-card p-16 text-center ink-border hard-shadow-sm">
      <p className="text-6xl">🌱</p>
      <h3 className="mt-4 font-display text-2xl font-bold">No markets yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-ink/70">
        The first pools of the day are being minted. Check back in a minute, or
        install the extension and start one yourself.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <InstallCTA size="sm" />
        <Link
          to="/"
          className="rounded-xl bg-paper px-4 py-2 font-display font-bold text-ink ink-border hard-shadow-sm"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
