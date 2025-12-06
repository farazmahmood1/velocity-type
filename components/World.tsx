import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WorldProps } from '../types';

// --- Shaders for Bending World ---

const RoadMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uCurvature: { value: 0 },
    uColorCenter: { value: new THREE.Color('#333333') },
    uColorEdge: { value: new THREE.Color('#222222') },
    uColorLine: { value: new THREE.Color('#ffffff') }
  },
  vertexShader: `
    uniform float uCurvature;
    uniform float uTime;
    varying vec2 vUv;
    varying float vZ;

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Bending Logic: Bend X based on Z distance
      float zDist = pos.z; 
      // The further negative Z, the more we bend
      pos.x += pow(abs(zDist), 2.0) * uCurvature * 0.0002;
      
      vZ = pos.z;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorCenter;
    uniform vec3 uColorEdge;
    uniform vec3 uColorLine;
    varying vec2 vUv;
    varying float vZ;

    void main() {
      // Create road gradient
      float edge = abs(vUv.x - 0.5) * 2.0;
      vec3 color = mix(uColorCenter, uColorEdge, pow(edge, 3.0));

      // Dashed Lines
      if (abs(vUv.x - 0.5) < 0.02) {
        // Move lines with time
        float dash = sin(vZ * 0.5 + uTime * 20.0);
        if (dash > 0.0) {
           color = uColorLine;
        }
      }
      
      // Side curbs (Red/White)
      if (edge > 0.9) {
          float strip = sin(vZ * 0.5 + uTime * 20.0);
          color = strip > 0.0 ? vec3(1.0, 0.0, 0.0) : vec3(1.0, 1.0, 1.0);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

const GrassMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uCurvature: { value: 0 },
    uColor: { value: new THREE.Color('#4caf50') }
  },
  vertexShader: `
    uniform float uCurvature;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      // Match road bending
      float zDist = pos.z; 
      pos.x += pow(abs(zDist), 2.0) * uCurvature * 0.0002;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying vec2 vUv;

    void main() {
      // Simple noise/grid pattern
      float grid = abs(sin(vUv.x * 50.0) * sin(vUv.y * 50.0));
      vec3 color = mix(uColor, uColor * 0.8, grid * 0.2);
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

// --- Procedural Components ---

const DecorationObj = ({ position, type }: { position: [number, number, number], type: 'tree' | 'rock' }) => {
    return (
        <group position={position}>
            {type === 'tree' ? (
                <group>
                    <mesh position={[0, 1.5, 0]}>
                        <coneGeometry args={[1, 3, 8]} />
                        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
                    </mesh>
                    <mesh position={[0, 0, 0]}>
                        <cylinderGeometry args={[0.3, 0.4, 1]} />
                        <meshStandardMaterial color="#3e2723" />
                    </mesh>
                </group>
            ) : (
                <mesh position={[0, 0.5, 0]} rotation={[Math.random(), Math.random(), Math.random()]}>
                    <dodecahedronGeometry args={[0.8]} />
                    <meshStandardMaterial color="#795548" />
                </mesh>
            )}
        </group>
    );
};

const SpeedLines = ({ speed }: { speed: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    const count = 30;
    
    // Create initial random positions
    const initialPositions = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 30,
            y: Math.random() * 5 + 1,
            z: Math.random() * -100,
            speedOffset: Math.random() * 0.5 + 0.5
        }));
    }, []);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        
        // Visual speed multiplier for lines
        // If speed is low, lines disappear
        const flowSpeed = speed * 100 * delta;
        const opacity = THREE.MathUtils.clamp((speed - 0.5) * 2, 0, 0.5);

        groupRef.current.children.forEach((mesh, i) => {
            const data = initialPositions[i];
            mesh.position.z += flowSpeed * data.speedOffset;

            // Reset when passed camera
            if (mesh.position.z > 5) {
                mesh.position.z = -100 - Math.random() * 50;
                mesh.position.x = (Math.random() - 0.5) * 30;
                // Keep center clear for car
                if (Math.abs(mesh.position.x) < 5) mesh.position.x += 10;
            }

            const mat = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
            mat.opacity = opacity;
        });
    });

    return (
        <group ref={groupRef}>
            {initialPositions.map((pos, i) => (
                <mesh key={i} position={[pos.x, pos.y, pos.z]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.05, 0.05, 5]} />
                    <meshBasicMaterial color="#ccffff" transparent opacity={0} blending={THREE.AdditiveBlending} />
                </mesh>
            ))}
        </group>
    )
}

