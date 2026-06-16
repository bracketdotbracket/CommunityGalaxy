import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type WalletAccount = {
  kind: "phantom" | "metamask";
  address: string;
};

type WalletContextValue = {
  account: WalletAccount | null;
  setAccount: (a: WalletAccount | null) => void;
  /** Lower-cased token addresses (mints) currently held by connected wallet. */
  holdings: Set<string>;
  setHoldings: (h: Set<string>) => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccountState] = useState<WalletAccount | null>(null);
  const [holdings, setHoldingsState] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("galaxy:wallet");
    if (stored) {
      try {
        setAccountState(JSON.parse(stored));
      } catch {
        /* noop */
      }
    }
  }, []);

  const setAccount = useCallback((a: WalletAccount | null) => {
    setAccountState(a);
    if (typeof window !== "undefined") {
      if (a) localStorage.setItem("galaxy:wallet", JSON.stringify(a));
      else localStorage.removeItem("galaxy:wallet");
    }
    if (!a) setHoldingsState(new Set());
  }, []);

  const setHoldings = useCallback((h: Set<string>) => {
    setHoldingsState(h);
  }, []);

  const value = useMemo(
    () => ({ account, setAccount, holdings, setHoldings }),
    [account, setAccount, holdings, setHoldings],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}