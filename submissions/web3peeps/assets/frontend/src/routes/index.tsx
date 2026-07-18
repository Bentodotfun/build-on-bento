import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Sparkles, Search, Zap, TrendingUp } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { InstallCTA } from "@/components/InstallCTA";
import { VerdictTicker } from "@/components/VerdictTicker";

export const Route = createFileRoute("/")({
  component: Landing,
});

const steps = [
  {
    icon: Search,
    title: "See a spicy tweet",
    body: "Any claim on X — sports, politics, tech, gossip. If it can be resolved true or false, it can be a market.",
  },
  {
    icon: Sparkles,
    title: "AI reads the room",
    body: "Anakin pulls context, sources, and sentiment so you're not betting blind on a headline.",
  },
  {
    icon: Zap,
    title: "Bet in one tap",
    body: "Bento drops the market straight into the tweet. No wallet, no signup — just your X handle.",
  },
  {
    icon: TrendingUp,
    title: "Watch it resolve",
    body: "Markets settle when the truth lands. Winners get paid. Losers get memed.",
  },
];

function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-20 top-10 size-64 rounded-full bg-zap/60 blur-3xl" />
          <div className="absolute right-0 top-40 size-72 rounded-full bg-electric/30 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 md:px-8 md:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-lilac px-4 py-1.5 ink-border font-mono text-xs font-semibold"
          >
            <span className="size-2 animate-pulse rounded-full bg-verdict-green" />
            Live on X · Powered by Bento + Anakin
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-4xl font-display text-5xl font-black leading-[1.02] tracking-tight text-ink md:text-7xl lg:text-8xl"
          >
            Turn any tweet into a{" "}
            <span className="relative inline-block">
              <span className="absolute inset-0 -z-10 -rotate-2 bg-zap" />
              <span className="relative px-2">live truth market</span>
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-6 max-w-2xl text-lg text-ink/70 md:text-xl"
          >
            No wallet. No sign-up. Just your X handle — we handle the rest.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <InstallCTA size="lg" />
            <a
              href="/pools"
              className="rounded-xl bg-paper px-5 py-3 font-display font-bold text-ink ink-border hard-shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Browse live markets →
            </a>
          </motion.div>
        </div>
      </section>

      {/* TICKER */}
      <VerdictTicker />

      {/* HOW IT WORKS */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 md:px-8 md:py-28">
        <div className="mb-12 flex items-end justify-between gap-6">
          <h2 className="font-display text-4xl font-black md:text-6xl">
            How it <span className="text-electric">works</span>
          </h2>
          <p className="hidden max-w-sm text-ink/70 md:block">
            From doomscroll to degen in under 10 seconds. That's the whole product.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative rounded-2xl bg-card p-6 ink-border hard-shadow-sm"
            >
              <div className="absolute -top-3 -left-3 grid size-10 place-items-center rounded-full bg-ink font-mono text-sm font-black text-paper">
                {i + 1}
              </div>
              <div className="mb-4 grid size-12 place-items-center rounded-xl bg-lilac ink-border">
                <s.icon className="size-6" strokeWidth={2.5} />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold">{s.title}</h3>
              <p className="text-sm text-ink/70">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHY NOT BENTO */}
      <section className="border-y-2 border-ink bg-lilac">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-24">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-mono text-sm font-bold uppercase tracking-widest text-electric">
                We ❤️ Bento, but —
              </p>
              <h2 className="mt-3 font-display text-4xl font-black md:text-5xl">
                Bento is the rail. Dibs is the reason to ride.
              </h2>
            </div>
            <ul className="space-y-4">
              {[
                ["In-tweet placement", "Markets live inside the tweet — not on some other tab."],
                ["AI research layer", "Anakin surfaces context before you bet, not after."],
                ["Zero wallet friction", "Handle-first onboarding. Custody sorted, out of your way."],
              ].map(([title, body]) => (
                <li
                  key={title}
                  className="rounded-xl bg-card p-4 ink-border hard-shadow-sm"
                >
                  <p className="font-display text-lg font-bold">{title}</p>
                  <p className="text-sm text-ink/70">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-24 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-electric p-10 text-center ink-border hard-shadow md:p-16">
          <div className="absolute -top-10 -right-10 size-40 rounded-full bg-zap opacity-90" />
          <h2 className="relative font-display text-4xl font-black text-electric-foreground md:text-6xl">
            Ready to bet on the timeline?
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-electric-foreground/80">
            Install the extension. Open X. Start printing.
          </p>
          <div className="relative mt-8 flex justify-center">
            <InstallCTA size="lg" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