export const World: React.FC<WorldProps> = ({ speed, curvature, isBraking }) => {
  const roadRef = useRef<THREE.Mesh>(null);
  const grassLeftRef = useRef<THREE.Mesh>(null);
  const grassRightRef = useRef<THREE.Mesh>(null);
  const decoGroupRef = useRef<THREE.Group>(null);
  
  // Create shaders once
  const roadMat = useMemo(() => new THREE.ShaderMaterial(RoadMaterial), []);
  const grassMat = useMemo(() => new THREE.ShaderMaterial(GrassMaterial), []);

  useFrame((state, delta) => {
    // Pass time and curvature to shaders
    // If braking, speed decreases visually in App.tsx, so effectiveSpeed naturally drops
    const effectiveSpeed = Math.max(speed, 0.05); 
    
    // We increase uTime uniform to simulate forward movement in the texture
    if(roadRef.current) {
        (roadRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value += effectiveSpeed * delta;
        (roadRef.current.material as THREE.ShaderMaterial).uniforms.uCurvature.value = THREE.MathUtils.lerp(
             (roadRef.current.material as THREE.ShaderMaterial).uniforms.uCurvature.value,
             curvature,
             delta * 2
        );
    }
    
    if(grassLeftRef.current) {
        (grassLeftRef.current.material as THREE.ShaderMaterial).uniforms.uCurvature.value = curvature;
    }
    if(grassRightRef.current) {
        (grassRightRef.current.material as THREE.ShaderMaterial).uniforms.uCurvature.value = curvature;
    }

    // Move decorations physically
    if (decoGroupRef.current) {
        decoGroupRef.current.children.forEach((child) => {
            child.position.z += effectiveSpeed * 40 * delta;
            
            // Loop decorations
            if (child.position.z > 10) {
                child.position.z = -150 - Math.random() * 50;
            }
            
            // Apply bending to objects so they stick to the curved ground visual
            const zDist = child.position.z;
            const bendX = Math.pow(Math.abs(zDist), 2.0) * curvature * 0.0002;
            
            const baseX = child.userData.baseX || child.position.x;
            child.position.x = baseX + bendX;
        });
    }
  });

  // Generate random decorations
  const decorations = useMemo(() => {
    const items = [];
    for (let i = 0; i < 40; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = (8 + Math.random() * 15) * side;
        const z = -Math.random() * 200;
        const type = Math.random() > 0.8 ? 'rock' : 'tree';
        items.push(<primitive object={new THREE.Group()} key={i} position={[x, 0, z]} userData={{ baseX: x }}>
            <DecorationObj position={[0,0,0]} type={type} />
        </primitive>);
    }
    return items;
  }, []);

  return (
    <group>
      {/* Road: 200 units long, 10 units wide */}
      <mesh ref={roadRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -50]}>
        <planeGeometry args={[12, 200, 20, 200]} />
        <primitive object={roadMat} attach="material" />
      </mesh>

      {/* Left Grass */}
      <mesh ref={grassLeftRef} rotation={[-Math.PI / 2, 0, 0]} position={[-30, -0.1, -50]}>
        <planeGeometry args={[50, 200, 20, 200]} />
        <primitive object={grassMat} attach="material" />
      </mesh>

      {/* Right Grass */}
      <mesh ref={grassRightRef} rotation={[-Math.PI / 2, 0, 0]} position={[30, -0.1, -50]}>
        <planeGeometry args={[50, 200, 20, 200]} />
        <primitive object={grassMat} attach="material" />
      </mesh>

      {/* Decorations */}
      <group ref={decoGroupRef}>
          {decorations}
      </group>
      
      {/* Speed Lines Effect */}
      <SpeedLines speed={speed} />

      <hemisphereLight intensity={0.8} groundColor="#4a8522" skyColor="#87CEEB" />
      <directionalLight 
        position={[50, 50, 20]} 
        intensity={1.5} 
        castShadow 
      />
      <fog attach="fog" args={['#87CEEB', 20, 120]} />
    </group>
  );
};