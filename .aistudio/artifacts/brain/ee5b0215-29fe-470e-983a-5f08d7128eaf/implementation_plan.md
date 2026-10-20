# 3D Narrative Diorama & Stage Engine (Three.js)

An interactive, real-time 3D diorama and stage visualizer integrated directly alongside the campaign adventure chat. The engine translates the active story scene and atmosphere into a stylized 3D environment with physically based lighting, fog, and particle effects, while offering interactive placeable props, lights, and camera controls.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural and UX choices below have been aligned with your selections from Phase 1. Review the key decisions before execution begins:

- **Confirmed Visualization**: Stylized atmospheric 3D diorama featuring physically based rendering (PBR), dynamic key/fill/rim lighting, volumetric floor fog, and environmental particles.
- **Confirmed Generation & Control**: Dual-mode engine supporting:
  1. *AI Scene Interpretation*: Automatic semantic extraction of setting, architecture, mood, and lighting from the active narrative turn or prompt.
  2. *Customizable 3D Stage*: Interactive toolbar to add, place, rotate, and customize props (e.g. ancient arches, tavern tables, lanterns, cyber-consoles, stone monoliths) and adjust lighting/mood presets.
- **Confirmed Interface Layout**: Responsive, collapsible split-view workspace pane positioned side-by-side with the adventure log, with quick toggle and camera presets.
- **Zero Asset Dependencies**: In accordance with Three.js production directives, all 3D geometries, materials, normal maps, and procedural surface textures are generated algorithmically in code—ensuring zero broken links, instant load times, and offline resilience.

---

### 1. Overview & Core Concept

- **What It Does**: Renders an atmospheric 3D diorama representing the current narrative scene. As players converse with Nyx or progress the plot, the 3D diorama adapts its lighting, weather, architecture, and environmental elements. Users can freely orbit, pan, zoom, tweak stage elements, and inspect characters/props in 3D space.
- **Target Audience & Context**: Tabletop roleplayers, solo writers, and campaign game masters who want immediate visual immersion and spatial grounding alongside their written narrative.
- **Key Value**: Bridges the gap between pure text roleplay and tabletop battlemap visualizers, providing immediate atmospheric immersion without needing external 3D software or heavy asset downloads.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Scene Revelation & Split View**: A dedicated "3D Stage" toggle button in the adventure log toolbar expands a side-by-side split view. The 3D canvas smoothly mounts with OrbitControls and cinematic camera reveal.
2. **AI Scene Extraction**: Clicking "Sync Scene" analyzes the latest narrative turn (or full scene context) using the server AI helper to configure atmospheric parameters (e.g., "Grimdark Tavern", "Neon Rain Cyber-Alley", "Ancient Sunken Ruins").
3. **Interactive Stage Customization**:
   - *Lighting & Atmosphere Controls*: Sliders and presets for time of day, fog density, light color temperature, ambient intensity, and particle effects (embers, dust motes, rain, spores).
   - *Placeable Props & Tokens*: Palette of procedural 3D modular structures (walls, archways, pillars, furniture, braziers, tech terminals, character tokens) that can be clicked to place onto the isometric ground plane.
   - *Selection & Gizmo Manipulation*: Clicking an placed object selects it, revealing rotation, scale, tint, and removal options.
4. **Cinematic Views**: Quick camera preset buttons (Isometric Diorama, Cinematic Eye-Level, Top-Down Tactical, Free Orbit) with smooth lerped transitions.

