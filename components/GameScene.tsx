
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Car } from './Car';
import { World } from './World';

interface GameSceneProps {
  wpm: number;
  isMoving: boolean;
}

const SceneController = ({ speed, onUpdateCurvature }: { speed: number, onUpdateCurvature: (c: number) => void }) => {
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const curveRef = useRef(0);
    const targetCurveRef = useRef(0);
    const timeRef = useRef(0);

    useFrame((state, delta) => {
        timeRef.current += delta;

        // Procedural Curve Generation
        // Change target curve every few seconds
        if (state.clock.elapsedTime % 5 < 0.1) {
             // Random curve between -1 (left) and 1 (right)
             targetCurveRef.current = (Math.random() - 0.5) * 2;
        }
        
        // Smoothly interpolate current curve to target
        curveRef.current = THREE.MathUtils.lerp(curveRef.current, targetCurveRef.current, delta * 0.5);
        onUpdateCurvature(curveRef.current);

        if (cameraRef.current) {
            // Camera shake based on speed
            const shake = speed * 0.05;
            const xShake = (Math.random() - 0.5) * shake;
            const yShake = (Math.random() - 0.5) * shake;

            // Camera pulls back (FOV increases) and moves lower as speed increases
            const targetFOV = 60 + speed * 40; // Wider FOV for speed sensation
            const targetY = 3.5 - speed * 1.5;
            const targetZ = 8 + speed * 3;

            cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, targetFOV, 0.05);
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, targetY + yShake, 0.05);
            cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, targetZ, 0.05);
            
            // Camera X follows curve slightly to look into the turn
            // If curve is positive (right), camera moves left to look right? 
            // Or camera rotates? Simple X offset is easier.
            const curveOffsetX = -curveRef.current * 3;
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, curveOffsetX + xShake, 0.05);

            cameraRef.current.lookAt(curveRef.current * 5, 0.5, -20); 
            cameraRef.current.updateProjectionMatrix();
        }
    });

    return <PerspectiveCamera makeDefault position={[0, 3, 8]} ref={cameraRef} />;
}

export const GameScene: React.FC<GameSceneProps> = ({ wpm, isMoving }) => {
  // Normalize speed: max speed visualization at 120 WPM
  // Exaggerate speed for visual impact
  const speed = Math.min(wpm / 100, 1.5); 
  const displaySpeed = isMoving ? speed : 0;
  
  // Tilt car forward when not accelerating (braking), back when accelerating
  const tilt = isMoving ? -0.05 * speed : 0.02;

  const [curvature, setCurvature] = useState(0);

  return (
    <Canvas shadows dpr={[1, 2]}>
      <Suspense fallback={null}>
        <SceneController speed={displaySpeed} onUpdateCurvature={setCurvature} />
        <Environment preset="night" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Car speed={displaySpeed} tilt={tilt} curvature={curvature} />
        <World speed={displaySpeed} curvature={curvature} />
      </Suspense>
    </Canvas>
  );
};
