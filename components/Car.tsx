
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import * as THREE from 'three';
import { CarProps } from '../types';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      cylinderGeometry: any;
      meshStandardMaterial: any;
      boxGeometry: any;
      planeGeometry: any;
      instancedMesh: any;
      meshBasicMaterial: any;
      coneGeometry: any;
      hemisphereLight: any;
      directionalLight: any;
      fog: any;
      shaderMaterial: any;
      circleGeometry: any;
    }
  }
}

const Wheel = ({ position, rotation, speed, isFront, steerAngle }: { position: [number, number, number], rotation?: [number, number, number], speed: number, isFront?: boolean, steerAngle?: number }) => {
  const wheelRef = useRef<Group>(null);
  
  useFrame((state, delta) => {
    if (wheelRef.current) {
      // Rotate wheels based on speed
      // The wheel mesh inside the group is rotated for rolling
      // The group itself rotates for steering
      const rollingMesh = wheelRef.current.children[0] as THREE.Mesh; // The cylinder mesh
      if(rollingMesh) {
         rollingMesh.rotation.x -= (speed * 20 + 5) * delta; 
      }

      if (isFront && steerAngle !== undefined) {
         wheelRef.current.rotation.y = THREE.MathUtils.lerp(wheelRef.current.rotation.y, steerAngle, delta * 5);
      }
    }
  });

  return (
    <group ref={wheelRef} position={position} rotation={rotation as any}>
      <group> 
         <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 0.25, 32]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
         </mesh>
         <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.26, 16]} />
            <meshStandardMaterial color="#333" metalness={0.8} />
         </mesh>
      </group>
    </group>
  );
};

export const Car: React.FC<CarProps> = ({ speed, tilt, curvature }) => {
  const chassisRef = useRef<Group>(null);
  
  useFrame((state, delta) => {
    if (chassisRef.current) {
      // Subtle engine vibration
      const t = state.clock.getElapsedTime();
      chassisRef.current.position.y = 0.6 + Math.sin(t * 30) * 0.005;
      
      // Pitch (Tilt) based on acceleration/deceleration
      chassisRef.current.rotation.x = THREE.MathUtils.lerp(chassisRef.current.rotation.x, tilt, delta * 2);

      // Roll (Banking) based on curvature (Turn)
      // If curvature is positive (right turn), car rolls left (negative Z) slightly? No, car leans outside? 
      // Actually usually cars lean OUT of the turn (body roll). 
      // Right turn -> body leans Left.
      const targetRoll = -curvature * 0.15;
      chassisRef.current.rotation.z = THREE.MathUtils.lerp(chassisRef.current.rotation.z, targetRoll, delta * 2);

      // Yaw (Turning) - rotate chassis slightly into the turn
      const targetYaw = -curvature * 0.1;
      chassisRef.current.rotation.y = THREE.MathUtils.lerp(chassisRef.current.rotation.y, targetYaw, delta * 2);
    }
  });

  // Calculate steer angle for front wheels
  // Max steer angle around 0.3 radians
  const steerAngle = -curvature * 0.3;

  return (
    <group ref={chassisRef}>
      {/* Main Body */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.5, 4]} />
        <meshStandardMaterial color="#e60000" metalness={0.6} roughness={0.2} />
      </mesh>
      
      {/* Cabin/Cockpit */}
      <mesh position={[0, 0.7, -0.2]} castShadow>
        <boxGeometry args={[1.4, 0.5, 2]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Hood Scoop */}
      <mesh position={[0, 0.46, 1.2]} castShadow>
         <boxGeometry args={[1.0, 0.1, 1.0]} />
         <meshStandardMaterial color="#cc0000" />
      </mesh>

      {/* Spoiler */}
      <group position={[0, 0.6, -1.8]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[1.9, 0.1, 0.4]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[-0.7, 0, 0]}>
          <boxGeometry args={[0.1, 0.6, 0.2]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0.7, 0, 0]}>
          <boxGeometry args={[0.1, 0.6, 0.2]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>

      {/* Headlights */}
      <mesh position={[-0.6, 0.2, 2.01]}>
        <boxGeometry args={[0.4, 0.2, 0.1]} />
        <meshStandardMaterial color="#ccffcc" emissive="#ccffcc" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.6, 0.2, 2.01]}>
        <boxGeometry args={[0.4, 0.2, 0.1]} />
        <meshStandardMaterial color="#ccffcc" emissive="#ccffcc" emissiveIntensity={2} />
      </mesh>

      {/* Taillights */}
      <mesh position={[0, 0.3, -2.01]}>
         <boxGeometry args={[1.6, 0.15, 0.1]} />
         <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={speed > 0 ? 1 : 3} /> 
      </mesh>

      {/* Wheels */}
      {/* Front Wheels Steer */}
      <Wheel position={[-0.9, 0, 1.2]} speed={speed} isFront steerAngle={steerAngle} />
      <Wheel position={[0.9, 0, 1.2]} speed={speed} isFront steerAngle={steerAngle} />
      
      {/* Rear Wheels Fixed */}
      <Wheel position={[-0.9, 0, -1.2]} speed={speed} />
      <Wheel position={[0.9, 0, -1.2]} speed={speed} />
    </group>
  );
};
