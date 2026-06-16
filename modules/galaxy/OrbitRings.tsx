import { useMemo } from "react";
import * as THREE from "three";

export function OrbitRings({ radii }: { radii: number[] }) {
  const unique = useMemo(() => Array.from(new Set(radii.map((r) => Math.round(r * 10) / 10))), [radii]);
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {unique.map((r) => (
        <mesh key={r}>
          <ringGeometry args={[r - 0.02, r + 0.02, 128]} />
          <meshBasicMaterial
            color="#5be6ff"
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}