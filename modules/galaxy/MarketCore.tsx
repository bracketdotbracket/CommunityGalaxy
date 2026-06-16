import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function MarketCore() {
  const inner = useRef<THREE.Mesh>(null);
  const outer = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (inner.current) inner.current.rotation.y = t * 0.3;
    if (outer.current) {
      outer.current.rotation.y = -t * 0.15;
      outer.current.rotation.x = t * 0.07;
    }
    if (halo.current) {
      const s = 1 + Math.sin(t * 1.6) * 0.06;
      halo.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      <pointLight color="#7af6ff" intensity={2.4} distance={60} decay={1.5} />
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.6, 2]} />
        <meshStandardMaterial
          color="#9ff7ff"
          emissive="#5be6ff"
          emissiveIntensity={1.5}
          metalness={0.4}
          roughness={0.2}
        />
      </mesh>
      <mesh ref={outer}>
        <icosahedronGeometry args={[2.4, 1]} />
        <meshBasicMaterial
          color="#a86bff"
          wireframe
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[3.4, 32, 32]} />
        <meshBasicMaterial
          color="#5be6ff"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}