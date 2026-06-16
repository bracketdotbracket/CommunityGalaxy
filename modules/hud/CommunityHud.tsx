import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { realtime } from "@coin-communities/sdk/react";
import { X, Heart, MessageCircle, Activity } from "lucide-react";
import type { PlanetData } from "@/lib/galaxy-types";
import { formatCompact } from "@/lib/galaxy-types";
import { makeRealtimeAuth, COIN_API_BASE_URL } from "@/lib/coin-sdk";
import { getCommunityMessagesProxy } from "@/lib/coin-auth.functions";

type Message = {
  id: string;
  userId: string;
  displayName: string;
  username?: string;
  profileImageUrl?: string | null;
  content: string;
  mediaUrl?: string | null;
  likeCount: number;
  replyCount: number;
  createdAt: string;
};

type Props = {
  planet: PlanetData;
  onClose: () => void;
  onActivity: (token: string) => void;
};

function communityUrl(tokenAddress: string) {
  return `https://coincommunities.org/communities/${tokenAddress}/?tab=latest`;
}

export function CommunityHud({ planet, onClose, onActivity }: Props) {
  const tokenAddress = planet.community.tokenAddress;
  const auth = useMemo(() => makeRealtimeAuth(tokenAddress), [tokenAddress]);

  const initial = useQuery({
    queryKey: ["community-messages", tokenAddress],
    queryFn: async () => {
      const res = await getCommunityMessagesProxy({
        data: { tokenAddress, limit: 100, offset: 0 },
      });
      return (res.messages ?? []) as Message[];
    },
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const [live, setLive] = useState<Message[]>([]);
  const [series, setSeries] = useState<number[]>(() => Array(20).fill(0));
  const tickRef = useRef(0);

  // Reset when planet changes
  useEffect(() => {
    setLive([]);
    setSeries(Array(20).fill(0));
    tickRef.current = 0;
  }, [tokenAddress]);

  // Realtime connection status (open / connecting / closed)
  const { status } = realtime.useCommunityRealtime(tokenAddress, {
    auth,
    baseUrl: COIN_API_BASE_URL,
  });

  realtime.useCommunityEvents(tokenAddress, {
    auth,
    baseUrl: COIN_API_BASE_URL,
    onMessage: (e: any) => {
      const m = (e?.message ?? e) as Message;
      if (!m || !m.id) return;
      setLive((cur) => [m, ...cur].slice(0, 100));
      tickRef.current += 1;
      onActivity(tokenAddress);
    },
    onLike: () => {
      tickRef.current += 0.4;
      onActivity(tokenAddress);
    },
    onGap: () => {
      // Reconnected — events may have been missed, refetch from REST
      initial.refetch();
    },
  });

  // Activity graph sampler
  useEffect(() => {
    const id = setInterval(() => {
      setSeries((s) => {
        const next = s.slice(1);
        next.push(tickRef.current);
        tickRef.current = 0;
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const out: Message[] = [];
    for (const m of [...live, ...(initial.data ?? [])]) {
      if (m && m.id && !seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out;
  }, [live, initial.data]);

  const maxSeries = Math.max(1, ...series);
  const totalMsgs = merged.length;

  return (
    <aside className="hud-panel pointer-events-auto absolute right-3 top-3 bottom-3 z-10 flex w-[360px] max-w-[92vw] flex-col rounded-xl">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-[color:var(--border)] p-4">
        {planet.community.tokenHighResImageUrl || planet.community.tokenImageUrl ? (
          <img
            src={planet.community.tokenHighResImageUrl ?? planet.community.tokenImageUrl ?? ""}
            alt={`${planet.community.tokenSymbol} logo`}
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-full object-cover"
            style={{ boxShadow: `0 0 20px ${planet.glowColor}` }}
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const fb = el.nextElementSibling as HTMLElement | null;
              if (fb) fb.style.display = "block";
            }}
          />
        ) : null}
        <div
          className="h-12 w-12 shrink-0 rounded-full"
          style={{
            display:
              planet.community.tokenHighResImageUrl || planet.community.tokenImageUrl
                ? "none"
                : "block",
            background: `radial-gradient(circle at 30% 30%, ${planet.color}, ${planet.glowColor})`,
            boxShadow: `0 0 20px ${planet.glowColor}`,
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-base font-bold uppercase tracking-wider neon-text-cyan truncate">
              ${planet.community.tokenSymbol || "—"}
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-mono uppercase ${
                status === "open" ? "text-[color:var(--neon-green)]" : "text-[color:var(--muted-foreground)]"
              }`}
              style={{ border: "1px solid currentColor" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse-glow"
                style={{ background: "currentColor" }}
              />
              {status === "open" ? "LIVE" : status === "connecting" ? "SYNC" : "REST"}
            </span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground truncate">
            {planet.community.tokenAddress.slice(0, 6)}…{planet.community.tokenAddress.slice(-4)}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:text-[color:var(--neon-pink)] hover:bg-white/5"
          aria-label="Back to galaxy"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 border-b border-[color:var(--border)] p-3 text-center font-mono">
        <Stat label="MC" value={`$${formatCompact(planet.marketCap)}`} />
        <Stat
          label="Holders"
          value={planet.holderCount != null ? formatCompact(planet.holderCount) : "—"}
        />
        <Stat label="Sentiment" value={`${Math.round(planet.sentiment * 100)}%`} />
        <Stat label="Msgs" value={formatCompact(planet.community.postCount)} />
      </div>

      {/* Activity graph */}
      <div className="border-b border-[color:var(--border)] p-3">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Activity (last 30s)
          </span>
          <span className="neon-text-cyan">{totalMsgs} loaded</span>
        </div>
        <div className="mt-2 flex h-12 items-end gap-[2px]">
          {series.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${(v / maxSeries) * 100}%`,
                minHeight: 2,
                background: `linear-gradient(180deg, ${planet.color}, ${planet.glowColor})`,
                boxShadow: v > 0 ? `0 0 8px ${planet.glowColor}` : "none",
                opacity: 0.4 + (v / maxSeries) * 0.6,
              }}
            />
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="scroll-thin flex-1 overflow-y-auto p-3 space-y-2">
        {merged.length === 0 && !initial.isLoading && (
          <div className="py-12 text-center font-mono text-xs text-muted-foreground">
            No messages yet.<br />Waiting for transmissions…
          </div>
        )}
        {initial.isLoading && merged.length === 0 && (
          <div className="py-12 text-center font-mono text-xs text-muted-foreground animate-pulse-glow">
            Establishing link…
          </div>
        )}
        {merged.map((m) => (
          <MessageRow key={m.id} m={m} tokenAddress={tokenAddress} />
        ))}
      </div>

      {/* Footer */}
      <button
        onClick={onClose}
        className="m-3 rounded-md border border-[color:var(--neon-cyan)]/50 bg-[color:var(--neon-cyan)]/10 py-2 text-xs font-mono uppercase tracking-[0.2em] neon-text-cyan hover:bg-[color:var(--neon-cyan)]/20 transition"
      >
        ← Back to galaxy
      </button>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/[0.03] p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm neon-text-cyan">{value}</div>
    </div>
  );
}

function MessageRow({ m, tokenAddress }: { m: Message; tokenAddress: string }) {
  return (
    <a
      href={communityUrl(tokenAddress)}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-md border border-white/5 bg-white/[0.02] p-2.5 transition hover:border-[color:var(--neon-cyan)]/40 hover:bg-white/[0.05] cursor-pointer"
    >
      <div className="flex items-center gap-2">
        {m.profileImageUrl ? (
          <img
            src={m.profileImageUrl}
            alt=""
            className="h-6 w-6 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[color:var(--neon-purple)] to-[color:var(--neon-cyan)]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold">{m.displayName || m.username || "anon"}</div>
        </div>
        <time className="font-mono text-[9px] text-muted-foreground">
          {timeAgo(m.createdAt)}
        </time>
      </div>
      {m.content && (
        <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-xs text-foreground/90">
          {m.content}
        </p>
      )}
      {m.mediaUrl && (
        <img
          src={m.mediaUrl}
          alt=""
          loading="lazy"
          className="mt-2 max-h-40 w-full rounded object-cover"
        />
      )}
      <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Heart className="h-3 w-3" /> {m.likeCount ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" /> {m.replyCount ?? 0}
        </span>
        <span className="ml-auto opacity-0 group-hover:opacity-100 transition text-[color:var(--neon-cyan)]">
          open ↗
        </span>
      </div>
    </a>
  );
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return "";
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return s + "s";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}