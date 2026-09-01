import React, { useState } from "react";
import { PromptVaultItem } from "../types";
import { Folder, FileText, Plus, Search, Trash2, Copy, Check } from "lucide-react";

interface PromptVaultProps {
  prompts: PromptVaultItem[];
  onAddPrompt: (character: string, folder: string, title: string, text: string) => void;
  onDeletePrompt: (id: string) => void;
}

export default function PromptVault({ prompts, onAddPrompt, onDeletePrompt }: PromptVaultProps) {
  const [search, setSearch] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [folder, setFolder] = useState("Main Cast");
  const [title, setTitle] = useState("");
  const [promptText, setPromptText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const folders = ["Main Cast", "NPCs", "World Factions", "Items & Tech", "Lore Archetypes"];

  const filteredPrompts = prompts.filter(p =>
    p.characterName.toLowerCase().includes(search.toLowerCase()) ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.promptText.toLowerCase().includes(search.toLowerCase()) ||
    p.folder.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !promptText) return;
    onAddPrompt(characterName || "General", folder, title, promptText);
    setTitle("");
    setPromptText("");
    setCharacterName("");
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800">
      <div className="mb-6">
        <h2 className="text-xl font-sans font-semibold tracking-tight text-purple-400">Lore Bible & Prompt Vault</h2>
        <p className="text-xs text-slate-400">Organize reusable prompts, character profiles, and lore sheets in dynamic folders.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Creation Form */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 flex flex-col h-fit">
          <h3 className="text-sm font-semibold mb-4 text-purple-300 flex items-center gap-2">
            <Plus size={16} /> Create Vault Prompt
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Folder</label>
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
              >
                {folders.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Character or Subject Name</label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="e.g. Nyx, Bob the Mage, Alderaan"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Prompt / Card Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Background & Behavior, Magic Style"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Prompt Instructions / Profile Details</label>
              <textarea
                required
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={5}
                placeholder="Describe traits, personality, key responses, or lore guidelines..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 outline-none resize-none font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 transition-colors py-2 px-4 rounded-lg text-xs font-semibold text-white"
            >
              Add to Lore Bible
            </button>
          </form>
        </div>

        {/* Search & Vault List */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          {/* Search Header */}
          <div className="relative mb-4">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search characters, prompts, style notes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-purple-500 outline-none text-slate-100"
            />
          </div>

          {/* Prompt cards listed by folder */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {folders.map(fld => {
              const itemsInFolder = filteredPrompts.filter(item => item.folder === fld);
              if (itemsInFolder.length === 0 && search === "") return null;

              return (
                <div key={fld} className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5 border-b border-slate-800/60 pb-1">
                    <Folder size={12} className="text-purple-400" /> {fld} ({itemsInFolder.length})
                  </h4>

                  {itemsInFolder.length === 0 ? (
                    <p className="text-xs text-slate-500 italic pl-5">No items matching filters.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {itemsInFolder.map(item => (
                        <div
                          key={item.id}
                          className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/60 hover:border-slate-700/80 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div>
                                <span className="bg-slate-800 text-[10px] text-slate-300 px-1.5 py-0.5 rounded">
                                  {item.characterName}
                                </span>
                                <h5 className="text-xs font-semibold text-slate-200 mt-1 flex items-center gap-1">
                                  <FileText size={12} className="text-slate-400" /> {item.title}
                                </h5>
                              </div>
                              <button
                                onClick={() => onDeletePrompt(item.id)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800/40 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono bg-slate-900/60 p-2 rounded border border-slate-800/40 whitespace-pre-wrap max-h-36 overflow-y-auto">
                              {item.promptText}
                            </p>
                          </div>

                          <div className="flex justify-end gap-2 mt-3">
                            <button
                              onClick={() => handleCopy(item.promptText, item.id)}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded flex items-center gap-1 transition-all"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check size={10} className="text-green-400" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy size={10} /> Copy Prompt
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredPrompts.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <FileText size={28} className="mx-auto mb-2 text-slate-600" />
                <p className="text-xs">No lore cards or prompts found. Add cards using the tool on the left.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
