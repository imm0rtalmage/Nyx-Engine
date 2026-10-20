import React, { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Scene3DConfig, Prop3DItem } from "../types";
import { 
  createProceduralGroundTexture, 
  createCompositeProp, 
  createParticleSystem, 
  disposeThreeScene 
} from "../utils/threeDioramaEngine";

interface Scene3DDioramaProps {
  config: Scene3DConfig;
  selectedPropId?: string | null;
  onSelectProp?: (propId: string | null) => void;
  onPlacePropAtPosition?: (position: [number, number, number]) => void;
  isPlacingActive?: boolean;
}

export const Scene3DDiorama: React.FC<Scene3DDioramaProps> = ({
  config,
  selectedPropId,
  onSelectProp,
  onPlacePropAtPosition,
  isPlacingActive = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Three.js instance refs to avoid recreation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const propsGroupRef = useRef<THREE.Group | null>(null);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const particleSystemRef = useRef<{ points: THREE.Points; update: (d: number) => void } | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());

  // Camera lerp animation target
  const targetCameraPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  // Raycaster for object picking & placement
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Set camera to preset with smooth animation
  const animateCameraToPreset = useCallback((preset: "isometric" | "cinematic" | "topdown" | "orbit") => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    if (preset === "isometric") {
      targetCameraPosRef.current = new THREE.Vector3(9.5, 9.5, 9.5);
      targetLookAtRef.current = new THREE.Vector3(0, 0.8, 0);
    } else if (preset === "cinematic") {
      targetCameraPosRef.current = new THREE.Vector3(0, 2.2, 6.8);
      targetLookAtRef.current = new THREE.Vector3(0, 1.2, 0);
    } else if (preset === "topdown") {
      targetCameraPosRef.current = new THREE.Vector3(0, 16, 0.01);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    }
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(config.fogColor || "#0f0c18");
    scene.fog = new THREE.FogExp2(config.fogColor || "#0f0c18", config.fogDensity || 0.025);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(9.5, 9.5, 9.5);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // 4. RoomEnvironment for realistic PBR reflections
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch (e) {
      console.warn("RoomEnvironment PMREM not generated, proceeding with dynamic light rig:", e);
    }

    // 5. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't go below ground
    controls.minDistance = 3;
    controls.maxDistance = 30;
    controls.target.set(0, 0.8, 0);
    controlsRef.current = controls;

    // 6. Diorama Ground Slab (12x12 styled base)
    const slabGeo = new THREE.BoxGeometry(13, 0.6, 13);
    const groundTex = createProceduralGroundTexture(config.groundTexture || "wood");
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.75,
      metalness: 0.1
    });
    const slab = new THREE.Mesh(slabGeo, groundMat);
    slab.position.set(0, -0.3, 0);
    slab.receiveShadow = true;
    scene.add(slab);
    groundMeshRef.current = slab;

    // Slab pedestal rim (beveled dark stone frame)
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x090c15,
      roughness: 0.9,
      metalness: 0.2
    });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.4, 13.6), rimMat);
    rim.position.set(0, -0.7, 0);
    scene.add(rim);

    // 7. Dynamic Lighting Rig
    const ambientLight = new THREE.AmbientLight(config.ambientColor || "#2a2238", config.ambientIntensity ?? 0.85);
    ambientLight.name = "ambient-light";
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(config.keyLightColor || "#ff9944", config.keyLightIntensity ?? 2.2);
    keyLight.position.set(7, 11, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -9;
    keyLight.shadow.camera.right = 9;
    keyLight.shadow.camera.top = 9;
    keyLight.shadow.camera.bottom = -9;
    keyLight.name = "key-light";
    scene.add(keyLight);

    // Cool fill light
    const fillLight = new THREE.DirectionalLight(0x4f46e5, 0.65);
    fillLight.position.set(-6, 7, -6);
    fillLight.name = "fill-light";
    scene.add(fillLight);

    // Dramatic rim light
    const rimLight = new THREE.DirectionalLight(0xec4899, 0.5);
    rimLight.position.set(0, 5, -8);
    rimLight.name = "rim-light";
    scene.add(rimLight);

    // 8. Props Container Group
    const propsGroup = new THREE.Group();
    propsGroup.name = "props-container";
    scene.add(propsGroup);
    propsGroupRef.current = propsGroup;

    // 9. Particle System
    const particleSys = createParticleSystem(config.particles || "embers");
    if (particleSys) {
      scene.add(particleSys.points);
      particleSystemRef.current = particleSys;
    }

    // 10. Animation Render Loop
    let running = true;
    const animate = () => {
      if (!running) return;
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      // Smooth camera lerp animation
      if (targetCameraPosRef.current && cameraRef.current && controlsRef.current) {
        cameraRef.current.position.lerp(targetCameraPosRef.current, 0.08);
        controlsRef.current.target.lerp(targetLookAtRef.current || new THREE.Vector3(0, 0.8, 0), 0.08);

        if (cameraRef.current.position.distanceTo(targetCameraPosRef.current) < 0.05) {
          targetCameraPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      // Update particles
      if (particleSystemRef.current) {
        particleSystemRef.current.update(delta);
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 11. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth > 0 && newHeight > 0) {
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(newWidth, newHeight);
      }
    });
    resizeObserver.observe(container);

    // Context loss recovery
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn("WebGL Context Lost on 3D Diorama.");
    };
    const handleContextRestored = () => {
      console.log("WebGL Context Restored on 3D Diorama.");
    };
    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    return () => {
      running = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      disposeThreeScene(scene, renderer);
    };
  }, []);

  // Update atmosphere, lighting, and ground texture when config changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Update background & fog
    scene.background = new THREE.Color(config.fogColor || "#0f0c18");
    if (scene.fog) {
      scene.fog.color = new THREE.Color(config.fogColor || "#0f0c18");
      (scene.fog as THREE.FogExp2).density = config.fogDensity || 0.025;
    }

    // Update lights
    const ambient = scene.getObjectByName("ambient-light") as THREE.AmbientLight;
    if (ambient) {
      ambient.color = new THREE.Color(config.ambientColor || "#2a2238");
      ambient.intensity = config.ambientIntensity ?? 0.85;
    }

    const keyLight = scene.getObjectByName("key-light") as THREE.DirectionalLight;
    if (keyLight) {
      keyLight.color = new THREE.Color(config.keyLightColor || "#ff9944");
      keyLight.intensity = config.keyLightIntensity ?? 2.2;
    }

    // Update ground texture
    if (groundMeshRef.current) {
      const newTex = createProceduralGroundTexture(config.groundTexture || "wood");
      const mat = groundMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat.map) mat.map.dispose();
      mat.map = newTex;
      mat.needsUpdate = true;
    }

    // Update particles if changed
    if (particleSystemRef.current) {
      scene.remove(particleSystemRef.current.points);
      particleSystemRef.current.points.geometry.dispose();
      (particleSystemRef.current.points.material as THREE.Material).dispose();
      particleSystemRef.current = null;
    }
    const newParticles = createParticleSystem(config.particles || "embers");
    if (newParticles) {
      scene.add(newParticles.points);
      particleSystemRef.current = newParticles;
    }
  }, [config.fogColor, config.fogDensity, config.ambientColor, config.ambientIntensity, config.keyLightColor, config.keyLightIntensity, config.groundTexture, config.particles]);

  // Synchronize Props in Scene
  useEffect(() => {
    const propsGroup = propsGroupRef.current;
    if (!propsGroup) return;

    // Clear old props
    while (propsGroup.children.length > 0) {
      const child = propsGroup.children[0];
      propsGroup.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        }
      });
    }

    // Instantiate and add new props
    config.props.forEach((p: Prop3DItem) => {
      const propGroup = createCompositeProp(p.type, p.tint);
      propGroup.position.set(p.position[0], p.position[1], p.position[2]);
      propGroup.rotation.set(p.rotation[0], p.rotation[1], p.rotation[2]);
      propGroup.scale.set(p.scale[0], p.scale[1], p.scale[2]);
      propGroup.userData = { propId: p.id, type: p.type, name: p.name };

      // Highlight selected prop with subtle bounding selection ring
      if (selectedPropId && p.id === selectedPropId) {
        const selRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.2, 0.04, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        selRing.rotation.x = Math.PI / 2;
        selRing.position.set(0, 0.06, 0);
        selRing.name = "selection-ring";
        propGroup.add(selRing);
      }

      propsGroup.add(propGroup);
    });
  }, [config.props, selectedPropId]);

  // Camera preset animation
  useEffect(() => {
    if (config.cameraPreset) {
      animateCameraToPreset(config.cameraPreset);
    }
  }, [config.cameraPreset, animateCameraToPreset]);

  // Pointer Click Handler (Raycasting for Object Selection & Grid Placement)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!canvas || !camera || !scene) return;

    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    // 1. If in placing mode, check intersection with the ground slab
    if (isPlacingActive && groundMeshRef.current) {
      const groundHits = raycasterRef.current.intersectObject(groundMeshRef.current);
      if (groundHits.length > 0) {
        const pt = groundHits[0].point;
        // Snap to clean 0.5 coordinate increments
        const snapX = Math.round(pt.x * 2) / 2;
        const snapZ = Math.round(pt.z * 2) / 2;
        onPlacePropAtPosition?.([snapX, 0, snapZ]);
        return;
      }
    }

    // 2. Otherwise test intersection with props
    if (propsGroupRef.current) {
      const hits = raycasterRef.current.intersectObjects(propsGroupRef.current.children, true);
      if (hits.length > 0) {
        // Find top-level prop group in hierarchy
        let target: THREE.Object3D | null = hits[0].object;
        while (target && target.parent !== propsGroupRef.current) {
          target = target.parent;
        }
        if (target && target.userData?.propId) {
          onSelectProp?.(target.userData.propId);
          return;
        }
      }
    }

    // If clicking into empty space, deselect
    onSelectProp?.(null);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[300px] select-none bg-slate-950 overflow-hidden">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`w-full h-full block ${isPlacingActive ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
      />
    </div>
  );
};
export default Scene3DDiorama;
