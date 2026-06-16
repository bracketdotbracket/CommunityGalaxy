import type { SentimentBucket } from "@/lib/galaxy-types";

export type FilterMode = "all" | "positive" | "hot" | "negative";

const OPTIONS: {
  mode: FilterMode;
  label: string;
  dotClass: string;
  textActive: string;
  hoverBg: string;
}[] = [
  {
    mode: "all",
    label: "All",
    dotClass: "bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.4)]",
    textActive: "text-white",
    hoverBg: "hover:bg-white/5",
  },
  {
    mode: "positive",
    label: "Bullish",
    dotClass: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]",
    textActive: "text-green-300",
    hoverBg: "hover:bg-green-500/5",
  },
  {
    mode: "hot",
    label: "Hot",
    dotClass: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]",
    textActive: "text-orange-300",
    hoverBg: "hover:bg-orange-500/5",
  },
  {
    mode: "negative",
    label: "Bearish",
    dotClass: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
    textActive: "text-rose-300",
    hoverBg: "hover:bg-rose-500/5",
  },
];

type Props = {
  mode: FilterMode;
  onChange: (mode: FilterMode) => void;
  counts: Record<SentimentBucket | "all", number>;
};

export function SentimentFilter({ mode, onChange, counts }: Props) {
  return (
    <div className="pointer-events-auto flex items-center gap-1 border border-white/10 bg-black/40 p-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur-md">
      {OPTIONS.map((opt) => {
        const active = mode === opt.mode;
        const count =
          opt.mode === "all" ? counts.all : counts[opt.mode as SentimentBucket] ?? 0;
        return (
          <button
            key={opt.mode}
            onClick={() => onChange(opt.mode)}
            className={`flex items-center gap-2 px-3 py-1.5 transition-colors ${
              active
                ? `bg-white/5 border border-white/10 ${opt.textActive}`
                : `border border-transparent text-white/40 ${opt.hoverBg} hover:text-white/80`
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${opt.dotClass}`} />
            <span>{opt.label}</span>
            <span className="ml-1 text-[9px] opacity-40">{count}</span>
          </button>
        );
      })}
    </div>
  );
}