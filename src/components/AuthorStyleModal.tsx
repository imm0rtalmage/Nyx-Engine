import React, { useState, useMemo, useEffect } from "react";
import { 
  generateAuthorStyleBlueprint,
  AuthorStyleBlueprint
} from "../lib/authorStyles";
import { 
  Palette, 
  Sparkles, 
  X, 
  Check, 
  Lock, 
  ShieldAlert, 
  BookOpen, 
  Search, 
  AlertCircle,
  Flame,
  Feather,
  RefreshCw,
  Plus,
  Tv,
  Gamepad2,
  Clapperboard,
  Layers,
  Trash2
} from "lucide-react";

interface AuthorStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAuthors: string;
  onSelectAuthor: (authorName: string) => void;
  onAnchorStyle?: (authorName: string) => void;
  onPurgeDrift?: (authorName: string) => void;
  onShowToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

// Creative inspirations to show users the limitless possibilities of free-form input
const INSPIRATION_IDEAS = [
  { label: "Avatar the Last Airbender show writers", type: "writing_room" as const, note: "Emotional heart, martial kinetic flow, ensemble banter" },
  { label: "Matt Mercer + RA Salvatore", type: "blend" as const, note: "Theatrical DM room staging + fluid blade choreography" },
  { label: "Andor writing room", type: "writing_room" as const, note: "Grounded espionage, razor-sharp dialogue, taut suspense" },
  { label: "Denis Villeneuve + Frank Herbert", type: "blend" as const, note: "Monolithic scale, sound design, deep philosophical intrigue" },
  { label: "William Gibson + Philip K. Dick", type: "blend" as const, note: "High-density sensory cyberpunk noir with paranoia" },
  { label: "Neil Gaiman + Studio Ghibli", type: "blend" as const, note: "Mythic folklore wonder, gentle heart, lyrical prose" },
  { label: "Joe Abercrombie + Guy Ritchie", type: "blend" as const, note: "Grimdark cynicism, bone-crunching fights, rapid witty banter" },
  { label: "Timothy Zahn + Arcane writers", type: "blend" as const, note: "Tactical deduction chess matches + emotional tragedy" }
];

