import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { PlanetData } from "@/lib/galaxy-types";

type Props = {
  selectedPlanet: PlanetData | null;
  onIdleReset?: () => void;
};

/** Smoothly zooms the camera toward the selected planet's current orbital position. */
export function CameraRig({ selectedPlanet, onIdleReset }: Props) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));
  const desiredCam = useRef(new THREE.Vector3(0, 8, 28));
  const home = useRef(new THREE.Vector3(0, 8, 28));
  const isInteracting = useRef(false);
  const lastInteract = useRef(0);
  const followSelection = useRef(true);

  useEffect(() => {
    home.current.copy(camera.position);
  }, [camera]);

  // When the selection changes, briefly auto-focus on the new planet again.
  useEffect(() => {
    followSelection.current = true;
    lastInteract.current = 0;
  }, [selectedPlanet?.community.tokenAddress]);

  // Attach interaction listeners to the OrbitControls so user drag pauses auto-follow.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onStart = () => {
      isInteracting.current = true;
      followSelection.current = false;
      lastInteract.current = performance.now();
    };
    const onChange = () => {
      lastInteract.current = performance.now();
    };
    const onEnd = () => {
      isInteracting.current = false;
      lastInteract.current = performance.now();
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("change", onChange);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("change", onChange);
      controls.removeEventListener("end", onEnd);
    };
  }, []);

  useFrame(({ clock }) => {
    const now = performance.now();
    const idleMs = lastInteract.current === 0 ? 0 : now - lastInteract.current;

    // If the user is actively dragging/zooming, let OrbitControls own the camera.
    if (isInteracting.current) {
      if (controlsRef.current) controlsRef.current.update();
      return;
    }

    // 5s of no input → reset to default galaxy view.
    if (lastInteract.current !== 0 && idleMs > 5000) {
      followSelection.current = false;
      if (selectedPlanet && onIdleReset) onIdleReset();
      targetPos.current.set(0, 0, 0);
      desiredCam.current.set(0, 10, 32);
      camera.position.lerp(desiredCam.current, 0.04);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetPos.current, 0.05);
        controlsRef.current.update();
      }
      return;
    }

    if (selectedPlanet && followSelection.current) {
      const t = clock.getElapsedTime();
      const angle = selectedPlanet.orbitPhase + t * selectedPlanet.orbitSpeed;
      const x = Math.cos(angle) * selectedPlanet.orbitRadius;
      const z = Math.sin(angle) * selectedPlanet.orbitRadius;
      const y = Math.sin(angle * 0.7 + selectedPlanet.index) * 0.6;
      targetPos.current.set(x, y, z);
      const dir = new THREE.Vector3(x, y + 1.5, z).normalize();
      desiredCam.current
        .copy(targetPos.current)
        .add(dir.multiplyScalar(selectedPlanet.size * 3 + 4));
      camera.position.lerp(desiredCam.current, 0.06);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetPos.current, 0.08);
        controlsRef.current.update();
      }
      return;
    }

    // No selection and not interacting: just let controls handle damping.
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      enablePan
      screenSpacePanning
      zoomToCursor
      minDistance={4}
      maxDistance={90}
      makeDefault
    />
  );
}