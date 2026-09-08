import React, { useState, useEffect } from "react";
import { X, Save, Trash2, RotateCcw, Sparkles, BookOpen, Tag } from "lucide-react";
import { LoreFact, LoreCategoryInfo } from "../data/loreStore";

interface LoreFactEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  fact?: LoreFact | null; // If null, mode is "Create New Fact"
  categories: LoreCategoryInfo[];
  defaultCategory?: string;
  onSave: (fact: LoreFact) => void;
  onDelete?: (id: string) => void;
  onReset?: (id: string) => void;
  onShowToast?: (title: string, message: string, type?: "info" | "success" | "error") => void;
}

export const LoreFactEditModal: React.FC<LoreFactEditModalProps> = ({
  isOpen,
  onClose,
  fact,
  categories,
  defaultCategory,
  onSave,
  onDelete,
  onReset,
  onShowToast
}) => {
  const isEditing = Boolean(fact);

  const [factText, setFactText] = useState("");
  const [universeName, setUniverseName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagsString, setTagsString] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  useEffect(() => {
    if (fact) {
      setFactText(fact.fact || "");
      setUniverseName(fact.universe || "");
      setCategoryId(fact.category || "cyberpunk");
      setTagsString((fact.tags || []).join(", "));
      setSourceTitle(fact.sourceTitle || "");
      setSourceUrl(fact.sourceUrl || "");
    } else {
      const initialCat = (defaultCategory && defaultCategory !== "all") ? defaultCategory : "cyberpunk";
      const catObj = categories.find(c => c.id === initialCat);
      setFactText("Did you know? ");
      setCategoryId(initialCat);
      setUniverseName(catObj ? catObj.name : "Custom Lore");
      setTagsString("Lore, Canon");
      setSourceTitle("");
      setSourceUrl("");
    }
  }, [fact, defaultCategory, categories, isOpen]);

  if (!isOpen) return null;

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const found = categories.find(c => c.id === newCatId);
    if (found && (!universeName || universeName === "Custom Lore" || categories.some(c => c.name === universeName))) {
      setUniverseName(found.name);
    }
  };

  const handleSave = () => {
    const trimmed = factText.trim();
    if (!trimmed || trimmed === "Did you know?") {
      onShowToast?.("Missing Fact Text", "Please provide a fact description.", "info");
      return;
    }

    const tags = tagsString
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    const savedFact: LoreFact = {
      id: fact?.id || `lore-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fact: trimmed.startsWith("Did you know?") ? trimmed : `Did you know? ${trimmed}`,
      universe: universeName.trim() || "Custom Lore",
      category: categoryId.toLowerCase().trim() || "custom",
      tags: tags.length > 0 ? tags : ["Lore"],
      sourceTitle: sourceTitle.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      isCustom: fact ? fact.isCustom : true,
      isEdited: Boolean(fact),
      createdDate: fact?.createdDate || new Date().toISOString()
    };

    onSave(savedFact);
    onShowToast?.(
      isEditing ? "Lore Fact Updated" : "Lore Fact Created", 
      `Saved lore fact to ${savedFact.universe}!`, 
      "success"
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {isEditing ? "Edit Lore Codex Entry" : "Create New Lore Entry"}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing ? "Modify canonical facts, tags, or universe attribution." : "Add a custom piece of worldbuilding or campaign lore."}
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

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          
          {/* Fact Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span>Lore Fact Text (Starts with "Did you know?")</span>
            </label>
            <textarea
              rows={4}
              value={factText}
              onChange={e => setFactText(e.target.value)}
              placeholder="Did you know? ..."
              className="w-full p-3 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 font-sans leading-relaxed"
            />
          </div>

          {/* Universe & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Universe Category Index</label>
              <select
                value={categoryId}
                onChange={e => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                {categories.filter(c => c.id !== "all").map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isCustom ? "(Custom)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Display Universe Name</label>
              <input
                type="text"
                value={universeName}
                onChange={e => setUniverseName(e.target.value)}
                placeholder="e.g. Cyberpunk & Night City, The Culture..."
                className="w-full px-3 py-2 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Tag size={13} className="text-purple-400" />
              <span>Tags (comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsString}
              onChange={e => setTagsString(e.target.value)}
              placeholder="e.g. Trauma Team, Night City, Cyberware, Economy"
              className="w-full px-3 py-2 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Source Reference (optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-500/10">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Source Title (optional)</label>
              <input
                type="text"
                value={sourceTitle}
                onChange={e => setSourceTitle(e.target.value)}
                placeholder="e.g. Cyberpunk 2020 Core Rulebook, Fandom Wiki"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Source URL (optional)</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-purple-500/20 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing && fact && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (onDelete && fact.id) {
                      onDelete(fact.id);
                      onShowToast?.("Lore Deleted", "Lore entry removed from Codex.", "info");
                      onClose();
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-xs text-red-300 hover:text-red-100 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Delete this fact"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>

                {fact.isEdited && onReset && (
                  <button
                    type="button"
                    onClick={() => {
                      onReset(fact.id);
                      onShowToast?.("Reset to Default", "Reverted fact to original canon text.", "info");
                      onClose();
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Reset to factory default"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Default</span>
                  </button>
                )}
              </>
            )}
          </div>

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
              <span>{isEditing ? "Save Changes" : "Add to Codex"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
