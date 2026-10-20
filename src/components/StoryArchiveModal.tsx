import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, RefreshCw, Trash2, Download, Copy, Check, 
  ArrowRight, Search, FileText, AlertCircle, Sparkles, X, ChevronDown, ChevronUp, Clock, Database,
  Upload, FileJson, Laptop, Smartphone, ExternalLink
} from "lucide-react";
import { Message, Project } from "../types";
import { safeLocalStorage } from "../App";

export interface StoredTranscriptEntry {
  id: string;
  key: string;
  sourceType: "active_project" | "local_cache" | "backup" | "orphaned" | "firestore";
  title: string;
  projectId?: string;
  messageCount: number;
  wordCount: number;
  messages: Message[];
  firstMessageSnippet?: string;
  lastMessageSnippet?: string;
  charactersFound: string[];
  lastUpdated?: string;
}

interface StoryArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onRestoreMessages: (messages: Message[], campaignName?: string) => void;
  onRestoreOrCreateCampaign?: (campaignName: string, messages?: Message[], specificProjectId?: string) => void;
  onExportAllData?: () => void;
  onImportAllData?: (jsonStr: string) => void;
  onShowToast?: (title: string, description: string, type?: "success" | "error" | "info") => void;
}

export function scanAllStoredTranscripts(projects: Project[]): StoredTranscriptEntry[] {
  const results: StoredTranscriptEntry[] = [];
  const processedKeys = new Set<string>();

  if (typeof window === "undefined" || !window.localStorage) {
    return results;
  }

  // 1. Scan known projects from project list
  projects.forEach((p) => {
    const primaryKey = `local_messages_${p.id}`;
    const backupKey = `local_messages_backup_${p.id}`;
    
    [primaryKey, backupKey].forEach((k) => {
      if (processedKeys.has(k)) return;
      const raw = safeLocalStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            processedKeys.add(k);
            const entry = buildTranscriptEntry(k, parsed, p.name || p.setting || "Campaign", p.id, k.includes("backup") ? "backup" : "active_project");
            results.push(entry);
          }
        } catch {}
      }
    });
  });

  // 2. Scan ALL localStorage keys for message arrays or orphaned logs
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || processedKeys.has(k)) continue;

    if (
      k.startsWith("local_messages_") || 
      k.startsWith("nyx_backup_") || 
      k.includes("messages") || 
      k.includes("transcript") || 
      k.includes("chat")
    ) {
      const raw = safeLocalStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if elements look like messages
          const sample = parsed[0];
          if (sample && (sample.role !== undefined || sample.content !== undefined || sample.text !== undefined)) {
            processedKeys.add(k);
            
            // Try to match with a project name if key contains project ID
            const matchedProj = projects.find(p => k.includes(p.id));
            let derivedTitle = matchedProj?.name || k.replace("local_messages_", "").replace("local_messages_backup_", "Backup: ");
            if (derivedTitle.startsWith("proj-")) {
              derivedTitle = `Campaign (${derivedTitle})`;
            }

            const isBackup = k.includes("backup");
            results.push(buildTranscriptEntry(k, parsed, derivedTitle, matchedProj?.id, isBackup ? "backup" : "local_cache"));
          }
        }
      } catch {}
    }
  }

  // 3. Scan for JSON structures inside project definitions that might have bundled transcripts
  projects.forEach((p) => {
    if (p.stAdventureModule && p.stAdventureModule.trim().length > 50) {
      const fakeKey = `module_${p.id}`;
      if (!processedKeys.has(fakeKey)) {
        processedKeys.add(fakeKey);
        results.push({
          id: `module-${p.id}`,
          key: `Adventure Module: ${p.name}`,
          sourceType: "active_project",
          title: `${p.name} - Adventure Module Lore`,
          projectId: p.id,
          messageCount: 1,
          wordCount: p.stAdventureModule.split(/\s+/).length,
          messages: [{
            id: `mod-${Date.now()}`,
            role: "assistant",
            content: p.stAdventureModule,
            timestamp: new Date().toISOString()
          }],
          firstMessageSnippet: p.stAdventureModule.slice(0, 180) + "...",
          lastMessageSnippet: p.stAdventureModule.slice(-180),
          charactersFound: [],
          lastUpdated: "Campaign Module"
        });
      }
    }
  });

  return results;
}

