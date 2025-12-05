import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { Car } from './Car';
import { World } from './World';
import { OpponentStats, MultiplayerMode } from '../types';

interface GameSceneProps {
  wpm: number;
  isMoving: boolean;
  multiplayerMode: MultiplayerMode;
  opponentStats?: OpponentStats;
  progress: number;
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
            // Always center on lane 0 or slightly offset if multiplayer?
            // Let's keep camera centered on 0, and move players to lanes
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, curveOffsetX + xShake, 0.05);

            // Look ahead into the road
            cameraRef.current.lookAt(curveRef.current * 10, 0.5, -30); 
            cameraRef.current.updateProjectionMatrix();
        }
    });

    return <PerspectiveCamera makeDefault position={[0, 3, 8]} ref={cameraRef} />;
}

// Wrapper for opponent logic
const OpponentCar = ({ stats, myProgress, curvature }: { stats: OpponentStats, myProgress: number, curvature: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    const zPosRef = useRef(0);

    useFrame((state, delta) => {
        if(groupRef.current) {
            // Calculate relative position
            // If opponent progress > myProgress, they should be ahead (negative Z)
            // If opponent progress < myProgress, they should be behind (positive Z)
            
            // Scale factor: how many meters of visual distance corresponds to 100% progress?
            // Let's say track length is ~1000 meters visually for the race duration
            const TRACK_SCALE = 500; 
            
            const progressDiff = myProgress - stats.progress; 
            
            // If I am winning (progressDiff > 0), opponent falls back (Positive Z)
            // If Opponent winning (progressDiff < 0), opponent goes ahead (Negative Z)
            const targetZ = progressDiff * TRACK_SCALE;
            
            zPosRef.current = THREE.MathUtils.lerp(zPosRef.current, targetZ, delta * 2);
            groupRef.current.position.z = zPosRef.current;
        }
    });

    const speed = Math.min(stats.wpm / 100, 1.5);
    const tilt = speed > 0 ? -0.05 * speed : 0;

    return (
        <group ref={groupRef}>
            <Car speed={speed} tilt={tilt} curvature={curvature} color="#0066cc" lanePosition={2.5} />
            {/* Name Tag */}
             <group position={[2.5, 2.5, 0]}>
                 <mesh>
                    <planeGeometry args={[2, 0.5]} />
                    <meshBasicMaterial color="#000" opacity={0.5} transparent />
                 </mesh>
                 {/* Text would be ideal here but for simplicity just a colored indicator */}
             </group>
        </group>
    )
}

export const GameScene: React.FC<GameSceneProps> = ({ wpm, isMoving, multiplayerMode, opponentStats, progress }) => {
  const speed = Math.min(wpm / 100, 1.5); 
  const displaySpeed = isMoving ? speed : 0;
  
  const tilt = isMoving ? -0.05 * speed : 0.02;
  const [curvature, setCurvature] = useState(0);

  // In Multiplayer: My Lane is -2.5 (Left), Opponent is 2.5 (Right)
  // In Single Player: Lane is 0
  const myLane = multiplayerMode === MultiplayerMode.SINGLE ? 0 : -2.5;

  return (
    <Canvas shadows dpr={[1, 2]}>
      <Suspense fallback={null}>
        <SceneController speed={displaySpeed} onUpdateCurvature={setCurvature} />
        <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
        <Environment preset="park" />
        
        {/* My Car */}
        <Car speed={displaySpeed} tilt={tilt} curvature={curvature} color="#e60000" lanePosition={myLane} />

        {/* Opponent Car */}
        {multiplayerMode !== MultiplayerMode.SINGLE && opponentStats && (
            <OpponentCar stats={opponentStats} myProgress={progress} curvature={curvature} />
        )}

        <World speed={displaySpeed} curvature={curvature} />
      </Suspense>
    </Canvas>
  );
};