import React, { useState } from "react";
import { Brain, Layers, Sliders, Sparkles, User, X, Zap, MapPin, Plus } from "lucide-react";
import { CharacterProfile, Message } from "../types";
import { computeGranularLoreContext } from "../lib/nyxLoreEngine";

interface ContextHUDModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterProfile[];
  messages: Message[];
  slidingTurnsLimit: number;
  onSetSlidingTurns: (turns: number) => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterProfile>) => Promise<void> | void;
  onShowToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
  persistentContext?: string;
  onSetPersistentContext?: (ctx: string) => void;
}

export const ContextHUDModal: React.FC<ContextHUDModalProps> = ({
  isOpen,
  onClose,
  characters,
  messages,
  slidingTurnsLimit,
  onSetSlidingTurns,
  onUpdateCharacter,
  onShowToast,
  persistentContext = "",
  onSetPersistentContext
}) => {
  const [newContextText, setNewContextText] = useState("");
  if (!isOpen) return null;

  const {
    pcEntities,
    granularEntities,
    activeLoreEntities,
    remainingBackgroundLore,
    estimatedTokens
  } = computeGranularLoreContext(characters, messages, slidingTurnsLimit);

  const estTier1Tokens = estimatedTokens.tier1Protagonist;
  const estTier2Tokens = estimatedTokens.tier2DynamicContext;
  const estTier4Tokens = estimatedTokens.tier4BackgroundIndex;
  const estHistoryTokens = estimatedTokens.slidingHistory;
  const estTotalContextTokens = estimatedTokens.total;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-purple-900/40 p-2.5 rounded-xl text-purple-300 border border-purple-700/40">
              <Brain size={20} className="text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                  Nyx Engine v2.0 Memory & Context HUD
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold">
                  GRANULAR DECAY ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Continuous Per-Turn Recency Decay & Dynamic Lorebook Injection Engine
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-400">
                Total Est. Context
              </span>
              <span className="text-xl font-bold font-mono text-purple-300 mt-1">
                ~{estTotalContextTokens.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                Tokens payload
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-400">
                Sliding History
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-cyan-300">
                  {Math.min(messages.length, slidingTurnsLimit)}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  / {messages.length} msgs
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono">
                Window: {slidingTurnsLimit} turns
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-400">
                Active Lore Entities
              </span>
              <span className="text-xl font-bold font-mono text-emerald-300 mt-1">
                {pcEntities.length + granularEntities.length}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                Injected in Context
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-400">
                Dormant Lore Index
              </span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-1">
                {remainingBackgroundLore.length}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                Background 1-line index
              </span>
            </div>
          </div>

          {/* Sliding Window Config Control */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-purple-400 shrink-0" />
              <span className="text-slate-300 font-semibold">
                Sliding Context Window Size:
              </span>
              <span className="text-slate-400">
                Controls how many recent message turns are sent directly to the model.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={4}
                max={30}
                step={2}
                value={slidingTurnsLimit}
                onChange={(e) => onSetSlidingTurns(parseInt(e.target.value))}
                className="w-28 accent-purple-500 cursor-pointer"
              />
              <span className="text-purple-300 font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 min-w-[3rem] text-center">
                {slidingTurnsLimit} turns
              </span>
            </div>
          </div>

          {/* Persistent Grounding Context & State Deltas */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-900/50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-850 pb-2">
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-bold font-mono text-emerald-300 uppercase tracking-wide">
                  Active Persistent Grounding Context & Location
                </span>
              </div>
              <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold">
                Injected in EVERY Prompt
              </span>
            </div>

            {persistentContext ? (
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {persistentContext}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic font-mono bg-slate-900/40 p-2.5 rounded-lg border border-slate-850/60">
                No manual grounding context pinned yet (e.g., location, injuries, weather). Add an entry below or tell Nyx "Add location: Rear Terrace to context".
              </div>
            )}

            {onSetPersistentContext && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newContextText}
                  onChange={(e) => setNewContextText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newContextText.trim()) {
                      e.preventDefault();
                      const trimmed = newContextText.trim();
                      const updated = persistentContext ? `${persistentContext}\n- ${trimmed}` : `- ${trimmed}`;
                      onSetPersistentContext(updated);
                      onShowToast?.("📌 Grounding Context Added", `Pinned: "${trimmed}"`, "success");
                      setNewContextText("");
                    }
                  }}
                  placeholder="Manually add location or fact (e.g. Location: Rear Terrace)..."
                  className="flex-1 bg-slate-900 border border-slate-750 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newContextText.trim()) return;
                    const trimmed = newContextText.trim();
                    const updated = persistentContext ? `${persistentContext}\n- ${trimmed}` : `- ${trimmed}`;
                    onSetPersistentContext(updated);
                    onShowToast?.("📌 Grounding Context Added", `Pinned: "${trimmed}"`, "success");
                    setNewContextText("");
                  }}
                  disabled={!newContextText.trim()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Plus size={12} />
                  <span>Pin to Context</span>
                </button>
              </div>
            )}
          </div>

          {/* Granular Memory Allocation Breakdown */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono flex items-center gap-1.5">
              <Layers size={13} />
              <span>Granular Recency Memory Allocation</span>
            </h4>

            {/* Protagonist Anchor */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-purple-900/40 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-850 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-700 text-purple-300 text-[10px] font-bold font-mono">
                    PROTAGONIST
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    Player Character (Permanent Anchor)
                  </span>
                  <span className="text-[10px] text-purple-400 font-mono">
                    (100% Immutable Anchor)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  ~{estTier1Tokens} tokens
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {pcEntities.map((pc) => (
                  <div
                    key={pc.id}
                    className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-purple-800/40"
                  >
                    <User size={13} className="text-purple-400" />
                    <span className="text-xs font-bold text-purple-200">
                      {pc.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({pc.role || "Protagonist"})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Granular Weighted Lore Entities */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-900/40 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-850 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-bold font-mono">
                    DYNAMIC CONTEXT
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    Active Granular Sliding Lore
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    (Mathematically Scaled per Turn Distance)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  ~{estTier2Tokens} tokens
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {granularEntities.map((g) => {
                  let badgeStyle = "bg-slate-800 text-slate-400";
                  if (g.weightPercent >= 80) {
                    badgeStyle = "bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold";
                  } else if (g.weightPercent >= 50) {
                    badgeStyle = "bg-teal-950 text-teal-300 border border-teal-800/60 font-medium";
                  } else if (g.weightPercent >= 25) {
                    badgeStyle = "bg-amber-950 text-amber-300 border border-amber-800/60";
                  } else {
                    badgeStyle = "bg-slate-900 text-slate-500 border border-slate-800";
                  }

                  const distanceLabel = g.turnDistance === 0 ? "Current turn" : `${g.turnDistance} turn${g.turnDistance > 1 ? "s" : ""} ago`;

                  return (
                    <div
                      key={g.entity.id}
                      className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
                    >
                      <Sparkles size={12} className={g.weightPercent >= 80 ? "text-emerald-400" : "text-amber-400"} />
                      <span className="text-xs font-semibold text-slate-200">
                        {g.entity.name}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${badgeStyle}`}>
                        {g.weightPercent}% weight
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        ({distanceLabel})
                      </span>
                    </div>
                  );
                })}
                {granularEntities.length === 0 && (
                  <p className="text-xs text-slate-500 italic">
                    No off-scene lorebook entities currently detected in the sliding conversation window. As soon as you or Nyx mention someone, they will automatically activate and decay turn by turn.
                  </p>
                )}
              </div>
            </div>

            {/* Background Lorebook Index */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-850 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-bold font-mono">
                    DORMANT REGISTRY
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    Background World Lore Index
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    (0% Token Waste / 1-Line Reference)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  ~{estTier4Tokens} tokens ({remainingBackgroundLore.length} entities)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {remainingBackgroundLore.map((char) => (
                  <span
                    key={char.id}
                    className="text-[10px] px-2 py-1 rounded bg-slate-900 text-slate-400 border border-slate-850 font-mono"
                  >
                    {char.name} ({char.type || "npc"})
                  </span>
                ))}
                {remainingBackgroundLore.length === 0 && (
                  <p className="text-xs text-slate-500 italic">
                    All entities in this project are currently active in context.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Slash Commands Quick Reference */}
          <div className="bg-slate-950/90 p-4 rounded-xl border border-purple-900/30 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono flex items-center gap-1.5">
              <Zap size={12} />
              <span>2.0 In-Chat Slash Commands Quick Reference</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-purple-300 font-bold">/inscene &lt;name&gt;</span>
                <span className="text-[10px] text-slate-400">
                  Mention/activate entity
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-purple-300 font-bold">/leave &lt;name&gt;</span>
                <span className="text-[10px] text-slate-400">
                  Decay entity from scene
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-purple-300 font-bold">/scene</span>
                <span className="text-[10px] text-slate-400">
                  List all active context entities
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-purple-300 font-bold">/clearscene</span>
                <span className="text-[10px] text-slate-400">
                  Reset active context to PC only
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer font-mono"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
