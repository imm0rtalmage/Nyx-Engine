import React from "react";
import { Brain, Layers, Sliders, Sparkles, User, X, Zap } from "lucide-react";
import { CharacterProfile, Message } from "../types";

interface ContextHUDModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterProfile[];
  messages: Message[];
  slidingTurnsLimit: number;
  onSetSlidingTurns: (turns: number) => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterProfile>) => Promise<void> | void;
  onShowToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

export const ContextHUDModal: React.FC<ContextHUDModalProps> = ({
  isOpen,
  onClose,
  characters,
  messages,
  slidingTurnsLimit,
  onSetSlidingTurns,
  onUpdateCharacter,
  onShowToast
}) => {
  if (!isOpen) return null;

  const inSceneCharacters = characters.filter(
    (c) => c.isInScene || c.type === "companion" || c.isPlayerCharacter
  );
  const outOfSceneCharacters = characters.filter(
    (c) => !c.isInScene && c.type !== "companion" && !c.isPlayerCharacter
  );

  const recentTurnsText = messages
    .slice(-5)
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  const activeKeywordTriggers = outOfSceneCharacters.filter((c) => {
    if (!c.name) return false;
    const nameMatch = recentTurnsText.includes(c.name.toLowerCase());
    const factionMatch =
      c.factionName && recentTurnsText.includes(c.factionName.toLowerCase());
    const keysMatch =
      c.activationKeys &&
      c.activationKeys.some(
        (k) => k.trim() && recentTurnsText.includes(k.trim().toLowerCase())
      );
    return nameMatch || factionMatch || keysMatch;
  });

  const remainingBackgroundLore = outOfSceneCharacters.filter(
    (c) => !activeKeywordTriggers.some((t) => t.id === c.id)
  );

  const estTier1Tokens =
    characters.filter((c) => c.isPlayerCharacter).length * 350;
  const estTier2Tokens =
    characters.filter(
      (c) => !c.isPlayerCharacter && (c.isInScene || c.type === "companion")
    ).length * 300;
  const estTier3Tokens = activeKeywordTriggers.length * 280;
  const estTier4Tokens = remainingBackgroundLore.length * 25;
  const estHistoryTokens = messages
    .slice(-slidingTurnsLimit)
    .reduce((acc, m) => acc + Math.round(m.content.length / 4), 0);
  const estTotalContextTokens =
    estTier1Tokens +
    estTier2Tokens +
    estTier3Tokens +
    estTier4Tokens +
    estHistoryTokens;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-purple-900/40 p-2.5 rounded-xl text-purple-300 border border-purple-700/40">
              <Brain size={20} className="text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                  2.0 Dynamic Memory & Context HUD
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                4-Tier Sliding Context & Dynamic Lorebook Injection Engine
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
                Active In-Scene
              </span>
              <span className="text-xl font-bold font-mono text-emerald-300 mt-1">
                {inSceneCharacters.length}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                Tier 1 & Tier 2 entities
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-400">
                Keyword Triggers
              </span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-1">
                {activeKeywordTriggers.length}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                Tier 3 active lore
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
                Controls how many recent message turns are sent directly to the
                model.
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

          {/* 4-Tier Memory Hierarchy Breakdown */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono flex items-center gap-1.5">
              <Layers size={13} />
              <span>4-Tier Memory Allocation Breakdown</span>
            </h4>

            {/* Tier 1: Player Characters */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-purple-900/40 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-850 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-700 text-purple-300 text-[10px] font-bold font-mono">
                    TIER 1
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    Player Character (Protagonist)
                  </span>
                  <span className="text-[10px] text-purple-400 font-mono">
                    (Permanent Anchor & Anti-Godmoding)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  ~{estTier1Tokens} tokens
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {characters
                  .filter((c) => c.isPlayerCharacter)
                  .map((pc) => (
                    <div
                      key={pc.id}
                      className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-purple-800/40"
                    >
                      <User size={13} className="text-purple-400" />
                      <span className="text-xs font-bold text-purple-200">
                        {pc.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({pc.role})
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Tier 2: In-Scene Entities */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-900/40 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-850 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-bold font-mono">
                    TIER 2
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    Active In-Scene Presence
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    (Full Dossier Injection)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  ~{estTier2Tokens} tokens
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {characters
                  .filter(
                    (c) =>
                      !c.isPlayerCharacter &&
                      (c.isInScene || c.type === "companion")
                  )
                  .map((char) => (
                    <div
                      key={char.id}
                      className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-800/40"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-200">
                        {char.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({char.role || char.type})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateCharacter(char.id, { isInScene: false });
                          onShowToast?.(
                            "⚪ Scene Left",
                            `"${char.name}" removed from scene.`,
                            "info"
                          );
                        }}
                        className="text-slate-500 hover:text-red-400 p-0.5 rounded ml-1 cursor-pointer"
                        title="Move to background Lorebook"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                {characters.filter(
                  (c) =>
                    !c.isPlayerCharacter &&
                    (c.isInScene || c.type === "companion")
                ).length === 0 && (
                  <p className="text-xs text-slate-500 italic">
                    No non-PC entities currently marked in-scene. Use the '+ Add
                    Entity' button above chat or type /inscene [name].
                  </p>
                )}
              </div>
            </div>

            {/* Tier 3: Keyword-Triggered Lore */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-amber-900/40 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-850 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 text-[10px] font-bold font-mono">
                    TIER 3
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    Keyword-Triggered Lore
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    (Dynamic Activation via Recent Turns)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  ~{estTier3Tokens} tokens
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {activeKeywordTriggers.map((char) => (
                  <div
                    key={char.id}
                    className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-amber-800/40"
                  >
                    <Sparkles size={11} className="text-amber-400 shrink-0" />
                    <span className="text-xs font-semibold text-amber-200">
                      {char.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({char.role || char.type})
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-mono border border-amber-800/50">
                      Detected in Turn History
                    </span>
                  </div>
                ))}
                {activeKeywordTriggers.length === 0 && (
                  <p className="text-xs text-slate-500 italic">
                    No off-scene lorebook keywords detected in the last 5 turns.
                    When you or Nyx mention an off-scene character, vehicle, or
                    location, it will automatically activate here.
                  </p>
                )}
              </div>
            </div>

            {/* Tier 4: Background Lorebook Index */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-850 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-bold font-mono">
                    TIER 4
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    Background Lorebook Index
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    (Condensed 1-Line Reference)
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
                    All lorebook entities are currently promoted to Tier 1, 2, or
                    3.
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
                  Move entity to active scene
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-purple-300 font-bold">/leave &lt;name&gt;</span>
                <span className="text-[10px] text-slate-400">
                  Return entity to lorebook
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-purple-300 font-bold">/scene</span>
                <span className="text-[10px] text-slate-400">
                  List all in-scene entities
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-purple-300 font-bold">/clearscene</span>
                <span className="text-[10px] text-slate-400">
                  Reset scene to solo PC
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
