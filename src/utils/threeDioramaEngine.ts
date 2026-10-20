import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Prop3DItem, Scene3DConfig } from "../types";

// ==========================================
// PROCEDURAL TEXTURE GENERATION (Zero 404s)
// ==========================================
export function createProceduralGroundTexture(type: "stone" | "wood" | "grid" | "dirt" | "metal"): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  if (type === "wood") {
    // Warm tavern floorboards
    ctx.fillStyle = "#1e140d";
    ctx.fillRect(0, 0, size, size);
    const plankHeight = 64;
    for (let y = 0; y < size; y += plankHeight) {
      ctx.fillStyle = (y / plankHeight) % 2 === 0 ? "#2b1c12" : "#24170f";
      ctx.fillRect(0, y, size, plankHeight - 2);
      // Wood grain lines
      ctx.strokeStyle = "rgba(10, 6, 4, 0.45)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const gy = y + 8 + i * 9;
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(size * 0.3, gy + Math.sin(i) * 3, size * 0.7, gy - Math.cos(i) * 3, size, gy);
        ctx.stroke();
      }
      // Plank nail accents
      ctx.fillStyle = "#110b06";
      ctx.beginPath();
      ctx.arc(16, y + plankHeight / 2, 2.5, 0, Math.PI * 2);
      ctx.arc(size - 16, y + plankHeight / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === "grid") {
    // Cyberpunk holographic grid
    ctx.fillStyle = "#060913";
    ctx.fillRect(0, 0, size, size);
    const step = 32;
    ctx.strokeStyle = "rgba(79, 70, 229, 0.25)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    // Major glowing gridlines
    ctx.strokeStyle = "rgba(168, 85, 247, 0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= size; i += step * 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  } else if (type === "metal") {
    // Industrial steel deck
    ctx.fillStyle = "#151821";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    for (let i = 0; i < 200; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 8 + 2, 1);
    }
    // Rivets
    ctx.fillStyle = "#334155";
    for (let x = 16; x < size; x += 64) {
      for (let y = 16; y < size; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (type === "dirt") {
    // Earth / forest floor
    ctx.fillStyle = "#151b14";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1500; i++) {
      const g = Math.random() * 40 + 20;
      ctx.fillStyle = `rgb(${g * 0.7}, ${g}, ${g * 0.5})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }
  } else {
    // Stone flagstone default
    ctx.fillStyle = "#1e222d";
    ctx.fillRect(0, 0, size, size);
    const tileSize = 64;
    ctx.strokeStyle = "#0d1017";
    ctx.lineWidth = 3;
    for (let x = 0; x < size; x += tileSize) {
      for (let y = 0; y < size; y += tileSize) {
        const offset = ((y / tileSize) % 2) * (tileSize / 2);
        const actualX = (x + offset) % size;
        const shade = Math.floor(Math.random() * 25 - 12);
        ctx.fillStyle = `rgb(${34 + shade}, ${38 + shade}, ${48 + shade})`;
        ctx.fillRect(actualX + 2, y + 2, tileSize - 4, tileSize - 4);
        ctx.strokeRect(actualX, y, tileSize, tileSize);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ==========================================
// COMPOSITE PROCEDURAL 3D PROP BUILDERS
// (3-12 parts per subject as per Three.js skill)
// ==========================================
export function createCompositeProp(type: string, tintColor?: string): THREE.Group {
  const group = new THREE.Group();
  group.name = `prop-${type}`;

  const defaultStoneMat = new THREE.MeshStandardMaterial({
    color: tintColor ? new THREE.Color(tintColor) : 0x475569,
    roughness: 0.85,
    metalness: 0.1
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.15
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: tintColor ? new THREE.Color(tintColor) : 0x5a3825,
    roughness: 0.75,
    metalness: 0.05
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.85
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.25,
    metalness: 0.9
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: tintColor ? new THREE.Color(tintColor) : 0xa855f7,
    emissive: tintColor ? new THREE.Color(tintColor) : 0xa855f7,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.5
  });

  if (type === "stone_arch") {
    // Part 1 & 2: Plinth bases
    const plinthGeo = new THREE.BoxGeometry(0.9, 0.4, 0.9);
    const leftPlinth = new THREE.Mesh(plinthGeo, darkStoneMat);
    leftPlinth.position.set(-1.6, 0.2, 0);
    const rightPlinth = new THREE.Mesh(plinthGeo, darkStoneMat);
    rightPlinth.position.set(1.6, 0.2, 0);
    group.add(leftPlinth, rightPlinth);

    // Part 3 & 4: Upright columns
    const colGeo = new THREE.BoxGeometry(0.7, 3.2, 0.7);
    const leftCol = new THREE.Mesh(colGeo, defaultStoneMat);
    leftCol.position.set(-1.6, 2.0, 0);
    const rightCol = new THREE.Mesh(colGeo, defaultStoneMat);
    rightCol.position.set(1.6, 2.0, 0);
    group.add(leftCol, rightCol);

    // Part 5: Arch lintel
    const lintelGeo = new THREE.BoxGeometry(4.2, 0.6, 0.8);
    const lintel = new THREE.Mesh(lintelGeo, defaultStoneMat);
    lintel.position.set(0, 3.9, 0);
    group.add(lintel);

    // Part 6: Keystone crest
    const keystoneGeo = new THREE.ConeGeometry(0.4, 0.6, 4);
    const keystone = new THREE.Mesh(keystoneGeo, goldMat);
    keystone.position.set(0, 4.25, 0.3);
    keystone.rotation.z = Math.PI;
    group.add(keystone);

    // Part 7: Arch inner crown (accent)
    const crownGeo = new THREE.BoxGeometry(3.4, 0.2, 0.7);
    const crown = new THREE.Mesh(crownGeo, darkStoneMat);
    crown.position.set(0, 3.55, 0);
    group.add(crown);
  } else if (type === "pillar_column") {
    // 5-part Roman/Gothic pillar
    // 1. Plinth base
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.2), darkStoneMat);
    base.position.set(0, 0.175, 0);
    // 2. Pedestal collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.4, 16), defaultStoneMat);
    collar.position.set(0, 0.55, 0);
    // 3. Fluted shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 3.2, 16), defaultStoneMat);
    shaft.position.set(0, 2.35, 0);
    // 4. Carved capital
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.46, 0.5, 16), goldMat);
    capital.position.set(0, 4.2, 0);
    // 5. Abacus top cap
    const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 1.3), darkStoneMat);
    abacus.position.set(0, 4.6, 0);
    group.add(base, collar, shaft, capital, abacus);
  } else if (type === "tavern_table") {
    // 6-part Tavern Table with benches and tankards
    // 1. Tabletop
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 1.2), woodMat);
    top.position.set(0, 1.0, 0);
    // 2-5: Four table legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.92, 8);
    const offsets = [
      [-1.0, -0.45], [1.0, -0.45],
      [-1.0, 0.45], [1.0, 0.45]
    ];
    offsets.forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(x, 0.46, z);
      group.add(leg);
    });
    // 6. Tankards
    const tankard1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.22, 10), metalMat);
    tankard1.position.set(-0.5, 1.19, 0.2);
    const tankard2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.22, 10), metalMat);
    tankard2.position.set(0.6, 1.19, -0.2);
    // 7. Table candle
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
    candle.position.set(0, 1.2, 0);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    flame.position.set(0, 1.35, 0);

    group.add(top, tankard1, tankard2, candle, flame);
  } else if (type === "fire_brazier") {
    // 6-part Iron Brazier with glowing coals and local point light
    // 1-3. Tripod legs
    const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.2, 8);
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3;
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(Math.cos(angle) * 0.45, 0.55, Math.sin(angle) * 0.45);
      leg.rotation.z = Math.cos(angle) * 0.2;
      leg.rotation.x = Math.sin(angle) * 0.2;
      group.add(leg);
    }
    // 4. Basin bowl
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.35, 0.45, 16), metalMat);
    bowl.position.set(0, 1.05, 0);
    // 5. Coals
    const coalMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff4400,
      emissiveIntensity: 2.2,
      roughness: 0.9
    });
    const coals = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), coalMat);
    coals.position.set(0, 1.15, 0);
    coals.scale.set(1, 0.3, 1);
    // 6. Local Brazier Point Light
    const brazierLight = new THREE.PointLight(0xff6600, 2.5, 7, 1.5);
    brazierLight.position.set(0, 1.4, 0);
    brazierLight.castShadow = true;
    brazierLight.shadow.bias = -0.001;

    group.add(bowl, coals, brazierLight);
  } else if (type === "cyber_terminal") {
    // 5-part Tech Console
    // 1. Base pedestal
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 0.8), darkStoneMat);
    base.position.set(0, 0.075, 0);
    // 2. Main chassis
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.6), metalMat);
    body.position.set(0, 0.7, 0);
    // 3. Slanted keyboard tray
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.4), darkStoneMat);
    tray.position.set(0, 1.0, 0.25);
    tray.rotation.x = 0.2;
    // 4. Hologram screen
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.04), glowMat);
    screen.position.set(0, 1.45, 0.05);
    screen.rotation.x = -0.15;
    // 5. Status power conduit
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), glowMat);
    conduit.position.set(0.35, 0.65, -0.28);
    group.add(base, body, tray, screen, conduit);
  } else if (type === "ancient_monolith") {
    // 4-part Runed Monolith
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.4, 8), darkStoneMat);
    base.position.set(0, 0.2, 0);
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 4.2, 6), defaultStoneMat);
    obelisk.position.set(0, 2.5, 0);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 6), goldMat);
    cap.position.set(0, 5.0, 0);
    // Runic floating ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.05, 8, 24), glowMat);
    ring.position.set(0, 3.2, 0);
    ring.rotation.x = Math.PI / 2;
    group.add(base, obelisk, cap, ring);
  } else if (type === "chest_crate") {
    // 5-part Reinforced Treasure Chest
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.7), woodMat);
    box.position.set(0, 0.3, 0);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 12, 1, false, 0, Math.PI), woodMat);
    lid.position.set(0, 0.6, 0);
    lid.rotation.z = Math.PI / 2;
    // Iron reinforcement bands
    const bandMat = metalMat;
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.74), bandMat);
    band1.position.set(-0.35, 0.32, 0);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.74), bandMat);
    band2.position.set(0.35, 0.32, 0);
    // Lock
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), goldMat);
    lock.position.set(0, 0.45, 0.37);
    group.add(box, lid, band1, band2, lock);
  } else {
    // Default Character Pawn / Miniature Token
    // 1. Plinth token base with colored player ring
    const tokenBase = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.18, 24), goldMat);
    tokenBase.position.set(0, 0.09, 0);
    // 2. Token body column
    const tokenBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 1.4, 16), glowMat);
    tokenBody.position.set(0, 0.88, 0);
    // 3. Token hero sphere
    const tokenHead = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), metalMat);
    tokenHead.position.set(0, 1.85, 0);
    // 4. Halo ring / crown
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.04, 8, 24), goldMat);
    halo.position.set(0, 2.15, 0);
    halo.rotation.x = Math.PI / 2;
    group.add(tokenBase, tokenBody, tokenHead, halo);
  }

  // Cast and receive shadows across all children
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

// ==========================================
// SCENE PARTICLES GENERATOR
// ==========================================
export function createParticleSystem(type: "none" | "dust" | "embers" | "rain" | "spores"): { points: THREE.Points; update: (delta: number) => void } | null {
  if (type === "none") return null;

  const count = type === "rain" ? 600 : 250;
  const positions = new Float32Array(count * 3);
  const velocities: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 1] = Math.random() * 8 + 0.2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18;

    if (type === "embers") {
      velocities.push({
        x: (Math.random() - 0.5) * 0.4,
        y: Math.random() * 0.8 + 0.3,
        z: (Math.random() - 0.5) * 0.4
      });
    } else if (type === "rain") {
      velocities.push({
        x: -0.2,
        y: -(Math.random() * 6 + 7),
        z: 0.1
      });
    } else {
      // Dust / spores drifting
      velocities.push({
        x: (Math.random() - 0.5) * 0.2,
        y: (Math.random() - 0.5) * 0.15,
        z: (Math.random() - 0.5) * 0.2
      });
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  let color = 0xa855f7;
  let size = 0.08;
  if (type === "embers") {
    color = 0xff6600;
    size = 0.12;
  } else if (type === "rain") {
    color = 0x60a5fa;
    size = 0.06;
  } else if (type === "dust") {
    color = 0xe2e8f0;
    size = 0.05;
  } else if (type === "spores") {
    color = 0x34d399;
    size = 0.09;
  }

  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: type === "rain" ? 0.7 : 0.85,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);

  const update = (delta: number) => {
    const pos = points.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const v = velocities[i];
      pos[i * 3] += v.x * delta;
      pos[i * 3 + 1] += v.y * delta;
      pos[i * 3 + 2] += v.z * delta;

      // Wrap around bounds
      if (type === "rain" && pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 8;
      } else if (type === "embers" && pos[i * 3 + 1] > 8) {
        pos[i * 3 + 1] = 0.2;
        pos[i * 3] = (Math.random() - 0.5) * 10;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      } else if (pos[i * 3 + 1] < 0 || pos[i * 3 + 1] > 9) {
        pos[i * 3 + 1] = Math.random() * 8 + 0.2;
      }
    }
    points.geometry.attributes.position.needsUpdate = true;
  };

  return { points, update };
}

// ==========================================
// CLEAN DISPOSAL HELPER (Prevent GPU Leaks)
// ==========================================
export function disposeThreeScene(scene: THREE.Scene, renderer?: THREE.WebGLRenderer) {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
    if (obj instanceof THREE.Light && obj.dispose) {
      obj.dispose();
    }
  });

  if (renderer) {
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
}
