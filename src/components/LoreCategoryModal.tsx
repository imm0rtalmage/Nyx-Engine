import React, { useState, useEffect } from "react";
import { X, Save, Trash2, Globe, Cpu, Sparkles, Swords, Rocket, Flame, Shield, Compass, BookOpen, Skull, Zap, Eye, Moon, Sun } from "lucide-react";
import { LoreCategoryInfo } from "../data/loreStore";

interface LoreCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: LoreCategoryInfo | null; // If null, create new
  onSave: (cat: LoreCategoryInfo) => void;
  onDelete?: (id: string) => void;
  onShowToast?: (title: string, message: string, type?: "info" | "success" | "error") => void;
}

const AVAILABLE_ICONS = [
  { name: "Globe", label: "World", icon: Globe },
  { name: "Cpu", label: "Cyber/Tech", icon: Cpu },
  { name: "Sparkles", label: "Magic", icon: Sparkles },
  { name: "Swords", label: "Combat/Action", icon: Swords },
  { name: "Rocket", label: "Sci-Fi/Space", icon: Rocket },
  { name: "Flame", label: "Grimdark/Chaos", icon: Flame },
  { name: "Shield", label: "Tactical", icon: Shield },
  { name: "Compass", label: "Exploration", icon: Compass },
  { name: "BookOpen", label: "Codex/History", icon: BookOpen },
  { name: "Skull", label: "Horror/Gothic", icon: Skull },
  { name: "Zap", label: "Superpowers", icon: Zap },
  { name: "Eye", label: "Cosmic/Mystery", icon: Eye },
  { name: "Moon", label: "Dark/Occult", icon: Moon },
  { name: "Sun", label: "Heroic/Epic", icon: Sun }
];

const AVAILABLE_COLORS = [
  { id: "purple", label: "Purple", bgClass: "bg-purple-500", borderClass: "border-purple-400" },
  { id: "blue", label: "Blue", bgClass: "bg-blue-500", borderClass: "border-blue-400" },
  { id: "amber", label: "Amber", bgClass: "bg-amber-500", borderClass: "border-amber-400" },
  { id: "emerald", label: "Emerald", bgClass: "bg-emerald-500", borderClass: "border-emerald-400" },
  { id: "red", label: "Red", bgClass: "bg-red-500", borderClass: "border-red-400" },
  { id: "cyan", label: "Cyan", bgClass: "bg-cyan-500", borderClass: "border-cyan-400" },
  { id: "rose", label: "Rose", bgClass: "bg-rose-500", borderClass: "border-rose-400" }
];

export const LoreCategoryModal: React.FC<LoreCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onSave,
  onDelete,
  onShowToast
}) => {
  const isEditing = Boolean(category);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [iconName, setIconName] = useState("Globe");
  const [color, setColor] = useState("purple");

  useEffect(() => {
    if (category) {
      setName(category.name || "");
      setSlug(category.id || "");
      setDescription(category.description || "");
      setIconName(category.iconName || "Globe");
      setColor(category.color || "purple");
    } else {
      setName("");
      setSlug("");
      setDescription("");
      setIconName("Globe");
      setColor("purple");
    }
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      onShowToast?.("Missing Name", "Please enter a universe or category name.", "info");
      return;
    }

    const cleanSlug = (slug || trimmedName).toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanSlug) {
      onShowToast?.("Invalid ID", "Please specify a valid slug ID.", "info");
      return;
    }

    const newCat: LoreCategoryInfo = {
      id: cleanSlug,
      name: trimmedName,
      description: description.trim() || `Canon lore archives for ${trimmedName}.`,
      iconName,
      color,
      isCustom: true
    };

    onSave(newCat);
    onShowToast?.(
      isEditing ? "Universe Updated" : "Universe Created", 
      `"${trimmedName}" is now available in your Lore Codex!`, 
      "success"
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {isEditing ? "Edit Lore Universe" : "Create New Universe Category"}
              </h3>
              <p className="text-xs text-slate-400">
                Define a new setting, franchise, or campaign index for the Lore Codex.
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

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          
          {/* Universe Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Universe / Category Name</label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Exandria & Critical Role, The Culture, SCP Foundation..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            />
          </div>

          {/* Slug ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Index Slug ID</label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              disabled={isEditing}
              placeholder="e.g. exandria, theculture, scp"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono focus:outline-none focus:border-purple-400 disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-400">
              Unique lowercase identifier used for campaign grounding tags.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Description & Canon Scope</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A brief summary of this universe's factions, tone, and canon rules..."
              className="w-full p-3 bg-slate-950 border border-purple-500/25 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Codex Icon</label>
            <div className="grid grid-cols-7 gap-2">
              {AVAILABLE_ICONS.map(item => {
                const IconComp = item.icon;
                const isSelected = iconName === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIconName(item.name)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-600/30 border-purple-400 text-purple-200 shadow-sm"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                    title={item.label}
                  >
                    <IconComp size={16} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Accent Color</label>
            <div className="flex items-center gap-2">
              {AVAILABLE_COLORS.map(c => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`w-7 h-7 rounded-full ${c.bgClass} transition-all cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    title={c.label}
                  />
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-purple-500/20 bg-slate-950/70 flex items-center justify-between">
          <div>
            {isEditing && category?.isCustom && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(category.id);
                  onShowToast?.("Universe Deleted", `Removed "${category.name}" from custom universes.`, "info");
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-xs text-red-300 hover:text-red-100 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete Universe</span>
              </button>
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
              <span>{isEditing ? "Save Changes" : "Create Universe"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
