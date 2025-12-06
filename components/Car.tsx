import React, { useRef, useMemo, Component, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { CarProps } from '../types';

// Error Boundary to catch 404s/Loading Errors
class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.warn("3D Model failed to load (using fallback):", error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Fallback Procedural Car (Futuristic Box)
const FallbackCar = () => (
  <group>
    <mesh position={[0, 0.4, 0]}>
      <boxGeometry args={[1.8, 0.6, 4]} />
      <meshStandardMaterial color="#00bcd4" roughness={0.3} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.9, -0.2]}>
      <boxGeometry args={[1.4, 0.5, 2]} />
      <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
    </mesh>
    <mesh position={[-0.9, 0.35, 1.2]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
      <meshStandardMaterial color="#333" />
    </mesh>
    <mesh position={[0.9, 0.35, 1.2]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
      <meshStandardMaterial color="#333" />
    </mesh>
    <mesh position={[-0.9, 0.35, -1.2]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
      <meshStandardMaterial color="#333" />
    </mesh>
    <mesh position={[0.9, 0.35, -1.2]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
      <meshStandardMaterial color="#333" />
    </mesh>
  </group>
);

const CarModelMesh = () => {
    // Explicitly using the Audi model as requested
    const { scene } = useGLTF('./audi_pb18_e_tron_low_poly_3d.glb');

    const clone = useMemo(() => {
        const s = scene.clone();
        // Adjust scale to fit the new procedural track
        s.scale.set(3.5, 3.5, 3.5); 
        // Rotate to face away from camera (driving forward)
        s.rotation.y = Math.PI; 
        s.position.y = 0; // Sit on the ground
        return s;
    }, [scene]);

    return <primitive object={clone} />;
};

export const Car: React.FC<CarProps> = ({ speed, tilt, curvature, lanePosition = 0 }) => {
  const containerRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  
  useFrame((state, delta) => {
    if (containerRef.current) {
        // Smooth lane changing
        containerRef.current.position.x = THREE.MathUtils.lerp(containerRef.current.position.x, lanePosition, delta * 5);
    }

    if (bodyRef.current) {
      const t = state.clock.getElapsedTime();
      
      // Engine vibration
      bodyRef.current.position.y = Math.sin(t * 40) * 0.005;
      
      // Acceleration tilt (nose up/down)
      bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, tilt, delta * 2);
      
      // Banking into turns
      const targetRoll = curvature * 0.15; 
      bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, targetRoll, delta * 2);

      // Turning visual
      const targetYaw = -curvature * 0.1;
      bodyRef.current.rotation.y = THREE.MathUtils.lerp(bodyRef.current.rotation.y, targetYaw, delta * 2);
    }
  });

  return (
    <group ref={containerRef}>
        <group ref={bodyRef}>
            <ModelErrorBoundary fallback={<FallbackCar />}>
                <CarModelMesh />
            </ModelErrorBoundary>
        </group>
    </group>
  );
};