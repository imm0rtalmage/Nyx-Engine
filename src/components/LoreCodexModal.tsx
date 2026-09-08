import React, { useState, useMemo } from "react";
import { 
  X, Search, Sparkles, BookOpen, Bookmark, 
  Copy, Check, Dices, Layers, ExternalLink, Plus,
  Globe, Edit3, Trash2, RotateCcw, Sliders, Settings2,
  CheckCircle2, ArrowUpRight
} from "lucide-react";
import { 
  useLoreStore, 
  LoreFact, 
  LoreCategoryInfo, 
  getCategoryFactCount, 
  deleteCustomCategory 
} from "../data/loreStore";
import { LoreImportModal } from "./LoreImportModal";
import { LoreFactEditModal } from "./LoreFactEditModal";
import { LoreCategoryModal } from "./LoreCategoryModal";
import { CampaignLoreIndexModal } from "./CampaignLoreIndexModal";

interface LoreCodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUniverse?: string;
  currentCampaign?: {
    id?: string;
    name?: string;
    activeFactIndexes?: string[];
  };
  onUpdateCampaignIndexes?: (indexes: string[]) => void;
  onShowToast?: (title: string, message: string, type?: "info" | "success" | "error") => void;
}

export const LoreCodexModal: React.FC<LoreCodexModalProps> = ({
  isOpen,
  onClose,
  activeUniverse,
  currentCampaign,
  onUpdateCampaignIndexes,
  onShowToast
}) => {
  const {
    allFacts,
    allCategories,
    customFacts,
    customCategories,
    saveFact,
    deleteFact,
    resetFactToDefault,
    saveCategory,
    deleteCategory
  } = useLoreStore();

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (activeUniverse && activeUniverse !== "all") {
      const match = allCategories.find(c => 
        c.id.toLowerCase() === activeUniverse.toLowerCase() ||
        c.name.toLowerCase() === activeUniverse.toLowerCase()
      );
      if (match) return match.id;
    }
    return "all";
  });

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("nyx_lore_bookmarks");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [randomHighlightId, setRandomHighlightId] = useState<string | null>(null);

  // Sub-modal states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFactEditOpen, setIsFactEditOpen] = useState(false);
  const [editingFact, setEditingFact] = useState<LoreFact | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LoreCategoryInfo | null>(null);

  const [isCampaignIndexModalOpen, setIsCampaignIndexModalOpen] = useState(false);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem("nyx_lore_bookmarks", JSON.stringify(Array.from(next)));
      } catch (err) {
        console.warn("Could not save bookmark to local storage:", err);
      }
      return next;
    });
  };

  const handleCopyFact = (fact: LoreFact) => {
    try {
      navigator.clipboard.writeText(fact.fact);
      setCopiedId(fact.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn("Failed to copy fact:", err);
    }
  };

  const filteredFacts = useMemo(() => {
    let list = allFacts;

    if (selectedCategory === "bookmarks") {
      list = list.filter(f => bookmarkedIds.has(f.id));
    } else if (selectedCategory === "custom") {
      list = list.filter(f => f.isCustom || f.isEdited);
    } else if (selectedCategory !== "all") {
      list = list.filter(f => f.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(f =>
        f.fact.toLowerCase().includes(q) ||
        f.universe.toLowerCase().includes(q) ||
        f.tags.some(t => t.toLowerCase().includes(q)) ||
        (f.sourceTitle && f.sourceTitle.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allFacts, selectedCategory, searchQuery, bookmarkedIds]);

  const handleSurpriseMe = () => {
    if (filteredFacts.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredFacts.length);
    const chosen = filteredFacts[randomIndex];
    setRandomHighlightId(chosen.id);

    // Scroll to element
    setTimeout(() => {
      const el = document.getElementById(`lore-card-${chosen.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    setTimeout(() => setRandomHighlightId(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-4 sm:px-6 py-3.5 border-b border-purple-500/20 bg-slate-950/70 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">Lore Archives & Canon Codex</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/30">
                  {allFacts.length} Entries
                </span>
                {customFacts.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                    {customFacts.length} Custom / Imported
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 line-clamp-1">
                Import external web sources, edit universe facts, manage custom universes, and customize campaign indices.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Import Sources Button (NotebookLM style) */}
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/40 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-950/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Import facts from web searches, URLs, or raw text (NotebookLM style distillation)"
            >
              <Globe size={14} className="text-cyan-200" />
              <span>Import Lore</span>
            </button>

            {/* Create New Fact */}
            <button
              onClick={() => {
                setEditingFact(null);
                setIsFactEditOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Add a custom lore fact manually"
            >
              <Plus size={14} className="text-emerald-400" />
              <span>New Fact</span>
            </button>

            {/* Manage Universes */}
            <button
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/60 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="Create or manage custom universes and categories"
            >
              <Layers size={13} className="text-purple-400" />
              <span className="hidden sm:inline">Universes</span>
            </button>

            {/* Campaign Fact Index Setting (If campaign provided or callback exists) */}
            {onUpdateCampaignIndexes && (
              <button
                onClick={() => setIsCampaignIndexModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 text-amber-200 border border-amber-500/40 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                title="Configure which lore fact indices apply to your active campaign"
              >
                <Sliders size={13} className="text-amber-400" />
                <span className="hidden md:inline">Campaign Index</span>
              </button>
            )}

            {/* Surprise Me */}
            <button
              onClick={handleSurpriseMe}
              className="px-2.5 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/50 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Pick a random fascinating lore fact"
            >
              <Dices size={14} className="text-amber-400" />
              <span className="hidden sm:inline">Random</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer ml-1"
              title="Close Lore Codex"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-purple-500/15 bg-slate-950/40 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search lore by topic, entity, author, weapon, source, or setting..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-purple-500/20 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Custom/Imported Only filter */}
            {customFacts.length > 0 && (
              <button
                onClick={() => setSelectedCategory(selectedCategory === "custom" ? "all" : "custom")}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  selectedCategory === "custom"
                    ? "bg-cyan-950/80 text-cyan-200 border-cyan-500/50 shadow-sm shadow-cyan-950/40"
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/50"
                }`}
              >
                <Sparkles size={13} className="text-cyan-400" />
                <span>Custom / Imported ({customFacts.length})</span>
              </button>
            )}

            {/* Bookmarks toggle */}
            <button
              onClick={() => setSelectedCategory(selectedCategory === "bookmarks" ? "all" : "bookmarks")}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                selectedCategory === "bookmarks"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10"
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/50"
              }`}
            >
              <Bookmark size={13} className={bookmarkedIds.size > 0 ? "fill-amber-400 text-amber-400" : ""} />
              <span>Saved ({bookmarkedIds.size})</span>
            </button>
          </div>
        </div>

        {/* Universe Category Pills */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/20 border-b border-purple-500/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === "all"
                ? "bg-purple-600 text-white font-semibold shadow-sm"
                : "bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            All Universes ({allFacts.length})
          </button>
          
          {allCategories.filter(c => c.id !== "all").map(cat => {
            const count = getCategoryFactCount(cat.id);
            const isSelected = selectedCategory === cat.id;
            return (
              <div key={cat.id} className="flex items-center">
                <button
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-purple-600 text-white font-semibold shadow-sm shadow-purple-600/30"
                      : "bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cat.isCustom && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Custom Universe" />}
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-purple-800 text-purple-200" : "bg-slate-900 text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              </div>
            );
          })}

          {/* Quick "+ Universe" Button */}
          <button
            onClick={() => {
              setEditingCategory(null);
              setIsCategoryModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 text-purple-300 hover:text-purple-100 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/40 transition-all cursor-pointer shrink-0"
            title="Create a new Universe / Category"
          >
            <Plus size={12} />
            <span>New Universe</span>
          </button>
        </div>

        {/* Content Body: Grid of Lore Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredFacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 gap-3">
              <BookOpen size={36} className="text-slate-600 stroke-[1.5]" />
              <p className="text-sm font-semibold">No lore records found matching your filters.</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Try clearing your search query, selecting another universe, or importing fresh canon facts from external sources.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setIsImportOpen(true)}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Globe size={13} />
                  <span>Import from Web</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFacts.map((fact) => {
                const isBookmarked = bookmarkedIds.has(fact.id);
                const isCopied = copiedId === fact.id;
                const isHighlighted = randomHighlightId === fact.id;

                return (
                  <div
                    key={fact.id}
                    id={`lore-card-${fact.id}`}
                    className={`group relative p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                      isHighlighted
                        ? "bg-purple-950/70 border-purple-400 shadow-xl shadow-purple-500/20 scale-[1.01]"
                        : fact.isCustom
                          ? "bg-slate-950/70 hover:bg-slate-950 border-cyan-500/25 hover:border-cyan-500/50 shadow-sm"
                          : "bg-slate-950/60 hover:bg-slate-950 border-purple-500/15 hover:border-purple-500/35 shadow-sm"
                    }`}
                  >
                    <div>
                      {/* Card Top Row */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-purple-300 font-mono tracking-wide flex items-center gap-1">
                            <Sparkles size={11} className="text-amber-400" />
                            {fact.universe}
                          </span>
                          
                          {fact.isCustom && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-semibold">
                              CUSTOM
                            </span>
                          )}
                          {fact.isEdited && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 font-semibold">
                              EDITED
                            </span>
                          )}
                        </div>

                        {/* Card Top Actions */}
                        <div className="flex items-center gap-1">
                          {/* Edit button */}
                          <button
                            onClick={() => {
                              setEditingFact(fact);
                              setIsFactEditOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                            title="Edit this lore fact"
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* Revert to Canon if edited */}
                          {fact.isEdited && (
                            <button
                              onClick={() => {
                                resetFactToDefault(fact.id);
                                onShowToast?.("Reverted to Canon", "Fact restored to original canon text.", "info");
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-all cursor-pointer"
                              title="Reset to default canonical fact"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}

                          {/* Delete if custom */}
                          {fact.isCustom && (
                            <button
                              onClick={() => {
                                deleteFact(fact.id);
                                onShowToast?.("Fact Deleted", "Custom lore fact removed from codex.", "info");
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all cursor-pointer"
                              title="Delete custom lore fact"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

                          {/* Copy button */}
                          <button
                            onClick={() => handleCopyFact(fact)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
                            title="Copy lore fact to clipboard"
                          >
                            {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </button>

                          {/* Bookmark button */}
                          <button
                            onClick={() => toggleBookmark(fact.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-all cursor-pointer"
                            title={isBookmarked ? "Remove from bookmarks" : "Save this lore fact"}
                          >
                            <Bookmark size={13} className={isBookmarked ? "fill-amber-400 text-amber-400" : ""} />
                          </button>
                        </div>
                      </div>

                      {/* Fact Text */}
                      <p className="text-xs text-slate-200 leading-relaxed font-sans select-text">
                        {fact.fact}
                      </p>

                      {/* Source Citation if available */}
                      {(fact.sourceUrl || fact.sourceTitle) && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                          <span className="text-slate-500">Source:</span>
                          {fact.sourceUrl ? (
                            <a 
                              href={fact.sourceUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-0.5 truncate max-w-[280px]"
                            >
                              <span className="truncate">{fact.sourceTitle || fact.sourceUrl}</span>
                              <ArrowUpRight size={10} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-300">{fact.sourceTitle}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {fact.tags && fact.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-purple-500/10">
                        {fact.tags.map(tag => (
                          <span
                            key={tag}
                            onClick={() => setSearchQuery(tag)}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 hover:bg-purple-950 text-slate-400 hover:text-purple-300 border border-slate-800 hover:border-purple-500/30 transition-all cursor-pointer"
                            title={`Filter by tag: ${tag}`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 sm:px-6 py-3 border-t border-purple-500/15 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <span>Showing {filteredFacts.length} of {allFacts.length} lore entries</span>
            {currentCampaign && (
              <span className="text-slate-500 hidden md:inline">
                • Active Campaign: <strong className="text-purple-300 font-medium">{currentCampaign.name || "Default"}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-purple-300/80">
              Interactive Storyteller Canon Hub
            </span>
          </div>
        </div>

      </div>

      {/* 1. NotebookLM-style Web Source Import Modal */}
      <LoreImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        categories={allCategories}
        defaultUniverse={selectedCategory !== "all" && selectedCategory !== "bookmarks" && selectedCategory !== "custom" ? selectedCategory : activeUniverse}
        onImportSuccess={(count, universeName) => {
          onShowToast?.(
            "Lore Imported!",
            `Distilled and imported ${count} fact(s) into universe: "${universeName}"`,
            "success"
          );
        }}
        onShowToast={onShowToast}
      />

      {/* 2. Fact Create / Edit Modal */}
      <LoreFactEditModal
        isOpen={isFactEditOpen}
        onClose={() => {
          setIsFactEditOpen(false);
          setEditingFact(null);
        }}
        fact={editingFact}
        categories={allCategories}
        defaultCategory={selectedCategory !== "all" && selectedCategory !== "bookmarks" && selectedCategory !== "custom" ? selectedCategory : undefined}
        onSave={(fact) => {
          saveFact(fact);
          setIsFactEditOpen(false);
          setEditingFact(null);
          onShowToast?.(
            editingFact ? "Fact Updated" : "Fact Created",
            `Successfully saved lore fact in ${fact.universe}.`,
            "success"
          );
        }}
        onDelete={(id) => {
          deleteFact(id);
          setIsFactEditOpen(false);
          setEditingFact(null);
          onShowToast?.("Fact Removed", "Lore fact deleted from codex.", "info");
        }}
        onReset={(id) => {
          resetFactToDefault(id);
          setIsFactEditOpen(false);
          setEditingFact(null);
          onShowToast?.("Reverted", "Fact restored to canonical default.", "info");
        }}
        onShowToast={onShowToast}
      />

      {/* 3. Universe / Category Modal */}
      <LoreCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSave={(cat) => {
          saveCategory(cat);
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
          setSelectedCategory(cat.id);
          onShowToast?.(
            "Universe Saved",
            `Universe "${cat.name}" is now ready for lore entries and campaign targeting.`,
            "success"
          );
        }}
        onDelete={(id) => {
          deleteCategory(id);
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
          if (selectedCategory === id) setSelectedCategory("all");
          onShowToast?.("Universe Deleted", "Custom universe removed.", "info");
        }}
        onShowToast={onShowToast}
      />

      {/* 4. Campaign Lore Index Selection Modal */}
      {currentCampaign && onUpdateCampaignIndexes && (
        <CampaignLoreIndexModal
          isOpen={isCampaignIndexModalOpen}
          onClose={() => setIsCampaignIndexModalOpen(false)}
          campaignTitle={currentCampaign.name || "Current Campaign"}
          activeFactIndexes={currentCampaign.activeFactIndexes}
          categories={allCategories}
          onSaveIndexes={(indexes) => {
            onUpdateCampaignIndexes(indexes);
            setIsCampaignIndexModalOpen(false);
            onShowToast?.(
              "Campaign Fact Indices Updated",
              indexes.length > 0 
                ? `Active trivia and lore grounded in ${indexes.length} chosen universe index(es).` 
                : "Auto-detecting lore based on campaign setting.",
              "success"
            );
          }}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};
