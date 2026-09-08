import React, { useState, useEffect, useId } from "react";
import { Project } from "../types";
import { 
  Globe, 
  Sparkles, 
  User, 
  Compass, 
  Clock, 
  BookOpen, 
  FileText, 
  Check, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Tag,
  Shield,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface MobileWorldSettingsProps {
  project: Project;
  onSetProjectValue: (key: string, val: any) => void;
  onUpdateNickname: (name: string) => void;
  onShowToast?: (title: string, description: string, type?: "success" | "error" | "info") => void;
  onSwitchToNarration?: () => void;
  onConsultAssistant?: () => void;
}

const SETTING_PRESETS = [
  "Night City 2077 (Cyberpunk)",
  "Outer Rim Starport (Space Opera)",
  "Eldritch Void (Cosmic Horror)",
  "High Fantasy Realm",
  "Grimdark Feudal Empire",
  "Modern Occult Metropolis",
  "Post-Apocalyptic Wasteland",
  "Solarpunk Sol System"
];

const MOOD_PRESETS = [
  "Default to Author(s)",
  "Dramatic & Atmospheric",
  "Gritty & Dark",
  "Suspenseful Noir",
  "Lighthearted & Witty",
  "Epic & Grand",
  "Eerie Cosmic Horror",
  "Cozy & Introspective"
];

const PACING_PRESETS = [
  "Default to Author(s)",
  "Slow-Burn & Deliberate",
  "Fast-Paced & Urgent",
  "Scene-by-Scene Cinematic",
  "Episodic & Punchy"
];

const TURN_HEADER_PRESETS = [
  "The Mortician - S01E11",
  "The Household - Fun in the Sun",
  "Episode {turn}",
  "Scene {turn}",
  "{speaker}"
];

export const MobileWorldSettings: React.FC<MobileWorldSettingsProps> = ({
  project,
  onSetProjectValue,
  onUpdateNickname,
  onShowToast,
  onSwitchToNarration,
  onConsultAssistant
}) => {
  const [name, setName] = useState(project.name || "");
  const [nickname, setNickname] = useState(project.userNickname || "");
  const [setting, setSetting] = useState(project.setting || "");
  const [perspective, setPerspective] = useState(project.narrativePerspective || "third_person");
  const [mood, setMood] = useState(project.emotionalTone || "");
  const [pacing, setPacing] = useState(project.pacing || "");
  const [turnHeader, setTurnHeader] = useState(project.turnHeader || "");
  const [creatorNames, setCreatorNames] = useState(project.creatorNames || "");
  const [styleGuide, setStyleGuide] = useState(project.styleGuide || "");
  const [plotOverview, setPlotOverview] = useState(project.plotOverview || "");
  const [persistentContext, setPersistentContext] = useState(project.persistentContext || "");
  const [customInstructions, setCustomInstructions] = useState(project.customInstructions || "");
  const [savedBadge, setSavedBadge] = useState(false);

  // Section collapse states
  const [expandedSection, setExpandedSection] = useState<string>("core");

  // Keep local states synced if active project changes externally
  useEffect(() => {
    setName(project.name || "");
    setNickname(project.userNickname || "");
    setSetting(project.setting || "");
    setPerspective(project.narrativePerspective || "third_person");
    setMood(project.emotionalTone || "");
    setPacing(project.pacing || "");
    setTurnHeader(project.turnHeader || "");
    setCreatorNames(project.creatorNames || "");
    setStyleGuide(project.styleGuide || "");
    setPlotOverview(project.plotOverview || "");
    setPersistentContext(project.persistentContext || "");
    setCustomInstructions(project.customInstructions || "");
  }, [project.id]);

  const triggerSaveIndicator = () => {
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 1400);
  };

  // Debounced auto-save triggers
  useEffect(() => {
    const timer = setTimeout(() => {
      if (name !== (project.name || "")) {
        onSetProjectValue("name", name);
        triggerSaveIndicator();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [name]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (nickname !== (project.userNickname || "")) {
        onUpdateNickname(nickname);
        triggerSaveIndicator();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [nickname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (setting !== (project.setting || "")) {
        onSetProjectValue("setting", setting);
        triggerSaveIndicator();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [setting]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mood !== (project.emotionalTone || "")) {
        onSetProjectValue("emotionalTone", mood);
        triggerSaveIndicator();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [mood]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pacing !== (project.pacing || "")) {
        onSetProjectValue("pacing", pacing);
        triggerSaveIndicator();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [pacing]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (turnHeader !== (project.turnHeader || "")) {
        onSetProjectValue("turnHeader", turnHeader);
        triggerSaveIndicator();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [turnHeader]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (creatorNames !== (project.creatorNames || "")) {
        onSetProjectValue("creatorNames", creatorNames);
        triggerSaveIndicator();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [creatorNames]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (styleGuide !== (project.styleGuide || "")) {
        onSetProjectValue("styleGuide", styleGuide);
        triggerSaveIndicator();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [styleGuide]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (plotOverview !== (project.plotOverview || "")) {
        onSetProjectValue("plotOverview", plotOverview);
        triggerSaveIndicator();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [plotOverview]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (persistentContext !== (project.persistentContext || "")) {
        onSetProjectValue("persistentContext", persistentContext);
        triggerSaveIndicator();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [persistentContext]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customInstructions !== (project.customInstructions || "")) {
        onSetProjectValue("customInstructions", customInstructions);
        triggerSaveIndicator();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [customInstructions]);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(prev => prev === sectionId ? "" : sectionId);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto pb-24 select-text">
      {/* HEADER BAR */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow shadow-purple-950">
            <SlidersHorizontal size={15} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
              World Settings
              {savedBadge ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1 animate-in fade-in">
                  <Check size={10} /> Auto-Saved
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                  Live Sync
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
              {project.name || "Campaign Settings"}
            </p>
          </div>
        </div>

        {onSwitchToNarration && (
          <button
            type="button"
            onClick={onSwitchToNarration}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-950 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Play</span>
            <Sparkles size={12} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
        {/* QUICK SHORTCUT CARDS */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              const next = perspective === "third_person" ? "second_person" : "third_person";
              setPerspective(next);
              onSetProjectValue("narrativePerspective", next);
              triggerSaveIndicator();
              onShowToast?.("Perspective Updated", `Perspective changed to ${next === "third_person" ? "Third Person ('Sena does...')" : "Second Person ('You do...')"}`, "info");
            }}
            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-purple-600/50 flex flex-col text-left transition-all active:scale-[0.98]"
          >
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Perspective</span>
            <span className="text-xs font-bold text-purple-300 mt-1 flex items-center gap-1.5">
              {perspective === "second_person" ? "🎯 Second Person (You)" : "👤 Third Person (Sena)"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setExpandedSection("atmosphere");
            }}
            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-purple-600/50 flex flex-col text-left transition-all active:scale-[0.98]"
          >
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Atmosphere / Mood</span>
            <span className="text-xs font-bold text-slate-200 mt-1 truncate">
              {mood || "Default to Author(s)"}
            </span>
          </button>
        </div>

        {/* 1. CAMPAIGN ANCHOR & IDENTITIES */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection("core")}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-850/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Globe size={16} className="text-purple-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Campaign Identity</h3>
                <p className="text-[11px] text-slate-400">Story title and what Nyx calls you</p>
              </div>
            </div>
            {expandedSection === "core" ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          <AnimatePresence initial={false}>
            {expandedSection === "core" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-800/60"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Shadows of Erebos, Night City 2077..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    What Nyx Calls You (Nickname)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Sir, Polymath, Captain, Adventurer..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500 transition-all font-mono"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. ACTIVE SETTING & UNIVERSE */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection("setting")}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-850/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Compass size={16} className="text-emerald-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Active Universe & Setting</h3>
                <p className="text-[11px] text-slate-400">World anchor, location, timeline, and genre</p>
              </div>
            </div>
            {expandedSection === "setting" ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          <AnimatePresence initial={false}>
            {expandedSection === "setting" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-800/60"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Universe / Anchor Setting
                  </label>
                  <input
                    type="text"
                    value={setting}
                    onChange={(e) => setSetting(e.target.value)}
                    placeholder="e.g. Night City 2077, Jump City, Star Wars Canon Year..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Quick Universe Presets
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SETTING_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setSetting(preset);
                          onSetProjectValue("setting", preset);
                          triggerSaveIndicator();
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          setting === preset
                            ? "bg-emerald-950 text-emerald-300 border-emerald-600 font-semibold"
                            : "bg-slate-950/80 text-slate-400 border-slate-850 hover:text-slate-200 hover:border-slate-750"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. ATMOSPHERE, MOOD & PACING */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection("atmosphere")}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-850/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles size={16} className="text-pink-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Atmosphere, Mood & Pacing</h3>
                <p className="text-[11px] text-slate-400">Emotional tension, sensory atmosphere, tempo</p>
              </div>
            </div>
            {expandedSection === "atmosphere" ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          <AnimatePresence initial={false}>
            {expandedSection === "atmosphere" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="px-4 pb-4 pt-1 space-y-3.5 border-t border-slate-800/60"
              >
                {/* Mood input */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-300">Emotional Tone & Mood</label>
                    <span className="text-[10px] text-slate-500 font-mono">Defaults to author if unadjusted</span>
                  </div>
                  <input
                    type="text"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="Default to Author(s) (or Gritty & Dark, Noir, Cozy...)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-pink-500 transition-all font-sans"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {MOOD_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setMood(preset);
                          onSetProjectValue("emotionalTone", preset);
                          triggerSaveIndicator();
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          mood === preset || (!mood && preset === "Default to Author(s)")
                            ? "bg-pink-950 text-pink-300 border-pink-600 font-semibold"
                            : "bg-slate-950/80 text-slate-400 border-slate-850 hover:text-slate-200"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pacing input */}
                <div className="pt-2 border-t border-slate-800/60">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-300">Narrative Pacing</label>
                    <span className="text-[10px] text-slate-500 font-mono">Tempo & progression</span>
                  </div>
                  <input
                    type="text"
                    value={pacing}
                    onChange={(e) => setPacing(e.target.value)}
                    placeholder="Default to Author(s) (or Slow-Burn, Cinematic Fast...)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-pink-500 transition-all font-sans"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {PACING_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setPacing(preset);
                          onSetProjectValue("pacing", preset);
                          triggerSaveIndicator();
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          pacing === preset || (!pacing && preset === "Default to Author(s)")
                            ? "bg-pink-950 text-pink-300 border-pink-600 font-semibold"
                            : "bg-slate-950/80 text-slate-400 border-slate-850 hover:text-slate-200"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. TURN HEADER / EPISODE CODE */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection("turnHeader")}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-850/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Tag size={16} className="text-amber-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Turn Header & Episode Title</h3>
                <p className="text-[11px] text-slate-400">Post title template displayed at top of narrative turns</p>
              </div>
            </div>
            {expandedSection === "turnHeader" ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          <AnimatePresence initial={false}>
            {expandedSection === "turnHeader" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-800/60"
              >
                <div>
                  <input
                    type="text"
                    value={turnHeader}
                    onChange={(e) => setTurnHeader(e.target.value)}
                    placeholder="e.g. The Mortician - S01E11, Episode {turn}..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500 transition-all font-sans"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TURN_HEADER_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setTurnHeader(preset);
                          onSetProjectValue("turnHeader", preset);
                          triggerSaveIndicator();
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          turnHeader === preset
                            ? "bg-amber-950 text-amber-300 border-amber-600 font-semibold"
                            : "bg-slate-950/80 text-slate-400 border-slate-850 hover:text-slate-200"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    {turnHeader && (
                      <button
                        type="button"
                        onClick={() => {
                          setTurnHeader("");
                          onSetProjectValue("turnHeader", "");
                          triggerSaveIndicator();
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg border bg-rose-950/50 text-rose-300 border-rose-800/50 hover:bg-rose-900/60 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5. AUTHORS & STYLE GUIDE */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection("style")}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-850/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen size={16} className="text-cyan-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Author Style & Prose Rules</h3>
                <p className="text-[11px] text-slate-400">Emulated authors, vocabulary, and formatting directives</p>
              </div>
            </div>
            {expandedSection === "style" ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          <AnimatePresence initial={false}>
            {expandedSection === "style" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-800/60"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Emulated Authors / Stylists
                  </label>
                  <input
                    type="text"
                    value={creatorNames}
                    onChange={(e) => setCreatorNames(e.target.value)}
                    placeholder="e.g. William Gibson, Frank Herbert, Matt Mercer..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Style Guide & Voice Directives
                  </label>
                  <textarea
                    rows={4}
                    value={styleGuide}
                    onChange={(e) => setStyleGuide(e.target.value)}
                    placeholder="Prose style rules, sensory descriptions, dialogue formatting, sentence pacing..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 transition-all font-sans leading-relaxed resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 6. PLOT OVERVIEW & CONTEXT */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection("plot")}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-850/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileText size={16} className="text-indigo-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Plot Overview & Active Stakes</h3>
                <p className="text-[11px] text-slate-400">Current narrative arc, immediate goals, looming conflicts</p>
              </div>
            </div>
            {expandedSection === "plot" ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          <AnimatePresence initial={false}>
            {expandedSection === "plot" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-800/60"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Active Plot Stakes & Story Arc
                  </label>
                  <textarea
                    rows={4}
                    value={plotOverview}
                    onChange={(e) => setPlotOverview(e.target.value)}
                    placeholder="The core mission, active antagonists, looming deadlines, and high-stakes mysteries..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all font-sans leading-relaxed resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Persistent Facts & Memory Rules
                  </label>
                  <textarea
                    rows={3}
                    value={persistentContext}
                    onChange={(e) => setPersistentContext(e.target.value)}
                    placeholder="Established facts that must always stay in memory every single turn..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all font-sans leading-relaxed resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 7. CUSTOM INSTRUCTIONS */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection("custom")}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-850/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Shield size={16} className="text-rose-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">DM Directives & Boundaries</h3>
                <p className="text-[11px] text-slate-400">Strict constraints, output formatting, player agency rules</p>
              </div>
            </div>
            {expandedSection === "custom" ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          <AnimatePresence initial={false}>
            {expandedSection === "custom" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-800/60"
              >
                <div>
                  <textarea
                    rows={4}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. Never speak or act on behalf of the player character. Maintain strict ammo counts. End turns with a tactical question..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-rose-500 transition-all font-sans leading-relaxed resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ACTION BUTTONS AT BOTTOM */}
        <div className="pt-2 flex items-center gap-2">
          {onSwitchToNarration && (
            <button
              type="button"
              onClick={onSwitchToNarration}
              className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Continue Story Narration</span>
            </button>
          )}

          {onConsultAssistant && (
            <button
              type="button"
              onClick={onConsultAssistant}
              className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-850 text-purple-300 border border-purple-800/40 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Brainstorm world ideas with Nyx Assistant"
            >
              <span>Ask Nyx</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileWorldSettings;