function buildTranscriptEntry(
  key: string,
  rawList: any[],
  title: string,
  projectId?: string,
  sourceType: StoredTranscriptEntry["sourceType"] = "local_cache"
): StoredTranscriptEntry {
  // Normalize items to Message interface
  const messages: Message[] = rawList.map((item, idx) => {
    const rawRole = item.role || item.sender;
    const role: Message["role"] = rawRole === "user" ? "user" : rawRole === "nyx" ? "nyx" : "assistant";
    const content = item.content || item.text || item.message || "";
    const rawTs = item.timestamp;
    const timestamp = typeof rawTs === "string" ? rawTs : rawTs ? new Date(rawTs).toISOString() : new Date().toISOString();

    return {
      id: item.id || `rec-${idx}-${Date.now()}`,
      role,
      content,
      timestamp,
      speakerIds: Array.isArray(item.speakerIds) ? item.speakerIds : undefined,
      chainOfThought: item.chainOfThought
    };
  }).filter(m => m.content && m.content.trim().length > 0);

  let totalWords = 0;
  const charsSet = new Set<string>();

  messages.forEach(m => {
    totalWords += m.content.trim().split(/\s+/).length;
    // detect capitalized names before colons (e.g. "Shima:", "Kaito:")
    const match = m.content.match(/^([A-Z][a-zA-Z0-9_\s]{1,20}):/);
    if (match && match[1]) charsSet.add(match[1].trim());
  });

  const first = messages[0];
  const last = messages[messages.length - 1];

  return {
    id: `transcript-${key}`,
    key,
    sourceType,
    title,
    projectId,
    messageCount: messages.length,
    wordCount: totalWords,
    messages,
    firstMessageSnippet: first ? first.content.slice(0, 180) + (first.content.length > 180 ? "..." : "") : undefined,
    lastMessageSnippet: last ? last.content.slice(0, 180) + (last.content.length > 180 ? "..." : "") : undefined,
    charactersFound: Array.from(charsSet).slice(0, 5),
    lastUpdated: new Date().toLocaleDateString()
  };
}

