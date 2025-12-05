import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, ShaderMaterial, InstancedMesh, Object3D } from 'three';
import * as THREE from 'three';
import { WorldProps } from '../types';

// Shader to curve the road
const roadVertexShader = `
uniform float uTime;
uniform float uCurvature;
varying vec2 vUv;
varying float vZ;

void main() {
  vUv = uv;
  vec3 pos = position;
  
  float zDist = pos.z + 10.0;
  float curveAmount = uCurvature * 0.002;
  pos.x += curveAmount * zDist * zDist;
  
  vZ = pos.z;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const roadFragmentShader = `
uniform sampler2D uMap;
uniform float uTime;
uniform float uSpeed;
varying vec2 vUv;
varying float vZ;

void main() {
  vec2 uv = vUv;
  uv.y -= uTime * (uSpeed * 5.0 + 0.5);
  
  vec4 color = texture2D(uMap, uv);
  
  // Fog effect - brighter for day time
  float fogDensity = 0.015;
  float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vZ * vZ);
  
  // Mix with Sky Color (Light Blue)
  gl_FragColor = mix(color, vec4(0.6, 0.8, 1.0, 1.0), clamp(fogFactor, 0.0, 1.0));
}
`;

const RoadSegments = ({ speed, curvature }: { speed: number, curvature: number }) => {
  const materialRef = useRef<ShaderMaterial>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Road Asphalt
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add noise/grain to asphalt
    for(let i=0; i<5000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#444' : '#222';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // Center Lines
    ctx.fillStyle = '#fff';
    ctx.fillRect(250, 0, 12, 256); 
    ctx.fillRect(250, 300, 12, 256); 
    
    // Side Lines
    ctx.fillStyle = '#fff'; 
    ctx.fillRect(10, 0, 10, 512);
    ctx.fillRect(492, 0, 10, 512);

    // Curbs (Red and White strips)
    // Draw on the very edges
    const curbWidth = 30;
    const stripHeight = 64;
    for(let y=0; y<512; y+=stripHeight) {
        ctx.fillStyle = (y/stripHeight) % 2 === 0 ? '#cc0000' : '#ffffff';
        ctx.fillRect(0, y, curbWidth, stripHeight); // Left curb
        ctx.fillRect(512 - curbWidth, y, curbWidth, stripHeight); // Right curb
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 40); 
    return tex;
  }, []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uSpeed.value = speed;
      materialRef.current.uniforms.uCurvature.value = THREE.MathUtils.lerp(
          materialRef.current.uniforms.uCurvature.value,
          curvature,
          delta * 2
      );
    }
  });

  const uniforms = useMemo(() => ({
    uMap: { value: texture },
    uTime: { value: 0 },
    uSpeed: { value: 0 },
    uCurvature: { value: 0 }
  }), [texture]);

  return (
    <group>
        {/* Road Surface */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[14, 200, 20, 200]} />
        <shaderMaterial
            ref={materialRef}
            vertexShader={roadVertexShader}
            fragmentShader={roadFragmentShader}
            uniforms={uniforms}
        />
        </mesh>
        
        {/* Grass Planes (Simple Green on sides) */}
        {/* We use a large plane below road for grass */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
            <planeGeometry args={[500, 500]} />
            <meshStandardMaterial color="#4a8522" roughness={1} />
        </mesh>
    </group>
  );
};

const Clouds = ({ speed }: { speed: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame((state, delta) => {
        if(groupRef.current) {
            // Clouds move slowly backwards
            groupRef.current.position.z += (speed * 5 + 2) * delta;
            if(groupRef.current.position.z > 50) {
                groupRef.current.position.z = -200;
            }
        }
    });

    return (
        <group ref={groupRef} position={[0, 30, -100]}>
            {/* Simple low poly cloud clusters */}
            <mesh position={[-40, 0, 0]}>
                <sphereGeometry args={[15, 7, 7]} />
                <meshStandardMaterial color="white" flatShading opacity={0.8} transparent />
            </mesh>
             <mesh position={[30, 5, -20]}>
                <sphereGeometry args={[20, 7, 7]} />
                <meshStandardMaterial color="white" flatShading opacity={0.8} transparent />
            </mesh>
            <mesh position={[10, -5, 40]}>
                <sphereGeometry args={[12, 7, 7]} />
                <meshStandardMaterial color="white" flatShading opacity={0.8} transparent />
            </mesh>
        </group>
    )
}

const Scenery = ({ curvature }: { curvature: number }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if(groupRef.current) {
             groupRef.current.rotation.y = THREE.MathUtils.lerp(
                groupRef.current.rotation.y,
                -curvature * 0.2, 
                delta
             );
        }
    });

    return (
        <group ref={groupRef}>
             {/* Distant Mountains - Earth colors */}
             <mesh position={[-60, -5, -100]}>
                <coneGeometry args={[80, 70, 4]} />
                <meshStandardMaterial color="#2d3a25" flatShading />
             </mesh>
             <mesh position={[-30, -5, -140]}>
                <coneGeometry args={[90, 100, 4]} />
                <meshStandardMaterial color="#3a4530" flatShading />
             </mesh>
             
             <mesh position={[60, -5, -90]}>
                <coneGeometry args={[70, 80, 4]} />
                <meshStandardMaterial color="#2d3a25" flatShading />
             </mesh>
             <mesh position={[20, -5, -160]}>
                <coneGeometry args={[100, 120, 4]} />
                <meshStandardMaterial color="#1e261a" flatShading />
             </mesh>
        </group>
    )
}

export const World: React.FC<WorldProps> = ({ speed, curvature }) => {
  return (
    <group>
      <RoadSegments speed={speed} curvature={curvature} />
      <Clouds speed={speed} />
      <Scenery curvature={curvature} />
      
      {/* Daylight setup */}
      <hemisphereLight intensity={0.6} groundColor="#4a8522" skyColor="#87CEEB" />
      <directionalLight 
        position={[50, 100, 50]} 
        intensity={1.5} 
        castShadow 
        color="#fffaf0" 
        shadow-bias={-0.001}
      />
      
      {/* Day fog */}
      <fog attach="fog" args={['#87CEEB', 30, 200]} />
    </group>
  );
};