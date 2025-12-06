import React, { Suspense, useRef, useState } from 'react';
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
  myCarModel: any; // Simplified, generic prop since we only use Audi now
}

const SceneController = ({ speed, onUpdateCurvature }: { speed: number, onUpdateCurvature: (c: number) => void }) => {
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const curveRef = useRef(0);
    const targetCurveRef = useRef(0);
    const timeRef = useRef(0);

    useFrame((state, delta) => {
        timeRef.current += delta;

        // Random curve generation
        if (state.clock.elapsedTime % 5 < 0.05) {
             targetCurveRef.current = (Math.random() - 0.5) * 50; // Stronger curves for shader effect
        }
        
        curveRef.current = THREE.MathUtils.lerp(curveRef.current, targetCurveRef.current, delta * 0.5);
        onUpdateCurvature(curveRef.current);

        if (cameraRef.current) {
            // Camera shake
            const shake = speed * 0.05;
            const xShake = (Math.random() - 0.5) * shake;
            const yShake = (Math.random() - 0.5) * shake;

            // Camera behavior 
            const targetFOV = 60 + speed * 15; 
            const targetY = 3.5; 
            const targetZ = 8 + speed * 2; 

            cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, targetFOV, 0.05);
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, targetY + yShake, 0.05);
            cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, targetZ, 0.05);
            
            // Banking Camera into turn
            const curveOffsetX = -curveRef.current * 0.05;
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, curveOffsetX + xShake, 0.05);
            
            cameraRef.current.lookAt(0, 1.5, -20); 
            cameraRef.current.updateProjectionMatrix();
        }
    });

    return <PerspectiveCamera makeDefault position={[0, 4, 10]} ref={cameraRef} />;
}

// Wrapper for opponent logic
const OpponentCar = ({ stats, myProgress, curvature }: { stats: OpponentStats, myProgress: number, curvature: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    const zPosRef = useRef(0);

    useFrame((state, delta) => {
        if(groupRef.current) {
            // Scale factor: how far visually is the opponent?
            const TRACK_SCALE = 100; 
            const progressDiff = myProgress - stats.progress; 
            const targetZ = progressDiff * TRACK_SCALE; // Positive means I'm ahead (opponent is behind/positive Z)
            
            zPosRef.current = THREE.MathUtils.lerp(zPosRef.current, targetZ, delta * 2);
            groupRef.current.position.z = zPosRef.current;
        }
    });

    const speed = Math.min(stats.wpm / 100, 1.5);
    const tilt = speed > 0 ? -0.05 * speed : 0;

    return (
        <group ref={groupRef}>
            {/* Opponent is on the right lane offset */}
            <Car 
                speed={speed} 
                tilt={tilt} 
                curvature={curvature} 
                lanePosition={3.5} 
            />
            {/* Name Tag */}
             <group position={[3.5, 3, 0]}>
                 <mesh>
                    <planeGeometry args={[3, 0.8]} />
                    <meshBasicMaterial color="#000" opacity={0.5} transparent />
                 </mesh>
             </group>
        </group>
    )
}

export const GameScene: React.FC<GameSceneProps> = ({ wpm, isMoving, multiplayerMode, opponentStats, progress }) => {
  const speed = Math.min(wpm / 100, 1.5); 
  const displaySpeed = isMoving ? speed : 0;
  
  const tilt = isMoving ? -0.05 * speed : 0.02;
  const [curvature, setCurvature] = useState(0);

  // My lane is center (0) for single, slightly left for multi
  const myLane = multiplayerMode === MultiplayerMode.SINGLE ? 0 : -2.0;

  return (
    <Canvas shadows dpr={[1, 2]}>
      <Suspense fallback={null}>
        <SceneController speed={displaySpeed} onUpdateCurvature={setCurvature} />
        <Sky sunPosition={[10, 10, 10]} turbidity={0.2} rayleigh={0.1} inclination={0.6} distance={1000} />
        <Environment preset="city" />
        
        {/* My Car */}
        <Car 
            speed={displaySpeed} 
            tilt={tilt} 
            curvature={curvature} 
            lanePosition={myLane} 
        />

        {/* Opponent Car */}
        {multiplayerMode !== MultiplayerMode.SINGLE && opponentStats && (
            <OpponentCar stats={opponentStats} myProgress={progress} curvature={curvature} />
        )}

        <World speed={displaySpeed} curvature={curvature} />
      </Suspense>
    </Canvas>
  );
};