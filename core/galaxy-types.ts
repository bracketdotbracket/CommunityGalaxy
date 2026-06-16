// Local mirror of the SDK shape — the SDK does not re-export this type.
export type TopCommunity = {
  chainId?: number | null;
  latestPostAt: number;
  memberCount: number;
  postCount: number;
  tokenAddress: string;
  tokenHighResImageUrl?: string | null;
  tokenImageUrl?: string | null;
  tokenSymbol: string;
  totalLikes: number;
};

export type SentimentBucket = "positive" | "hot" | "negative" | "neutral";

export type PlanetData = {
  community: TopCommunity;
  /** Stable orbit slot index */
  index: number;
  /** Synthetic market cap derived from on-chain activity */
  marketCap: number;
  /** Real on-chain holder count when available */
  holderCount: number | null;
  /** 0..1, derived from likes/posts + recency */
  sentiment: number;
  bucket: SentimentBucket;
  /** Scene radius from core */
  orbitRadius: number;
  /** Radians per second */
  orbitSpeed: number;
  /** Initial angle */
  orbitPhase: number;
  /** Display radius */
  size: number;
  /** Color (hex) */
  color: string;
  glowColor: string;
};

export function bucketFromSentiment(s: number): SentimentBucket {
  if (s >= 0.7) return "positive";
  if (s >= 0.5) return "hot";
  if (s >= 0.3) return "neutral";
  return "negative";
}

export function colorForBucket(b: SentimentBucket): { color: string; glow: string } {
  switch (b) {
    case "positive":
      return { color: "#5ef0c8", glow: "#22e6a8" };
    case "hot":
      return { color: "#ffd166", glow: "#ffb02e" };
    case "negative":
      return { color: "#ff4f8b", glow: "#a23bff" };
    default:
      return { color: "#7ad6ff", glow: "#4aa3ff" };
  }
}

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toFixed(0);
}

// Area-proportional: radius ∝ √MC. A $9M coin renders with 9× the area
// (3× the radius) of a $1M coin. Reference: $10M → radius 2.0.
const MC_REFERENCE = 10_000_000;
const RADIUS_AT_REFERENCE = 2.0;
const MIN_RADIUS = 0.15;
const MAX_RADIUS = 4.0;

export function sizeFromMarketCap(mc: number): number {
  if (!Number.isFinite(mc) || mc <= 0) return MIN_RADIUS;
  const r = RADIUS_AT_REFERENCE * Math.sqrt(mc / MC_REFERENCE);
  return Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, r));
}

export function buildPlanets(communities: TopCommunity[]): PlanetData[] {
  const limited = communities;
  const now = Date.now();
  return limited.map((c, i) => {
    const activity = c.memberCount + c.postCount * 2 + c.totalLikes;
    const marketCap = 50_000 + activity * 137; // synthetic but stable
    const hoursSincePost = Math.max(0, (now - c.latestPostAt) / 3_600_000);
    const recency = Math.exp(-hoursSincePost / 12); // 0..1
    const engagement =
      c.postCount > 0 ? Math.min(1, c.totalLikes / Math.max(1, c.postCount) / 4) : 0;
    const sentiment = Math.max(0, Math.min(1, 0.35 + recency * 0.4 + engagement * 0.35));
    const bucket = bucketFromSentiment(sentiment);
    const { color, glow } = colorForBucket(bucket);
    const size = sizeFromMarketCap(marketCap);
    // Distribute on rings — wider rings hold more planets
    const perRing = 8;
    const ringIndex = Math.floor(i / perRing);
    const inRing = i % perRing;
    const orbitRadius = 6 + ringIndex * 3.2 + (inRing % 2) * 1.1;
    const orbitSpeed = (0.05 + ((i * 37) % 13) * 0.012) * (ringIndex % 2 === 0 ? 1 : -1);
    const orbitPhase = (i * 2.399) % (Math.PI * 2);
    return {
      community: c,
      index: i,
      marketCap,
      holderCount: null,
      sentiment,
      bucket,
      orbitRadius,
      orbitSpeed,
      orbitPhase,
      size,
      color,
      glowColor: glow,
    };
  });
}