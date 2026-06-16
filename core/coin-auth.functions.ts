import { createServerFn } from "@tanstack/react-start";

const API_BASE = "https://api.coin-communities.xyz/api/v1";

function getPublicApiKey() {
  return process.env.COIN_COMMUNITIES_API_KEY ?? process.env.COINCOMMUNITY_API_KEY;
}

function getServerApiKey() {
  return process.env.COINCOMMUNITY_API_KEY ?? process.env.COIN_COMMUNITIES_API_KEY;
}

/**
 * Mint a one-time WebSocket ticket using the Server API key + secret.
 * Tickets are single-use and expire after ~30s, so this runs on every
 * (re)connect from the realtime client.
 */
export const getCoinWsTicket = createServerFn({ method: "POST" })
  .inputValidator((d: { tokenAddress: string }) => {
    if (!d?.tokenAddress || typeof d.tokenAddress !== "string") {
      throw new Error("tokenAddress is required");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.COINCOMMUNITY_API_KEY;
    const secret = process.env.COINCOMMUNITY_API_SECRET;
    if (!key || !secret) {
      throw new Error("COINCOMMUNITY_API_KEY/SECRET not configured");
    }

    const url = `${API_BASE}/communities/${encodeURIComponent(
      data.tokenAddress,
    )}/ws/ticket/server`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-server-key": key,
        "x-server-secret": secret,
        "content-type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`ws ticket failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { ticket: string };
    return { ticket: json.ticket };
  });

/**
 * Server-side proxy for /communities/top — the endpoint requires an API key
 * we can't expose in the browser, so we forward the call through the server
 * using the Server API key + secret.
 */
export const getTopCommunitiesProxy = createServerFn({ method: "POST" })
  .inputValidator((d: { limit?: number; offset?: number }) => ({
    limit: Math.min(Math.max(Number(d?.limit) || 100, 1), 100),
    offset: Math.max(Number(d?.offset) || 0, 0),
  }))
  .handler(async ({ data }) => {
    const apiKey = getPublicApiKey();
    if (!apiKey) {
      throw new Error("CoinCommunity API key not configured");
    }
    const url = `${API_BASE}/communities/top?limit=${data.limit}&offset=${data.offset}`;
    const res = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `communities/top failed (${res.status}): ${body.slice(0, 200) || "API key rejected"}`,
      );
    }
    const json = (await res.json()) as { communities?: any[] };
    return { communities: (json.communities ?? []) as any[] };
  });

export const getCommunityMessagesProxy = createServerFn({ method: "POST" })
  .inputValidator((d: { tokenAddress: string; limit?: number; offset?: number }) => {
    if (!d?.tokenAddress || typeof d.tokenAddress !== "string") {
      throw new Error("tokenAddress is required");
    }
    return {
      tokenAddress: d.tokenAddress,
      limit: Math.min(Math.max(Number(d?.limit) || 50, 1), 100),
      offset: Math.max(Number(d?.offset) || 0, 0),
    };
  })
  .handler(async ({ data }) => {
    const token = encodeURIComponent(data.tokenAddress);
    const qs = `limit=${data.limit}&offset=${data.offset}&order=desc&filterIsSpam=true&filterIsHarm=true`;
    const attempts: Array<{ url: string; headers: Record<string, string>; label: string }> = [];

    const serverKey = getServerApiKey();
    if (serverKey) {
      attempts.push({
        url: `${API_BASE}/communities/${token}/messages/server?${qs}`,
        headers: { "x-server-key": serverKey },
        label: "server messages",
      });
    }

    const apiKey = getPublicApiKey();
    if (apiKey) {
      attempts.push({
        url: `${API_BASE}/communities/${token}/messages?${qs}`,
        headers: { "x-api-key": apiKey },
        label: "api-key messages",
      });
      attempts.push({
        url: `${API_BASE}/communities/${token}/messages/public`,
        headers: { "x-api-key": apiKey },
        label: "public messages",
      });
    }

    if (attempts.length === 0) {
      throw new Error("CoinCommunity API key not configured");
    }

    const failures: string[] = [];
    for (const attempt of attempts) {
      const res = await fetch(attempt.url, { headers: attempt.headers });
      if (res.ok) {
        const json = (await res.json()) as { messages?: any[] };
        return { messages: (json.messages ?? []) as any[] };
      }
      const body = await res.text().catch(() => "");
      failures.push(`${attempt.label} ${res.status}: ${body.slice(0, 120) || "rejected"}`);
    }

    throw new Error(`messages failed — ${failures.join("; ")}`);
  });