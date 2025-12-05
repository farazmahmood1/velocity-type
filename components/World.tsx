
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, ShaderMaterial, InstancedMesh, Object3D } from 'three';
import * as THREE from 'three';
import { WorldProps } from '../types';

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

// Shader to curve the road
const roadVertexShader = `
uniform float uTime;
uniform float uCurvature;
varying vec2 vUv;
varying float vZ;

void main() {
  vUv = uv;
  vec3 pos = position;
  
  // Curve equation: displace X based on Z distance squared
  // We offset based on world position Z relative to camera (approx)
  // Since road moves via texture offset, the mesh is static. 
  // We just bend the mesh away from camera.
  
  float zDist = pos.z + 10.0; // Offset to start curve slightly ahead
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
  // Scroll texture
  vec2 uv = vUv;
  uv.y -= uTime * (uSpeed * 5.0 + 0.5);
  
  vec4 color = texture2D(uMap, uv);
  
  // Fog effect in shader for smoother blend
  float fogDensity = 0.02;
  float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vZ * vZ);
  
  gl_FragColor = mix(color, vec4(0.05, 0.05, 0.05, 1.0), clamp(fogFactor, 0.0, 1.0));
}
`;

const RoadSegments = ({ speed, curvature }: { speed: number, curvature: number }) => {
  const materialRef = useRef<ShaderMaterial>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw lane lines
    ctx.fillStyle = '#fff';
    ctx.fillRect(250, 0, 12, 256); 
    ctx.fillRect(250, 300, 12, 256); 
    
    // Draw side lines
    ctx.fillStyle = '#f0db26'; 
    ctx.fillRect(10, 0, 10, 512);
    ctx.fillRect(492, 0, 10, 512);

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
      // Smoothly interpolate curvature
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[12, 200, 20, 200]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={roadVertexShader}
        fragmentShader={roadFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

const SpeedParticles = ({ speed, curvature }: { speed: number, curvature: number }) => {
    const count = 300;
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);
    
    const particles = useMemo(() => {
        const temp = [];
        for(let i=0; i<count; i++) {
            temp.push({
                x: (Math.random() - 0.5) * 40,
                y: Math.random() * 8,
                z: (Math.random() - 0.5) * 100 - 50,
                speedOffset: Math.random() + 0.5,
                initialX: (Math.random() - 0.5) * 40
            });
        }
        return temp;
    }, []);

    useFrame((state, delta) => {
        if(!meshRef.current) return;
        
        particles.forEach((p, i) => {
            // Move forward
            p.z += (speed * 40 + 15) * delta * p.speedOffset;
            
            // Apply curve to particles
            // x = x_orig + curve * z^2
            // Since particles come towards us (positive Z direction roughly relative to spawn),
            // We need to reverse logic: particles at far distance (negative Z) should be shifted.
            const dist = p.z - 10; // offset
            // When curvature is positive (right turn), road bends right (positive X).
            // Particles should appear to follow that bend.
            // Simplified: Shift X based on Z
            
            const curveShift = curvature * 0.002 * (p.z - 20) * (p.z - 20);
            
            // Check bounds and reset
            if (p.z > 20) {
                p.z = -150;
                p.x = (Math.random() - 0.5) * 40; 
                p.initialX = p.x;
            }

            // If we are far away (negative Z), shift X
            let finalX = p.initialX;
            if (p.z < 0) {
                 finalX += curveShift;
            }

            dummy.position.set(finalX, p.y, p.z);
            // Stretch based on speed
            const scaleZ = 1 + speed * 20;
            dummy.scale.set(0.05, 0.05, scaleZ);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="cyan" transparent opacity={0.3} />
        </instancedMesh>
    );
}

const Scenery = ({ curvature }: { curvature: number }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if(groupRef.current) {
             // Rotate background slightly to enhance turn feeling
             groupRef.current.rotation.y = THREE.MathUtils.lerp(
                groupRef.current.rotation.y,
                -curvature * 0.2, // Counter-rotate scenery slightly
                delta
             );
        }
    });

    return (
        <group ref={groupRef}>
             {/* Distant Mountains - placed far enough to not need heavy curving */}
             <mesh position={[-60, -5, -80]}>
                <coneGeometry args={[50, 60, 4]} />
                <meshStandardMaterial color="#0f0518" />
             </mesh>
             <mesh position={[-30, -5, -120]}>
                <coneGeometry args={[60, 90, 4]} />
                <meshStandardMaterial color="#0a0210" />
             </mesh>
             
             <mesh position={[60, -5, -70]}>
                <coneGeometry args={[40, 70, 4]} />
                <meshStandardMaterial color="#0f0518" />
             </mesh>
             <mesh position={[20, -5, -130]}>
                <coneGeometry args={[70, 100, 4]} />
                <meshStandardMaterial color="#0a0210" />
             </mesh>
             
             {/* Moon/Sun */}
             <mesh position={[0, 40, -150]}>
                 <circleGeometry args={[20, 32]} />
                 <meshBasicMaterial color="#ffcc00" fog={false} />
             </mesh>

             {/* Ground Plane */}
             <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1, 0]}>
                 <planeGeometry args={[1000, 1000]} />
                 <meshStandardMaterial color="#050505" />
             </mesh>
        </group>
    )
}

export const World: React.FC<WorldProps> = ({ speed, curvature }) => {
  return (
    <group>
      <RoadSegments speed={speed} curvature={curvature} />
      <SpeedParticles speed={speed} curvature={curvature} />
      <Scenery curvature={curvature} />
      <hemisphereLight intensity={0.5} groundColor="#000000" skyColor="#111122" />
      <directionalLight position={[10, 20, 5]} intensity={1.5} castShadow color="#ffaa00"/>
      <fog attach="fog" args={['#050505', 20, 150]} />
    </group>
  );
};
