import { useState } from "react";
import { Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";

declare global {
  interface Window {
    solana?: { isPhantom?: boolean; connect: () => Promise<{ publicKey: { toString: () => string } }> };
    ethereum?: { request: (args: { method: string }) => Promise<string[]>; isMetaMask?: boolean };
  }
}

function short(addr: string | null) {
  if (!addr) return "";
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

export function WalletConnect() {
  const [open, setOpen] = useState(false);
  const { account, setAccount } = useWallet();
  const [err, setErr] = useState<string | null>(null);

  async function connectPhantom() {
    setErr(null);
    try {
      if (!window.solana?.isPhantom) {
        window.open("https://phantom.app/", "_blank");
        return;
      }
      const res = await window.solana.connect();
      const acct = { kind: "phantom" as const, address: res.publicKey.toString() };
      setAccount(acct);
      setOpen(false);
    } catch (e: any) {
      setErr(e?.message ?? "Phantom connection failed");
    }
  }

  async function connectMetamask() {
    setErr(null);
    try {
      if (!window.ethereum) {
        window.open("https://metamask.io/", "_blank");
        return;
      }
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts?.[0]) {
        const acct = { kind: "metamask" as const, address: accounts[0] };
        setAccount(acct);
        setOpen(false);
      }
    } catch (e: any) {
      setErr(e?.message ?? "MetaMask connection failed");
    }
  }

  function disconnect() {
    setAccount(null);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group relative flex items-center gap-2 border border-[color:var(--neon-cyan)]/30 bg-[color:var(--neon-cyan)]/5 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[color:var(--neon-cyan)] backdrop-blur-md transition-all duration-300 hover:border-[color:var(--neon-cyan)] hover:bg-[color:var(--neon-cyan)]/10 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
      >
        <Wallet className="h-4 w-4" />
        {account ? (
          <>
            <span className="opacity-70">{account.kind === "phantom" ? "SOL" : "ETH"}</span>
            <span className="text-foreground">{short(account.address)}</span>
          </>
        ) : (
          <span>Connect Wallet</span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-56 border border-[color:var(--neon-cyan)]/30 bg-[#0a0914]/95 p-2 font-mono text-xs backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.6)] z-20">
          {account ? (
            <button
              onClick={disconnect}
              className="w-full px-2 py-2 text-left uppercase tracking-[0.15em] hover:bg-white/5 text-[color:var(--neon-pink)]"
            >
              Disconnect
            </button>
          ) : (
            <>
              <button
                onClick={connectPhantom}
                className="w-full px-2 py-2 text-left uppercase tracking-[0.15em] hover:bg-white/5 flex items-center justify-between"
              >
                <span>Phantom</span>
                <span className="opacity-60">Solana</span>
              </button>
              <button
                onClick={connectMetamask}
                className="w-full px-2 py-2 text-left uppercase tracking-[0.15em] hover:bg-white/5 flex items-center justify-between"
              >
                <span>MetaMask</span>
                <span className="opacity-60">EVM</span>
              </button>
              {err && <div className="mt-1 px-2 text-[10px] text-[color:var(--neon-pink)]">{err}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}