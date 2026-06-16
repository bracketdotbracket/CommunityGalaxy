import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useQuery } from "@tanstack/react-query";
import "@/lib/coin-sdk";
import { getTopCommunitiesProxy } from "@/lib/coin-auth.functions";
import { Starfield, Nebula } from "./Starfield";
import { MarketCore } from "./MarketCore";
import { Planet } from "./Planet";
import { OrbitRings } from "./OrbitRings";
import { CameraRig } from "./CameraRig";
import {
  buildPlanets,
  sizeFromMarketCap,
  type PlanetData,
  type TopCommunity,
} from "@/lib/galaxy-types";
import { useTokenStats } from "@/lib/token-data";
import { CommunityHud } from "@/components/hud/CommunityHud";
import { WalletConnect } from "@/components/hud/WalletConnect";
import { AudioToggle, useClickSfx } from "@/components/hud/AudioToggle";
import { PlanetSearch } from "@/components/hud/PlanetSearch";
import { SentimentFilter, type FilterMode } from "@/components/hud/SentimentFilter";
import { useTrendingAlerts } from "@/hooks/use-trending-alerts";
import { useHoldings } from "@/hooks/use-holdings";
import { useWallet } from "@/lib/wallet-context";

export function SentimentGalaxy({ onReady }: { onReady?: () => void } = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["top-communities"],
    queryFn: async () => {
      const all: TopCommunity[] = [];
      const PAGE = 100;
      const MAX_PAGES = 50; // hard cap → up to 5000 communities
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await getTopCommunitiesProxy({
          data: { limit: PAGE, offset: page * PAGE },
        });
        const batch = (res.communities ?? []) as TopCommunity[];
        if (batch.length === 0) break;
        all.push(...batch);
        if (batch.length < PAGE) break;
      }
      return all;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const basePlanets = useMemo(() => buildPlanets(data ?? []), [data]);
  const addresses = useMemo(
    () => basePlanets.map((p) => p.community.tokenAddress),
    [basePlanets],
  );
  const { data: statsMap } = useTokenStats(addresses);
  const MIN_MC = 10_000;
  const planets = useMemo(() => {
    if (!statsMap) return basePlanets.filter((p) => p.marketCap >= MIN_MC);
    return basePlanets
      .map((p) => {
        const stats = statsMap[p.community.tokenAddress];
        if (!stats) return p;
        const mc = stats.marketCap ?? p.marketCap;
        return {
          ...p,
          marketCap: mc,
          holderCount: stats.holderCount,
          size: sizeFromMarketCap(mc),
        };
      })
      .filter((p) => p.marketCap >= MIN_MC);
  }, [basePlanets, statsMap]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [hoverToken, setHoverToken] = useState<string | null>(null);
  const [spikes, setSpikes] = useState<Record<string, number>>({});
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const bucketCounts = useMemo(() => {
    const c = { all: planets.length, positive: 0, hot: 0, negative: 0, neutral: 0 };
    for (const p of planets) c[p.bucket] += 1;
    return c;
  }, [planets]);

  const visiblePlanets = useMemo(
    () => (filterMode === "all" ? planets : planets.filter((p) => p.bucket === filterMode)),
    [planets, filterMode],
  );

  const playSfx = useClickSfx();

  // Wallet-aware: fetch SPL holdings and expose a fast lookup set
  useHoldings();
  const { holdings } = useWallet();


  // Detect activity bumps from TopCommunities polling → trigger spike pulses
  useEffect(() => {
    if (!data) return;
    setSpikes((prev) => {
      const next = { ...prev };
      for (const c of data) {
        const key = c.tokenAddress;
        const stamp = c.latestPostAt;
        const last = (prev as any)[`_stamp:${key}`] ?? 0;
        if (stamp > last) {
          next[key] = Date.now();
          (next as any)[`_stamp:${key}`] = stamp;
        }
      }
      return next;
    });
  }, [data]);

  // Signal parent the first batch of communities has arrived → preloader can dismiss
  useEffect(() => {
    if (data && data.length > 0) onReady?.();
  }, [data, onReady]);

  const selectedPlanet: PlanetData | null = useMemo(
    () => planets.find((p) => p.community.tokenAddress === selectedToken) ?? null,
    [planets, selectedToken],
  );

  function handlePlanetClick(token: string) {
    playSfx("select");
    setSelectedToken(token);
  }
  function handleHudActivity(token: string) {
    setSpikes((prev) => ({ ...prev, [token]: Date.now() }));
  }

  // Trending toasts — surfaces communities with rapid new posts
  useTrendingAlerts({
    communities: data,
    planets,
    onFocus: (token) => {
      playSfx("select");
      setSelectedToken(token);
    },
  });

  return (
    <div className="fixed inset-0">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 10, 32], fov: 55, near: 0.1, far: 300 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onPointerMissed={() => setSelectedToken(null)}
      >
        <color attach="background" args={["#06050f"]} />
        <fog attach="fog" args={["#06050f", 60, 180]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[10, 20, 10]} intensity={0.5} color="#aacbff" />
        <Suspense fallback={null}>
          <Nebula />
          <Starfield />
          <OrbitRings radii={visiblePlanets.map((p) => p.orbitRadius)} />
          <MarketCore />
          {visiblePlanets.map((p) => (
            <Planet
              key={p.community.tokenAddress}
              data={p}
              selected={p.community.tokenAddress === selectedToken}
              spikeAt={spikes[p.community.tokenAddress] ?? 0}
              owned={holdings.has(p.community.tokenAddress)}
              onClick={handlePlanetClick}
              onHover={setHoverToken}
            />
          ))}
          <CameraRig
            selectedPlanet={selectedPlanet}
            onIdleReset={() => setSelectedToken(null)}
          />
        </Suspense>
      </Canvas>

      {/* Top-left controls */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-start gap-2">
        <div className="pointer-events-auto"><WalletConnect /></div>
        <div className="pointer-events-auto"><AudioToggle /></div>
        <PlanetSearch
          planets={visiblePlanets}
          onSelect={(token) => {
            playSfx("select");
            setSelectedToken(token);
          }}
        />
        <SentimentFilter
          mode={filterMode}
          onChange={setFilterMode}
          counts={bucketCounts}
        />
      </div>


      {/* Top-right title */}
      <div className="pointer-events-none absolute right-3 top-3 z-0 hidden xl:block">
        {!selectedPlanet && (
          <div className="relative group font-mono">
            <div className="absolute -inset-1 bg-gradient-to-r from-[color:var(--neon-cyan)] to-[color:var(--neon-purple)] blur opacity-20 transition-opacity" />
            <div className="relative flex items-center gap-3 border border-[color:var(--neon-cyan)]/30 bg-[#0a0914] px-5 py-2.5">
              <span className="text-[11px] font-bold tracking-[0.3em] text-[color:var(--neon-cyan)]">SENTIMENT</span>
              <div className="w-px h-3 bg-white/20" />
              <span className="text-[11px] font-bold tracking-[0.3em] text-white/90">GALAXY</span>
              <div className="absolute -bottom-px left-0 w-full h-px bg-gradient-to-r from-transparent via-[color:var(--neon-cyan)]/50 to-transparent" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom-center status */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-0 -translate-x-1/2">
        <div className="hud-panel rounded-md px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {isLoading && "Scanning the memecoin universe…"}
          {error && <span className="text-[color:var(--neon-pink)]">Connection lost</span>}
          {!isLoading && !error && (
            <>
              <span className="neon-text-cyan">{visiblePlanets.length}</span>
              {filterMode !== "all" && (
                <span className="opacity-60"> / {planets.length}</span>
              )}{" "}
              communities ·
              {" "}
              <span className="opacity-70">
                {hoverToken
                  ? `→ $${planets.find((p) => p.community.tokenAddress === hoverToken)?.community.tokenSymbol ?? ""}`
                  : "drag to orbit · scroll to zoom · click a planet"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Floating community HUD */}
      {selectedPlanet && (
        <CommunityHud
          planet={selectedPlanet}
          onClose={() => setSelectedToken(null)}
          onActivity={handleHudActivity}
        />
      )}
    </div>
  );
}