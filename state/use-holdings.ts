import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet-context";

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

async function fetchSolanaHoldings(owner: string): Promise<Set<string>> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenAccountsByOwner",
    params: [
      owner,
      { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      { encoding: "jsonParsed" },
    ],
  };
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Solana RPC failed");
  const json = await res.json();
  const mints = new Set<string>();
  const arr: any[] = json?.result?.value ?? [];
  for (const item of arr) {
    const info = item?.account?.data?.parsed?.info;
    const mint = info?.mint as string | undefined;
    const amount = info?.tokenAmount?.uiAmount as number | undefined;
    if (mint && (amount ?? 0) > 0) mints.add(mint);
  }
  return mints;
}

/**
 * Fetches SPL token holdings for a connected Phantom wallet and pushes them
 * into the wallet context so visual layers can react.
 */
export function useHoldings() {
  const { account, setHoldings } = useWallet();
  const enabled = account?.kind === "phantom" && !!account.address;

  const query = useQuery({
    queryKey: ["wallet-holdings", account?.address],
    queryFn: () => fetchSolanaHoldings(account!.address),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data) setHoldings(query.data);
  }, [query.data, setHoldings]);

  return query;
}