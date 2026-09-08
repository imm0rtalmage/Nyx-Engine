import React, { useState, useEffect } from "react";
import { 
  Globe, 
  BookOpen, 
  GitBranch, 
  Sparkles, 
  Search, 
  Check, 
  X, 
  ChevronRight, 
  AlertCircle, 
  Shield, 
  User, 
  Eye, 
  Mic, 
  Brain, 
  Swords, 
  Clock, 
  ExternalLink,
  History,
  FileText,
  Layers,
  ArrowRight
} from "lucide-react";
import { CharacterProfile } from "../types";

interface CanonDeltaStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCharacter?: CharacterProfile | null;
  projectSetting?: string;
  chatMessages?: any[];
  onApplyProfile: (updatedProfile: Partial<CharacterProfile>, targetCharId?: string) => void;
  existingCharacters?: CharacterProfile[];
}

export const CanonDeltaStudioModal: React.FC<CanonDeltaStudioModalProps> = ({
  isOpen,
  onClose,
  initialCharacter,
  projectSetting = "",
  chatMessages = [],
  onApplyProfile,
  existingCharacters = []
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Search & Inputs
  const [characterName, setCharacterName] = useState("");
  const [franchiseHint, setFranchiseHint] = useState(projectSetting || "Baldur's Gate 3 / Forgotten Realms");
  const [timelineStage, setTimelineStage] = useState<string>("prequel");
  const [userGuidance, setUserGuidance] = useState(
    "The campaign narrative is a prequel where this character appears before their canonical game events. They should be portrayed at an earlier, formative stage without future knowledge or titles."
  );

  // Loading states
  const [isResearching, setIsResearching] = useState(false);
  const [isExtractingLogs, setIsExtractingLogs] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Data states
  const [onlineCanon, setOnlineCanon] = useState<any | null>(null);
  const [logSummary, setLogSummary] = useState<any | null>(null);
  const [reconciledProfile, setReconciledProfile] = useState<any | null>(null);

  // Populate when opened
  useEffect(() => {
    if (isOpen) {
      if (initialCharacter) {
        setCharacterName(initialCharacter.name || "");
        if (initialCharacter.timelineStage) {
          setTimelineStage(initialCharacter.timelineStage);
        }
        if (initialCharacter.canonDelta) {
          setUserGuidance(`Existing delta: ${initialCharacter.canonDelta}`);
        }
      } else if (!characterName && existingCharacters.length > 0) {
        const candidate = existingCharacters.find(c => c.type === "companion" || c.type === "npc");
        if (candidate) {
          setCharacterName(candidate.name);
        }
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialCharacter]);

  if (!isOpen) return null;

  // Step 1: Research Online Canon
  const handleResearchCanon = async () => {
    if (!characterName.trim()) {
      setErrorMsg("Please enter a character name to research.");
      return;
    }
    setErrorMsg(null);
    setIsResearching(true);
    try {
      const res = await fetch("/api/canon/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: characterName.trim(),
          setting: projectSetting,
          franchise: franchiseHint
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch online canon");
      }
      const data = await res.json();
      setOnlineCanon(data);
      setActiveStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to research canon");
    } finally {
      setIsResearching(false);
    }
  };

  // Step 2: Extract Campaign Logs
  const handleExtractLogs = async () => {
    setErrorMsg(null);
    setIsExtractingLogs(true);
    try {
      const res = await fetch("/api/canon/extract-from-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: characterName.trim(),
          messages: chatMessages,
          projectSetting
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to extract from campaign logs");
      }
      const data = await res.json();
      setLogSummary(data);
      setActiveStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to extract campaign logs");
    } finally {
      setIsExtractingLogs(false);
    }
  };

  // Step 3: Reconcile Canon Delta
  const handleReconcileDelta = async () => {
    if (!characterName.trim()) {
      setErrorMsg("Character name is required.");
      return;
    }
    setErrorMsg(null);
    setIsReconciling(true);
    try {
      const res = await fetch("/api/canon/reconcile-delta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: characterName.trim(),
          onlineCanon: onlineCanon || {},
          logSummary: logSummary || {},
          timelineStage,
          projectSetting,
          userGuidance
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reconcile canon delta");
      }
      const data = await res.json();
      setReconciledProfile(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reconcile canon delta");
    } finally {
      setIsReconciling(false);
    }
  };

  // Apply to character
  const handleApply = (targetCharId?: string) => {
    if (!reconciledProfile) return;
    const partial: Partial<CharacterProfile> = {
      name: reconciledProfile.characterName || characterName,
      role: reconciledProfile.role || "Operative",
      description: reconciledProfile.description,
      backstory: reconciledProfile.backstory,
      factionName: reconciledProfile.factionName,
      relationships: reconciledProfile.relationships,
      signatureItems: reconciledProfile.signatureItems,
      // Granular fields
      appearanceBuild: reconciledProfile.appearanceBuild,
      distinguishingMarks: reconciledProfile.distinguishingMarks,
      attireWardrobe: reconciledProfile.attireWardrobe,
      voiceCadence: reconciledProfile.voiceCadence,
      mannerisms: reconciledProfile.mannerisms,
      temperament: reconciledProfile.temperament,
      motivationsSecrets: reconciledProfile.motivationsSecrets,
      tacticalStyle: reconciledProfile.tacticalStyle,
      // Delta fields
      timelineStage: reconciledProfile.timelineStage || timelineStage,
      canonSource: reconciledProfile.canonSource || onlineCanon?.canonSource || "Online Lore Wiki",
      canonDelta: reconciledProfile.canonDelta
    };

    onApplyProfile(partial, targetCharId || initialCharacter?.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-950 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-850 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-800/60 text-purple-400">
              <Globe size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 tracking-wide">
                  Canon & Narrative Delta Studio
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/40 font-mono">
                  v2.0 Delta Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Research online wiki canon, harvest campaign narrative logs, and synthesize custom continuity deltas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-850 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Navigation Tabs */}
        <div className="px-5 py-2.5 bg-slate-900/30 border-b border-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveStep(1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeStep === 1
                  ? "bg-purple-900/50 text-purple-200 border border-purple-700/50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              }`}
            >
              <Search size={13} className="text-purple-400" />
              <span>1. Research Online Canon</span>
              {onlineCanon && <Check size={12} className="text-emerald-400 ml-0.5" />}
            </button>

            <ChevronRight size={14} className="text-slate-600" />

            <button
              onClick={() => setActiveStep(2)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeStep === 2
                  ? "bg-purple-900/50 text-purple-200 border border-purple-700/50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              }`}
            >
              <History size={13} className="text-teal-400" />
              <span>2. Harvest Campaign Logs</span>
              {logSummary && <Check size={12} className="text-emerald-400 ml-0.5" />}
            </button>

            <ChevronRight size={14} className="text-slate-600" />

            <button
              onClick={() => setActiveStep(3)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeStep === 3
                  ? "bg-purple-900/50 text-purple-200 border border-purple-700/50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              }`}
            >
              <GitBranch size={13} className="text-amber-400" />
              <span>3. Reconcile Delta & Specs</span>
              {reconciledProfile && <Check size={12} className="text-emerald-400 ml-0.5" />}
            </button>
          </div>

          {/* Target Character Indicator */}
          {characterName && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">
              <span className="text-slate-500">Subject:</span>
              <strong className="text-purple-300">{characterName}</strong>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-2.5 rounded-lg bg-red-950/40 border border-red-900/60 text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* STEP 1: Research Online Canon */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Search size={14} className="text-purple-400" />
                  Canonical Character Search
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Search fandom wikis, official tabletop sourcebooks, and gaming databases. The system fetches official role, visual traits, weapons, and timeline appearances.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Character / NPC Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lora Bergauz, Nine-Fingers Keene, Astarion..."
                      value={characterName}
                      onChange={(e) => setCharacterName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded px-3 py-2 text-xs text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Franchise / Setting Context
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Baldur's Gate 3 / Forgotten Realms, Star Wars..."
                      value={franchiseHint}
                      onChange={(e) => setFranchiseHint(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded px-3 py-2 text-xs text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleResearchCanon}
                    disabled={isResearching || !characterName.trim()}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
                  >
                    {isResearching ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Searching Official Lore & Wikis...</span>
                      </>
                    ) : (
                      <>
                        <Search size={14} />
                        <span>Search Web & Wiki Canon</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Display Online Canon Result */}
              {onlineCanon && (
                <div className="bg-slate-900/60 border border-purple-900/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Globe size={15} className="text-purple-400" />
                      <span className="text-xs font-bold text-purple-300">
                        Official Canon: {onlineCanon.characterName}
                      </span>
                      <span className="text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800/40 px-2 py-0.5 rounded font-mono">
                        {onlineCanon.canonSource || "Wiki Source"}
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveStep(2)}
                      className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1 font-medium"
                    >
                      <span>Proceed to Logs</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Official Role & Faction</span>
                      <p className="text-slate-200 mt-0.5 font-medium">{onlineCanon.officialRole}</p>
                      <p className="text-blue-400 text-[11px] mt-0.5">{onlineCanon.officialFaction}</p>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Canonical Appearances</span>
                      <p className="text-slate-300 mt-0.5">{onlineCanon.canonicalAppearances || "Documented media"}</p>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Official Appearance</span>
                      <p className="text-slate-300 mt-0.5 leading-relaxed">{onlineCanon.officialAppearance}</p>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Official Weapons & Gear</span>
                      <p className="text-amber-300/90 mt-0.5">{onlineCanon.officialWeaponsGear || "Standard equipment"}</p>
                    </div>
                  </div>

                  {onlineCanon.officialSummary && (
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 text-xs">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Canonical Biography & Fate</span>
                      <p className="text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">{onlineCanon.officialSummary}</p>
                    </div>
                  )}

                  {onlineCanon.sources && onlineCanon.sources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-400">
                      <span className="font-mono uppercase text-slate-500">Sources:</span>
                      {onlineCanon.sources.map((s: any, idx: number) => (
                        <a
                          key={idx}
                          href={s.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-purple-400 hover:text-purple-300 underline underline-offset-2"
                        >
                          <span>{s.title || "Reference"}</span>
                          <ExternalLink size={9} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Harvest Campaign Narrative Logs */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <History size={14} className="text-teal-400" />
                    Harvest Campaign Narrative Logs
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {chatMessages.length} turns in campaign history
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Scan recent campaign turns to extract how <strong>{characterName || "the character"}</strong> actually appeared, spoke, and acted in this adventure (e.g., mortician duties, clandestine meetings, wounds, promises made).
                </p>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-400">
                    Target Subject: <strong className="text-teal-300">{characterName || "Auto-detect prominent character"}</strong>
                  </div>

                  <button
                    onClick={handleExtractLogs}
                    disabled={isExtractingLogs || chatMessages.length === 0}
                    className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
                  >
                    {isExtractingLogs ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Auditing Campaign Logs...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={14} />
                        <span>Extract from Campaign Logs</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Display Log Extraction Result */}
              {logSummary && (
                <div className="bg-slate-900/60 border border-teal-900/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <History size={15} className="text-teal-400" />
                      <span className="text-xs font-bold text-teal-300">
                        In-Story Reality: {logSummary.characterName}
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveStep(3)}
                      className="text-xs text-teal-300 hover:text-teal-200 flex items-center gap-1 font-medium"
                    >
                      <span>Proceed to Reconcile</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Campaign Role & Profession</span>
                      <p className="text-slate-200 mt-0.5 font-medium">{logSummary.campaignRole}</p>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Relationship to Protagonist</span>
                      <p className="text-pink-300/90 mt-0.5">{logSummary.relationshipWithProtagonist}</p>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Appearance Described in Chat</span>
                      <p className="text-slate-300 mt-0.5 leading-relaxed">{logSummary.campaignAppearance}</p>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Current Narrative Status</span>
                      <p className="text-emerald-400 mt-0.5">{logSummary.currentStatus}</p>
                    </div>
                  </div>

                  {logSummary.campaignActions && (
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 text-xs">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Key Actions & Deeds in Story</span>
                      <p className="text-slate-300 mt-1 leading-relaxed">{logSummary.campaignActions}</p>
                    </div>
                  )}

                  {logSummary.excerpts && logSummary.excerpts.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] uppercase font-mono text-slate-500 block">Transcript Evidentiary Excerpts</span>
                      <div className="space-y-1">
                        {logSummary.excerpts.map((exc: string, idx: number) => (
                          <div key={idx} className="bg-slate-950/80 p-2 rounded text-[11px] text-slate-300 italic border-l-2 border-teal-500">
                            "{exc}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Reconcile Canon Delta & Synthesize Granular Profile */}
          {activeStep === 3 && (
            <div className="space-y-4">
              
              {/* Configuration Controls */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <GitBranch size={14} className="text-amber-400" />
                  Timeline Stage & Continuity Divergence
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-amber-400 mb-1">
                      Continuity / Timeline Phase
                    </label>
                    <select
                      value={timelineStage}
                      onChange={(e) => setTimelineStage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none font-mono"
                    >
                      <option value="prequel">🕒 Prequel (Before Official Events)</option>
                      <option value="alternate">🔀 Alternate Timeline (Diverged Reality)</option>
                      <option value="mid-canon">⏳ Mid-Canon (Parallel to Official Events)</option>
                      <option value="sequel">⏩ Sequel (After Official Events)</option>
                      <option value="original">📖 Original / Adapted Lore</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      e.g. Set as Prequel for the Mortician narrative so Lora Bergauz is an apprentice, not yet a hardened Guild second-in-command.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Campaign Guidance & Narrative Premises
                    </label>
                    <textarea
                      rows={2}
                      value={userGuidance}
                      onChange={(e) => setUserGuidance(e.target.value)}
                      placeholder="Specify how this character fits into your unique campaign..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none resize-none font-sans"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleReconcileDelta}
                    disabled={isReconciling || !characterName.trim()}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
                  >
                    {isReconciling ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Synthesizing Canon Delta & Granular Specs...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>⚡ Compute Canon Delta & Reconcile</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Reconciled Output Display */}
              {reconciledProfile && (
                <div className="bg-slate-900/60 border border-amber-900/50 rounded-xl p-4 space-y-4">
                  
                  {/* Top Banner: Delta Summary */}
                  <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono font-bold text-amber-400 flex items-center gap-1.5">
                        <GitBranch size={13} />
                        Authoritative Campaign Delta Directive
                      </span>
                      <span className="text-[9px] bg-amber-900/60 text-amber-200 border border-amber-700/60 px-2 py-0.5 rounded font-mono uppercase">
                        {reconciledProfile.timelineStage}
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                      {reconciledProfile.canonDelta}
                    </p>
                    {reconciledProfile.aiNarratorDirective && (
                      <p className="text-[11px] text-amber-400/80 italic pt-1 border-t border-amber-900/40 font-mono">
                        Prompt Instruction: {reconciledProfile.aiNarratorDirective}
                      </p>
                    )}
                  </div>

                  {/* Granular Breakdown Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    {/* Visual & Optics */}
                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-850 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
                        <Eye size={13} />
                        <span>Visual Profile & Wardrobe</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[9px] uppercase font-mono text-slate-500 block">Build & Silhouette</span>
                          <p className="text-slate-300">{reconciledProfile.appearanceBuild || "Not specified"}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-mono text-slate-500 block">Distinguishing Marks & Hair</span>
                          <p className="text-slate-300">{reconciledProfile.distinguishingMarks || "Not specified"}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-mono text-slate-500 block">Attire & Wardrobe</span>
                          <p className="text-slate-300">{reconciledProfile.attireWardrobe || "Not specified"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Voice & Presence */}
                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-850 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400 uppercase tracking-wider border-b border-slate-850 pb-1.5">
                        <Mic size={13} />
                        <span>Voice, Cadence & Mannerisms</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[9px] uppercase font-mono text-slate-500 block">Voice & Dialogue Tone</span>
                          <p className="text-slate-300">{reconciledProfile.voiceCadence || "Not specified"}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-mono text-slate-500 block">Body Language & Quirks</span>
                          <p className="text-slate-300">{reconciledProfile.mannerisms || "Not specified"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Psychology & Motivations */}
                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-850 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-pink-400 uppercase tracking-wider border-b border-slate-850 pb-1.5">
                        <Brain size={13} />
                        <span>Psychology & Secrets</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[9px] uppercase font-mono text-slate-500 block">Temperament & Moral Lines</span>
                          <p className="text-slate-300">{reconciledProfile.temperament || "Not specified"}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-mono text-slate-500 block">Core Drives & Secrets</span>
                          <p className="text-slate-300">{reconciledProfile.motivationsSecrets || "Not specified"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Tactical Style & Gear */}
                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-850 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-850 pb-1.5">
                        <Swords size={13} />
                        <span>Tactics & Signature Items</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[9px] uppercase font-mono text-slate-500 block">Combat & Tactical Style</span>
                          <p className="text-slate-300">{reconciledProfile.tacticalStyle || "Not specified"}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-mono text-slate-500 block">Signature Gear in Possession</span>
                          <p className="text-amber-300/90">{reconciledProfile.signatureItems || "None specified"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary & Backstory Preview */}
                  <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-850 space-y-2 text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-500 block">Reconciled Overview</span>
                      <p className="text-slate-200 mt-0.5 leading-relaxed">{reconciledProfile.description}</p>
                    </div>
                    {reconciledProfile.backstory && (
                      <div className="pt-2 border-t border-slate-900">
                        <span className="text-[9px] uppercase font-mono text-teal-400 block">Reconciled Backstory</span>
                        <p className="text-slate-300 mt-0.5 leading-relaxed whitespace-pre-wrap">{reconciledProfile.backstory}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions to apply */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <div className="text-[11px] text-slate-400">
                      Ready to apply to Lore Database
                    </div>

                    <div className="flex items-center gap-2">
                      {initialCharacter && (
                        <button
                          onClick={() => handleApply(initialCharacter.id)}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
                        >
                          <Check size={14} />
                          <span>Update "{initialCharacter.name}"</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleApply(undefined)}
                        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
                      >
                        <Sparkles size={14} />
                        <span>{initialCharacter ? "Save as New Lore Profile" : "Add to Lore Database"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-850 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px]">Sliding Recency Lore Delta active</span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
          >
            Close Studio
          </button>
        </div>

      </div>
    </div>
  );
};