#### Visual Identity & Theme
- **Aesthetic Direction**: Moody, tabletop diorama aesthetic with dark obsidian borders (`bg-slate-950/80`), subtle glow accents, and frosted dark glass HUD overlays (`bg-black/50 backdrop-blur-md border border-white/10`).
- **Lighting Model**: Studio 3-point lighting setup (warm key light with soft shadow mapping, cool fill light, and sharp atmospheric rim light) combined with procedural `RoomEnvironment` reflections for rich material depth.
- **Typography**: Clean monospace telemetry and coordinate labels (`font-mono text-[11px]`) paired with the active campaign theme fonts for titles and controls.
- **Semantic DOM Overlays**: All interactive buttons, camera pills, inspector drawers, and preset selectors are rendered as accessible, crisp HTML/Tailwind DOM elements layered over the WebGL canvas, keeping rendering decoupled from UI logic.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native Three.js with Canvas Ref vs Heavy 3D Engines**
  - *Chosen Approach*: Lightweight Three.js (`three` + `@types/three`) mounted via React `useRef` and a modular Scene Controller.
  - *Why*: Ultra-fast bundle footprint, zero React 19 reconciliation friction, standard WebGL performance, and precise lifecycle disposal (`geometry.dispose()`, `material.dispose()`) to prevent GPU leaks.
  - *Alternatives Considered*: Babylon.js or heavy glTF downloads were avoided to eliminate network latency and external asset failure points.

- **Decision 2: Procedural Multi-Part Geometry vs External Models**
  - *Chosen Approach*: Procedurally generated composite models (assembled `THREE.Group` meshes with multi-part silhouettes, bevels, and algorithmic surface materials).
  - *Why*: 100% self-contained, instant load times, customizable color schemes, and immunity to missing asset errors.

- **Decision 3: Dedicated Server Endpoint for Scene Layout Parsing (`/api/parse-scene-3d`)**
  - *Chosen Approach*: Lightweight server proxy endpoint that parses prose into structured 3D parameters (`environmentType`, `timeOfDay`, `fogDensity`, `primaryLightColor`, `suggestedProps`).
  - *Why*: Keeps client bundle free of prompt plumbing while leveraging existing Gemini API credentials securely on the server.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          AdventureChat Layout                          │
│                                                                        │
│   ┌───────────────────────────────┐  ┌──────────────────────────────┐  │
│   │      Narrative Chat Log       │  │    3D Scene Diorama Canvas   │  │
│   │  - User Actions               │  │  - WebGLRenderer (Three.js)  │  │
│   │  - Nyx Storyteller Prose      │  │  - OrbitControls             │  │
│   │  - In-Context Badges          │  │  - Dynamic Lighting & Fog    │  │
│   │  - Input Box & Regen          │  │  - Procedural Props & Ground │  │
│   └──────────────┬────────────────┘  └──────────────▲───────────────┘  │
│                  │                                  │                  │
│                  │ (Latest Narrative Turn)          │ (Apply 3D State) │
│                  ▼                                  │                  │
│   ┌─────────────────────────────────────────────────┴───────────────┐  │
│   │                 Scene 3D Controller & HUD                       │  │
│   │  - AI Scene Extractor (/api/parse-scene-3d)                     │  │
│   │  - Procedural Prop Catalog (Fantasy, Sci-Fi, Gothic, Cyber)     │  │
│   │  - Lighting & Atmosphere Manager                                │  │
│   │  - Camera Preset Animator (Lerp)                                │  │
│   └─────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data Model (`Scene3DConfig`)
```typescript
interface Scene3DConfig {
  preset: "tavern" | "dungeon" | "cyberpunk" | "forest" | "ruins" | "interior" | "custom";
  groundTexture: "stone" | "wood" | "grid" | "dirt" | "metal";
  ambientColor: string;
  keyLightColor: string;
  keyLightIntensity: number;
  fogColor: string;
  fogDensity: number;
  particles: "none" | "dust" | "embers" | "rain" | "spores";
  props: Array<{
    id: string;
    type: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    tint?: string;
  }>;
}
```

#### Component Plan
1. `src/components/Scene3DDiorama.tsx`: Core Three.js canvas container, render loop, WebGL context loss handling, resize observer, and raycast object selection.
2. `src/utils/threeDioramaEngine.ts`: Modular Three.js scene builder, procedural geometry assemblers (walls, archways, braziers, tables, pillars), lighting rigs, and particle systems.
3. `src/components/Scene3DToolbar.tsx`: Floating HUD with camera presets (Isometric, Front, Top), mood switcher, prop placer drawer, and AI Sync button.
4. `server.ts` (`/api/parse-scene-3d`): Structured scene extraction endpoint mapping narrative descriptions to `Scene3DConfig` parameters.