export const AuthorStyleModal: React.FC<AuthorStyleModalProps> = ({
  isOpen,
  onClose,
  currentAuthors,
  onSelectAuthor,
  onAnchorStyle,
  onPurgeDrift,
  onShowToast
}) => {
  const [styleInput, setStyleInput] = useState(currentAuthors || "");

  // Keep local state in sync when modal opens
  useEffect(() => {
    if (isOpen) {
      setStyleInput(currentAuthors || "");
    }
  }, [isOpen, currentAuthors]);

  // Live real-time deconstruction of whatever the user types
  const blueprint: AuthorStyleBlueprint = useMemo(() => {
    return generateAuthorStyleBlueprint(styleInput);
  }, [styleInput]);

  if (!isOpen) return null;

  const handleSaveAndLock = () => {
    const trimmed = styleInput.trim();
    const finalValue = trimmed || "Master-Level Literary Fiction";
    onSelectAuthor(finalValue);
    onAnchorStyle?.(finalValue);
    onShowToast?.("Voice Anchored", `Narrative style locked to: ${finalValue}`, "success");
    onClose();
  };

  const handleResetToDefault = () => {
    setStyleInput("");
    onSelectAuthor("");
    onAnchorStyle?.("");
    onShowToast?.("Style Reset", "Narrative returned to standard Master Literary Fiction.", "info");
    onClose();
  };

  const handlePurgeDriftClick = () => {
    const target = styleInput.trim() || currentAuthors || "Master-Level Literary Fiction";
    onPurgeDrift?.(target);
    onShowToast?.("Drift Recalibration Injected", `High-priority directive sent to enforce ${target} prose strictly.`, "info");
    onClose();
  };

  const handleApplyInspiration = (inspirationText: string, append: boolean = false) => {
    if (append && styleInput.trim()) {
      setStyleInput(`${styleInput.trim()} + ${inspirationText}`);
    } else {
      setStyleInput(inspirationText);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-950 border border-purple-500/40 rounded-2xl shadow-2xl shadow-purple-950/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-850 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/90 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-inner">
              <Feather size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  Stylistic Influence & Writing Room
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-700/60 font-semibold flex items-center gap-1">
                  <Lock size={10} className="text-emerald-400" /> Free-Form Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Freely enter any authors, television show writing rooms, tabletop DMs, directors, or blended creators.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition-colors"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Bar with Emergency Anti-Drift Trigger */}
        <div className="px-6 py-2.5 bg-purple-950/20 border-b border-slate-850 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono">Current Active Voice:</span>
            <span className="font-semibold text-purple-300 font-mono bg-purple-950/80 border border-purple-800/60 px-2 py-0.5 rounded">
              {currentAuthors || "Master-Level Literary Fiction (Default)"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePurgeDriftClick}
              className="text-xs px-2.5 py-1 rounded-lg font-mono bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-800/80 hover:border-amber-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Inject an emergency instruction to eliminate generic AI assistant filler and re-anchor style"
            >
              <RefreshCw size={12} className="text-amber-400" />
              <span>Purge Drift & Force Voice</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Main Free-Form Input Box */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="freeform-style-input" className="text-xs font-bold font-mono text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={13} className="text-purple-400" />
                <span>Who writes, directs, or runs this scene?</span>
              </label>
              {styleInput.trim() && (
                <button
                  type="button"
                  onClick={() => setStyleInput("")}
                  className="text-[11px] text-slate-400 hover:text-red-400 font-mono flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 size={11} /> Clear input
                </button>
              )}
            </div>

            <textarea
              id="freeform-style-input"
              value={styleInput}
              onChange={(e) => setStyleInput(e.target.value)}
              placeholder='Type anything free-form: e.g. "Avatar the Last Airbender show writers", "Matt Mercer + RA Salvatore", "Andor writing room", "Denis Villeneuve + Frank Herbert", or any custom blend...'
              rows={3}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-purple-500 font-sans leading-relaxed transition-all resize-y shadow-inner"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                <span>Tip: Blend multiple styles using <code className="text-purple-300 font-bold bg-slate-950 px-1 py-0.5 rounded border border-slate-800">+</code> or <code className="text-purple-300 font-bold bg-slate-950 px-1 py-0.5 rounded border border-slate-800">&amp;</code></span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-xs px-3 py-1.5 rounded-lg font-mono text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-800 transition-colors cursor-pointer"
                >
                  Reset Default
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndLock}
                  className="text-xs px-4 py-1.5 rounded-lg font-mono font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-950/50"
                >
                  <Lock size={13} /> Lock Voice &amp; Style
                </button>
              </div>
            </div>
          </div>

          {/* Inspirational Ideas (Free-Form Examples, Not Rigid Presets) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles size={12} className="text-purple-400" />
                <span>Inspirational Sparks &amp; Blends (Click to test or append)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Non-rigid examples of what you can type
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {INSPIRATION_IDEAS.map((idea, idx) => {
                const isExact = styleInput.trim().toLowerCase() === idea.label.toLowerCase();
                return (
                  <div
                    key={idx}
                    className={`group relative p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                      isExact
                        ? "bg-purple-950/60 border-purple-500 text-purple-200 shadow-md shadow-purple-950/40"
                        : "bg-slate-900/50 border-slate-800/80 hover:border-purple-600/60 hover:bg-slate-900"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition-colors">
                          {idea.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        {idea.note}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => handleApplyInspiration(idea.label, false)}
                        className="flex-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-900/80 text-slate-300 hover:text-purple-200 transition-colors cursor-pointer text-center"
                        title="Replace input with this style"
                      >
                        Use
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyInspiration(idea.label, true)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-900/80 text-slate-300 hover:text-purple-200 transition-colors cursor-pointer flex items-center gap-0.5"
                        title="Append to current input with '+'"
                      >
                        <Plus size={10} /> Blend
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Stylistic DNA Breakdown (Dynamic Deconstruction) */}
          <div className="bg-slate-900/30 border border-purple-900/40 rounded-xl p-4.5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
                  Live Stylistic Deconstruction:
                </span>
                <span className="text-xs font-bold text-purple-300 font-mono">
                  {blueprint.targetAuthors}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {blueprint.isWritingRoom && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800/80 flex items-center gap-1">
                    <Tv size={10} /> Screenwriting Room
                  </span>
                )}
                {blueprint.isTTRPGMaster && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                    <Gamepad2 size={10} /> Tabletop DM
                  </span>
                )}
                {blueprint.isMultiAuthor && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800/80 flex items-center gap-1">
                    <Layers size={10} /> Multi-Creator Hybrid
                  </span>
                )}
              </div>
            </div>

            {/* Prose Architecture */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block">
                Prose Architecture &amp; Pacing:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                {blueprint.proseArchitecture}
              </p>
            </div>

            {/* Sensory & Environmental Texture */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                Sensory &amp; Environmental Palettes:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                {blueprint.sensoryPalette}
              </p>
            </div>

            {/* Dialogue Cadence */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                Dialogue Cadence &amp; Subtext:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                {blueprint.dialogueCadence}
              </p>
            </div>

            {/* Scene Economy */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider block">
                Tactical Movement &amp; Scene Blocking:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                {blueprint.sceneEconomy}
              </p>
            </div>

            {/* Banned Clichés */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider block">
                Zero-Drift &amp; Anti-Cliché Safeguards:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                {blueprint.bannedHabits.map((habit, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-red-400 shrink-0 font-bold">•</span>
                    <span>{habit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-850 bg-slate-900/70 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="font-mono text-[11px]">
              Dual-Voice Firewall active: Story narration outside brackets is 100% authorial. Nyx OOC is quarantined inside [brackets].
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
