import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { PlanetData } from "@/lib/galaxy-types";
import { formatCompact } from "@/lib/galaxy-types";

type PlanetProps = {
  data: PlanetData;
  selected: boolean;
  spikeAt: number; // timestamp ms; pulses briefly after this
  owned?: boolean;
  onClick: (token: string) => void;
  onHover: (token: string | null) => void;
};

export function Planet({ data, selected, spikeAt, owned = false, onClick, onHover }: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ownedGlowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => new THREE.Color(data.color), [data.color]);
  const glowColor = useMemo(() => new THREE.Color(data.glowColor), [data.glowColor]);

  const rawIconUrl =
    data.community.tokenImageUrl || data.community.tokenHighResImageUrl || null;
  // Proxy through wsrv.nl to guarantee CORS headers + reasonable size.
  const iconUrl = useMemo(() => {
    if (!rawIconUrl) return null;
    const stripped = rawIconUrl.replace(/^https?:\/\//, "");
    return `https://wsrv.nl/?url=${encodeURIComponent(stripped)}&w=256&h=256&fit=cover&output=png`;
  }, [rawIconUrl]);
  const [iconTexture, setIconTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!iconUrl) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      // Paint to a square canvas so the sphere wrap looks consistent.
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0b0f1a";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      setIconTexture(tex);
    };
    img.onerror = () => {
      /* ignore — fallback to solid color */
    };
    img.src = iconUrl;
    return () => {
      cancelled = true;
    };
  }, [iconUrl]);

  useEffect(() => {
    return () => {
      iconTexture?.dispose();
    };
  }, [iconTexture]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const angle = data.orbitPhase + t * data.orbitSpeed;
    const x = Math.cos(angle) * data.orbitRadius;
    const z = Math.sin(angle) * data.orbitRadius;
    const y = Math.sin(angle * 0.7 + data.index) * 0.6;
    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
    }
    if (planetRef.current) {
      planetRef.current.rotation.y = t * 0.5;
    }
    // Spike pulse
    const dt = (Date.now() - spikeAt) / 1000;
    const spike = dt >= 0 && dt < 1.6 ? Math.max(0, 1 - dt / 1.6) : 0;
    const baseScale = 1 + (hovered || selected ? 0.18 : 0) + spike * 0.6;
    if (planetRef.current) {
      planetRef.current.scale.setScalar(baseScale);
    }
    if (glowRef.current) {
      const g = 1.6 + Math.sin(t * 2 + data.index) * 0.06 + spike * 0.7;
      glowRef.current.scale.setScalar(g);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.18 + spike * 0.45 + (hovered ? 0.1 : 0);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.3;
    }
    if (ownedGlowRef.current) {
      const pulse = 0.5 + Math.sin(t * 2.4 + data.index) * 0.5;
      const s = 2.1 + pulse * 0.35;
      ownedGlowRef.current.scale.setScalar(s);
      (ownedGlowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.14 + pulse * 0.18;
      ownedGlowRef.current.rotation.y = t * 0.4;
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(data.community.tokenAddress);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(data.community.tokenAddress);
      }}
    >
      <mesh ref={planetRef}>
        <sphereGeometry args={[data.size, 32, 32]} />
        {iconTexture ? (
          <meshBasicMaterial map={iconTexture} toneMapped={false} />
        ) : (
          <meshStandardMaterial
            color={color}
            emissive={glowColor}
            emissiveIntensity={data.bucket === "positive" ? 0.9 : 0.55}
            metalness={0.35}
            roughness={0.45}
          />
        )}
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[data.size, 24, 24]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {owned && (
        <>
          <mesh ref={ownedGlowRef}>
            <sphereGeometry args={[data.size, 24, 24]} />
            <meshBasicMaterial
              color={"#5ef0c8"}
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[data.size * 2.1, data.size * 2.25, 64]} />
            <meshBasicMaterial
              color={"#5ef0c8"}
              transparent
              opacity={0.55}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
      {(selected || data.bucket === "positive") && (
        <mesh ref={ringRef} rotation={[Math.PI / 2.4, 0, 0]}>
          <ringGeometry args={[data.size * 1.6, data.size * 1.85, 64]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={selected ? 0.7 : 0.35}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
      {hovered && (
        <Html distanceFactor={14} position={[0, data.size + 1.2, 0]} center>
          <div
            className="hud-panel rounded-md px-3 py-2 text-xs font-mono whitespace-nowrap pointer-events-none"
            style={{ color: "var(--neon-cyan)" }}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider">
                ${data.community.tokenSymbol || "—"}
              </span>
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: data.glowColor, boxShadow: `0 0 8px ${data.glowColor}` }}
              />
            </div>
            <div className="text-[10px] opacity-80 mt-1 space-y-0.5">
              <div>MC ≈ ${formatCompact(data.marketCap)}</div>
              {data.holderCount != null && (
                <div>{formatCompact(data.holderCount)} holders</div>
              )}
              <div>Sentiment {Math.round(data.sentiment * 100)}%</div>
              <div>{formatCompact(data.community.postCount)} posts · {formatCompact(data.community.memberCount)} members</div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}