import React, { useState } from "react";
import { Scene3DConfig, Prop3DItem } from "../types";
import { 
  Box, Eye, Sparkles, Plus, Trash2, RotateCw, RotateCcw, 
  Maximize2, Minimize2, X, Sliders, Sun, CloudRain, Flame, 
  Compass, RefreshCw, Wand2, Check, Palette
} from "lucide-react";

export interface Scene3DToolbarProps {
  config: Scene3DConfig;
  onChangeConfig: (newConfig: Scene3DConfig) => void;
  selectedPropId: string | null;
  onSelectProp: (propId: string | null) => void;
  isPlacingActive: boolean;
  onTogglePlacingPropType: (propType: string | null) => void;
  selectedPlacingType: string | null;
  onSyncSceneWithAI: () => void;
  isSyncingAI: boolean;
  onCloseSplitView: () => void;
  isExpandedFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const PROP_CATALOG = [
  { type: "stone_arch", label: "Stone Arch", category: "Architecture", icon: "🏛️" },
  { type: "pillar_column", label: "Pillar Column", category: "Architecture", icon: "🏛️" },
  { type: "tavern_table", label: "Tavern Table", category: "Furniture", icon: "🪵" },
  { type: "chest_crate", label: "Treasure Chest", category: "Furniture", icon: "📦" },
  { type: "fire_brazier", label: "Iron Brazier", category: "Lighting", icon: "🔥" },
  { type: "crystal_spire", label: "Crystal Spire", category: "Magic", icon: "💎" },
  { type: "cyber_terminal", label: "Cyber Console", category: "Sci-Fi", icon: "💻" },
  { type: "ancient_monolith", label: "Runic Monolith", category: "Magic", icon: "🗿" },
  { type: "character_token", label: "Hero Pawn", category: "Tokens", icon: "♟️" }
];

const PRESET_ATMOSPHERES: Array<{
  id: Scene3DConfig["preset"];
  label: string;
  ground: Scene3DConfig["groundTexture"];
  ambientColor: string;
  keyLightColor: string;
  fogColor: string;
  fogDensity: number;
  particles: Scene3DConfig["particles"];
}> = [
  {
    id: "tavern",
    label: "Tavern Hearth",
    ground: "wood",
    ambientColor: "#2a1c12",
    keyLightColor: "#ff9944",
    fogColor: "#120b08",
    fogDensity: 0.025,
    particles: "embers"
  },
  {
    id: "dungeon",
    label: "Dungeon Depths",
    ground: "stone",
    ambientColor: "#111827",
    keyLightColor: "#38bdf8",
    fogColor: "#05070e",
    fogDensity: 0.04,
    particles: "dust"
  },
  {
    id: "cyberpunk",
    label: "Cyber Neon",
    ground: "grid",
    ambientColor: "#1e1b4b",
    keyLightColor: "#a855f7",
    fogColor: "#070714",
    fogDensity: 0.03,
    particles: "rain"
  },
  {
    id: "forest",
    label: "Moonlit Glade",
    ground: "dirt",
    ambientColor: "#062e1e",
    keyLightColor: "#6ee7b7",
    fogColor: "#03120b",
    fogDensity: 0.035,
    particles: "spores"
  },
  {
    id: "sanctum",
    label: "Arcane Ruins",
    ground: "stone",
    ambientColor: "#2e1065",
    keyLightColor: "#f43f5e",
    fogColor: "#10061f",
    fogDensity: 0.03,
    particles: "embers"
  }
];

export const Scene3DToolbar: React.FC<Scene3DToolbarProps> = ({
  config,
  onChangeConfig,
  selectedPropId,
  onSelectProp,
  isPlacingActive,
  onTogglePlacingPropType,
  selectedPlacingType,
  onSyncSceneWithAI,
  isSyncingAI,
  onCloseSplitView,
  isExpandedFullscreen,
  onToggleFullscreen
}) => {
  const [activeTab, setActiveTab] = useState<"props" | "atmosphere" | "camera">("camera");

  const selectedProp = config.props.find(p => p.id === selectedPropId);

  // Apply atmosphere preset
  const handleApplyPreset = (preset: typeof PRESET_ATMOSPHERES[0]) => {
    onChangeConfig({
      ...config,
      preset: preset.id,
      groundTexture: preset.ground,
      ambientColor: preset.ambientColor,
      keyLightColor: preset.keyLightColor,
      fogColor: preset.fogColor,
      fogDensity: preset.fogDensity,
      particles: preset.particles,
      sceneTitle: `${preset.label} Scene`
    });
  };

  // Modify selected prop
  const handleRotateSelected = (deltaRad: number) => {
    if (!selectedPropId) return;
    onChangeConfig({
      ...config,
      props: config.props.map(p => {
        if (p.id !== selectedPropId) return p;
        return {
          ...p,
          rotation: [p.rotation[0], p.rotation[1] + deltaRad, p.rotation[2]]
        };
      })
    });
  };

  const handleScaleSelected = (deltaScale: number) => {
    if (!selectedPropId) return;
    onChangeConfig({
      ...config,
      props: config.props.map(p => {
        if (p.id !== selectedPropId) return p;
        const currentScale = p.scale[0];
        const nextScale = Math.max(0.4, Math.min(3.0, currentScale + deltaScale));
        return {
          ...p,
          scale: [nextScale, nextScale, nextScale]
        };
      })
    });
  };

  const handleDeleteSelected = () => {
    if (!selectedPropId) return;
    onChangeConfig({
      ...config,
      props: config.props.filter(p => p.id !== selectedPropId)
    });
    onSelectProp(null);
  };

  const handleTintSelected = (tint: string) => {
    if (!selectedPropId) return;
    onChangeConfig({
      ...config,
      props: config.props.map(p => {
        if (p.id !== selectedPropId) return p;
        return { ...p, tint };
      })
    });
  };

  return (
    <div className="absolute inset-x-0 top-0 pointer-events-none z-20 flex flex-col p-2.5 gap-2 select-none">
      {/* Top Floating Glass Header Bar */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 shadow-xl pointer-events-auto">
        <div className="flex items-center gap-2 px-1.5 min-w-0">
          <div className="w-5 h-5 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
            <Box size={12} />
          </div>
          <span className="text-xs font-semibold font-mono tracking-wide text-slate-200 truncate">
            {config.sceneTitle || "3D Stage Diorama"}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* AI Sync Button */}
          <button
            type="button"
            onClick={onSyncSceneWithAI}
            disabled={isSyncingAI}
            className="px-2.5 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 text-purple-200 text-[11px] font-mono font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Automatically analyze latest narrative turn and synchronize 3D environment and props"
          >
            {isSyncingAI ? (
              <RefreshCw size={11} className="animate-spin text-purple-400" />
            ) : (
              <Wand2 size={11} className="text-purple-400" />
            )}
            <span className="hidden sm:inline">AI Sync</span>
          </button>

          {/* Tab Toggles */}
          <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "camera" ? "props" : "camera")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                activeTab === "camera" ? "bg-purple-600 text-white font-semibold shadow-xs" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Camera presets"
            >
              <Eye size={11} className="inline mr-1" />
              Cam
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "props" ? "camera" : "props")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                activeTab === "props" ? "bg-purple-600 text-white font-semibold shadow-xs" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Prop catalog and stage props"
            >
              <Plus size={11} className="inline mr-0.5" />
              Props
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "atmosphere" ? "camera" : "atmosphere")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                activeTab === "atmosphere" ? "bg-purple-600 text-white font-semibold shadow-xs" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Atmosphere and lighting"
            >
              <Sliders size={11} className="inline mr-1" />
              Mood
            </button>
          </div>

          {/* Fullscreen / Popout toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors cursor-pointer"
              title={isExpandedFullscreen ? "Exit full view" : "Expand 3D stage"}
            >
              {isExpandedFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}

          {/* Close / Collapse Button */}
          <button
            type="button"
            onClick={onCloseSplitView}
            className="p-1 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-950/40 transition-colors cursor-pointer"
            title="Collapse 3D Stage view"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Sub-Panel: Camera Presets */}
      {activeTab === "camera" && (
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-xs shadow-lg pointer-events-auto self-start animate-in fade-in duration-150">
          <span className="text-[10px] font-mono text-slate-400 px-1">View:</span>
          {(["isometric", "cinematic", "topdown"] as const).map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => onChangeConfig({ ...config, cameraPreset: preset })}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-medium capitalize transition-all cursor-pointer ${
                config.cameraPreset === preset
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-900 text-slate-400 hover:text-slate-100 border border-slate-800"
              }`}
            >
              {preset}
            </button>
          ))}
          <span className="text-[10px] font-mono text-slate-500 pl-1 hidden sm:inline">
            (Drag to Orbit, Scroll to Zoom)
          </span>
        </div>
      )}

      {/* Sub-Panel: Atmosphere & Lighting Presets */}
      {activeTab === "atmosphere" && (
        <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-slate-950/95 backdrop-blur-md border border-slate-800 text-xs shadow-xl pointer-events-auto max-w-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-purple-300">Atmosphere Presets:</span>
            <span className="text-[10px] font-mono text-slate-400">Ground: {config.groundTexture}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {PRESET_ATMOSPHERES.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                  config.preset === p.id 
                    ? "bg-purple-950/70 border-purple-500 text-purple-200 shadow-xs" 
                    : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="text-[10.5px] font-medium truncate">{p.label}</div>
                <div className="text-[9px] font-mono text-slate-500 capitalize">{p.particles} FX</div>
              </button>
            ))}
          </div>

          {/* Particles Selector */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400">Particles:</span>
            {(["none", "embers", "rain", "dust", "spores"] as const).map(fx => (
              <button
                key={fx}
                type="button"
                onClick={() => onChangeConfig({ ...config, particles: fx })}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono capitalize cursor-pointer ${
                  config.particles === fx ? "bg-purple-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {fx}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Panel: Prop Catalog & Place Mode */}
      {activeTab === "props" && (
        <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-slate-950/95 backdrop-blur-md border border-slate-800 text-xs shadow-xl pointer-events-auto max-w-lg animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-purple-300">
              {isPlacingActive ? "Click ground slab to place prop" : "Select prop to place:"}
            </span>
            {isPlacingActive && (
              <button
                type="button"
                onClick={() => onTogglePlacingPropType(null)}
                className="text-[10px] font-mono text-red-400 hover:underline cursor-pointer"
              >
                Cancel Placing
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {PROP_CATALOG.map(item => (
              <button
                key={item.type}
                type="button"
                onClick={() => onTogglePlacingPropType(item.type)}
                className={`p-1.5 rounded-lg border text-left transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedPlacingType === item.type
                    ? "bg-purple-600 text-white border-purple-400 shadow-md scale-102"
                    : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-purple-600/40"
                }`}
              >
                <span className="text-sm shrink-0">{item.icon}</span>
                <span className="text-[10px] font-medium truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Floating Inspector: Selected Prop */}
      {selectedProp && (
        <div className="mt-auto self-start flex items-center gap-2 p-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-sky-500/40 shadow-2xl pointer-events-auto text-xs animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="font-mono text-[11px] font-semibold text-sky-200">
              {selectedProp.name || selectedProp.type}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Rotate Left / Right */}
            <button
              type="button"
              onClick={() => handleRotateSelected(-Math.PI / 4)}
              className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              title="Rotate counter-clockwise 45°"
            >
              <RotateCcw size={12} />
            </button>
            <button
              type="button"
              onClick={() => handleRotateSelected(Math.PI / 4)}
              className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              title="Rotate clockwise 45°"
            >
              <RotateCw size={12} />
            </button>

            {/* Scale Up / Down */}
            <button
              type="button"
              onClick={() => handleScaleSelected(0.15)}
              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 font-mono text-[10px] transition-colors cursor-pointer"
              title="Enlarge scale"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => handleScaleSelected(-0.15)}
              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 font-mono text-[10px] transition-colors cursor-pointer"
              title="Shrink scale"
            >
              -
            </button>

            {/* Tint colors */}
            <div className="flex items-center gap-0.5 px-1 border-l border-slate-800">
              {["#a855f7", "#38bdf8", "#ef4444", "#10b981", "#f59e0b"].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleTintSelected(c)}
                  className="w-3.5 h-3.5 rounded-full border border-white/20 hover:scale-125 transition-transform cursor-pointer"
                  style={{ backgroundColor: c }}
                  title={`Tint ${c}`}
                />
              ))}
            </div>

            {/* Delete Prop */}
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="p-1 rounded bg-red-950/70 hover:bg-red-900 border border-red-800/50 text-red-300 transition-colors cursor-pointer ml-1"
              title="Remove prop from stage"
            >
              <Trash2 size={12} />
            </button>

            {/* Deselect */}
            <button
              type="button"
              onClick={() => onSelectProp(null)}
              className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Deselect"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Placing Helper Badge */}
      {isPlacingActive && (
        <div className="mt-auto self-center px-3 py-1 rounded-full bg-purple-950/90 border border-purple-500/80 text-purple-200 text-xs font-mono shadow-2xl pointer-events-auto flex items-center gap-2">
          <Sparkles size={12} className="text-purple-400" />
          <span>Click anywhere on the diorama ground to place prop</span>
        </div>
      )}
    </div>
  );
};
export default Scene3DToolbar;
