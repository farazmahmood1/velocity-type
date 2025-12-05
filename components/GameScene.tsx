import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Sky } from '@react-three/drei';
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

        if (state.clock.elapsedTime % 5 < 0.1) {
             targetCurveRef.current = (Math.random() - 0.5) * 2;
        }
        
        curveRef.current = THREE.MathUtils.lerp(curveRef.current, targetCurveRef.current, delta * 0.5);
        onUpdateCurvature(curveRef.current);

        if (cameraRef.current) {
            // Camera shake
            const shake = speed * 0.05;
            const xShake = (Math.random() - 0.5) * shake;
            const yShake = (Math.random() - 0.5) * shake;

            // Camera behavior
            const targetFOV = 60 + speed * 40; 
            const targetY = 3.5 - speed * 1.5;
            const targetZ = 8 + speed * 3;

            cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, targetFOV, 0.05);
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, targetY + yShake, 0.05);
            cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, targetZ, 0.05);
            
            const curveOffsetX = -curveRef.current * 3;
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, curveOffsetX + xShake, 0.05);

            // Look ahead into the road
            cameraRef.current.lookAt(curveRef.current * 10, 0.5, -30); 
            cameraRef.current.updateProjectionMatrix();
        }
    });

    return <PerspectiveCamera makeDefault position={[0, 3, 8]} ref={cameraRef} />;
}

export const GameScene: React.FC<GameSceneProps> = ({ wpm, isMoving }) => {
  const speed = Math.min(wpm / 100, 1.5); 
  const displaySpeed = isMoving ? speed : 0;
  
  // Tilt car back when accelerating (since we rotated car 180, negative rotation X is tilting back relative to world)
  const tilt = isMoving ? -0.05 * speed : 0.02;

  const [curvature, setCurvature] = useState(0);

  return (
    <Canvas shadows dpr={[1, 2]}>
      <Suspense fallback={null}>
        <SceneController speed={displaySpeed} onUpdateCurvature={setCurvature} />
        <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
        <Environment preset="park" />
        
        <Car speed={displaySpeed} tilt={tilt} curvature={curvature} />
        <World speed={displaySpeed} curvature={curvature} />
      </Suspense>
    </Canvas>
  );
};