import { useEffect, useState } from "react";

type Props = {
  /** True when the app signals first data is ready. */
  ready: boolean;
  /** Called after the exit animation finishes so the parent can unmount. */
  onDone?: () => void;
};

/**
 * Full-screen cinematic preloader. Animates a progress bar toward 90% while
 * loading, jumps to 100% on ready, then fades out.
 */
export function Preloader({ ready, onDone }: Props) {
  const [progress, setProgress] = useState(2);
  const [hidden, setHidden] = useState(false);

  // Indeterminate ramp up to 90% while waiting
  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + Math.max(0.4, (90 - p) * 0.06)));
    }, 120);
    return () => window.clearInterval(id);
  }, [ready]);

  // Snap to 100 then fade out
  useEffect(() => {
    if (!ready) return;
    setProgress(100);
    const t1 = window.setTimeout(() => setHidden(true), 650);
    const t2 = window.setTimeout(() => onDone?.(), 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [ready, onDone]);

  return (
    <div
      className={[
        "fixed inset-0 z-[100] flex items-center justify-center",
        "bg-[#06050f] transition-opacity duration-500",
        hidden ? "opacity-0 pointer-events-none" : "opacity-100",
      ].join(" ")}
      aria-hidden={hidden}
      role="status"
      aria-live="polite"
    >
      {/* Scanlines / vignette */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.7) 80%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px)",
        }}
      />

      {/* Pulsing orb */}
      <div className="absolute">
        <div className="h-40 w-40 rounded-full bg-[color:var(--neon-cyan)]/10 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-[min(440px,86vw)] text-center font-mono">
        {/* Brand */}
        <div className="relative inline-flex items-center gap-3 border border-[color:var(--neon-cyan)]/30 bg-[#0a0914]/80 px-5 py-2.5">
          <span className="text-[11px] font-bold tracking-[0.3em] text-[color:var(--neon-cyan)]">
            COMMUNITY
          </span>
          <div className="h-3 w-px bg-white/20" />
          <span className="text-[11px] font-bold tracking-[0.3em] text-white/90">
            GALAXY
          </span>
          <div className="absolute -bottom-px left-0 h-px w-full bg-gradient-to-r from-transparent via-[color:var(--neon-cyan)]/60 to-transparent" />
        </div>

        <div className="mt-8 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          {ready ? "Entering orbit" : "Calibrating sensors"}
        </div>

        {/* Progress bar */}
        <div className="mx-auto mt-4 h-[3px] w-full overflow-hidden bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-[color:var(--neon-cyan)] via-[color:var(--neon-purple)] to-[color:var(--neon-pink)] transition-[width] duration-200 ease-out"
            style={{
              width: `${progress}%`,
              boxShadow: "0 0 12px color-mix(in oklab, var(--neon-cyan) 70%, transparent)",
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] tracking-widest text-muted-foreground/70">
          <span>SYS · LINK</span>
          <span className="tabular-nums">{Math.floor(progress).toString().padStart(3, "0")}%</span>
        </div>
      </div>
    </div>
  );
}