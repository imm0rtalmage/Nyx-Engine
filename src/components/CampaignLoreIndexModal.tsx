import React, { useState, useEffect } from "react";
import { 
  X, CheckSquare, Square, Save, RotateCcw, Filter, 
  Sparkles, Layers, BookOpen, Search, Info 
} from "lucide-react";
import { LoreCategoryInfo, getCategoryFactCount } from "../data/loreStore";

interface CampaignLoreIndexModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignTitle: string;
  activeFactIndexes?: string[]; // E.g. ["cyberpunk", "warhammer"]
  categories: LoreCategoryInfo[];
  onSaveIndexes: (selectedIndexes: string[]) => void;
  onShowToast?: (title: string, message: string, type?: "info" | "success" | "error") => void;
}

export const CampaignLoreIndexModal: React.FC<CampaignLoreIndexModalProps> = ({
  isOpen,
  onClose,
  campaignTitle,
  activeFactIndexes,
  categories,
  onSaveIndexes,
  onShowToast
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState("");
  const [isAutoMode, setIsAutoMode] = useState(false);

  // Available categories excluding "all"
  const selectableCategories = categories.filter(c => c.id !== "all");

  useEffect(() => {
    if (activeFactIndexes && activeFactIndexes.length > 0) {
      setSelectedIds(new Set(activeFactIndexes));
      setIsAutoMode(false);
    } else {
      // Auto mode means no explicit filter: auto-matches active setting text or uses all
      setSelectedIds(new Set());
      setIsAutoMode(true);
    }
  }, [activeFactIndexes, isOpen]);

  if (!isOpen) return null;

  const toggleCategory = (id: string) => {
    setIsAutoMode(false);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setIsAutoMode(false);
    setSelectedIds(new Set(selectableCategories.map(c => c.id)));
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
    setIsAutoMode(false);
  };

  const handleResetToAuto = () => {
    setSelectedIds(new Set());
    setIsAutoMode(true);
  };

  const handleSave = () => {
    const list = isAutoMode ? [] : Array.from(selectedIds);
    onSaveIndexes(list);
    onShowToast?.(
      "Lore Indices Updated",
      isAutoMode 
        ? `Campaign set to Auto-Detect lore from setting text.` 
        : `Bound ${list.length} Lore Codex index(es) to "${campaignTitle}".`,
      "success"
    );
    onClose();
  };

  const filteredCategories = selectableCategories.filter(c =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Campaign Lore Fact Indices
              </h3>
              <p className="text-xs text-slate-400">
                Configure which Lore Codex universes & canon indices ground <span className="text-purple-300 font-semibold">{campaignTitle}</span>.
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

        {/* Toolbar */}
        <div className="p-4 border-b border-purple-500/15 bg-slate-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Filter universes..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-purple-500/20 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleResetToAuto}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                isAutoMode
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <Sparkles size={12} className={isAutoMode ? "text-amber-300" : "text-slate-400"} />
              <span>Auto (Setting Match)</span>
            </button>
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="px-6 py-2 bg-purple-950/20 border-b border-purple-500/10 flex items-center gap-2 text-[11px] text-purple-300">
          <Info size={13} className="shrink-0 text-purple-400" />
          <span>
            {isAutoMode 
              ? "Auto Mode: Trivia and storyteller grounding dynamically adapt to the campaign's Active Setting text." 
              : `Custom Mode: ${selectedIds.size} universe index(es) explicitly selected for this campaign.`}
          </span>
        </div>

        {/* Universe List */}
        <div className="p-6 space-y-2 overflow-y-auto max-h-[60vh]">
          {filteredCategories.map(cat => {
            const isSelected = selectedIds.has(cat.id);
            const count = getCategoryFactCount(cat.id);

            return (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-purple-950/40 border-purple-500/40 text-slate-100 shadow-sm"
                    : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-purple-400 shrink-0">
                    {isSelected ? <CheckSquare size={16} className="text-purple-400" /> : <Square size={16} className="text-slate-500" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 truncate">{cat.name}</span>
                      {cat.isCustom && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-500/30">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{cat.description}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                  <BookOpen size={11} className="text-purple-400" />
                  <span>{count} facts</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-purple-500/20 bg-slate-950/70 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {isAutoMode ? "Auto Detection active" : `${selectedIds.size} index(es) active`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save size={14} />
              <span>Apply Setting</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