export function StoryArchiveModal({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onRestoreMessages,
  onRestoreOrCreateCampaign,
  onExportAllData,
  onImportAllData,
  onShowToast
}: StoryArchiveModalProps) {
  const [transcripts, setTranscripts] = useState<StoredTranscriptEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedJson, setPastedJson] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text && onImportAllData) {
        onImportAllData(text);
        setTimeout(performScan, 400);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmPaste = () => {
    if (!pastedJson.trim()) {
      onShowToast?.("Paste Empty", "Please paste valid backup JSON text.", "info");
      return;
    }
    if (onImportAllData) {
      onImportAllData(pastedJson);
      setShowPasteModal(false);
      setPastedJson("");
      setTimeout(performScan, 400);
    }
  };

  const performScan = () => {
    setIsScanning(true);
    try {
      const found = scanAllStoredTranscripts(projects);
      setTranscripts(found);
      if (found.length > 0) {
        onShowToast?.("🔍 Storage Scan Complete", `Discovered ${found.length} saved story transcripts across your campaigns.`, "success");
      } else {
        onShowToast?.("Storage Scan", "No previous transcripts found in cache.", "info");
      }
    } catch (err: any) {
      console.error("Scan error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      performScan();
    }
  }, [isOpen, projects]);

  if (!isOpen) return null;

  const filteredTranscripts = transcripts.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.key.toLowerCase().includes(q) ||
      t.charactersFound.some(c => c.toLowerCase().includes(q)) ||
      t.messages.some(m => m.content.toLowerCase().includes(q))
    );
  });

  const handleCopyTranscript = (t: StoredTranscriptEntry) => {
    const formatted = t.messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(formatted);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2500);
    onShowToast?.("📋 Transcript Copied", `Copied ${t.messageCount} messages to clipboard.`, "success");
  };

  const handleDownloadTranscript = (t: StoredTranscriptEntry) => {
    const formatted = t.messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([formatted], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_Transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast?.("📥 Transcript Downloaded", `Saved transcript text file.`, "success");
  };

  const hasShimaInProjects = projects.some(p => p.name.toLowerCase().includes("shima"));
  const shimaTranscript = transcripts.find(t => t.title.toLowerCase().includes("shima") || t.key.toLowerCase().includes("shima") || t.messages.some(m => m.content.toLowerCase().includes("shima")));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-4xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-600/40 flex items-center justify-center text-purple-400">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Story Archive & Transcript Explorer
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/50 text-purple-300 font-mono">
                  {transcripts.length} Saved Logs
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse, search, recover, and switch between campaign story logs and cached browser archives.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json,application/json"
              className="hidden"
            />
            {onExportAllData && (
              <button
                type="button"
                onClick={onExportAllData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-xs font-semibold text-purple-200 transition-colors shadow-xs cursor-pointer"
                title="Export all campaigns, characters, notes, and messages to a portable JSON backup file"
              >
                <Download size={13} className="text-purple-400" />
                <span className="hidden sm:inline">Export All</span> (.json)
              </button>
            )}
            {onImportAllData && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-xs font-semibold text-emerald-200 transition-colors shadow-xs cursor-pointer"
                title="Import campaign backup JSON from another machine or device"
              >
                <Upload size={13} className="text-emerald-400" />
                <span className="hidden sm:inline">Import</span> Backup
              </button>
            )}
            <button
              type="button"
              onClick={performScan}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors border border-slate-700"
              title="Rescan browser local storage"
            >
              <RefreshCw size={13} className={isScanning ? "animate-spin text-purple-400" : "text-slate-400"} />
              Rescan Storage
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Recovery Banner for Shima Campaign */}
        {(!hasShimaInProjects || shimaTranscript) && (
          <div className="px-6 py-3 bg-gradient-to-r from-purple-950/70 to-slate-900 border-b border-purple-800/40 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-purple-200">
              <Sparkles size={15} className="text-purple-400 shrink-0" />
              <span>
                <strong>"Shima" Campaign:</strong>{" "}
                {hasShimaInProjects 
                  ? "Campaign is available in your active list. Click to jump to it."
                  : "Restore or reopen the 'Shima' campaign and retrieve all story logs."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onRestoreOrCreateCampaign) {
                  onRestoreOrCreateCampaign("Shima", shimaTranscript?.messages, shimaTranscript?.projectId);
                } else if (shimaTranscript) {
                  onRestoreMessages(shimaTranscript.messages, "Shima");
                }
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shrink-0 shadow transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={13} />
              Open "Shima" Campaign
            </button>
          </div>
        )}

        {/* Device Switch Migration Helper Banner */}
        {transcripts.length === 0 && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-purple-950/40 border border-purple-800/50 text-xs space-y-2 text-slate-200 shadow-md">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
              <Laptop size={16} className="text-purple-400 shrink-0" />
              <span>Switched Machines or Don't See Your Campaigns?</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              Campaigns, adventure transcripts, and character profiles are stored locally in each browser. Because you are on a new machine or new browser session, this browser doesn't have your previous files yet.
              <span className="text-emerald-300 font-semibold block mt-1">
                Your campaigns are safe on your original machine!
              </span>
            </p>
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-[11px] space-y-1 text-slate-300">
              <div className="font-semibold text-purple-300">Fast 2-step migration:</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>On your <span className="text-slate-200 font-semibold">previous machine</span>, click <span className="text-purple-300 font-mono font-semibold">Archives → "Export All (.json)"</span>.</li>
                <li>On this machine, click <span className="text-emerald-300 font-mono font-semibold">"Import Backup"</span> below to instantly load all your campaigns, characters, and chats.</li>
              </ol>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <Upload size={13} /> Import Backup File (.json)
              </button>
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <Copy size={13} /> Paste Backup JSON
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center gap-3 justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by campaign name, dialogue words, or character..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="text-[11px] font-medium text-slate-400 hover:text-purple-300 flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
              title="Paste raw JSON backup text to restore"
            >
              <FileJson size={13} /> Paste JSON
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredTranscripts.length === 0 ? (
            <div className="py-16 text-center space-y-3 max-w-md mx-auto">
              <Database className="mx-auto text-slate-600" size={36} />
              <h3 className="text-sm font-semibold text-slate-300">No matching transcripts found</h3>
              <p className="text-xs text-slate-400">
                {searchQuery 
                  ? "Try adjusting your search query or clear the filter to view all saved logs."
                  : "No story transcripts are currently saved in your browser storage. Generating scenes in any campaign will automatically archive your dialogue here."}
              </p>
              <button
                type="button"
                onClick={performScan}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-semibold border border-purple-500/40 transition-colors mt-2"
              >
                <RefreshCw size={13} /> Deep Scan Storage
              </button>
            </div>
          ) : (
            filteredTranscripts.map((t) => {
              const isExpanded = expandedId === t.id;
              const isCurrentActive = t.projectId && t.projectId === activeProjectId;

              return (
                <div
                  key={t.id}
                  className={`rounded-xl border transition-all ${
                    isCurrentActive
                      ? "bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-950/20"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-100">{t.title}</span>
                        {isCurrentActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                            Active Campaign
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                          {t.messageCount} {t.messageCount === 1 ? "turn" : "turns"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-400 font-mono">
                          ~{t.wordCount.toLocaleString()} words
                        </span>
                      </div>

                      {/* Character Badges */}
                      {t.charactersFound.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                          <span className="text-slate-500">Characters:</span>
                          {t.charactersFound.map((c, i) => (
                            <span key={i} className="text-purple-300/90 bg-purple-950/40 px-1.5 py-0.2 rounded border border-purple-800/30 text-[10px]">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Snippet Preview */}
                      {t.lastMessageSnippet && (
                        <p className="text-xs text-slate-400 line-clamp-2 italic pt-1 text-slate-400/90 font-serif">
                          "{t.lastMessageSnippet}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 md:pt-0 shrink-0">
                      {projects.some(p => (t.projectId && p.id === t.projectId) || (p.name && t.title && p.name.toLowerCase() === t.title.toLowerCase())) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onRestoreMessages(t.messages, t.title);
                              onShowToast?.("🛡️ Adventure Log Restored", `Loaded ${t.messageCount} message(s) from "${t.title}" into your current session.`, "success");
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
                            title="Load all these messages into the active adventure log"
                          >
                            <Sparkles size={13} />
                            Restore to Campaign
                          </button>

                          {t.projectId && t.projectId !== activeProjectId && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectProject(t.projectId!);
                                onShowToast?.("Campaign Switched", `Switched active project to "${t.title}".`, "info");
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors border border-slate-700"
                              title="Switch active project to this campaign"
                            >
                              <ArrowRight size={13} />
                              Switch
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (onRestoreOrCreateCampaign) {
                              onRestoreOrCreateCampaign(t.title, t.messages, t.projectId);
                            } else {
                              onRestoreMessages(t.messages, t.title);
                            }
                            onClose();
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
                          title="Recreate this project and restore full logs"
                        >
                          <Sparkles size={13} />
                          Rebuild & Open
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyTranscript(t)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/60"
                        title="Copy transcript text to clipboard"
                      >
                        {copiedId === t.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadTranscript(t)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/60"
                        title="Download transcript as text file"
                      >
                        <Download size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/60"
                        title={isExpanded ? "Collapse preview" : "Expand full transcript reader"}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Full Transcript Viewer */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 p-4 bg-slate-950/70 rounded-b-xl space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                        <span className="font-mono">Transcript Key: {t.key}</span>
                        <span>{t.messages.length} Total Messages</span>
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto space-y-3 pr-2 font-mono text-xs">
                        {t.messages.map((m, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border ${
                              m.role === "user"
                                ? "bg-slate-900 border-slate-800 text-slate-300"
                                : "bg-purple-950/20 border-purple-900/30 text-purple-200"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold mb-1 opacity-75">
                              <span>{m.role === "user" ? "Player / User" : "Nyx Storyteller"}</span>
                              <span className="text-[10px] font-normal">{new Date(m.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                              {m.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {filteredTranscripts.length} transcript{filteredTranscripts.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors border border-slate-700"
          >
            Close
          </button>
        </div>

      </div>

      {/* PASTE BACKUP JSON MODAL */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <FileJson size={18} />
                <h3 className="text-sm font-bold text-slate-100">Paste Campaign Backup JSON</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Paste exported JSON text from your previous machine to restore all campaigns, character vaults, notes, and story transcripts.
            </p>

            <textarea
              rows={8}
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder='Paste backup JSON content here (starts with { "version": 2, "projects": [...] } or [{ "id": ... }])...'
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none focus:border-purple-500 transition-colors resize-none"
            />

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPaste}
                disabled={!pastedJson.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all flex items-center gap-1.5"
              >
                <Upload size={13} />
                Restore from Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
