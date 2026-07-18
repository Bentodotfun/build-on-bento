import { promises as fs } from "fs";
import path from "path";

/**
 * Minimal local tracking of duels this worker created — no DB for a
 * hackathon-speed build. The resolver needs this because there's no
 * "list my created duels" read on the SDK (see BENTO_INTEGRATION.md).
 */

export type TrackedDuel = {
  duelId: string;
  question: string;
  startTime: number; // ms
  endTime: number; // ms
  resolved: boolean;
  seeded?: boolean; // has the bot placed a small balancing bet on both sides yet?
};

const STATE_FILE = path.join(process.cwd(), ".pulse-duels.json");

export async function loadState(): Promise<TrackedDuel[]> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveState(duels: TrackedDuel[]): Promise<void> {
  await fs.writeFile(STATE_FILE, JSON.stringify(duels, null, 2));
}

export async function addDuel(d: TrackedDuel): Promise<void> {
  const state = await loadState();
  state.push(d);
  await saveState(state);
}

export async function markResolved(duelId: string): Promise<void> {
  const state = await loadState();
  const row = state.find((d) => d.duelId === duelId);
  if (row) row.resolved = true;
  await saveState(state);
}

export async function markSeeded(duelId: string): Promise<void> {
  const state = await loadState();
  const row = state.find((d) => d.duelId === duelId);
  if (row) row.seeded = true;
  await saveState(state);
}
