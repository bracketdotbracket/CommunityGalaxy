import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function Starfield({ count = 2400, radius = 120 }: { count?: number; radius?: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const palette = [
      new THREE.Color("#9bd4ff"),
      new THREE.Color("#c4b1ff"),
      new THREE.Color("#ffffff"),
      new THREE.Color("#ffd9a8"),
    ];
    for (let i = 0; i < count; i++) {
      // Distribute roughly inside a sphere shell
      const r = radius * (0.4 + Math.random() * 0.6);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = 0.3 + Math.random() * 1.2;
    }
    return { positions, colors, sizes };
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.008;
    const mat = ref.current.material as THREE.PointsMaterial;
    // Subtle twinkle
    mat.opacity = 0.75 + Math.sin(clock.getElapsedTime() * 1.8) * 0.1;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.5}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function Nebula() {
  return (
    <>
      <mesh position={[-30, 10, -40]}>
        <sphereGeometry args={[28, 32, 32]} />
        <meshBasicMaterial color="#5b2bff" transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <mesh position={[40, -8, -30]}>
        <sphereGeometry args={[22, 32, 32]} />
        <meshBasicMaterial color="#22e6ff" transparent opacity={0.05} depthWrite={false} />
      </mesh>
      <mesh position={[10, 25, -60]}>
        <sphereGeometry args={[34, 32, 32]} />
        <meshBasicMaterial color="#ff4f8b" transparent opacity={0.04} depthWrite={false} />
      </mesh>
    </>
  );
}