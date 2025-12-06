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

const CarModelMesh = ({ isBraking }: { isBraking: boolean }) => {
    // Explicitly using the Audi model as requested
    const { scene } = useGLTF('./audi_pb18_e_tron_low_poly_3d.glb');
    const brakeLightRef = useRef<THREE.Mesh>(null);

    const clone = useMemo(() => {
        const s = scene.clone();
        // Adjust scale to fit the new procedural track
        s.scale.set(3.5, 3.5, 3.5); 
        // Rotate to face away from camera (driving forward)
        s.rotation.y = Math.PI; 
        s.position.y = 0; // Sit on the ground
        return s;
    }, [scene]);

    // Add Brake Lights to the model scene manually if not present
    // Position roughly where tail lights would be on this model
    return (
        <group>
            <primitive object={clone} />
            {/* Procedural Brake Lights Overlay */}
            <group position={[0, 0.8, 2.3]}>
                <mesh position={[-0.8, 0, 0]}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshStandardMaterial 
                        color="red" 
                        emissive="red" 
                        emissiveIntensity={isBraking ? 5 : 0.5} 
                        toneMapped={false} 
                    />
                </mesh>
                <mesh position={[0.8, 0, 0]}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshStandardMaterial 
                        color="red" 
                        emissive="red" 
                        emissiveIntensity={isBraking ? 5 : 0.5} 
                        toneMapped={false} 
                    />
                </mesh>
            </group>
        </group>
    );
};

export const Car: React.FC<CarProps> = ({ speed, tilt, curvature, lanePosition = 0, isBraking = false }) => {
  const containerRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  
  useFrame((state, delta) => {
    if (containerRef.current) {
        // Smooth lane changing - reduced Lerp speed for weightiness
        containerRef.current.position.x = THREE.MathUtils.lerp(containerRef.current.position.x, lanePosition, delta * 3);
    }

    if (bodyRef.current) {
      const t = state.clock.getElapsedTime();
      
      // Engine vibration - Subtle
      bodyRef.current.position.y = Math.sin(t * 50) * 0.002;
      
      // Pitch Logic:
      // Accelerating (Positive Tilt/Speed) -> Nose Up (Negative Rotation X)
      // Braking (isBraking) -> Nose Down (Positive Rotation X)
      let targetPitch = 0;
      if (isBraking) {
          targetPitch = 0.05; // Reduced Nose Dive for stability
      } else {
          targetPitch = -speed * 0.03; // Reduced Squat for stability
      }
      
      bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, targetPitch, delta * 4);
      
      // STABILITY FIX: Removed banking (Z) and turning (Y) rotation.
      // The car now stays perfectly straight to avoid "rotatory motion".
      bodyRef.current.rotation.z = 0;
      bodyRef.current.rotation.y = 0;
    }
  });

  return (
    <group ref={containerRef}>
        <group ref={bodyRef}>
            <ModelErrorBoundary fallback={<FallbackCar />}>
                <CarModelMesh isBraking={isBraking} />
            </ModelErrorBoundary>
        </group>
    </group>
  );
};