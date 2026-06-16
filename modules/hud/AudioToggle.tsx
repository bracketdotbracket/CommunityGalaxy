import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Synth ambient pad + on-demand click SFX, fully procedural via WebAudio.
 * No assets needed.
 */
export function useClickSfx() {
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);
  return (kind: "click" | "select" = "click") => {
    try {
      if (!ctxRef.current) {
        const Ctor =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return;
        ctxRef.current = new Ctor();
      }
      const ctx = ctxRef.current!;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(kind === "select" ? 880 : 660, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(
        kind === "select" ? 1760 : 990,
        ctx.currentTime + 0.08,
      );
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.24);
    } catch {
      /* ignore */
    }
  };
}

export function AudioToggle() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => () => stop(), []);

  function start() {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx: AudioContext = (ctxRef.current ??= new Ctor());
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 1.2);
    master.connect(ctx.destination);

    // 3 detuned sine pads
    const freqs = [110, 164.81, 246.94];
    const oscs = freqs.map((f) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.07 + Math.random() * 0.1;
      lfoGain.gain.value = 1.2;
      lfo.connect(lfoGain).connect(o.frequency);
      const g = ctx.createGain();
      g.gain.value = 0.5;
      o.connect(g).connect(master);
      o.start();
      lfo.start();
      return { o, lfo };
    });

    nodesRef.current = {
      stop: () => {
        try {
          master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
          setTimeout(() => {
            oscs.forEach(({ o, lfo }) => {
              try { o.stop(); lfo.stop(); } catch { /* */ }
            });
            try { master.disconnect(); } catch { /* */ }
          }, 700);
        } catch {
          /* */
        }
      },
    };
  }
  function stop() {
    nodesRef.current?.stop();
    nodesRef.current = null;
  }

  return (
    <button
      onClick={() => {
        if (on) {
          stop();
          setOn(false);
        } else {
          start();
          setOn(true);
        }
      }}
      className="flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:text-foreground"
      aria-label="Toggle ambient music"
    >
      {on ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      <span>{on ? "Ambient On" : "Ambient Off"}</span>
    </button>
  );
}