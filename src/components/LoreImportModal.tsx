import React, { useState, useEffect } from "react";
import { 
  X, Globe, Link2, FileText, Sparkles, Check, CheckSquare, 
  Square, Edit3, Loader2, ExternalLink, Plus, AlertCircle, ArrowRight,
  Trash2, Filter, Layers, Sliders, Search, BookOpen
} from "lucide-react";
import { 
  LoreFact, 
  LoreCategoryInfo, 
  saveCustomCategory, 
  importLoreFacts, 
  getLoreFactsByCategory 
} from "../data/loreStore";
import { safeFetchJson } from "../utils/apiClient";

interface LoreImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: LoreCategoryInfo[];
  defaultUniverse?: string;
  onImportSuccess?: (count: number, universeName: string) => void;
  onShowToast?: (title: string, message: string, type?: "info" | "success" | "error") => void;
}

export const LoreImportModal: React.FC<LoreImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  defaultUniverse,
  onImportSuccess,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<"search" | "url" | "text">("search");
  
  // Inputs
  const [searchQuery, setSearchQuery] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>(() => {
    if (defaultUniverse && defaultUniverse !== "all") return defaultUniverse;
    return "cyberpunk";
  });
  const [isCustomUniverse, setIsCustomUniverse] = useState(false);
  const [customUniverseName, setCustomUniverseName] = useState("");
  const [customUniverseDesc, setCustomUniverseDesc] = useState("");

  // Depth & Volume Controls
  const [extractionDepth, setExtractionDepth] = useState<"brief" | "deep" | "archive">("deep");
  const [targetFactCount, setTargetFactCount] = useState<number>(18);
  const [thematicFocus, setThematicFocus] = useState<"all" | "history" | "factions" | "tech_magic" | "characters" | "secrets">("all");

  // Loading & Preview state
  const [isDistilling, setIsDistilling] = useState(false);
  const [isDistillingNextBatch, setIsDistillingNextBatch] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<number>(1);
  const [distillStage, setDistillStage] = useState<string>("Connecting to source...");
  const [distillError, setDistillError] = useState<string | null>(null);
  const [previewFacts, setPreviewFacts] = useState<LoreFact[]>([]);
  const [previewFilter, setPreviewFilter] = useState<string>("");
  const [selectedFactIds, setSelectedFactIds] = useState<Set<string>>(new Set());
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [sourceMetadata, setSourceMetadata] = useState<{
    sourceTitle?: string;
    sourceUrl?: string;
    suggestedUniverse?: string;
    suggestedCategory?: string;
  } | null>(null);

  // Success summary banner state
  const [importSuccessSummary, setImportSuccessSummary] = useState<{
    count: number;
    universe: string;
  } | null>(null);

  // Cycling progress messages during distillation
  useEffect(() => {
    if (!isDistilling && !isDistillingNextBatch) return;
    const stages = [
      activeTab === "url" ? "Connecting to wiki archive & resolving page redirects..." : "Scanning lore archives...",
      "Analyzing canonical chapters, historical milestones & timelines...",
      `Distilling ${targetFactCount} verified "Did you know?" canon facts with lore tags...`,
      "Synthesizing encyclopedic archive..."
    ];
    let idx = 0;
    setDistillStage(stages[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setDistillStage(stages[idx]);
    }, 2800);
    return () => clearInterval(timer);
  }, [isDistilling, isDistillingNextBatch, activeTab, targetFactCount]);

  if (!isOpen) return null;

  const handleSetDepth = (depth: "brief" | "deep" | "archive") => {
    setExtractionDepth(depth);
    if (depth === "brief") setTargetFactCount(10);
    else if (depth === "deep") setTargetFactCount(18);
    else if (depth === "archive") setTargetFactCount(28);
  };

  const handleStartDistill = async () => {
    setDistillError(null);
    setImportSuccessSummary(null);
    let payload: any = {
      count: targetFactCount,
      depth: extractionDepth,
      thematicFocus: thematicFocus,
      batchNumber: 1
    };

    if (activeTab === "search") {
      if (!searchQuery.trim()) {
        onShowToast?.("Missing Topic", "Please enter a topic, entity, or lore query to search the net.", "info");
        return;
      }
      payload.query = searchQuery.trim();
    } else if (activeTab === "url") {
      if (!webUrl.trim()) {
        onShowToast?.("Missing URL", "Please enter a valid web URL or wiki link.", "info");
        return;
      }
      payload.url = webUrl.trim();
    } else {
      if (!rawText.trim()) {
        onShowToast?.("Missing Text", "Please paste lore notes or source text to distill.", "info");
        return;
      }
      payload.rawText = rawText.trim();
    }

    // Determine target universe and category
    let targetCatSlug = selectedUniverseId;
    if (isCustomUniverse && customUniverseName.trim()) {
      targetCatSlug = customUniverseName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      payload.targetUniverse = customUniverseName.trim();
      payload.targetCategory = targetCatSlug;
    } else {
      const chosenCat = categories.find(c => c.id === selectedUniverseId);
      if (chosenCat && chosenCat.id !== "all") {
        targetCatSlug = chosenCat.id;
        payload.targetUniverse = chosenCat.name;
        payload.targetCategory = chosenCat.id;
      }
    }

    // Ground against already-saved facts in this codex category to avoid repeats
    const existingCodexFacts = getLoreFactsByCategory(targetCatSlug).map(f => f.fact);
    if (existingCodexFacts.length > 0) {
      payload.existingFacts = existingCodexFacts.slice(0, 50);
    }

    setIsDistilling(true);
    setCurrentBatch(1);

    try {
      const data = await safeFetchJson<any>("/api/lore/distill-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeout: 90000
      });

      if (!data.facts || !Array.isArray(data.facts) || data.facts.length === 0) {
        throw new Error("No lore facts could be synthesized from this source.");
      }

      setSourceMetadata({
        sourceTitle: data.sourceTitle,
        sourceUrl: data.sourceUrl,
        suggestedUniverse: data.suggestedUniverse,
        suggestedCategory: data.suggestedCategory
      });

      // If user hadn't entered a custom universe name and model suggested one, prefill it
      if (isCustomUniverse && !customUniverseName && data.suggestedUniverse) {
        setCustomUniverseName(data.suggestedUniverse);
      }

      setPreviewFacts(data.facts);
      setSelectedFactIds(new Set(data.facts.map((f: LoreFact) => f.id)));
      onShowToast?.("Lore Distilled", `Extracted Batch #1 (${data.facts.length} lore entries)!`, "success");
    } catch (err: any) {
      console.error("Lore distillation error:", err);
      setDistillError(err.message || "Failed to distill lore from source.");
      onShowToast?.("Distillation Failed", err.message || "Could not extract lore from source.", "error");
    } finally {
      setIsDistilling(false);
    }
  };

  const handleDistillNextBatch = async () => {
    if (isDistilling || isDistillingNextBatch) return;
    setIsDistillingNextBatch(true);
    setDistillError(null);

    const nextBatch = currentBatch + 1;

    let payload: any = {
      count: targetFactCount,
      depth: extractionDepth,
      thematicFocus: thematicFocus,
      batchNumber: nextBatch
    };

    if (activeTab === "search") {
      payload.query = searchQuery.trim();
    } else if (activeTab === "url") {
      payload.url = webUrl.trim();
    } else {
      payload.rawText = rawText.trim();
    }

    // Determine target universe and category
    let targetCatSlug = selectedUniverseId;
    if (isCustomUniverse && customUniverseName.trim()) {
      targetCatSlug = customUniverseName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      payload.targetUniverse = customUniverseName.trim();
      payload.targetCategory = targetCatSlug;
    } else {
      const chosenCat = categories.find(c => c.id === selectedUniverseId);
      if (chosenCat && chosenCat.id !== "all") {
        targetCatSlug = chosenCat.id;
        payload.targetUniverse = chosenCat.name;
        payload.targetCategory = chosenCat.id;
      }
    }

    // Combine preview facts and existing codex facts to ensure deduplication
    const previewTexts = previewFacts.map(f => f.fact);
    const existingCodexFacts = getLoreFactsByCategory(targetCatSlug).map(f => f.fact);
    const avoidCombined = Array.from(new Set([...previewTexts, ...existingCodexFacts]));
    payload.existingFacts = avoidCombined.slice(0, 70);

    try {
      const data = await safeFetchJson<any>("/api/lore/distill-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeout: 90000
      });

      if (!data.facts || !Array.isArray(data.facts) || data.facts.length === 0) {
        throw new Error("No additional canonical facts could be found for this batch.");
      }

      // Filter out duplicates against existing preview
      const existingSet = new Set(previewFacts.map(f => f.fact.trim().toLowerCase()));
      const newUniqueFacts: LoreFact[] = data.facts.filter((f: LoreFact) => !existingSet.has(f.fact.trim().toLowerCase()));

      if (newUniqueFacts.length === 0) {
        onShowToast?.("All Canon Distilled", "All primary and secondary lore entries from this source have been captured!", "info");
        return;
      }

      setPreviewFacts(prev => [...prev, ...newUniqueFacts]);
      setSelectedFactIds(prev => {
        const next = new Set(prev);
        newUniqueFacts.forEach(f => next.add(f.id));
        return next;
      });
      setCurrentBatch(nextBatch);
      onShowToast?.(
        `Batch #${nextBatch} Added!`,
        `Distilled ${newUniqueFacts.length} new facts! Total in list: ${previewFacts.length + newUniqueFacts.length}`,
        "success"
      );
    } catch (err: any) {
      console.error("Batch distillation error:", err);
      onShowToast?.("Batch Distillation Error", err.message || "Failed to distill next batch.", "error");
    } finally {
      setIsDistillingNextBatch(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedFactIds.size === previewFacts.length) {
      setSelectedFactIds(new Set());
    } else {
      setSelectedFactIds(new Set(previewFacts.map(f => f.id)));
    }
  };

  const toggleFactSelected = (id: string) => {
    setSelectedFactIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteFact = (id: string) => {
    setPreviewFacts(prev => prev.filter(f => f.id !== id));
    setSelectedFactIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleUpdateFactText = (id: string, newText: string) => {
    setPreviewFacts(prev => prev.map(f => f.id === id ? { ...f, fact: newText } : f));
  };

  const handleCommitImport = () => {
    const factsToImport = previewFacts.filter(f => selectedFactIds.has(f.id));
    if (factsToImport.length === 0) {
      onShowToast?.("No Facts Selected", "Please check at least one lore fact to import.", "info");
      return;
    }

    let targetCatInfo: LoreCategoryInfo | undefined = undefined;

    // Create custom category if specified or suggested
    if (isCustomUniverse && customUniverseName.trim()) {
      const slug = customUniverseName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      targetCatInfo = {
        id: slug,
        name: customUniverseName.trim(),
        description: customUniverseDesc.trim() || `Canon lore archives for ${customUniverseName.trim()}.`,
        iconName: "Globe",
        color: "purple",
        isCustom: true
      };
      saveCustomCategory(targetCatInfo);
    }

    const { importedCount } = importLoreFacts(factsToImport, targetCatInfo);

    const universeLabel = targetCatInfo?.name || 
      categories.find(c => c.id === selectedUniverseId)?.name || 
      sourceMetadata?.suggestedUniverse || 
      "Codex";

    onShowToast?.("Lore Added to Codex", `Successfully imported ${importedCount} verified lore facts into ${universeLabel}!`, "success");
    if (onImportSuccess) {
      onImportSuccess(importedCount, universeLabel);
    }
    
    // Set success summary state so the user can easily choose to distill another batch or finish
    setImportSuccessSummary({ count: importedCount, universe: universeLabel });
  };

  const filteredPreviewFacts = previewFacts.filter(fact => {
    if (!previewFilter.trim()) return true;
    const q = previewFilter.toLowerCase();
    return fact.fact.toLowerCase().includes(q) ||
      fact.universe.toLowerCase().includes(q) ||
      fact.tags?.some(t => t.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
              <Sparkles size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Import Lore Sources from the Net</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/30">
                  NotebookLM Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pull in web research, wiki pages, or source notes to distill rich, verified lore facts for your Codex.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {importSuccessSummary ? (
            /* Post-Import Success & Next Batch Workflow */
            <div className="py-10 px-4 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-300 shadow-lg shadow-emerald-950/50">
                <Check size={32} />
              </div>
              
              <div className="space-y-2 max-w-lg mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
                    Import Confirmed
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/30 text-[11px] font-mono text-purple-300">
                    Batch #{currentBatch}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {importSuccessSummary.count} Canon Facts Added to {importSuccessSummary.universe}!
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your verified lore entries have been permanently cataloged in the Codex.
                </p>
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/25 text-left text-xs text-purple-200/90 space-y-1 mt-3">
                  <div className="font-semibold text-purple-300 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-300" />
                    <span>Want to distill another {targetFactCount} facts right away?</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    You can distill another batch immediately. The archivist will automatically ground against the {importSuccessSummary.count} facts you just saved to unearth brand-new, non-repeating canon details and secondary lore.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    setImportSuccessSummary(null);
                    setPreviewFacts([]);
                    setSelectedFactIds(new Set());
                    handleStartDistill();
                  }}
                  className="w-full sm:flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles size={14} className="text-amber-300" />
                  <span>Distill Another {targetFactCount} Facts</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
                >
                  Explore Codex
                </button>
              </div>
            </div>
          ) : previewFacts.length === 0 ? (
            <>
              {/* Source Input Mode Tabs */}
              <div className="flex rounded-xl bg-slate-950/80 p-1 border border-purple-500/20">
                <button
                  onClick={() => { setActiveTab("search"); setDistillError(null); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeTab === "search"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Globe size={14} />
                  <span>Web Topic Research</span>
                </button>
                <button
                  onClick={() => { setActiveTab("url"); setDistillError(null); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeTab === "url"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Link2 size={14} />
                  <span>Web Link / Wiki URL</span>
                </button>
                <button
                  onClick={() => { setActiveTab("text"); setDistillError(null); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeTab === "text"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileText size={14} />
                  <span>Pasted Source Notes</span>
                </button>
              </div>

              {/* Tab 1: Web Research Query */}
              {activeTab === "search" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Globe size={14} className="text-purple-400" />
                    <span>Search Query / Lore Topic</span>
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setDistillError(null); }}
                    onKeyDown={e => { if (e.key === "Enter") handleStartDistill(); }}
                    placeholder="e.g. Warhammer 40k Grey Knights origin, Eberron Mourning, Mistborn Allomancy..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 mr-1">Quick Suggestions:</span>
                    {[
                      "Cyberpunk 2077 Arasaka Corporation",
                      "Warhammer 40k Grey Knights",
                      "Star Wars Darth Vader Canon",
                      "D&D Mind Flayers & Elder Brains"
                    ].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setSearchQuery(preset);
                          setDistillError(null);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:bg-purple-900/60 hover:text-white transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Nyx analyzes canon lore, factions, secrets, and timeline events to generate verified "Did you know?" facts.
                  </p>
                </div>
              )}

              {/* Tab 2: Web URL */}
              {activeTab === "url" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Link2 size={14} className="text-purple-400" />
                    <span>Web Page or Wiki Link</span>
                  </label>
                  <input
                    type="url"
                    value={webUrl}
                    onChange={e => { setWebUrl(e.target.value); setDistillError(null); }}
                    onKeyDown={e => { if (e.key === "Enter") handleStartDistill(); }}
                    placeholder="https://starwars.fandom.com/wiki/Darth_Vader or https://en.wikipedia.org/wiki/Cyberpunk"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 mr-1">Examples:</span>
                    {[
                      { label: "Star Wars: Darth Vader (Fandom)", url: "https://starwars.fandom.com/wiki/Darth_Vader" },
                      { label: "Wikipedia: Cyberpunk", url: "https://en.wikipedia.org/wiki/Cyberpunk" }
                    ].map(ex => (
                      <button
                        key={ex.url}
                        type="button"
                        onClick={() => {
                          setWebUrl(ex.url);
                          setDistillError(null);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:bg-purple-900/60 hover:text-white transition-colors cursor-pointer"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Paste any public article, lore guide, or Fandom/Wikipedia link. MediaWiki content is parsed directly for comprehensive coverage.
                  </p>
                </div>
              )}

              {/* Tab 3: Raw Source Text */}
              {activeTab === "text" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText size={14} className="text-purple-400" />
                    <span>Paste Lore Excerpt / Source Document</span>
                  </label>
                  <textarea
                    rows={6}
                    value={rawText}
                    onChange={e => { setRawText(e.target.value); setDistillError(null); }}
                    placeholder="Paste chapter notes, campaign setting documents, PDF transcripts, or world handouts here..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 font-mono"
                  />
                </div>
              )}

              {/* Extraction Volume & Depth Settings */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                    <Layers size={14} className="text-purple-400" />
                    <span>Extraction Depth & Fact Volume</span>
                  </span>
                  <span className="text-xs font-mono text-purple-400 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30">
                    Target: {targetFactCount} Facts
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetDepth("brief")}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      extractionDepth === "brief"
                        ? "bg-purple-600/25 border-purple-500 text-white shadow-sm"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-purple-500/30 hover:text-slate-200"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>Quick Essence</span>
                      <span className="text-[10px] font-mono text-purple-300">~10 facts</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Core overview and key highlights.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetDepth("deep")}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer relative ${
                      extractionDepth === "deep"
                        ? "bg-purple-600/25 border-purple-500 text-white shadow-sm"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-purple-500/30 hover:text-slate-200"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>Deep Chronicle</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans">
                          Recommended
                        </span>
                      </span>
                      <span className="text-[10px] font-mono text-purple-300">~18 facts</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Broad coverage of history, factions, gear, and figures.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetDepth("archive")}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      extractionDepth === "archive"
                        ? "bg-purple-600/25 border-purple-500 text-white shadow-sm"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-purple-500/30 hover:text-slate-200"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>Full Archive</span>
                      <span className="text-[10px] font-mono text-purple-300">~28 facts</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Exhaustive breakdown for full wiki articles.
                    </p>
                  </button>
                </div>

                {/* Fine-tuning Slider */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                      <Sliders size={12} className="text-purple-400" />
                      <span>Quantity per Batch:</span>
                    </span>
                    <input
                      type="range"
                      min={6}
                      max={35}
                      value={targetFactCount}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        setTargetFactCount(val);
                        if (val <= 12) setExtractionDepth("brief");
                        else if (val <= 22) setExtractionDepth("deep");
                        else setExtractionDepth("archive");
                      }}
                      className="flex-1 accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono text-purple-300 w-16 text-right font-bold">
                      {targetFactCount} facts
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                    <span>Single batch limit: 35 facts</span>
                    <span className="text-purple-300/90 font-medium">✨ Sequential distillation: chain multiple batches of 35 for 70, 105+ facts</span>
                  </div>
                </div>
              </div>

              {/* Thematic Focus & Target Universe Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Thematic Focus */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-500/20 space-y-2.5">
                  <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                    <Filter size={13} className="text-purple-400" />
                    <span>Thematic Focus</span>
                  </span>
                  <select
                    value={thematicFocus}
                    onChange={e => setThematicFocus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    <option value="all">Comprehensive / Balanced (All Lore)</option>
                    <option value="history">History, Eras & Major Battles</option>
                    <option value="factions">Factions, Orders & Societies</option>
                    <option value="tech_magic">Weapons, Cyberware, Tech & Magic</option>
                    <option value="characters">Key Figures, Lineages & Leaders</option>
                    <option value="secrets">Secrets, Mysteries & Obscure Canon</option>
                  </select>
                  <p className="text-[11px] text-slate-400">
                    Guides Nyx's canon extractor to prioritize specific aspects of the source material.
                  </p>
                </div>

                {/* Target Universe */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                      <BookOpen size={13} className="text-purple-400" />
                      <span>Target Universe</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomUniverse(!isCustomUniverse)}
                      className="text-[11px] text-purple-400 hover:text-purple-200 font-semibold cursor-pointer"
                    >
                      {isCustomUniverse ? "Use Existing" : "+ New Universe"}
                    </button>
                  </div>

                  {!isCustomUniverse ? (
                    <div>
                      <select
                        value={selectedUniverseId}
                        onChange={e => setSelectedUniverseId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-400 cursor-pointer"
                      >
                        {categories.filter(c => c.id !== "all").map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.isCustom ? "(Custom)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={customUniverseName}
                        onChange={e => setCustomUniverseName(e.target.value)}
                        placeholder="New Universe Name (e.g. Star Wars, Dune)..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-400"
                      />
                      <input
                        type="text"
                        value={customUniverseDesc}
                        onChange={e => setCustomUniverseDesc(e.target.value)}
                        placeholder="Short Description (optional)..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* Ingestion Progress State */}
              {isDistilling && (
                <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <Loader2 size={20} className="animate-spin text-purple-300 shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-200">
                        Distilling {targetFactCount} Canonical Facts with NotebookLM Engine...
                      </div>
                      <div className="text-[11px] text-purple-300/80 font-mono mt-0.5">
                        {distillStage}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full w-2/3 animate-pulse rounded-full" />
                  </div>
                </div>
              )}

              {distillError && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{distillError}</span>
                </div>
              )}
            </>
          ) : (
            /* Review & Edit Distilled Facts State */
            <div className="space-y-4">
              
              {/* Summary Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-purple-950/40 border border-purple-500/30">
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2 flex-wrap">
                    <span className="text-purple-300 font-mono text-sm">
                      {previewFacts.length} Facts in Review
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/40 text-[10px] font-mono text-purple-200">
                      Batch #{currentBatch}
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="truncate max-w-xs">{sourceMetadata?.sourceTitle || "Wiki Source"}</span>
                    {sourceMetadata?.sourceUrl && (
                      <a
                        href={sourceMetadata.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-400 hover:text-purple-200 flex items-center gap-0.5 shrink-0"
                        title="Open source URL"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-purple-300/80 mt-0.5">
                    Target Universe: <span className="font-semibold text-slate-200">{customUniverseName || sourceMetadata?.suggestedUniverse || categories.find(c => c.id === selectedUniverseId)?.name || "Custom"}</span> &bull; {selectedFactIds.size} of {previewFacts.length} selected for import
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDistillNextBatch}
                    disabled={isDistilling || isDistillingNextBatch}
                    className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-xs font-semibold text-purple-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    title={`Extract another ${targetFactCount} distinct facts and append to this list`}
                  >
                    {isDistillingNextBatch ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-purple-300" />
                        <span>Distilling Batch #{currentBatch + 1}...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} className="text-purple-300" />
                        <span>+ Distill Another {targetFactCount} (Batch {currentBatch + 1})</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={toggleSelectAll}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {selectedFactIds.size === previewFacts.length ? <CheckSquare size={14} className="text-purple-400" /> : <Square size={14} />}
                    <span>{selectedFactIds.size === previewFacts.length ? "Deselect All" : "Select All"}</span>
                  </button>

                  <button
                    onClick={() => { setPreviewFacts([]); setSelectedFactIds(new Set()); setPreviewFilter(""); setCurrentBatch(1); }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  >
                    Start Over
                  </button>
                </div>
              </div>

              {/* Distilling Next Batch In-Progress Alert */}
              {isDistillingNextBatch && (
                <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-xs text-purple-200 flex items-center gap-3 animate-pulse">
                  <Loader2 size={16} className="animate-spin text-amber-300 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>Distilling Batch #{currentBatch + 1} ({targetFactCount} canon facts)...</span>
                    </div>
                    <p className="text-[11px] text-purple-300/80 mt-0.5">
                      Archivist is examining deeper chapters and automatically deduplicating against your {previewFacts.length} active facts to avoid repeats.
                    </p>
                  </div>
                </div>
              )}

              {/* Filter / Search within preview facts */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={previewFilter}
                  onChange={e => setPreviewFilter(e.target.value)}
                  placeholder="Filter extracted facts by keyword, tag, or character..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-purple-500/20 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
                {previewFilter && (
                  <button
                    onClick={() => setPreviewFilter("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* List of Distilled Facts */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredPreviewFacts.map((fact, index) => {
                  const isSelected = selectedFactIds.has(fact.id);
                  const isEditing = editingFactId === fact.id;

                  return (
                    <div
                      key={fact.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-slate-950/70 border-purple-500/40 shadow-sm"
                          : "bg-slate-950/30 border-slate-800 opacity-55"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleFactSelected(fact.id)}
                          className="mt-1 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer shrink-0"
                          title={isSelected ? "Uncheck fact" : "Check fact"}
                        >
                          {isSelected ? <CheckSquare size={16} className="text-purple-400" /> : <Square size={16} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[11px] font-mono text-purple-300 font-semibold">
                              Fact #{index + 1} &bull; {fact.universe}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingFactId(isEditing ? null : fact.id)}
                                className="text-[11px] text-slate-400 hover:text-purple-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Edit3 size={11} />
                                <span>{isEditing ? "Done" : "Edit"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFact(fact.id)}
                                className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Remove this fact from list"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          {isEditing ? (
                            <textarea
                              rows={3}
                              value={fact.fact}
                              onChange={e => handleUpdateFactText(fact.id, e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-purple-500/40 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-sans mt-1"
                            />
                          ) : (
                            <p className="text-xs text-slate-200 leading-relaxed font-sans">
                              {fact.fact}
                            </p>
                          )}

                          {fact.tags && fact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {fact.tags.map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setPreviewFilter(t)}
                                  className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 hover:bg-purple-950 text-slate-400 hover:text-purple-300 border border-slate-800 hover:border-purple-500/40 transition-colors cursor-pointer"
                                >
                                  #{t}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredPreviewFacts.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                    No facts match the search filter "{previewFilter}".
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-purple-500/20 bg-slate-950/70 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {importSuccessSummary ? "Close" : "Cancel"}
          </button>

          {importSuccessSummary ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setImportSuccessSummary(null);
                  setPreviewFacts([]);
                  setSelectedFactIds(new Set());
                  handleStartDistill();
                }}
                className="px-4 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-xs font-semibold text-purple-200 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>+ Distill Another {targetFactCount} Facts</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Check size={14} className="text-emerald-300" />
                <span>Done / View Codex</span>
              </button>
            </div>
          ) : previewFacts.length === 0 ? (
            <button
              onClick={handleStartDistill}
              disabled={isDistilling}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              {isDistilling ? (
                <>
                  <Loader2 size={14} className="animate-spin text-purple-200" />
                  <span>Distilling {targetFactCount} Facts...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-amber-300" />
                  <span>Distill {targetFactCount} Lore Facts</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDistillNextBatch}
                disabled={isDistilling || isDistillingNextBatch}
                className="px-4 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-xs font-semibold text-purple-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDistillingNextBatch ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-purple-300" />
                    <span>Distilling Batch #{currentBatch + 1}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-amber-400" />
                    <span>+ Distill {targetFactCount} More (Batch {currentBatch + 1})</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCommitImport}
                disabled={selectedFactIds.size === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Check size={14} className="text-emerald-300" />
                <span>Import {selectedFactIds.size} Facts to Codex</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
