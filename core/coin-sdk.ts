import { configureApi } from "@coin-communities/sdk/react";
import { getCoinWsTicket } from "./coin-auth.functions";

export const COIN_API_BASE_URL = "https://api.coin-communities.xyz";

let configured = false;

export function ensureSdkConfigured() {
  if (configured) return;
  configured = true;
  // Public REST endpoints (getMessagesPublic, etc.) don't need auth.
  // The realtime ticket is minted server-side via getCoinWsTicket.
  configureApi({ baseUrl: COIN_API_BASE_URL });
}

/** Realtime auth helper — fetches a fresh ticket on each (re)connect. */
export function makeRealtimeAuth(tokenAddress: string) {
  return {
    getTicket: async () => {
      const res = await getCoinWsTicket({ data: { tokenAddress } });
      return res.ticket;
    },
  };
}

if (typeof window !== "undefined") {
  ensureSdkConfigured();
}