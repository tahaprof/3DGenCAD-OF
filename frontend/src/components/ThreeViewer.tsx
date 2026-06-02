import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// A placeholder procedural geometry to represent a generated 3D model
function PlaceholderModel() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <cylinderGeometry args={[1, 1, 3, 32]} />
      <meshStandardMaterial color="#3b82f6" metalness={0.5} roughness={0.2} />

      {/* Add some features to make it look industrial */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.2, 0.2, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.1} />
      </mesh>

      <mesh position={[0, -1.5, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.2, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.1} />
      </mesh>
    </mesh>
  );
}

function STLModel({ url }: { url: string }) {
  const geom = useLoader(STLLoader, url);

  useEffect(() => {
    if (geom) {
      geom.computeVertexNormals();
      geom.center();
    }
  }, [geom]);

  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <meshStandardMaterial color="#3b82f6" metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

interface ThreeViewerProps {
  url?: string;
}

export default function ThreeViewer({ url }: ThreeViewerProps) {
  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 relative rounded-xl overflow-hidden cursor-move">
      <Canvas shadows camera={{ position: [4, 3, 4], fov: 50 }}>
        <color attach="background" args={['#f8fafc']} />

        <Stage intensity={0.5} environment="city" shadows="contact" adjustCamera={true}>
          <Suspense fallback={<PlaceholderModel />}>
            {url ? <STLModel url={url} /> : <PlaceholderModel />}
          </Suspense>
        </Stage>

        <Grid
          infiniteGrid
          fadeDistance={20}
          sectionColor="#94a3b8"
          cellColor="#cbd5e1"
          position={[0, -1.6, 0]}
        />

        <OrbitControls
          makeDefault
          autoRotate={!url}
          autoRotateSpeed={0.5}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      <div className="absolute bottom-3 left-3 bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 shadow-sm pointer-events-none">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}
