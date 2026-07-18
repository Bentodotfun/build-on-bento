import type { PoolStatus } from "@/lib/pools-types";

export function StatusBadge({ status }: { status: PoolStatus }) {
  if (status === "open")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-electric px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-electric-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-white" />
        Open
      </span>
    );
  if (status === "resolved_true")
    return (
      <span className="rounded-full bg-verdict-green px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink">
        ✓ Resolved True
      </span>
    );
  return (
    <span className="rounded-full bg-verdict-red px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
      ✗ Resolved False
    </span>
  );
}
