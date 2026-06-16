import { useQuery } from "@tanstack/react-query";

export type TokenStats = {
  marketCap: number | null;
  holderCount: number | null;
  priceUsd: number | null;
  volume24h: number | null;
};

type JupPool = {
  volume24h?: number;
  baseAsset?: {
    id?: string;
    usdPrice?: number;
    mcap?: number;
    holderCount?: number;
  };
};

async function fetchBatch(addresses: string[]): Promise<Record<string, TokenStats>> {
  if (addresses.length === 0) return {};
  const url = `https://datapi.jup.ag/v1/pools?assetIds=${addresses.join(",")}`;
  const res = await fetch(url);
  if (!res.ok) return {};
  const json = (await res.json()) as { pools?: JupPool[] };
  const pools = json.pools ?? [];
  // One pool per asset (Jupiter returns the canonical pool first). Keep highest mcap if duplicates.
  const out: Record<string, TokenStats> = {};
  for (const p of pools) {
    const id = p.baseAsset?.id;
    if (!id) continue;
    const stats: TokenStats = {
      marketCap: typeof p.baseAsset?.mcap === "number" ? p.baseAsset.mcap : null,
      holderCount:
        typeof p.baseAsset?.holderCount === "number" ? p.baseAsset.holderCount : null,
      priceUsd: typeof p.baseAsset?.usdPrice === "number" ? p.baseAsset.usdPrice : null,
      volume24h: typeof p.volume24h === "number" ? p.volume24h : null,
    };
    const prev = out[id];
    if (!prev || (stats.marketCap ?? 0) > (prev.marketCap ?? 0)) {
      out[id] = stats;
    }
  }
  return out;
}

export function useTokenStats(addresses: string[]) {
  const key = [...addresses].sort().join(",");
  return useQuery({
    queryKey: ["jup-token-stats", key],
    enabled: addresses.length > 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      // Jupiter's datapi accepts many ids per call; chunk conservatively.
      const chunks: string[][] = [];
      for (let i = 0; i < addresses.length; i += 30) {
        chunks.push(addresses.slice(i, i + 30));
      }
      const results = await Promise.all(chunks.map(fetchBatch));
      return results.reduce<Record<string, TokenStats>>(
        (acc, r) => Object.assign(acc, r),
        {},
      );
    },
  });
}