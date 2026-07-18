import { Link } from "@tanstack/react-router";
import { InstallCTA } from "./InstallCTA";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-electric text-electric-foreground ink-border font-display text-lg font-black">
            D
          </span>
          <span className="font-display text-xl font-black tracking-tight">
            Dibs
          </span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            to="/"
            className="font-medium text-ink/70 hover:text-ink"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-ink font-bold" }}
          >
            Home
          </Link>
          <Link
            to="/pools"
            className="font-medium text-ink/70 hover:text-ink"
            activeProps={{ className: "text-ink font-bold" }}
          >
            Live Pools
          </Link>
        </nav>
        <InstallCTA size="sm" label="Install" />
      </div>
    </header>
  );
}
