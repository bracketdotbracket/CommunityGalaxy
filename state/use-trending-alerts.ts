import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { PlanetData, TopCommunity } from "@/lib/galaxy-types";

type Options = {
  /** Current poll snapshot from the top-communities query */
  communities: TopCommunity[] | undefined;
  /** Resolved planets (with derived market cap, color, etc) */
  planets: PlanetData[];
  /** Called when the user clicks the toast to fly to a planet */
  onFocus: (tokenAddress: string) => void;
};

type Entry = {
  /** Recent latestPostAt timestamps observed (ms) */
  bursts: number[];
  /** Last time we surfaced a toast for this token */
  lastToastAt: number;
  /** Have we seen at least one snapshot yet? */
  seeded: boolean;
};

const WINDOW_MS = 90_000; // look back 90s
const MIN_BURSTS = 3; // need 3 fresh posts in window
const TOAST_COOLDOWN_MS = 2 * 60_000; // 2 min per token

/** Watches polling snapshots and fires a toast when a community spikes in activity. */
export function useTrendingAlerts({ communities, planets, onFocus }: Options) {
  const entriesRef = useRef<Map<string, Entry>>(new Map());
  // Keep latest planets map in a ref so we can render rich toast content
  const planetsRef = useRef(planets);
  planetsRef.current = planets;
  const focusRef = useRef(onFocus);
  focusRef.current = onFocus;

  useEffect(() => {
    if (!communities) return;
    const now = Date.now();
    const entries = entriesRef.current;

    for (const c of communities) {
      const key = c.tokenAddress;
      const stamp = c.latestPostAt;
      let entry = entries.get(key);
      if (!entry) {
        entry = { bursts: [], lastToastAt: 0, seeded: false };
        entries.set(key, entry);
      }

      const prevLatest = entry.bursts[entry.bursts.length - 1] ?? 0;
      if (!entry.seeded) {
        // Baseline first sighting — don't fire a toast for historical data.
        entry.bursts = stamp ? [stamp] : [];
        entry.seeded = true;
        continue;
      }

      if (stamp && stamp > prevLatest) {
        entry.bursts.push(stamp);
      }
      // Drop bursts outside window
      entry.bursts = entry.bursts.filter((t) => now - t < WINDOW_MS);

      if (
        entry.bursts.length >= MIN_BURSTS &&
        now - entry.lastToastAt > TOAST_COOLDOWN_MS
      ) {
        entry.lastToastAt = now;
        const planet = planetsRef.current.find(
          (p) => p.community.tokenAddress === key,
        );
        const symbol = c.tokenSymbol || planet?.community.tokenSymbol || "—";
        const count = entry.bursts.length;
        toast(`🔥 $${symbol} trending`, {
          description: `${count} new posts in the last ${Math.round(
            WINDOW_MS / 1000,
          )}s · click to fly there`,
          duration: 8000,
          action: {
            label: "Fly",
            onClick: () => focusRef.current(key),
          },
        });
      }
    }
  }, [communities]);
}