import React, { useState } from "react";
import { 
  X, Globe, Link2, FileText, Sparkles, Check, CheckSquare, 
  Square, Edit3, Loader2, ExternalLink, Plus, AlertCircle, ArrowRight
} from "lucide-react";
import { LoreFact, LoreCategoryInfo, saveCustomCategory, importLoreFacts } from "../data/loreStore";

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

  // Loading & Preview state
  const [isDistilling, setIsDistilling] = useState(false);
  const [distillError, setDistillError] = useState<string | null>(null);
  const [previewFacts, setPreviewFacts] = useState<LoreFact[]>([]);
  const [selectedFactIds, setSelectedFactIds] = useState<Set<string>>(new Set());
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [sourceMetadata, setSourceMetadata] = useState<{
    sourceTitle?: string;
    sourceUrl?: string;
    suggestedUniverse?: string;
    suggestedCategory?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleStartDistill = async () => {
    setDistillError(null);
    let payload: any = {};

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
    if (isCustomUniverse && customUniverseName.trim()) {
      payload.targetUniverse = customUniverseName.trim();
      payload.targetCategory = customUniverseName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    } else {
      const chosenCat = categories.find(c => c.id === selectedUniverseId);
      if (chosenCat && chosenCat.id !== "all") {
        payload.targetUniverse = chosenCat.name;
        payload.targetCategory = chosenCat.id;
      }
    }

    setIsDistilling(true);

    try {
      const resp = await fetch("/api/lore/distill-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${resp.status}`);
      }

      const data = await resp.json();
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
      onShowToast?.("Lore Distilled", `Extracted ${data.facts.length} lore entries from source!`, "success");
    } catch (err: any) {
      console.error("Lore distillation error:", err);
      setDistillError(err.message || "Failed to distill lore from source.");
      onShowToast?.("Distillation Failed", err.message || "Could not extract lore from source.", "error");
    } finally {
      setIsDistilling(false);
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
    onClose();
  };

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
                Pull in web research, wiki URLs, or source notes to distill canonical lore facts for your Codex.
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
          
          {previewFacts.length === 0 ? (
            <>
              {/* Source Input Mode Tabs */}
              <div className="flex rounded-xl bg-slate-950/80 p-1 border border-purple-500/20">
                <button
                  onClick={() => setActiveTab("search")}
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
                  onClick={() => setActiveTab("url")}
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
                  onClick={() => setActiveTab("text")}
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
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="e.g. Warhammer 40k Grey Knights origin, Eberron Mourning, Mistborn Allomancy..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    Nyx uses Gemini with Google Search to scan live internet sources, extracting canon secrets and timeline facts.
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
                    onChange={e => setWebUrl(e.target.value)}
                    placeholder="https://fandom.com/wiki/... or https://en.wikipedia.org/wiki/..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    Paste any public article, lore guide, or wiki entry. The server fetches and distills the page text directly.
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
                    onChange={e => setRawText(e.target.value)}
                    placeholder="Paste chapter notes, campaign setting documents, PDF transcripts, or world handouts here..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 font-mono"
                  />
                </div>
              )}

              {/* Target Universe & Category Configuration */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                    <span>Target Lore Universe / Category</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCustomUniverse(!isCustomUniverse)}
                    className="text-xs text-purple-400 hover:text-purple-200 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {isCustomUniverse ? "Choose Existing Universe" : "+ Create New Universe"}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[11px] text-slate-400 mb-1 block">New Universe Name</label>
                      <input
                        type="text"
                        value={customUniverseName}
                        onChange={e => setCustomUniverseName(e.target.value)}
                        placeholder="e.g. The Culture, Exandria, Percy Jackson..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 mb-1 block">Short Description</label>
                      <input
                        type="text"
                        value={customUniverseDesc}
                        onChange={e => setCustomUniverseDesc(e.target.value)}
                        placeholder="e.g. Iain M. Banks utopian space opera..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {distillError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-400" />
                  <span>{distillError}</span>
                </div>
              )}
            </>
          ) : (
            /* Review & Edit Distilled Facts State */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl bg-purple-950/40 border border-purple-500/25">
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <span>Source: {sourceMetadata?.sourceTitle || "Web Lore Extract"}</span>
                    {sourceMetadata?.sourceUrl && (
                      <a
                        href={sourceMetadata.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-400 hover:text-purple-200 flex items-center gap-0.5"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-purple-300/80">
                    Review and edit distilled lore facts before saving into your Codex.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={toggleSelectAll}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {selectedFactIds.size === previewFacts.length ? <CheckSquare size={13} className="text-purple-400" /> : <Square size={13} />}
                    <span>{selectedFactIds.size === previewFacts.length ? "Deselect All" : "Select All"}</span>
                  </button>
                  <button
                    onClick={() => { setPreviewFacts([]); setSelectedFactIds(new Set()); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  >
                    Distill Another Source
                  </button>
                </div>
              </div>

              {/* List of Distilled Facts */}
              <div className="space-y-3">
                {previewFacts.map((fact, index) => {
                  const isSelected = selectedFactIds.has(fact.id);
                  const isEditing = editingFactId === fact.id;

                  return (
                    <div
                      key={fact.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-slate-950/70 border-purple-500/40 shadow-sm"
                          : "bg-slate-950/30 border-slate-800 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleFactSelected(fact.id)}
                          className="mt-1 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer shrink-0"
                        >
                          {isSelected ? <CheckSquare size={16} className="text-purple-400" /> : <Square size={16} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[11px] font-mono text-purple-300 font-semibold">
                              Fact #{index + 1} &bull; {fact.universe}
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingFactId(isEditing ? null : fact.id)}
                              className="text-[11px] text-slate-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 size={12} />
                              <span>{isEditing ? "Done" : "Edit"}</span>
                            </button>
                          </div>

                          {isEditing ? (
                            <textarea
                              rows={3}
                              value={fact.fact}
                              onChange={e => handleUpdateFactText(fact.id, e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-purple-500/30 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-sans"
                            />
                          ) : (
                            <p className="text-xs text-slate-200 leading-relaxed font-sans">
                              {fact.fact}
                            </p>
                          )}

                          {fact.tags && fact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {fact.tags.map(t => (
                                <span key={t} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
            Cancel
          </button>

          {previewFacts.length === 0 ? (
            <button
              onClick={handleStartDistill}
              disabled={isDistilling}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              {isDistilling ? (
                <>
                  <Loader2 size={14} className="animate-spin text-purple-200" />
                  <span>Distilling Canon Lore...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-amber-300" />
                  <span>Distill Lore Facts</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleCommitImport}
              disabled={selectedFactIds.size === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Check size={14} className="text-emerald-300" />
              <span>Import {selectedFactIds.size} Facts to Codex</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
