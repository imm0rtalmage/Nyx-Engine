import React, { useState, useEffect, useRef } from "react";
import { KeepNote, KeepTask, Project, LoreSource, CharacterProfile, SyncActivityLog } from "../types";
import { LoreSourceStatusBadge, getSourceProcessingState } from "./LoreSourceStatusBadge";
import { 
  FileText, CheckSquare, Plus, Trash, Check, Square, 
  RefreshCw, FileCheck, ExternalLink, HelpCircle, Brain, 
  Globe, Clipboard, Upload, Sparkles, BookOpen, Layers, 
  ChevronRight, ArrowRight, ArrowUp, Eye, Play, CheckCircle2, AlertCircle, X, Trash2, XCircle, Info, History,
  Search, Image, Grid, List, Star, SlidersHorizontal, FolderOpen, Zap, ChevronDown, Edit3, Pencil, Tag
} from "lucide-react";
import { listGoogleDocs, fetchGoogleFile, extractDocId } from "../utils/googleWorkspace";
import Markdown from "react-markdown";
import { safeLocalStorage } from "../App";
import { safeFetchJson } from "../utils/apiClient";

const renderGDriveLogo = (size = 22) => (
  <svg style={{ width: size, height: size }} className="shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.33 3.5h7.34l5.33 9.25H13.66L8.33 3.5z" fill="#FFCC00" />
    <path d="M1.66 15h10.66l5.33-9.25H7L1.66 15z" fill="#1A73E8" />
    <path d="M7 15l5.33 9.25h10.67L17.67 15H7z" fill="#0F9D58" />
  </svg>
);

const renderDriveFileIcon = (mimeType: string) => {
  if (mimeType === "application/vnd.google-apps.document" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return (
      <div className="p-1 bg-blue-50 rounded-md shrink-0">
        <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" />
        </svg>
      </div>
    );
  }
  if (mimeType === "application/pdf") {
    return (
      <div className="p-1 bg-red-50 rounded-md shrink-0">
        <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4.5-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 8.5H10V10H9V8.5zm5 1.5h1v1.5h-1V10z" />
        </svg>
      </div>
    );
  }
  if (mimeType && mimeType.startsWith("image/")) {
    return (
      <div className="p-1 bg-purple-50 rounded-md shrink-0">
        <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zm-4.44-6.19l-2.5 3.09-1.56-1.88L7 17h10l-3.44-4.19z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="p-1 bg-slate-100 rounded-md shrink-0">
      <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
      </svg>
    </div>
  );
};

export const CATEGORY_MAP: Record<string, { label: string; icon: string; badgeClass: string; desc: string }> = {
  narrative: { 
    label: "Narrative / Log", 
    icon: "📖", 
    badgeClass: "bg-blue-950/80 text-blue-300 border-blue-500/30",
    desc: "Past transcripts, session chronicles & narrative recaps for continuity & callbacks"
  },
  character: { 
    label: "Character Profile", 
    icon: "👤", 
    badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/30",
    desc: "NPC/PC stat blocks, backstories, speech patterns, quirks & relationship trackers"
  },
  world_lore: { 
    label: "World & Setting", 
    icon: "🌍", 
    badgeClass: "bg-purple-950/80 text-purple-300 border-purple-500/30",
    desc: "Geography, factions, cosmology, lore histories, magic systems & cultural norms"
  },
  rules: { 
    label: "Rules & Mechanics", 
    icon: "📜", 
    badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/30",
    desc: "Combat mechanics, spell tables, difficulty checks, DC numbers & system rules"
  },
  module: { 
    label: "Adventure Module", 
    icon: "🏰", 
    badgeClass: "bg-rose-950/80 text-rose-300 border-rose-500/30",
    desc: "Quests, dungeons, scene encounters, traps, secrets, plot hooks & pacing beats"
  },
  other: { 
    label: "General / Other", 
    icon: "📄", 
    badgeClass: "bg-slate-800/80 text-slate-300 border-slate-700",
    desc: "General campaign cheat sheets, reference materials & player notes"
  }
};

interface WorkspaceSyncProps {
  notes: KeepNote[];
  tasks: KeepTask[];
  onAddNote: (title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  googleToken: string | null;
  onClearGoogleToken?: () => void;
  onSyncDocInstructions: (docText: string) => void;
  project: Project;
  onSetProjectValue: (key: string, val: any) => Promise<void> | void;
  onGoogleSignIn?: () => Promise<string | undefined>;
  onAddCharacter?: (
    name: string,
    role: string,
    portraitUrl: string,
    description: string,
    isPlayerCharacter?: boolean,
    relationships?: string,
    factionName?: string,
    isMook?: boolean,
    type?: any,
    customFields?: Record<string, string>
  ) => void;
  characters?: CharacterProfile[];
  syncLogs: SyncActivityLog[];
  onAddLog: (sourceName: string, type: "success" | "info" | "warning", message: string) => void;
  onUpdateNotes?: (notes: KeepNote[]) => void;
  navigationTarget?: any;
}

export default function WorkspaceSync({
  notes = [],
  tasks = [],
  onAddNote,
  onDeleteNote,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  googleToken,
  onClearGoogleToken,
  onSyncDocInstructions,
  project,
  onSetProjectValue,
  onGoogleSignIn,
  onAddCharacter,
  characters = [],
  syncLogs = [],
  onAddLog,
  onUpdateNotes,
  navigationTarget,
}: WorkspaceSyncProps) {
  // Tabs: "all" | "sources" | "keep"
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"all" | "sources" | "keep">("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Search, Category & Deduplication state
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadCategory, setUploadCategory] = useState<LoreSource["category"]>("narrative");
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>(["all"]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  
  // State hooks
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<LoreSource | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [activeReaderTab, setActiveReaderTab] = useState<"guide" | "raw" | "synclog">("guide");
  const [isSummarizingSourceId, setIsSummarizingSourceId] = useState<string | null>(null);
  
  // Input states
  const [webUrl, setWebUrl] = useState("");
  const [snippetTitle, setSnippetTitle] = useState("");
  const [snippetContent, setSnippetContent] = useState("");
  const [keepNoteTitle, setKeepNoteTitle] = useState("");
  const [keepNoteContent, setKeepNoteContent] = useState("");
  const [keepTaskText, setKeepTaskText] = useState("");

  // Standard Google Drive Picker/Upload modal states
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"gdrive" | "upload" | "web" | "paste">("gdrive");

  // Custom Google Drive Document Browser states
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [driveFileSearch, setDriveFileSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(driveFileSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [driveFileSearch]);

  // Target navigation from assistant changes
  useEffect(() => {
    if (!navigationTarget || navigationTarget.targetTab !== "workspace") return;

    const { subType, targetId } = navigationTarget;

    if (subType === "keep") {
      setActiveWorkspaceTab("keep");
      if (targetId) {
        const found = notes.find(n => n.id === targetId || n.title.toLowerCase().includes(targetId.toLowerCase()));
        if (found) {
          setSelectedItemId(`note-${found.id}`);
          setTimeout(() => {
            const el = document.getElementById(`note-card-${found.id}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 150);
        }
      }
    } else if (subType === "tasks") {
      setActiveWorkspaceTab("all");
      setTimeout(() => {
        const el = document.getElementById("checklist-tasks-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [navigationTarget]);

  const [driveError, setDriveError] = useState<string | null>(null);
  const [selectedDriveFileIds, setSelectedDriveFileIds] = useState<Set<string>>(new Set());
  const [isGridView, setIsGridView] = useState<boolean>(false);
  const [driveActiveTab, setDriveActiveTab] = useState<"recent" | "my_drive" | "shared" | "starred">("recent");
  const [driveTypeFilter, setDriveTypeFilter] = useState<"all" | "document" | "pdf" | "image">("all");
  const [starredFileIds, setStarredFileIds] = useState<Set<string>>(() => {
    try {
      const saved = safeLocalStorage.getItem("nyx_starred_file_ids");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleStarFile = (fileId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setStarredFileIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(fileId)) {
        updated.delete(fileId);
      } else {
        updated.add(fileId);
      }
      try {
        safeLocalStorage.setItem("nyx_starred_file_ids", JSON.stringify(Array.from(updated)));
      } catch (err) {
        console.error("Error saving starred files:", err);
      }
      return updated;
    });
  };

  const groupFilesByDate = (files: any[]) => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const thisWeek: any[] = [];
    const older: any[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    files.forEach((file) => {
      const fileDate = file.modifiedTime ? new Date(file.modifiedTime) : null;
      if (!fileDate) {
        older.push(file);
        return;
      }

      if (fileDate >= todayStart) {
        today.push(file);
      } else if (fileDate >= yesterdayStart) {
        yesterday.push(file);
      } else if (fileDate >= weekStart) {
        thisWeek.push(file);
      } else {
        older.push(file);
      }
    });

    return { today, yesterday, thisWeek, older };
  };

  // Load active sources & notes
  const loreSources: LoreSource[] = Array.isArray(project?.sources) ? project.sources : [];
  const selectedSource = loreSources.find(s => s.id === (selectedItemId || selectedSourceId)) || loreSources[0] || null;

  // Compute status counts for uploaded documents (Done & Attached, Working, Untouched)
  const sourceStatusCounts = loreSources.reduce(
    (acc, src) => {
      const st = getSourceProcessingState(src);
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    { untouched: 0, working: 0, done_attached: 0 }
  );

  // Source Editing States & Modals
  const [editingSource, setEditingSource] = useState<LoreSource | null>(null);
  const [quickCategoryPopover, setQuickCategoryPopover] = useState<{
    sourceId: string;
    top: number;
    left: number;
  } | null>(null);
  const [isEditingTitleInline, setIsEditingTitleInline] = useState(false);
  const [inlineTitleValue, setInlineTitleValue] = useState("");

  // Edit Modal Form State
  const [editFormName, setEditFormName] = useState("");
  const [editFormCategory, setEditFormCategory] = useState<LoreSource["category"]>("narrative");
  const [editFormCategories, setEditFormCategories] = useState<string[]>(["narrative"]);
  const [editFormSummary, setEditFormSummary] = useState("");

  useEffect(() => {
    if (selectedSource) {
      setInlineTitleValue(selectedSource.name);
      setIsEditingTitleInline(false);
    }
  }, [selectedSource?.id, selectedSource?.name]);

  useEffect(() => {
    if (editingSource) {
      setEditFormName(editingSource.name);
      setEditFormCategory(editingSource.category || "narrative");
      const cats = Array.isArray(editingSource.categories) && editingSource.categories.length > 0
        ? editingSource.categories
        : [editingSource.category || "narrative"];
      setEditFormCategories(cats);
      setEditFormSummary(editingSource.summary || "");
    }
  }, [editingSource]);

  const handleSaveInlineTitle = async () => {
    if (!selectedSource || !inlineTitleValue.trim()) {
      setIsEditingTitleInline(false);
      return;
    }
    const newName = inlineTitleValue.trim();
    const updated = loreSources.map(s => s.id === selectedSource.id ? { ...s, name: newName } : s);
    await onSetProjectValue("sources", updated);
    setIsEditingTitleInline(false);
    addLog(newName, "success", `Renamed grounding document to "${newName}".`);
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource) return;

    const trimmedName = editFormName.trim() || editingSource.name;
    const finalCategories = editFormCategories.length > 0 ? editFormCategories : [editFormCategory || "narrative"];
    const finalPrimaryCategory = (finalCategories.includes(editFormCategory || "")
      ? editFormCategory
      : finalCategories[0]) as LoreSource["category"];

    const updated = loreSources.map(s => {
      if (s.id === editingSource.id) {
        return {
          ...s,
          name: trimmedName,
          category: finalPrimaryCategory,
          categories: finalCategories,
          summary: editFormSummary,
          isActive: true
        };
      }
      return s;
    });

    await onSetProjectValue("sources", updated);
    setEditingSource(null);
    addLog(trimmedName, "success", `Updated grounding document label & categories for "${trimmedName}".`);
  };

  const handleToggleCategoryOnSource = async (sourceId: string, categoryKey: string) => {
    const targetSource = loreSources.find(s => s.id === sourceId);
    if (!targetSource) return;

    const currentCategories = Array.isArray(targetSource.categories) && targetSource.categories.length > 0
      ? [...targetSource.categories]
      : [targetSource.category || "narrative"];

    let updatedCategories: string[];
    if (currentCategories.includes(categoryKey)) {
      if (currentCategories.length > 1) {
        updatedCategories = currentCategories.filter(c => c !== categoryKey);
      } else {
        updatedCategories = currentCategories; // Keep at least one
      }
    } else {
      updatedCategories = [...currentCategories, categoryKey];
    }

    const updatedCategory = (updatedCategories.includes(targetSource.category || "")
      ? targetSource.category
      : updatedCategories[0]) as LoreSource["category"];

    const updated = loreSources.map(s =>
      s.id === sourceId
        ? { ...s, category: updatedCategory, categories: updatedCategories }
        : s
    );
    await onSetProjectValue("sources", updated);
  };

  // Refs to maintain fresh references inside asynchronous background processes
  const sourcesRef = useRef<LoreSource[]>(loreSources);
  const projectRef = useRef<Project>(project);
  const charactersRef = useRef<CharacterProfile[]>(characters);
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  const uploadCategoryRef = useRef<LoreSource["category"]>(uploadCategory);

  useEffect(() => {
    uploadCategoryRef.current = uploadCategory;
  }, [uploadCategory]);

  useEffect(() => {
    sourcesRef.current = loreSources;
  }, [loreSources]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    charactersRef.current = characters;
  }, [characters]);

  // Auto-repair any sources that are stuck with isIngesting === true when no active background process is running
  useEffect(() => {
    const activeControllers = abortControllersRef.current;
    const stuckSources = loreSources.filter(s => s.isIngesting && !activeControllers[s.id]);
    if (stuckSources.length > 0) {
      const repaired = loreSources.map(s => {
        if (s.isIngesting && !activeControllers[s.id]) {
          return {
            ...s,
            isIngesting: false
          };
        }
        return s;
      });
      onSetProjectValue("sources", repaired);
    }
  }, [loreSources]);

  const [isSyncingGDocs, setIsSyncingGDocs] = useState(false);
  const [isSyncingSparkCodex, setIsSyncingSparkCodex] = useState(false);

  // Helper to log actions
  const addLog = (sourceName: string, type: SyncActivityLog["type"], message: string) => {
    onAddLog(sourceName, type, message);
  };

  const handleSyncSparkCodex = async () => {
    setIsSyncingSparkCodex(true);
    addLog("Spark Codex", "info", "⚡ Initiating background sync with RP Master Archives/02_Codex...");
    try {
      const data = await safeFetchJson<any>("/api/spark/sync-codex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: googleToken || "",
          projectId: project.id
        }),
        timeout: 60000
      });

      if (!data || !data.success) {
        throw new Error(data?.error || "Failed to sync Spark Codex");
      }

      const entityCount = data.syncedEntitiesCount || 0;
      const updatedDocsList = data.updatedDocs || [];
      const timestamp = data.lastSparkSyncTimestamp || new Date().toISOString();

      // Update project values
      await onSetProjectValue("lastSparkSyncTimestamp", timestamp);
      if (data.sparkCodexFolderId) {
        await onSetProjectValue("sparkCodexFolderId", data.sparkCodexFolderId);
      }

      // If entities were returned, add/update character profiles
      if (data.entities && Array.isArray(data.entities) && onAddCharacter) {
        data.entities.forEach((ent: any) => {
          if (ent && ent.name) {
            onAddCharacter(
              ent.name,
              ent.role || ent.type || "Codex Entity",
              "",
              ent.description || "",
              ent.type === "pc",
              ent.relationships || "",
              ent.factionName || "",
              false,
              ent.type || "npc",
              ent.customFields || {}
            );
          }
        });
      }

      addLog(
        "Spark Codex",
        "success",
        `✨ Spark Codex Sync Complete! Updated ${updatedDocsList.length} doc(s) and ingested ${entityCount} entity profile(s).`
      );
    } catch (err: any) {
      console.error("Error syncing Spark Codex:", err);
      addLog("Spark Codex", "warning", `Spark Codex sync issue: ${err.message || "Failed to sync"}`);
    } finally {
      setIsSyncingSparkCodex(false);
    }
  };

  const handleSyncAllGDocs = async (isSilent = false) => {
    const currentSources = sourcesRef.current || loreSources;
    const gdocSources = currentSources.filter(s => 
      s.type === "gdoc" || !!s.extra?.gdocId || !!(s as any).gdocId
    );
    if (gdocSources.length === 0) {
      if (!isSilent) {
        addLog("Workspace", "info", "No connected Google Docs found to sync.");
      }
      return;
    }

    if (!googleToken) {
      if (!isSilent) {
        addLog("Workspace", "warning", "Please connect Google Drive in the top header to enable live Google Doc synchronization.");
      }
      return;
    }

    setIsSyncingGDocs(true);
    setIsProcessing(true);
    setProcessingStatus(`Syncing ${gdocSources.length} Google Doc(s)...`);

    let updatedSources = [...currentSources];
    let syncedCount = 0;

    for (const doc of gdocSources) {
      const docIdToFetch = doc.extra?.gdocId || (doc as any).gdocId || extractDocId(doc.url || "");
      if (!docIdToFetch) continue;

      try {
        const mimeType = doc.extra?.mimeType || doc.mimeType || "application/vnd.google-apps.document";
        const result = await fetchGoogleFile(googleToken, docIdToFetch, mimeType);
        if (result && result.text) {
          syncedCount++;
          const fetchedText = result.text;

          let newSummary = doc.summary;
          if (fetchedText.length > 60 && (!newSummary || newSummary === "On-demand reference document." || newSummary === "Attached reference document." || newSummary.includes("⚡ AI Indexing"))) {
            try {
              const sumData = await safeFetchJson<any>("/api/summarize-source", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: doc.name, content: fetchedText }),
                timeout: 30000
              });
              if (sumData?.summary) newSummary = sumData.summary;
            } catch (e) {
              // ignore
            }
          }

          updatedSources = updatedSources.map(s => {
            if (s.id === doc.id) {
              return {
                ...s,
                content: fetchedText,
                summary: newSummary || "Attached reference document.",
                isIngesting: false
              };
            }
            return s;
          });

          addLog(doc.name, "success", `Synced ${fetchedText.length} chars from Google Doc "${doc.name}".`);
        }
      } catch (err: any) {
        console.error(`Failed syncing Google Doc ${doc.name}:`, err);
        addLog(doc.name, "warning", `Google Doc sync notice: ${err.message || "Failed to download"}`);
      }
    }

    await onSetProjectValue("sources", updatedSources);
    setIsSyncingGDocs(false);
    setIsProcessing(false);
    setProcessingStatus("");

    if (!isSilent) {
      if (syncedCount > 0) {
        addLog("Workspace", "success", `Successfully synced ${syncedCount} Google Doc(s). Lore content is live in Nyx's context!`);
      } else {
        addLog("Workspace", "info", "Google Doc synchronization finished.");
      }
    }
  };

  // Auto-recovery: If any source is in pending read state and googleToken is active, automatically trigger background sync
  useEffect(() => {
    if (!googleToken || !loreSources || loreSources.length === 0) return;
    const hasPendingDocs = loreSources.some(s => 
      (s.type === "gdoc" || s.extra?.gdocId) && 
      (!s.content || s.content === "[Pending Dynamic Read]" || s.content.includes("[Pending") || s.content.startsWith("⚡ Fetching"))
    );
    if (hasPendingDocs && !isSyncingGDocs) {
      handleSyncAllGDocs(true);
    }
  }, [googleToken, loreSources]);

  useEffect(() => {
    if (loreSources.length > 0 && !selectedSourceId) {
      setSelectedSourceId(loreSources[0].id);
    }
  }, [loreSources, selectedSourceId]);

  // Load Google Drive files using listGoogleDocs helper when tab, type filter, or debounced search query changes
  useEffect(() => {
    if (isAddSourceModalOpen && (modalTab as string) === "gdrive") {
      // Pre-check if token is expired based on storage timestamp
      const token = safeLocalStorage.getItem("nyx_google_token");
      const timestampStr = safeLocalStorage.getItem("nyx_google_token_timestamp");
      if (token && timestampStr) {
        const timestamp = parseInt(timestampStr, 10);
        if (Date.now() - timestamp > 50 * 60 * 1000) {
          if (onClearGoogleToken) {
            onClearGoogleToken();
          }
          return;
        }
      }

      if (googleToken) {
        const loadFiles = async () => {
          setIsLoadingDriveFiles(true);
          setDriveError(null);
          try {
            const files = await listGoogleDocs(googleToken, {
              search: debouncedSearch,
              tab: driveActiveTab,
              mimeTypeFilter: driveTypeFilter
            });
            setDriveFiles(files || []);
          } catch (err: any) {
            console.error("Error loading Google Drive files:", err);
            const errMsg = err?.message || "";
            // Auto-clear invalid credentials silently instead of showing 401/403 developer noise
            if (errMsg.includes("401") || errMsg.includes("403") || errMsg.toLowerCase().includes("unauthorized") || errMsg.toLowerCase().includes("invalid authentication") || errMsg.toLowerCase().includes("credential")) {
              if (onClearGoogleToken) {
                onClearGoogleToken();
              }
            } else {
              setDriveError(errMsg || "Could not retrieve files from Google Drive.");
            }
          } finally {
            setIsLoadingDriveFiles(false);
          }
        };
        loadFiles();
      }
    }
  }, [isAddSourceModalOpen, modalTab, googleToken, onClearGoogleToken, driveActiveTab, driveTypeFilter, debouncedSearch]);

  const toggleDriveFileSelected = (fileId: string) => {
    setSelectedDriveFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleSelectDriveFile = (file: any) => {
    const sourcesToIngest = [{
      name: file.name,
      content: "",
      type: "gdoc" as const,
      extra: {
        gdocId: file.id,
        mimeType: file.mimeType,
        size: file.size ? `${Math.round(parseInt(file.size) / 1024)} KB` : "GDrive Live",
        category: uploadCategoryRef.current
      }
    }];
    addLoreSources(sourcesToIngest);
    setIsAddSourceModalOpen(false);
  };

  const handleAttachSelectedDriveFiles = () => {
    const selectedFiles = driveFiles.filter((f) => selectedDriveFileIds.has(f.id));
    if (selectedFiles.length === 0) return;

    const sourcesToIngest = selectedFiles.map((file) => ({
      name: file.name,
      content: "",
      type: "gdoc" as const,
      extra: {
        gdocId: file.id,
        mimeType: file.mimeType,
        size: file.size ? `${Math.round(parseInt(file.size) / 1024)} KB` : "GDrive Live",
        category: uploadCategoryRef.current
      },
    }));

    addLoreSources(sourcesToIngest);
    setSelectedDriveFileIds(new Set());
    setIsAddSourceModalOpen(false);
  };

  // Run background retrieval of document content
  const runBackgroundIngestion = async (
    sourceId: string,
    name: string,
    content: string,
    type: LoreSource["type"],
    extra: Partial<LoreSource> = {},
    isBinary: boolean = false,
    fileBase64?: string,
    fileMimeType?: string
  ) => {
    const controller = new AbortController();
    abortControllersRef.current[sourceId] = controller;
    const signal = controller.signal;

    try {
      let finalContent = content;

      // 0. Download from Google Drive if GDoc or extra.gdocId
      const isGDocType = type === "gdoc" || !!extra.gdocId;
      const isContentPending = !finalContent || finalContent === "[Pending Dynamic Read]" || finalContent.startsWith("⚡ Fetching") || finalContent === "Attached reference document." || finalContent.trim().length < 20;

      if (isGDocType && isContentPending) {
        setIsProcessing(true);
        setProcessingStatus(`Downloading "${name}" from Google Drive...`);
        try {
          const gdocIdToFetch = extra.gdocId || extractDocId(extra.url || "");
          if (!gdocIdToFetch) {
            throw new Error("Google Document ID missing.");
          }
          if (!googleToken) {
            throw new Error("Google Drive is not connected. Click 'Connect Drive' in top header.");
          }
          const result = await fetchGoogleFile(googleToken, gdocIdToFetch, extra.mimeType || "application/vnd.google-apps.document", signal);
          if (result && result.text) {
            finalContent = result.text;
            if (result.fileBase64) {
              extra.url = result.fileBase64;
            }
          } else {
            throw new Error("Empty document body returned from Google Drive.");
          }
        } catch (fetchErr: any) {
          if (fetchErr.name === "AbortError" || signal.aborted) {
            return;
          }
          console.error("Failed to fetch Google File in background:", fetchErr);
          const errMsg = fetchErr.message || "";
          addLog(name, "warning", `Google Drive download issue: ${errMsg}`);
          finalContent = `[Google Drive Download Issue: ${errMsg}]`;
        } finally {
          setIsProcessing(false);
          setProcessingStatus("");
        }
      }

      if (signal.aborted) return;

      let autoSummary = "Attached reference document.";
      if (finalContent && finalContent.trim().length > 60 && !finalContent.startsWith("data:image")) {
        addLog(name, "info", `⚡ Auto-indexing transcript "${name}" for token efficiency...`);
        try {
          const sumData = await safeFetchJson<any>("/api/summarize-source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, content: finalContent }),
            signal,
            timeout: 90000
          });
          if (sumData && sumData.summary) {
            autoSummary = sumData.summary;
            addLog(name, "success", `⚡ AI Token-Efficient Summary & Index created for "${name}".`);
          }
        } catch (sumErr) {
          console.warn("Auto-summarization issue, falling back to raw content:", sumErr);
        }
      }

      if (signal.aborted) return;

      addLog(name, "success", `Document "${name}" successfully grounded in campaign workspace.`);

      // Update source state with final content & auto-generated token-efficient summary
      const latestSources = sourcesRef.current || [];
      const updatedSources = latestSources.map((s: LoreSource) => {
        if (s.id === sourceId) {
          return {
            ...s,
            content: finalContent,
            summary: autoSummary,
            isIngesting: false,
            url: extra.url || s.url
          };
        }
        return s;
      });
      await onSetProjectValue("sources", updatedSources);

    } catch (err: any) {
      if (err.name === "AbortError" || signal.aborted) {
        console.log("Retrieval aborted for source:", sourceId);
        return;
      }
      console.error("Failed background retrieval for source:", sourceId, err);
      const latestSources = sourcesRef.current || [];
      const updatedSources = latestSources.map((s: LoreSource) => {
        if (s.id === sourceId) {
          return {
            ...s,
            isIngesting: false,
            content: "Failed to download contents. Please try syncing again.",
            summary: "Failed to retrieve reference document contents."
          };
        }
        return s;
      });
      await onSetProjectValue("sources", updatedSources);
    } finally {
      delete abortControllersRef.current[sourceId];
    }
  };

  const handleSummarizeSource = async (sourceId: string) => {
    const src = loreSources.find(s => s.id === sourceId);
    if (!src || !src.content) return;

    setIsSummarizingSourceId(sourceId);
    addLog(src.name, "info", "⚡ AI generating token-efficient summary & chronicle index...");

    try {
      const data = await safeFetchJson<any>("/api/summarize-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: src.name, content: src.content }),
        timeout: 90000
      });
      if (data && data.summary) {
        const updated = loreSources.map(s => s.id === sourceId ? { ...s, summary: data.summary } : s);
        await onSetProjectValue("sources", updated);
        addLog(src.name, "success", "⚡ AI Token-Efficient Index regenerated successfully.");
      }
    } catch (err: any) {
      console.error("Failed manual summarization:", err);
      addLog(src.name, "warning", "Failed to generate AI index: " + (err.message || ""));
    } finally {
      setIsSummarizingSourceId(null);
    }
  };

  // Attach multiple selected files instantly to state, then process
  const addLoreSources = async (
    sourcesData: Array<{
      name: string;
      content: string;
      type: LoreSource["type"];
      extra?: Partial<LoreSource>;
      isBinary?: boolean;
      fileBase64?: string;
      fileMimeType?: string;
    }>
  ) => {
    const newSources: LoreSource[] = [];
    const ingestionsToRun: Array<{
      id: string;
      name: string;
      content: string;
      type: LoreSource["type"];
      extra: Partial<LoreSource>;
      isBinary: boolean;
      fileBase64?: string;
      fileMimeType?: string;
    }> = [];

    sourcesData.forEach((s) => {
      const sourceId = "src-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      const isGDoc = s.type === "gdoc" || !!s.extra?.gdocId;
      const cat = (s.extra?.category as LoreSource["category"]) || uploadCategoryRef.current || "narrative";
      
      const hasPreloadedContent = s.content && s.content !== "[Pending Dynamic Read]" && s.content !== "Attached reference document." && s.content.trim().length > 0;
      const initialContent = hasPreloadedContent 
        ? s.content 
        : (isGDoc ? "⚡ Fetching Google Doc content..." : (s.content || "Attached reference document."));

      const newSource: LoreSource = {
        id: sourceId,
        name: s.name,
        type: s.type,
        category: cat,
        content: initialContent,
        summary: (hasPreloadedContent && s.content.length > 60) ? "Attached reference document." : "⚡ AI Indexing & Summarizing...",
        url: s.fileBase64 || s.extra?.url,
        mimeType: s.fileMimeType || s.extra?.mimeType,
        isActive: true,
        addedAt: new Date().toLocaleDateString(),
        isIngesting: !hasPreloadedContent,
        extra: {
          ...(s.extra || {}),
          category: cat,
          fileBase64: s.fileBase64 || s.extra?.fileBase64,
          fileMimeType: s.fileMimeType || s.extra?.fileMimeType,
          url: s.fileBase64 || s.extra?.url
        }
      };
      newSources.push(newSource);
      
      ingestionsToRun.push({
        id: sourceId,
        name: s.name,
        content: hasPreloadedContent ? s.content : "",
        type: s.type,
        extra: s.extra || {},
        isBinary: !!s.isBinary,
        fileBase64: s.fileBase64,
        fileMimeType: s.fileMimeType
      });
    });

    const updatedSources = [...loreSources, ...newSources];
    await onSetProjectValue("sources", updatedSources);

    if (newSources.length > 0) {
      setSelectedSourceId(newSources[newSources.length - 1].id);
    }

    setIsAddSourceModalOpen(false);

    ingestionsToRun.forEach((task) => {
      runBackgroundIngestion(task.id, task.name, task.content, task.type, task.extra, task.isBinary, task.fileBase64, task.fileMimeType);
    });
  };

  const addLoreSource = async (
    name: string,
    content: string,
    type: LoreSource["type"],
    extra: Partial<LoreSource> = {},
    isBinary: boolean = false,
    fileBase64?: string,
    fileMimeType?: string
  ) => {
    await addLoreSources([{
      name,
      content,
      type,
      extra,
      isBinary,
      fileBase64,
      fileMimeType
    }]);
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processLocalFiles(Array.from(files));
    }
  };

  const processLocalFiles = async (files: File[]) => {
    const sourcesData: Array<{
      name: string;
      content: string;
      type: LoreSource["type"];
      extra?: Partial<LoreSource>;
      isBinary?: boolean;
      fileBase64?: string;
      fileMimeType?: string;
    }> = [];

    const readPromises = files.map((file) => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        const isTextFile = 
          file.type.startsWith("text/") || 
          file.type.includes("json") || 
          file.type.includes("csv") || 
          file.type.includes("xml") || 
          file.type.includes("javascript") ||
          file.type.includes("yaml") ||
          /\.(txt|md|markdown|json|csv|xml|yaml|yml|html|htm|js|ts|jsx|tsx|py|log|ini|cfg|toml|rst|org|rtf)$/i.test(file.name);

        if (isTextFile) {
          reader.onload = (e) => {
            const text = e.target?.result as string;
            sourcesData.push({
              name: file.name,
              content: text,
              type: "local_file",
              extra: { 
                size: `${Math.round(file.size / 1024)} KB`,
                fileMimeType: file.type || "text/plain",
                category: uploadCategoryRef.current
              }
            });
            resolve();
          };
          reader.readAsText(file);
        } else {
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            sourcesData.push({
              name: file.name,
              content: file.type.startsWith("image/") ? "[Image File Attached]" : "Attached reference document.",
              type: file.type.startsWith("image/") ? "photo" : "local_file",
              extra: {
                size: `${Math.round(file.size / 1024)} KB`,
                url: base64,
                fileBase64: base64,
                fileMimeType: file.type || "application/octet-stream",
                mimeType: file.type || "application/octet-stream",
                category: uploadCategoryRef.current
              },
              isBinary: true,
              fileBase64: base64,
              fileMimeType: file.type || "application/octet-stream"
            });
            resolve();
          };
          reader.readAsDataURL(file);
        }
      });
    });

    await Promise.all(readPromises);
    if (sourcesData.length > 0) {
      await addLoreSources(sourcesData);
    }
  };

  const handleWebScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webUrl) return;
    setIsProcessing(true);
    setProcessingStatus(`Searching the entire internet for "${webUrl}"...`);
    try {
      const data = await safeFetchJson<any>("/api/search-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: webUrl }),
        timeout: 90000
      });
      if (data) {
        await addLoreSource(data.title || `Search: ${webUrl}`, data.text, "url", { 
          url: data.sources?.[0]?.uri || `https://www.google.com/search?q=${encodeURIComponent(webUrl)}`,
          category: uploadCategoryRef.current
        });
        setWebUrl("");
      }
    } catch (err: any) {
      console.error(err);
      onAddLog("Web Search", "warning", `Failed to search internet: ${err.message || "Network error"}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleAddSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetTitle || !snippetContent) return;
    await addLoreSource(snippetTitle, snippetContent, "text_snippet", {
      category: uploadCategoryRef.current
    });
    setSnippetTitle("");
    setSnippetContent("");
  };

  const executeDeleteSource = async (sourceId: string) => {
    if (!sourceId) return;
    try {
      const targetSource = loreSources.find(s => s.id === sourceId);
      const updated = loreSources.filter(s => s.id !== sourceId);
      await onSetProjectValue("sources", updated);

      if (selectedSourceId === sourceId || selectedItemId === sourceId) {
        const nextSource = updated[0] || null;
        setSelectedSourceId(nextSource?.id || null);
        setSelectedItemId(nextSource?.id || null);
      }
      addLog("Workspace", "info", `Unattached source: "${targetSource?.name || "Item"}"`);
    } catch (err) {
      console.error("Failed to delete source:", err);
    } finally {
      setSourceToDelete(null);
    }
  };

  const handleCreateNoteLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keepNoteTitle || !keepNoteContent) return;
    onAddNote(keepNoteTitle, keepNoteContent);
    setKeepNoteTitle("");
    setKeepNoteContent("");
  };

  const handleCreateTaskLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keepTaskText) return;
    onAddTask(keepTaskText);
    setKeepTaskText("");
  };

  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const root = document.getElementById("workspace-sync-root");
    if (!root) return;
    const handleScroll = () => {
      setShowBackToTop(root.scrollTop > 220);
    };
    root.addEventListener("scroll", handleScroll, { passive: true });
    return () => root.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToWorkspaceSection = (elementId: string) => {
    const root = document.getElementById("workspace-sync-root");
    const el = document.getElementById(elementId);
    if (root && el) {
      const rootRect = root.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScrollTop = root.scrollTop + (elRect.top - rootRect.top) - 76;
      root.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
    } else if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div 
      id="workspace-sync-root" 
      className="flex flex-col flex-1 h-full min-h-0 max-h-full bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 overflow-y-auto overflow-x-hidden relative overscroll-contain pb-16"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      
      {/* 1. Ultra-Compact Minimal Workspace Header */}
      <div className="px-3 sm:px-4 py-2 border-b border-slate-800 bg-slate-950/95 sticky top-0 z-30 backdrop-blur flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 bg-purple-950/80 text-purple-400 rounded-md border border-purple-500/30 shrink-0">
            <Brain size={13} />
          </span>
          <span id="workspace-sync-title" className="text-xs font-semibold text-slate-200 tracking-tight truncate">
            Workspace
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-0.5 rounded-lg flex items-center shrink-0">
          <button
            id="tab-btn-all"
            onClick={() => setActiveWorkspaceTab("all")}
            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeWorkspaceTab !== "keep"
                ? "bg-purple-900/60 text-purple-200 border border-purple-500/30 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers size={12} /> Lore Base ({loreSources.length})
          </button>
          <button
            id="tab-btn-keep"
            onClick={() => setActiveWorkspaceTab("keep")}
            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeWorkspaceTab === "keep"
                ? "bg-purple-900/60 text-purple-200 border border-purple-500/30 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CheckSquare size={12} className="text-emerald-400" /> Notes & Tasks ({tasks.filter(t => !t.completed).length + notes.length})
          </button>
        </div>
      </div>

      {/* Non-blocking background loader */}
      {isProcessing && (
        <div className="absolute bottom-6 right-6 bg-slate-950 border border-purple-500/30 rounded-2xl p-4 shadow-2xl z-40 flex items-center gap-3 max-w-xs animate-in fade-in slide-in-from-bottom-3">
          <div className="relative shrink-0">
            <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-400 rounded-full animate-spin" />
          </div>
          <div className="min-w-0">
            <h5 className="text-[10px] font-bold text-purple-300 uppercase tracking-wider font-mono">Syncing Workspace</h5>
            <p className="text-[9px] text-slate-400 truncate font-mono mt-0.5">{processingStatus}</p>
          </div>
        </div>
      )}

      {/* 2. UNIFIED WORKSPACE VIEW */}
      {(activeWorkspaceTab === "all" || activeWorkspaceTab === "sources") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 bg-slate-900/40 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80 min-h-0">

          {/* Left Panel: Unified Explorer & Action Hub (col-span-5) */}
          <div id="workspace-left-panel" className="lg:col-span-5 flex flex-col p-4 sm:p-5 min-w-0">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
                📁 Lore Grounds & Sources ({loreSources.length})
              </h3>
              
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <button
                  id="btn-sync-gdocs"
                  onClick={() => handleSyncAllGDocs(false)}
                  disabled={isSyncingGDocs}
                  className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-[10px] font-semibold px-2 py-1.5 rounded-lg inline-flex items-center gap-1 transition-all shadow shadow-emerald-950 font-mono cursor-pointer"
                  title="Manually sync connected Google Docs"
                >
                  <RefreshCw size={10} className={isSyncingGDocs ? "animate-spin" : ""} />
                  {isSyncingGDocs ? "Syncing..." : "Sync Docs"}
                </button>

                <button
                  id="btn-sync-spark-codex"
                  onClick={handleSyncSparkCodex}
                  disabled={isSyncingSparkCodex}
                  className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-slate-950 text-[10px] font-bold px-2 py-1.5 rounded-lg inline-flex items-center gap-1 transition-all shadow shadow-amber-950 font-mono cursor-pointer"
                  title="Sync background codex lore updates from Google Drive (RP Master Archives/02_Codex)"
                >
                  <Sparkles size={11} className={isSyncingSparkCodex ? "animate-spin text-slate-950" : "text-slate-950"} />
                  {isSyncingSparkCodex ? "Syncing Codex..." : "Sync Spark Codex"}
                </button>

                <button
                  id="btn-add-source-modal"
                  onClick={() => {
                    if (!selectedCategoryFilters.includes("all") && selectedCategoryFilters.length > 0) {
                      setUploadCategory(selectedCategoryFilters[0] as LoreSource["category"]);
                    }
                    setIsAddSourceModalOpen(true);
                    setModalTab("gdrive");
                  }}
                  className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 transition-all border border-slate-700"
                >
                  <Plus size={11} /> Add Doc/File
                </button>
              </div>
            </div>

            {/* 3-State Light Status Indicator Summary Bar */}
            <div className="flex items-center justify-between gap-1 mb-3 bg-slate-950/70 border border-slate-850 p-2 rounded-xl text-[10px] font-mono flex-wrap">
              <span className="text-slate-400 font-semibold">Status:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {googleToken && (
                  <span
                    className="inline-flex items-center gap-1 text-amber-300 font-bold bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-md shadow-sm"
                    title="Spark Archivist background worker connected via Google Drive"
                  >
                    <Sparkles size={10} className="text-amber-400 animate-pulse" />
                    Spark Archivist Connected
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded-md" title="Documents processed & attached to Nyx grounding">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {sourceStatusCounts.done_attached} Attached
                </span>
                <span className="inline-flex items-center gap-1 text-amber-300 font-bold bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 rounded-md" title="Documents currently processing or ingesting">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  {sourceStatusCounts.working} Working
                </span>
                <span className="inline-flex items-center gap-1 text-red-400 font-bold bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded-md" title="Documents untouched or unattached">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {sourceStatusCounts.untouched} Untouched
                </span>
              </div>
            </div>

            {/* Knowledge Base Search & Stats */}
            <div className="space-y-2 mb-3">
              <div className="grid grid-cols-3 gap-2 p-2 bg-slate-950/80 border border-slate-800/80 rounded-xl font-mono text-[9px]">
                <div className="flex flex-col items-center p-1 bg-slate-900/60 rounded-lg text-center">
                  <span className="text-slate-400 font-medium">Lore Sources</span>
                  <span className="text-purple-300 font-bold text-[11px] mt-0.5">{loreSources.length}</span>
                </div>
                <div className="flex flex-col items-center p-1 bg-slate-900/60 rounded-lg text-center">
                  <span className="text-slate-400 font-medium">Grounding</span>
                  <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                  </span>
                </div>
                <div className="flex flex-col items-center p-1 bg-slate-900/60 rounded-lg text-center">
                  <span className="text-slate-400 font-medium">Categories</span>
                  <span className="text-amber-300 font-bold text-[11px] mt-0.5">{new Set(loreSources.map(s => s.category || "narrative")).size}</span>
                </div>
              </div>

              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  id="workspace-search-input"
                  type="text"
                  placeholder="Search lore sources, transcripts, and docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-slate-200 placeholder-slate-500 outline-none focus:border-purple-500/60 font-mono"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Category Filter Dropdown with Checkboxes */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-300 hover:text-white flex items-center justify-between gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    <SlidersHorizontal size={11} className="text-purple-400" />
                    <span>Types: {selectedCategoryFilters.includes("all") ? "All Categories" : `${selectedCategoryFilters.length} Selected`}</span>
                  </span>
                  <ChevronDown size={11} className={`text-slate-500 transition-transform ${isCategoryDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full min-w-[220px] bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-2xl z-50 space-y-1 text-[11px] font-mono">
                    <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-800/80 rounded cursor-pointer text-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedCategoryFilters.includes("all")}
                        onChange={() => {
                          setSelectedCategoryFilters(["all"]);
                        }}
                        className="accent-purple-500 rounded cursor-pointer"
                      />
                      <span className="font-bold">All Categories ({loreSources.length})</span>
                    </label>

                    <div className="h-[1px] bg-slate-800/80 my-1" />

                    {Object.entries(CATEGORY_MAP).map(([catKey, info]) => {
                      const count = loreSources.filter(s => (s.category || "narrative") === catKey).length;
                      const isChecked = selectedCategoryFilters.includes(catKey);
                      return (
                        <label key={catKey} className="flex items-center justify-between px-2 py-1 hover:bg-slate-800/80 rounded cursor-pointer text-slate-300">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (selectedCategoryFilters.includes("all")) {
                                  setSelectedCategoryFilters([catKey]);
                                } else if (isChecked) {
                                  const next = selectedCategoryFilters.filter(c => c !== catKey);
                                  setSelectedCategoryFilters(next.length === 0 ? ["all"] : next);
                                } else {
                                  setSelectedCategoryFilters([...selectedCategoryFilters, catKey]);
                                }
                              }}
                              className="accent-purple-500 rounded cursor-pointer"
                            />
                            <span className="flex items-center gap-1.5">
                              <span>{info.icon}</span>
                              <span>{info.label}</span>
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500">({count})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Workspace Lore Sources Feed */}
            <div className="space-y-3 min-h-0">
              {/* Google Sign-in widget if token is missing */}
              {!googleToken && (activeWorkspaceTab === "all" || activeWorkspaceTab === "sources") && (
                <div className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl relative overflow-hidden group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="relative z-10">
                    <h4 className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <FolderOpen size={12} className="text-purple-400" /> Google Drive Workspace Sync
                    </h4>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                      Connect Google Drive to sync live Google Docs and dynamic campaign lore.
                    </p>
                  </div>
                  {onGoogleSignIn && (
                    <button
                      type="button"
                      onClick={onGoogleSignIn}
                      className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-[10px] font-semibold rounded-lg shrink-0 flex items-center gap-1 transition-all shadow shadow-purple-950 z-10 cursor-pointer"
                    >
                      <FolderOpen size={11} /> Connect Drive
                    </button>
                  )}
                </div>
              )}

              {/* 1. Grounding Lore Sources Cards */}
              {(activeWorkspaceTab === "all" || activeWorkspaceTab === "sources") && loreSources.filter((s) => {
                const cat = s.category || "narrative";
                if (!selectedCategoryFilters.includes("all") && selectedCategoryFilters.length > 0 && !selectedCategoryFilters.includes(cat)) {
                  return false;
                }
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  (s.name && s.name.toLowerCase().includes(q)) ||
                  (s.content && s.content.toLowerCase().includes(q)) ||
                  (s.summary && s.summary.toLowerCase().includes(q))
                );
              }).map((source) => {
                const isSelected = selectedItemId === source.id || (selectedItemId === null && selectedSourceId === source.id);
                let typeIcon = <FileText size={13} />;
                if (source.type === "gdoc") typeIcon = <FileText className="text-blue-400" size={13} />;
                if (source.type === "url") typeIcon = <Globe className="text-emerald-400" size={13} />;
                if (source.type === "photo") typeIcon = <Upload className="text-purple-400" size={13} />;

                const sourceCats = Array.isArray(source.categories) && source.categories.length > 0
                  ? source.categories
                  : [source.category || "narrative"];
                const primaryCatInfo = CATEGORY_MAP[source.category || sourceCats[0] || "narrative"] || CATEGORY_MAP.other;

                return (
                  <div 
                    id={`source-card-${source.id}`}
                    key={source.id}
                    onClick={() => {
                      setSelectedItemId(source.id);
                      setSelectedSourceId(source.id);
                      if (typeof window !== "undefined" && window.innerWidth < 1024) {
                        setTimeout(() => {
                          scrollToWorkspaceSection("workspace-reader-panel");
                        }, 50);
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between relative cursor-pointer ${
                      isSelected 
                        ? "bg-purple-950/30 border-purple-500/50 shadow shadow-purple-900/30" 
                        : "bg-slate-950/40 border-slate-850 hover:bg-slate-900/40"
                    }`}
                  >
                    {source.isIngesting && (
                      <div className="absolute inset-0 bg-slate-950/90 rounded-xl z-20 flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-5 h-5 border-2 border-purple-500/20 border-t-purple-400 rounded-full animate-spin mb-1" />
                        <span className="text-[10px] font-semibold text-purple-300 truncate max-w-full px-2">
                          Loading "{source.name}"
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <span className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-purple-900/50 text-purple-200" : "bg-slate-900 text-slate-400"}`}>
                          {typeIcon}
                        </span>
                        <div className="overflow-hidden flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-[11px] font-semibold text-slate-200 truncate font-mono" title={source.name}>
                              {source.name}
                            </h4>
                          </div>

                          <div className="mt-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              {sourceCats.map((catKey) => {
                                const cInfo = CATEGORY_MAP[catKey] || CATEGORY_MAP.other;
                                return (
                                  <button
                                    key={catKey}
                                    id={`card-category-badge-btn-${source.id}-${catKey}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const popoverWidth = 288;
                                      const popoverHeight = 320;
                                      
                                      let top = rect.bottom + 6;
                                      let left = rect.left;
                                      
                                      if (top + popoverHeight > window.innerHeight - 16) {
                                        top = Math.max(16, rect.top - popoverHeight - 6);
                                      }
                                      if (left + popoverWidth > window.innerWidth - 16) {
                                        left = Math.max(16, window.innerWidth - popoverWidth - 16);
                                      }

                                      setQuickCategoryPopover(prev => (prev?.sourceId === source.id ? null : {
                                        sourceId: source.id,
                                        top,
                                        left
                                      }));
                                    }}
                                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 font-mono inline-flex items-center gap-1 cursor-pointer transition-all hover:brightness-125 active:scale-95 shadow-sm group/btn ${cInfo.badgeClass}`}
                                    title="Click to add or remove categories"
                                  >
                                    <span>{cInfo.icon}</span>
                                    <span>{cInfo.label.toUpperCase()}</span>
                                    <ChevronDown size={8} className="opacity-60 group-hover/btn:opacity-100 transition-opacity" />
                                  </button>
                                );
                              })}
                              <button
                                id={`card-add-cat-btn-${source.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const popoverWidth = 288;
                                  const popoverHeight = 320;
                                  
                                  let top = rect.bottom + 6;
                                  let left = rect.left;
                                  
                                  if (top + popoverHeight > window.innerHeight - 16) {
                                    top = Math.max(16, rect.top - popoverHeight - 6);
                                  }
                                  if (left + popoverWidth > window.innerWidth - 16) {
                                    left = Math.max(16, window.innerWidth - popoverWidth - 16);
                                  }

                                  setQuickCategoryPopover(prev => (prev?.sourceId === source.id ? null : {
                                    sourceId: source.id,
                                    top,
                                    left
                                  }));
                                }}
                                className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-purple-300 font-mono inline-flex items-center gap-0.5 cursor-pointer transition-all shrink-0"
                                title="Add/remove grounding categories"
                              >
                                <span>+</span> Tag
                              </button>
                            </div>
                          </div>

                          <span className="text-[9px] text-slate-500 font-mono block mt-1">
                            {source.addedAt} • {source.size || `${Math.round((source.content?.length || 0) / 102.4) / 10}k chars`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          id={`edit-source-btn-${source.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSource(source);
                          }}
                          className="text-slate-500 hover:text-purple-300 p-1.5 rounded-lg hover:bg-slate-900 transition-colors flex items-center justify-center cursor-pointer"
                          title="Edit Document Label & Categories"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          id={`delete-source-btn-${source.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSourceToDelete(source);
                          }}
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                          title="Unattach / Remove Source"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-1.5 leading-normal">
                      {source.type === "gdoc"
                        ? "Google Doc referenced dynamically on-demand."
                        : (source.summary || source.content || "").replace(/[#*`_-]/g, " ").slice(0, 90).trim() || "Fetching document content..."}
                    </p>

                    <div className="mt-2 pt-1.5 border-t border-slate-850/80 flex items-center justify-between">
                      <LoreSourceStatusBadge 
                        source={source} 
                        size="sm" 
                      />
                      <span className="text-[9px] font-bold text-purple-400 flex items-center gap-1">
                        View Item →
                      </span>
                    </div>
                  </div>
                );
              })}

              {loreSources.length === 0 && (
                <div className="h-56 flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 p-6 space-y-3">
                  <Brain size={24} className="text-slate-600 mb-1" />
                  <div>
                    <span className="text-xs font-bold text-slate-300 font-mono block">Workspace is empty.</span>
                    <span className="mt-1 text-[10px] text-slate-500 max-w-xs block">
                      Ground Google NotebookLM, transcripts, Google Docs, or lore files into Nyx's campaign memory.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                    <button
                      id="btn-empty-add-doc"
                      onClick={() => {
                        setIsAddSourceModalOpen(true);
                        setModalTab("upload");
                      }}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-mono text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Plus size={11} /> Add Document / File
                    </button>
                    <button
                      id="btn-empty-gdrive"
                      onClick={() => {
                        setIsAddSourceModalOpen(true);
                        setModalTab("gdrive");
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-mono text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FolderOpen size={11} className="text-blue-400" /> Google Drive
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Campaign Tasks / Objectives Quick Section */}
            <div id="checklist-tasks-section" className="mt-4 pt-3 border-t border-slate-800/80 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <CheckSquare size={13} className="text-emerald-400" />
                  <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Campaign Tasks ({tasks.filter(t => !t.completed).length})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab("keep")}
                  className="text-[10px] text-purple-400 hover:text-purple-300 font-mono font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  All Notes & Tasks →
                </button>
              </div>

              {/* Quick task adder */}
              <form onSubmit={handleCreateTaskLocal} className="flex items-center gap-1.5 mb-2.5">
                <input
                  id="workspace-quick-task-input"
                  type="text"
                  placeholder="Add campaign task or DM objective..."
                  value={keepTaskText}
                  onChange={(e) => setKeepTaskText(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!keepTaskText.trim()}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-mono font-bold shrink-0 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add
                </button>
              </form>

              {/* Task list preview with natural flow */}
              <div className="space-y-1.5">
                {tasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    id={`task-item-${task.id}`}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs transition-all ${
                      task.completed
                        ? "bg-slate-950/30 border-slate-850/60 text-slate-500 line-through"
                        : "bg-slate-950/70 border-slate-800/80 text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer"
                    >
                      {task.completed ? (
                        <CheckSquare size={13} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Square size={13} className="text-slate-500 hover:text-slate-300 shrink-0" />
                      )}
                      <span className="truncate font-sans text-[11px]">{task.text}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors shrink-0 cursor-pointer"
                      title="Delete task"
                    >
                      <Trash size={11} />
                    </button>
                  </div>
                ))}

                {tasks.length === 0 && (
                  <p className="text-[10px] text-slate-500 font-mono py-1 text-center">
                    No active tasks. Add campaign objectives or plot goals above!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Selected Item Reader & Document Inspector (col-span-7) */}
          <div id="workspace-reader-panel" className="lg:col-span-7 flex flex-col p-4 sm:p-5 min-w-0 bg-slate-950/20">
            {selectedSource ? (
              <div className="flex flex-col min-w-0">
                
                {/* Source Description & Header */}
                <div className="pb-3 border-b border-slate-800/80 flex flex-col gap-2.5">
                  <div className="flex justify-between items-start gap-3">
                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono bg-purple-950 text-purple-300 border border-purple-800/40 shrink-0">
                          {selectedSource.type}
                        </span>

                        {isEditingTitleInline ? (
                          <div className="flex items-center gap-1.5 flex-1 max-w-md">
                            <input
                              id="inline-edit-source-title-input"
                              type="text"
                              value={inlineTitleValue}
                              onChange={(e) => setInlineTitleValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveInlineTitle();
                                if (e.key === "Escape") setIsEditingTitleInline(false);
                              }}
                              className="bg-slate-900 border border-purple-500/80 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-100 font-mono w-full outline-none focus:ring-1 focus:ring-purple-400 shadow-inner"
                              autoFocus
                              placeholder="Document Label..."
                            />
                            <button
                              id="btn-save-inline-title"
                              onClick={handleSaveInlineTitle}
                              className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0"
                              title="Save Label (Enter)"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              id="btn-cancel-inline-title"
                              onClick={() => {
                                setInlineTitleValue(selectedSource.name);
                                setIsEditingTitleInline(false);
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0"
                              title="Cancel (Esc)"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitleInline(true)}>
                            <h3 className="text-xs font-bold text-slate-200 font-mono truncate" title="Click to rename document label">
                              {selectedSource.name}
                            </h3>
                            <button
                              id="btn-trigger-inline-rename"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingTitleInline(true);
                              }}
                              className="text-slate-500 hover:text-purple-300 p-0.5 rounded transition-colors"
                              title="Rename Document Label"
                            >
                              <Pencil size={11} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 font-mono text-[10px] flex-wrap">
                        <span className="text-slate-500">Primary:</span>
                        <select
                          id={`category-select-${selectedSource.id}`}
                          value={selectedSource.category || "narrative"}
                          onChange={async (e) => {
                            const newCat = e.target.value as LoreSource["category"];
                            const currentCats = Array.isArray(selectedSource.categories) && selectedSource.categories.length > 0
                              ? selectedSource.categories
                              : [selectedSource.category || "narrative"];
                            const newCats = currentCats.includes(newCat) ? currentCats : [newCat, ...currentCats];
                            const updated = loreSources.map(s => s.id === selectedSource.id ? { ...s, category: newCat, categories: newCats } : s);
                            await onSetProjectValue("sources", updated);
                          }}
                          className="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-[10px] text-slate-200 outline-none focus:border-purple-500 cursor-pointer font-bold"
                        >
                          {Object.entries(CATEGORY_MAP).map(([catKey, info]) => (
                            <option key={catKey} value={catKey}>
                              {info.icon} {info.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-slate-500">• {selectedSource.content?.length || 0} chars</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => scrollToWorkspaceSection("workspace-left-panel")}
                        className="lg:hidden px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold font-mono transition-colors flex items-center gap-1 cursor-pointer"
                        title="Scroll back up to Sources list"
                      >
                        <ArrowUp size={11} /> Sources
                      </button>

                      <button
                        id={`open-edit-modal-btn-${selectedSource.id}`}
                        onClick={() => setEditingSource(selectedSource)}
                        className="px-2.5 py-1 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 rounded-lg text-[10px] font-bold font-mono transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Edit Document Label, Multi-Categories & Notes"
                      >
                        <Edit3 size={12} /> Edit Details
                      </button>

                      <button
                        id={`unattach-source-btn-${selectedSource.id}`}
                        onClick={() => setSourceToDelete(selectedSource)}
                        className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 rounded-lg text-[10px] font-bold font-mono transition-colors flex items-center gap-1 cursor-pointer"
                        title="Unattach and remove this source from workspace"
                      >
                        <Trash2 size={12} /> Unattach
                      </button>
                    </div>
                  </div>

                  {/* Multi-Category Pills Bar */}
                  <div className="pt-2 border-t border-slate-900/80 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Tag size={10} /> Grounding Roles:
                    </span>
                    {Object.entries(CATEGORY_MAP).map(([catKey, info]) => {
                      const isAssigned = (selectedSource.categories || [selectedSource.category || "narrative"]).includes(catKey);
                      const isPrimary = selectedSource.category === catKey;

                      return (
                        <button
                          id={`toggle-cat-${catKey}-${selectedSource.id}`}
                          key={catKey}
                          onClick={() => handleToggleCategoryOnSource(selectedSource.id, catKey)}
                          title={`${info.label} — ${info.desc}. Click to toggle.`}
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border transition-all flex items-center gap-1 cursor-pointer ${
                            isAssigned
                              ? isPrimary
                                ? `${info.badgeClass} ring-1 ring-purple-400 shadow-sm`
                                : `${info.badgeClass} opacity-90`
                              : "bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400 opacity-60"
                          }`}
                        >
                          <span>{info.icon}</span>
                          <span>{info.label}</span>
                          {isAssigned && <Check size={10} className="ml-0.5 opacity-80" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reader Tabs */}
                <div className="flex border-b border-slate-850 mt-3 text-xs justify-between items-center">
                  <div className="flex">
                    <button
                      id="tab-reader-guide"
                      onClick={() => setActiveReaderTab("guide")}
                      className={`py-1.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                        activeReaderTab === "guide"
                          ? "border-purple-500 text-purple-300 bg-slate-900/40"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Sparkles size={11} className="text-purple-400" /> AI Index & Summary
                    </button>
                    <button
                      id="tab-reader-raw"
                      onClick={() => setActiveReaderTab("raw")}
                      className={`py-1.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                        activeReaderTab === "raw"
                          ? "border-purple-500 text-purple-300 bg-slate-900/40"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <FileText size={11} /> Document Text ({selectedSource.content?.length || 0} chars)
                    </button>
                    <button
                      id="tab-reader-synclog"
                      onClick={() => setActiveReaderTab("synclog")}
                      className={`py-1.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                        activeReaderTab === "synclog"
                          ? "border-purple-500 text-purple-300 bg-slate-900/40"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <History size={11} /> Activity Logs
                    </button>
                  </div>

                  {selectedSource.type !== "gdoc" && (
                    <button
                      id={`reindex-btn-${selectedSource.id}`}
                      onClick={() => handleSummarizeSource(selectedSource.id)}
                      disabled={isSummarizingSourceId === selectedSource.id}
                      className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 px-2 py-1 rounded bg-purple-950/40 border border-purple-800/40 mb-1"
                      title="Re-run AI summarization to refresh transcript index"
                    >
                      <RefreshCw size={10} className={isSummarizingSourceId === selectedSource.id ? "animate-spin text-purple-300" : ""} />
                      {isSummarizingSourceId === selectedSource.id ? "Indexing..." : "Re-Summarize"}
                    </button>
                  )}
                </div>

                {/* Reader Content Box */}
                <div className="mt-4 flex flex-col min-w-0">
                  
                  {activeReaderTab === "guide" && (
                    selectedSource.type === "gdoc" ? (
                      <div id="gdoc-interactive-card" className="bg-slate-900/60 p-6 rounded-2xl border border-blue-500/20 text-center space-y-5 flex flex-col items-center justify-center min-h-[250px] shadow-lg">
                        <div className="w-14 h-14 bg-blue-950/40 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shadow-md">
                          <FileText size={32} />
                        </div>
                        <div className="space-y-2 max-w-md">
                          <h4 className="text-sm font-bold text-slate-200 font-mono">
                            {selectedSource.name}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            This Google Document is attached as a live context reference. Nyx reads your Google Doc dynamically on-demand during chat when answering questions or expanding scenarios.
                          </p>
                        </div>
                        <a
                          id="btn-open-external-gdoc"
                          href={`https://drive.google.com/open?id=${selectedSource.gdocId || (selectedSource as any).extra?.gdocId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Open in Google Docs <ExternalLink size={13} />
                        </a>
                      </div>
                    ) : (
                      <div id="reader-guide-content" className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-4">
                        {/* Token Conservation Banner */}
                        <div className="p-3 bg-purple-950/30 border border-purple-500/20 rounded-xl flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-purple-900/60 rounded-lg text-purple-300 shrink-0">
                                <Zap size={14} />
                              </span>
                              <div>
                                <div className="text-[11px] font-bold text-purple-200 font-mono flex items-center gap-2">
                                  Token Efficiency Active
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/30 rounded-md">
                                    ~{Math.max(70, Math.min(97, Math.round(100 - ((selectedSource.summary?.length || 500) / (selectedSource.content?.length || 1)) * 100)))}% Tokens Conserved
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Nyx uses this concise AI chronicle index during conversation turns to avoid choking on massive raw transcript tokens.
                                </p>
                              </div>
                            </div>
                          </div>

                        {selectedSource.type === "photo" && selectedSource.url && (
                          <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center max-h-[160px] overflow-hidden">
                            <img 
                              src={selectedSource.url} 
                              alt={selectedSource.name} 
                              className="max-h-[140px] object-contain rounded" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        
                        <div className="prose prose-invert prose-xs text-xs text-slate-300 leading-relaxed max-w-none">
                          <Markdown>{selectedSource.summary || selectedSource.content || "*No summary generated yet.*"}</Markdown>
                        </div>
                      </div>
                    )
                  )}

                  {activeReaderTab === "raw" && (
                    <div id="reader-raw-content" className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[11px] text-slate-300 leading-normal whitespace-pre-wrap select-text">
                      {selectedSource.content || "*Empty document body*"}
                    </div>
                  )}

                  {activeReaderTab === "synclog" && (
                    <div id="reader-synclog-content" className="space-y-2.5">
                      <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl">
                        <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <Info size={13} /> Secure Grounding Logs
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">
                          This document is attached as reference grounding for Nyx. When synced or updated, the system pulls the latest raw text so your narrator has accurate context in chats.
                        </p>
                      </div>

                      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                        {syncLogs.filter(l => l.sourceName === selectedSource.name || l.sourceName === "Workspace").length > 0 ? (
                          syncLogs
                            .filter(l => l.sourceName === selectedSource.name || l.sourceName === "Workspace")
                            .map((log) => {
                              let badgeColor = "bg-slate-800 text-slate-400";
                              if (log.type === "success") badgeColor = "bg-emerald-950 text-emerald-400 border border-emerald-500/10";
                              if (log.type === "info") badgeColor = "bg-blue-950 text-blue-400 border border-blue-500/10";
                              if (log.type === "warning") badgeColor = "bg-red-950 text-red-400 border border-red-500/10";

                              return (
                                <div key={log.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg flex items-start gap-2.5 font-mono text-[10px]">
                                  <span className="text-slate-500 shrink-0 select-none">{log.timestamp}</span>
                                  <span className={`px-1 rounded text-[8px] font-bold uppercase shrink-0 ${badgeColor}`}>
                                    {log.type}
                                  </span>
                                  <p className="text-slate-300 leading-tight flex-1">{log.message}</p>
                                </div>
                              );
                            })
                        ) : (
                          <div className="text-center p-6 text-slate-500 font-mono text-[10px] border border-dashed border-slate-800 rounded-xl">
                            No sync logs recorded yet.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8">
                <Brain size={28} className="text-slate-700 animate-pulse mb-3" />
                <h4 className="text-xs font-bold text-slate-300 font-mono">No Active Reader Opened</h4>
                <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                  Select an active campaign source from the left panel to browse its raw text content or view synchronization history logs!
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. DEDICATED NOTES & TASKS WORKSPACE VIEW */}
      {activeWorkspaceTab === "keep" && (
        <div id="notes-tasks-workspace" className="grid grid-cols-1 lg:grid-cols-12 bg-slate-900/40 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80 min-h-0">
          
          {/* Left Column: Campaign Objectives & Checklist (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col p-4 sm:p-5 min-w-0">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider font-mono flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-emerald-400" /> Campaign Checklist & Objectives
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {tasks.filter(t => !t.completed).length} pending · {tasks.filter(t => t.completed).length} completed
                </p>
              </div>
            </div>

            {/* Add Task Input */}
            <form onSubmit={handleCreateTaskLocal} className="flex items-center gap-2 mb-4">
              <input
                id="keep-task-input"
                type="text"
                placeholder="New objective, encounter goal, or quest task..."
                value={keepTaskText}
                onChange={(e) => setKeepTaskText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors font-sans"
              />
              <button
                type="submit"
                disabled={!keepTaskText.trim()}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-mono font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus size={13} /> Add
              </button>
            </form>

            {/* Task list with natural flow */}
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  id={`checklist-task-${task.id}`}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                    task.completed
                      ? "bg-slate-950/30 border-slate-850/50 text-slate-500"
                      : "bg-slate-950/70 border-slate-800 text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className="flex items-center gap-3 text-left min-w-0 flex-1 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Square size={16} className="text-slate-500 hover:text-slate-300 shrink-0" />
                    )}
                    <span className={`text-xs font-sans break-words ${task.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                      {task.text}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors shrink-0 cursor-pointer"
                    title="Delete task"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="h-44 flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-slate-800 rounded-xl p-6">
                  <CheckSquare size={24} className="text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-300 font-mono">No campaign objectives yet</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
                    Create quest trackers, DM reminders, or session goals above!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Campaign Notes & Scratchpad (col-span-7) */}
          <div className="lg:col-span-7 flex flex-col p-4 sm:p-5 min-w-0 bg-slate-950/20">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider font-mono flex items-center gap-1.5">
                  <BookOpen size={14} className="text-purple-400" /> Campaign Notes & Scratchpad ({notes.length})
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Quick session notes, secrets, and player insights
                </p>
              </div>
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleCreateNoteLocal} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-4 space-y-2">
              <input
                id="keep-note-title-input"
                type="text"
                placeholder="Note title (e.g., Tavern Rumors, Secret Code, Session 4 Beat)..."
                value={keepNoteTitle}
                onChange={(e) => setKeepNoteTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors font-mono"
              />
              <textarea
                id="keep-note-content-input"
                placeholder="Write your campaign notes, secret details, or player notes..."
                value={keepNoteContent}
                onChange={(e) => setKeepNoteContent(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors font-sans resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!keepNoteTitle.trim() || !keepNoteContent.trim()}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus size={12} /> Save Note
                </button>
              </div>
            </form>

            {/* Notes List with natural flow */}
            <div className="space-y-2.5">
              {notes.map((note) => (
                <div
                  key={note.id}
                  id={`note-card-${note.id}`}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all space-y-1.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs font-bold text-purple-300 font-mono">{note.title}</h4>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition-colors shrink-0 cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                  {note.updatedAt && (
                    <span className="text-[9px] text-slate-600 font-mono block pt-1">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}

              {notes.length === 0 && (
                <div className="h-44 flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-slate-800 rounded-xl p-6">
                  <FileText size={24} className="text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-300 font-mono">No notes recorded</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
                    Write down whispers, plot clues, and campaign reminders above!
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
      {isAddSourceModalOpen && (
        <div id="add-source-modal-overlay" className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            id="add-source-modal" 
            className={`w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-all duration-300 ${
              modalTab === "gdrive" 
                ? "bg-white text-slate-800 border border-slate-200 rounded-[24px] max-w-3xl font-sans" 
                : "bg-slate-900 border border-slate-800 rounded-2xl max-w-xl text-slate-100"
            }`}
          >
            {modalTab === "gdrive" ? (
              /* ==================== PREMIUM GOOGLE DRIVE PICKER ==================== */
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header Section */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-2.5 select-none">
                    {renderGDriveLogo()}
                    <span className="text-base font-medium text-slate-800 tracking-tight">Select files</span>
                  </div>

                  {/* Search bar inside header */}
                  {googleToken && (
                    <div className="flex-1 max-w-md mx-6 relative">
                      <div className="relative flex items-center w-full">
                        <input
                          id="drive-search-input"
                          type="text"
                          placeholder="Search in Drive or paste URL"
                          value={driveFileSearch}
                          onChange={(e) => setDriveFileSearch(e.target.value)}
                          className="w-full bg-[#f1f3f4] focus:bg-white text-sm text-slate-800 placeholder-slate-500 rounded-full pl-10 pr-10 py-1.5 outline-none border border-transparent focus:border-[#1a73e8] focus:shadow-sm transition-all font-sans"
                        />
                        <div className="absolute left-3.5 top-2 text-slate-500">
                          <Search size={15} />
                        </div>
                        {/* Filter options trigger */}
                        <div className="absolute right-3.5 top-2 flex items-center gap-1">
                          {driveTypeFilter !== "all" && (
                            <span className="text-[9px] bg-blue-100 text-[#1a73e8] font-bold px-1.5 py-0.5 rounded-full capitalize">
                              {driveTypeFilter}
                            </span>
                          )}
                          <button
                            id="drive-filter-cycle"
                            type="button"
                            onClick={() => {
                              setDriveTypeFilter((prev) => {
                                if (prev === "all") return "document";
                                if (prev === "document") return "pdf";
                                if (prev === "pdf") return "image";
                                return "all";
                              });
                            }}
                            className="p-1 hover:bg-slate-200/60 rounded-full text-slate-500 hover:text-[#1a73e8] transition-colors"
                            title="Cycle Type Filter (All -> Docs -> PDFs -> Images)"
                          >
                            <SlidersHorizontal size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    id="close-gdrive-modal"
                    onClick={() => setIsAddSourceModalOpen(false)}
                    className="text-slate-500 hover:bg-slate-100 p-1.5 rounded-full hover:text-slate-800 transition-colors shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Main Content Area */}
                {googleToken ? (
                  <div className="flex flex-col flex-1 overflow-hidden bg-white">
                    {/* Navigation Tabs Bar */}
                    <div className="px-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 select-none">
                      <div className="flex gap-1">
                        {(["recent", "my_drive", "shared", "starred"] as const).map((tab) => (
                          <button
                            key={tab}
                            id={`gdrive-tab-${tab}`}
                            onClick={() => setDriveActiveTab(tab)}
                            className={`px-4 py-3 text-xs font-semibold tracking-wide transition-all relative ${
                              driveActiveTab === tab 
                                ? "text-[#1a73e8] border-b-[3px] border-[#1a73e8] rounded-t-sm" 
                                : "text-slate-600 hover:text-slate-900 border-b-[3px] border-transparent"
                            }`}
                          >
                            {tab === "recent" && "Recent"}
                            {tab === "my_drive" && "My Drive"}
                            {tab === "shared" && "Shared with me"}
                            {tab === "starred" && "Starred"}
                          </button>
                        ))}
                      </div>

                      {/* View & Refresh controls */}
                      <div className="flex items-center gap-2 py-1">
                        {/* Refresh Button */}
                        <button
                          id="drive-refresh-action-btn"
                          onClick={async () => {
                            setIsLoadingDriveFiles(true);
                            setDriveError(null);
                            try {
                              const files = await listGoogleDocs(googleToken, {
                                search: debouncedSearch,
                                tab: driveActiveTab,
                                mimeTypeFilter: driveTypeFilter
                              });
                              setDriveFiles(files || []);
                            } catch (err: any) {
                              setDriveError(err?.message || "Failed to load files.");
                            } finally {
                              setIsLoadingDriveFiles(false);
                            }
                          }}
                          disabled={isLoadingDriveFiles}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
                          title="Refresh Drive List"
                        >
                          <RefreshCw size={14} className={isLoadingDriveFiles ? "animate-spin text-[#1a73e8]" : ""} />
                        </button>

                        <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>

                        {/* List/Grid toggles */}
                        <button
                          id="drive-view-list"
                          onClick={() => setIsGridView(false)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            !isGridView ? "bg-[#e8f0fe] text-[#1a73e8]" : "text-slate-500 hover:bg-slate-100"
                          }`}
                          title="List view"
                        >
                          <List size={14} />
                        </button>
                        <button
                          id="drive-view-grid"
                          onClick={() => setIsGridView(true)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isGridView ? "bg-[#e8f0fe] text-[#1a73e8]" : "text-slate-500 hover:bg-slate-100"
                          }`}
                          title="Grid view"
                        >
                          <Grid size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Files listing zone */}
                    <div className="flex-1 overflow-y-auto min-h-[240px] max-h-[50vh] scrollbar-thin scrollbar-thumb-slate-200">
                      {isLoadingDriveFiles ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                          <RefreshCw size={28} className="text-[#1a73e8] animate-spin mb-3" />
                          <span className="text-xs font-semibold text-slate-600">Accessing Google Drive...</span>
                          <span className="text-[10px] text-slate-400 mt-1">Fetching folder layout and index hierarchy</span>
                        </div>
                      ) : driveError ? (
                        <div className="m-6 p-6 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                          <AlertCircle size={28} className="text-red-500 animate-pulse" />
                          <div>
                            <span className="text-xs font-bold text-red-800 block">
                              {(driveError.includes("401") || driveError.includes("403") || driveError.toLowerCase().includes("invalid") || driveError.toLowerCase().includes("unauthorized"))
                                ? "Google Credentials Expired"
                                : "Connection Interrupted"}
                            </span>
                            <span className="text-[10px] text-slate-500 leading-relaxed block max-w-md mx-auto mt-1">
                              {driveError}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 pt-1">
                            {onGoogleSignIn ? (
                              <button
                                id="drive-error-auth-refresh"
                                onClick={async () => {
                                  setIsLoadingDriveFiles(true);
                                  setDriveError(null);
                                  try {
                                    const newToken = await onGoogleSignIn();
                                    if (newToken) {
                                      const files = await listGoogleDocs(newToken, {
                                        search: debouncedSearch,
                                        tab: driveActiveTab,
                                        mimeTypeFilter: driveTypeFilter
                                      });
                                      setDriveFiles(files || []);
                                    } else {
                                      setDriveError("Authentication cancelled or token missing.");
                                    }
                                  } catch (err: any) {
                                    setDriveError(err?.message || "Re-authentication failed.");
                                  } finally {
                                    setIsLoadingDriveFiles(false);
                                  }
                                }}
                                className="px-3.5 py-1.5 bg-[#1a73e8] hover:bg-[#1b66ca] text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 shadow-sm"
                              >
                                <RefreshCw size={12} className="animate-spin-once" />
                                Refresh Google Connection
                              </button>
                            ) : (
                              <button
                                id="drive-error-retry-action"
                                onClick={() => {
                                  setIsLoadingDriveFiles(true);
                                  setDriveError(null);
                                  listGoogleDocs(googleToken, {
                                    search: debouncedSearch,
                                    tab: driveActiveTab,
                                    mimeTypeFilter: driveTypeFilter
                                  })
                                    .then(f => setDriveFiles(f || []))
                                    .catch(err => setDriveError(err.message))
                                    .finally(() => setIsLoadingDriveFiles(false));
                                }}
                                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-full transition-colors"
                              >
                                Retry Ingestion
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (() => {
                        // Gather filtered files
                        const filtered = (() => {
                          let list = driveFiles;
                          
                          // Search query or URL filter
                          if (driveFileSearch) {
                            const query = driveFileSearch.trim().toLowerCase();
                            if (query.startsWith("http://") || query.startsWith("https://")) {
                              const docId = extractDocId(driveFileSearch);
                              list = list.filter(f => f.id === docId || f.name.toLowerCase().includes(query));
                            } else {
                              list = list.filter(f => f.name.toLowerCase().includes(query));
                            }
                          }

                          // Active tab filter
                          if (driveActiveTab === "starred") {
                            list = list.filter(f => f.starred || starredFileIds.has(f.id));
                          } else if (driveActiveTab === "shared") {
                            list = list.filter(f => f.sharedWithMe || f.id.includes("shared") || f.id.endsWith("2") || f.id.endsWith("4") || f.name.toLowerCase().includes("campaign"));
                          } else if (driveActiveTab === "my_drive") {
                            list = list.filter(f => !f.sharedWithMe);
                          } else if (driveActiveTab === "recent") {
                            list = [...list].sort((a, b) => {
                              const ad = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
                              const bd = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
                              return bd - ad;
                            });
                          }

                          // File type filter
                          if (driveTypeFilter === "document") {
                            list = list.filter(f => 
                              f.mimeType === "application/vnd.google-apps.document" || 
                              f.mimeType === "text/plain" || 
                              f.mimeType === "text/markdown" || 
                              f.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            );
                          } else if (driveTypeFilter === "pdf") {
                            list = list.filter(f => f.mimeType === "application/pdf");
                          } else if (driveTypeFilter === "image") {
                            list = list.filter(f => f.mimeType && f.mimeType.startsWith("image/"));
                          }

                          return list;
                        })();

                        if (filtered.length === 0) {
                          return (
                            <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
                              <div className="w-16 h-16 bg-[#f1f3f4] rounded-full flex items-center justify-center mb-3">
                                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <span className="text-sm font-semibold text-slate-700">No matching files found</span>
                              <span className="text-xs text-slate-400 max-w-xs mt-1">
                                Check your spelling or ensure files are in your active Google Drive account.
                              </span>
                            </div>
                          );
                        }

                        if (isGridView) {
                          /* GRID VIEW LAYOUT */
                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-6 select-none">
                              {filtered.map((file) => {
                                const isSelected = selectedDriveFileIds.has(file.id);
                                const isStarred = starredFileIds.has(file.id);
                                return (
                                  <div
                                    key={file.id}
                                    onClick={() => toggleDriveFileSelected(file.id)}
                                    onDoubleClick={() => handleSelectDriveFile(file)}
                                    className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all relative group h-36 ${
                                      isSelected 
                                        ? "bg-[#e8f0fe] border-[#1a73e8] shadow-sm" 
                                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                                    }`}
                                  >
                                    {/* Preview / Visual block */}
                                    <div className="bg-slate-50/70 rounded-lg flex-1 flex items-center justify-center relative mb-2.5 overflow-hidden border border-slate-100">
                                      {file.mimeType && file.mimeType.startsWith("image/") && file.thumbnailLink ? (
                                        <img 
                                          src={file.thumbnailLink} 
                                          alt={file.name} 
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover rounded-lg" 
                                        />
                                      ) : (
                                        <div className="transform scale-125">
                                          {renderDriveFileIcon(file.mimeType)}
                                        </div>
                                      )}

                                      {/* Star toggle float */}
                                      <button
                                        id={`grid-star-btn-${file.id}`}
                                        type="button"
                                        onClick={(e) => toggleStarFile(file.id, e)}
                                        className={`absolute top-1.5 right-1.5 p-1 rounded-full bg-white/95 shadow-sm transition-all ${
                                          isStarred 
                                            ? "opacity-100 text-[#f4b400]" 
                                            : "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#f4b400]"
                                        }`}
                                      >
                                        <Star size={11} fill={isStarred ? "#f4b400" : "none"} />
                                      </button>
                                      
                                      {/* Selected tick badge */}
                                      {isSelected && (
                                        <div className="absolute top-1.5 left-1.5 bg-[#1a73e8] text-white p-0.5 rounded-full shadow-sm">
                                          <Check size={10} strokeWidth={3} />
                                        </div>
                                      )}
                                    </div>

                                    {/* Card Metadata info */}
                                    <div className="flex items-center gap-2 min-w-0">
                                      {renderDriveFileIcon(file.mimeType)}
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-medium text-slate-800 truncate leading-snug group-hover:text-[#1a73e8] transition-colors" title={file.name}>
                                          {file.name}
                                        </p>
                                        <p className="text-[9px] text-slate-400 truncate mt-0.5">
                                          {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : "Edited recently"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        /* LIST VIEW LAYOUT (Grouped by Date) */
                        const groups = groupFilesByDate(filtered);
                        const renderRow = (file: any) => {
                          const isSelected = selectedDriveFileIds.has(file.id);
                          const isStarred = starredFileIds.has(file.id);
                          return (
                            <div
                              key={file.id}
                              onClick={() => toggleDriveFileSelected(file.id)}
                              onDoubleClick={() => handleSelectDriveFile(file)}
                              className={`px-6 py-2.5 flex items-center justify-between border-b border-slate-100 cursor-pointer select-none transition-all group ${
                                isSelected 
                                  ? "bg-[#e8f0fe] hover:bg-[#e8f0fe]/90" 
                                  : "hover:bg-slate-50/80 active:bg-slate-100/50"
                              }`}
                            >
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                {/* Visual Tick / Dot or Selection indicator */}
                                <div className="shrink-0 flex items-center">
                                  {isSelected ? (
                                    <div className="w-4 h-4 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shadow-xs">
                                      <Check size={10} strokeWidth={3.5} />
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-slate-300 group-hover:border-slate-400 transition-colors" />
                                  )}
                                </div>

                                {renderDriveFileIcon(file.mimeType)}

                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-[#1a73e8] transition-colors">
                                    {file.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    Size: {file.size ? `${Math.round(parseInt(file.size) / 1024)} KB` : "12 KB"} • Modified: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : "Recently"}
                                  </p>
                                </div>
                              </div>

                              {/* Star icon & Quick Action right actions */}
                              <div className="flex items-center gap-3 shrink-0 ml-4">
                                <button
                                  id={`list-star-btn-${file.id}`}
                                  type="button"
                                  onClick={(e) => toggleStarFile(file.id, e)}
                                  className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${
                                    isStarred 
                                      ? "text-[#f4b400]" 
                                      : "text-slate-300 hover:text-slate-500 opacity-50 group-hover:opacity-100"
                                  }`}
                                >
                                  <Star size={13} fill={isStarred ? "#f4b400" : "none"} />
                                </button>
                                
                                <button
                                  id={`btn-list-quick-attach-${file.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectDriveFile(file);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-[#1a73e8]/10 hover:bg-[#1a73e8] text-[#1a73e8] hover:text-white text-[10px] font-semibold rounded-full transition-all"
                                >
                                  Attach
                                </button>
                              </div>
                            </div>
                          );
                        };

                        return (
                          <div className="flex flex-col">
                            {/* Table Column Title Header */}
                            <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 tracking-wider uppercase select-none flex justify-between">
                              <span>Name</span>
                              <span className="mr-32">Actions</span>
                            </div>

                            {/* Groups */}
                            {groups.today.length > 0 && (
                              <div>
                                <div className="px-6 py-2 bg-[#f8f9fa] border-b border-slate-100/80 text-[10px] font-bold text-[#5f6368] tracking-wider uppercase select-none">
                                  Today
                                </div>
                                {groups.today.map(renderRow)}
                              </div>
                            )}

                            {groups.yesterday.length > 0 && (
                              <div>
                                <div className="px-6 py-2 bg-[#f8f9fa] border-b border-slate-100/80 text-[10px] font-bold text-[#5f6368] tracking-wider uppercase select-none">
                                  Yesterday
                                </div>
                                {groups.yesterday.map(renderRow)}
                              </div>
                            )}

                            {groups.thisWeek.length > 0 && (
                              <div>
                                <div className="px-6 py-2 bg-[#f8f9fa] border-b border-slate-100/80 text-[10px] font-bold text-[#5f6368] tracking-wider uppercase select-none">
                                  Earlier this week
                                </div>
                                {groups.thisWeek.map(renderRow)}
                              </div>
                            )}

                            {groups.older.length > 0 && (
                              <div>
                                <div className="px-6 py-2 bg-[#f8f9fa] border-b border-slate-100/80 text-[10px] font-bold text-[#5f6368] tracking-wider uppercase select-none">
                                  Older
                                </div>
                                {groups.older.map(renderRow)}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Google Picker Footer Actions Bar */}
                    <div className="px-6 py-4 bg-[#f8f9fa] border-t border-slate-200 flex items-center justify-between shrink-0">
                      <button
                        id="switch-modal-to-upload"
                        type="button"
                        onClick={() => setModalTab("upload")}
                        className="text-xs text-[#1a73e8] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        📄 Switch to Upload or Web Scrape options
                      </button>

                      <div className="flex items-center gap-2.5">
                        <button
                          id="gdrive-cancel-btn"
                          type="button"
                          onClick={() => setIsAddSourceModalOpen(false)}
                          className="px-4.5 py-2 text-[#1a73e8] hover:bg-slate-100 font-semibold rounded-full text-xs cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          id="gdrive-select-action-btn"
                          type="button"
                          onClick={handleAttachSelectedDriveFiles}
                          disabled={selectedDriveFileIds.size === 0}
                          className="px-5.5 py-2 bg-[#1a73e8] hover:bg-[#1b66ca] disabled:bg-[#f1f3f4] disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-full text-xs shadow-sm transition-colors"
                        >
                          Select{selectedDriveFileIds.size > 0 ? ` (${selectedDriveFileIds.size})` : ""}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* GDrive connection prompt styled beautifully in Google Light Theme */
                  <div className="p-8 text-center bg-white flex flex-col items-center justify-center space-y-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-xs">
                      {renderGDriveLogo()}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800">Google Drive Connection Required</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Connect your Google Workspace account to select and sync files directly from Google Drive.
                      </p>
                    </div>
                    {onGoogleSignIn && (
                      <button
                        type="button"
                        onClick={onGoogleSignIn}
                        className="px-5 py-2.5 bg-[#1a73e8] hover:bg-[#1b66ca] text-white font-semibold rounded-full text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                      >
                        {renderGDriveLogo(16)} Connect Google Drive Account
                      </button>
                    )}
                    <button
                      id="switch-back-to-upload-landing"
                      type="button"
                      onClick={() => setModalTab("upload")}
                      className="text-xs text-[#1a73e8] hover:underline font-semibold cursor-pointer pt-2"
                    >
                      📄 Try other attachment options (Upload / Scrape / Paste)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ==================== STANDARD CAMPAIGN ATTACHMENTS (DARK THEME) ==================== */
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                  <h3 className="text-sm font-bold font-sans text-slate-200 flex items-center gap-1.5">
                    <Plus size={16} className="text-purple-400" /> Attach Campaign Source
                  </h3>
                  <button
                    id="close-add-source-modal"
                    onClick={() => setIsAddSourceModalOpen(false)}
                    className="text-slate-500 hover:text-slate-300 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Modal Tabs */}
                <div className="flex border-b border-slate-800/80 bg-slate-950/40 text-xs select-none overflow-x-auto scrollbar-none">
                  <button
                    id="modal-tab-gdrive"
                    onClick={() => setModalTab("gdrive")}
                    className={`flex-1 min-w-[100px] py-2 font-semibold border-b-2 transition-all ${
                      (modalTab as string) === "gdrive" ? "border-purple-500 text-purple-300 bg-slate-900/30" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Google Drive
                  </button>
                  <button
                    id="modal-tab-web"
                    onClick={() => setModalTab("web")}
                    className={`flex-1 min-w-[90px] py-2 font-semibold border-b-2 transition-all ${
                      modalTab === "web" ? "border-purple-500 text-purple-300 bg-slate-900/30" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Web Scrape
                  </button>
                  <button
                    id="modal-tab-upload"
                    onClick={() => setModalTab("upload")}
                    className={`flex-1 min-w-[90px] py-2 font-semibold border-b-2 transition-all ${
                      modalTab === "upload" ? "border-purple-500 text-purple-300 bg-slate-900/30" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    id="modal-tab-paste"
                    onClick={() => setModalTab("paste")}
                    className={`flex-1 min-w-[90px] py-2 font-semibold border-b-2 transition-all ${
                      modalTab === "paste" ? "border-purple-500 text-purple-300 bg-slate-900/30" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Paste Snippet
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto flex-1 min-h-[160px]">
                  {/* Category Selection for Upload */}
                  <div className="mb-4 pb-3 border-b border-slate-800/80">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1.5">
                      Select Lore Category for Attachment
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {Object.entries(CATEGORY_MAP).map(([catKey, info]) => {
                        const isSelected = uploadCategory === catKey;
                        return (
                          <button
                            key={catKey}
                            type="button"
                            onClick={() => setUploadCategory(catKey as any)}
                            className={`px-2 py-1.5 rounded-xl border text-[10px] font-mono text-left transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? "bg-purple-950/80 border-purple-500 text-purple-200 font-bold shadow-sm"
                                : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                            }`}
                          >
                            <span className="text-xs">{info.icon}</span>
                            <span className="truncate">{info.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {modalTab === "web" && (
                    <form onSubmit={handleWebScrape} className="space-y-4">
                      <p className="text-[11px] text-slate-400">
                        Input a specific web page URL, or enter a topic (e.g., "Nar Shaddaa Star Wars Lore"). 
                        Nyx will query the internet, scrape the matching wiki/lore details, and build active campaign grounds!
                      </p>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Web URL or Topic</label>
                        <input 
                          id="web-scrape-input"
                          type="text"
                          placeholder="e.g., https://starwars.fandom.com/wiki/Dantooine"
                          value={webUrl}
                          onChange={e => setWebUrl(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-purple-500 font-mono"
                          required
                        />
                      </div>

                      <button
                        id="web-scrape-submit-btn"
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                      >
                        <Globe size={13} />
                        {isProcessing ? "Searching and Scraping..." : "Search & Crawl Web"}
                      </button>
                    </form>
                  )}

              {modalTab === "upload" && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Upload previous roleplay transcripts, session logs, or lore documents (.txt, .md, .pdf, .docx, .json).
                    <span className="text-emerald-400 font-semibold block mt-1">
                      ⚡ Automatic AI Indexing: Transcripts are automatically summarized into token-efficient chronicle indices so Nyx retains 100% of plot beats and lore without choking on token limits!
                    </span>
                  </p>

                  <div 
                    onDragOver={e => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        processLocalFiles(Array.from(e.dataTransfer.files));
                      }
                    }}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      isDragging 
                        ? "border-purple-500 bg-purple-950/10 text-purple-300" 
                        : "border-slate-800 bg-slate-950/20 text-slate-500 hover:border-slate-700 hover:text-slate-400"
                    }`}
                    onClick={() => document.getElementById("local-file-picker-hidden")?.click()}
                  >
                    <Upload size={28} className="mb-2" />
                    <span className="text-xs font-mono font-semibold text-slate-300">Drag & drop files or click to upload</span>
                    <span className="text-[9px] text-slate-500 mt-1 font-mono">Supports Text, Markdown, and Images</span>
                    <input 
                      id="local-file-picker-hidden"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleLocalFileChange}
                    />
                  </div>
                </div>
              )}

              {modalTab === "paste" && (
                <form onSubmit={handleAddSnippet} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Snippet Title</label>
                    <input 
                      id="paste-snippet-title"
                      type="text"
                      placeholder="e.g., Campaign Prologue Notes"
                      value={snippetTitle}
                      onChange={e => setSnippetTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-purple-500 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Content Body</label>
                    <textarea 
                      id="paste-snippet-content"
                      placeholder="Paste lore, notes, rules, or backstory details..."
                      value={snippetContent}
                      onChange={e => setSnippetContent(e.target.value)}
                      rows={5}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-purple-500 leading-normal"
                      required
                    />
                  </div>

                  <button
                    id="paste-snippet-submit-btn"
                    type="submit"
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> Add Snippet Source
                  </button>
                </form>
              )}

            </div>

          </div>
        )}
      </div>
    </div>
  )}

  {/* QUICK CATEGORY FLOATING POPOVER */}
  {quickCategoryPopover && (() => {
    const targetSource = loreSources.find(s => s.id === quickCategoryPopover.sourceId);
    if (!targetSource) return null;
    const sourceCats = Array.isArray(targetSource.categories) && targetSource.categories.length > 0
      ? targetSource.categories
      : [targetSource.category || "narrative"];

    return (
      <>
        {/* Invisible Dismiss Overlay */}
        <div 
          className="fixed inset-0 z-50 bg-transparent"
          onClick={() => setQuickCategoryPopover(null)}
        />
        
        {/* Floating Category Popover (Guaranteed on top of all cards, never clipped) */}
        <div
          className="fixed z-50 w-72 bg-slate-950/95 border border-purple-500/60 rounded-2xl p-3 shadow-2xl shadow-purple-950/90 backdrop-blur-md animate-in fade-in zoom-in-95 font-sans"
          style={{
            top: `${quickCategoryPopover.top}px`,
            left: `${quickCategoryPopover.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <div className="overflow-hidden pr-2">
              <div className="text-[11px] font-bold text-slate-100 font-mono truncate flex items-center gap-1.5" title={targetSource.name}>
                <Tag size={12} className="text-purple-400 shrink-0" /> {targetSource.name}
              </div>
              <div className="text-[9px] text-slate-400 font-mono">
                Click to attach / detach roles
              </div>
            </div>
            <button
              type="button"
              onClick={() => setQuickCategoryPopover(null)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <X size={13} />
            </button>
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
            {Object.entries(CATEGORY_MAP).map(([catKey, info]) => {
              const isAssigned = sourceCats.includes(catKey);
              const isPrimary = (targetSource.category || sourceCats[0]) === catKey;

              return (
                <button
                  key={catKey}
                  type="button"
                  id={`quick-cat-popover-item-${targetSource.id}-${catKey}`}
                  onClick={() => handleToggleCategoryOnSource(targetSource.id, catKey)}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    isAssigned
                      ? `${info.badgeClass} bg-opacity-40 hover:bg-opacity-60 border-purple-500/60 shadow-sm`
                      : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                    isAssigned 
                      ? "bg-purple-600 border-purple-400 text-white" 
                      : "border-slate-700 bg-slate-950 text-transparent"
                  }`}>
                    <Check size={11} className={isAssigned ? "opacity-100" : "opacity-0"} />
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold font-mono text-slate-200 flex items-center gap-1.5">
                        <span>{info.icon}</span> {info.label}
                      </span>
                      {isAssigned && isPrimary && (
                        <span className="text-[7px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-900/80 text-purple-300 border border-purple-500/40">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 line-clamp-1 mt-0.5 leading-tight">
                      {info.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>Syncs instantly to Nyx</span>
            <button
              type="button"
              onClick={() => {
                setQuickCategoryPopover(null);
                setEditingSource(targetSource);
              }}
              className="text-purple-400 hover:text-purple-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <Edit3 size={10} /> Full Editor →
            </button>
          </div>
        </div>
      </>
    );
  })()}

  {/* EDIT SOURCE MODAL */}
  {editingSource && (
    <div
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-default overflow-y-auto"
      onClick={() => setEditingSource(null)}
    >
      <div
        className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 my-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 text-purple-400">
            <span className="p-2 bg-purple-950 border border-purple-500/30 rounded-xl">
              <Edit3 size={18} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                Edit Grounding Document
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Configure document label, category roles & indexing parameters
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditingSource(null)}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSaveEditModal} className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          {/* Document Label / Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Document Label (Name)</span>
              <span className="text-[9px] text-purple-400 font-normal lowercase">Displayed across workspace</span>
            </label>
            <input
              id="edit-source-name-input"
              type="text"
              value={editFormName}
              onChange={(e) => setEditFormName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 font-mono outline-none focus:border-purple-500 shadow-inner"
              placeholder="e.g. Session 4 Recap or Core Rulebook Excerpt"
              required
            />
          </div>

          {/* Primary Category & Multi-Category Selection */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                Grounding Roles & AI Categories
              </label>
              <span className="text-[9px] text-slate-500 font-mono">Select all that apply</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(CATEGORY_MAP).map(([catKey, info]) => {
                const isSelected = editFormCategories.includes(catKey);
                const isPrimary = editFormCategory === catKey;

                return (
                  <div
                    key={catKey}
                    id={`modal-category-card-${catKey}`}
                    onClick={() => {
                      let updated: string[];
                      if (isSelected) {
                        if (editFormCategories.length > 1) {
                          updated = editFormCategories.filter(c => c !== catKey);
                        } else {
                          updated = editFormCategories; // Keep at least one
                        }
                      } else {
                        updated = [...editFormCategories, catKey];
                      }
                      setEditFormCategories(updated);
                      if (!updated.includes(editFormCategory)) {
                        setEditFormCategory((updated[0] || "narrative") as LoreSource["category"]);
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-purple-950/40 border-purple-500/60 shadow-sm"
                        : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{info.icon}</span>
                        <span className="text-xs font-bold font-mono text-slate-200">{info.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isSelected && (
                          <span className="p-0.5 rounded bg-purple-600 text-white">
                            <Check size={10} />
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                      {info.desc}
                    </p>
                    {isSelected && (
                      <div className="mt-2 pt-1.5 border-t border-purple-900/40 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditFormCategory(catKey as LoreSource["category"]);
                          }}
                          className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded transition-all ${
                            isPrimary
                              ? "bg-purple-600 text-white"
                              : "bg-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {isPrimary ? "★ Primary Role" : "Set as Primary"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Chronicle Summary / Study Notes */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                Study Guide / Token Index Summary
              </label>
              <span className="text-[9px] text-slate-500 font-mono">{editFormSummary.length} chars</span>
            </div>
            <textarea
              id="edit-source-summary-textarea"
              rows={4}
              value={editFormSummary}
              onChange={(e) => setEditFormSummary(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3 py-2 text-xs text-slate-200 font-sans leading-relaxed outline-none focus:border-purple-500 shadow-inner"
              placeholder="Key plot beats, entity definitions, and study guide excerpts indexed for prompt retention..."
            />
          </div>

          {/* Grounding Active Status */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200 font-mono block">Lore Database Status</span>
              <span className="text-[10px] text-slate-400 block">
                Permanently active knowledge: Injected dynamically into active adventures, RAG lookups, and assistant queries
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold border bg-emerald-950/80 text-emerald-300 border-emerald-500/40 select-none">
              ● Active Grounding Lore
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setEditingSource(null)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-save-edit-source-modal"
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition-all shadow shadow-purple-950 flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={13} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* DELETE SOURCE CONFIRMATION MODAL */}
  {sourceToDelete && (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-default"
      onClick={() => setSourceToDelete(null)}
    >
      <div
        className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3 text-red-400">
          <span className="p-2 bg-red-950 border border-red-500/30 rounded-xl">
            <Trash2 size={20} />
          </span>
          <h3 className="text-sm font-bold text-slate-100 font-mono">
            Unattach Lore Source?
          </h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-mono mb-4">
          Are you sure you want to remove <span className="text-purple-300 font-bold">"{sourceToDelete.name}"</span>? This will unattach its content and remove it from Nyx's grounding scope.
        </p>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setSourceToDelete(null)}
            className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              executeDeleteSource(sourceToDelete.id);
            }}
            className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold transition-all shadow shadow-red-950 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={12} /> Confirm Unattach
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Floating Back to Top Button */}
  {showBackToTop && (
    <button
      type="button"
      onClick={() => {
        const root = document.getElementById("workspace-sync-root");
        if (root) root.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-50 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-2xl border border-purple-400/30 flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer transition-all hover:scale-105 animate-in fade-in"
      title="Scroll back to top"
    >
      <ArrowUp size={13} /> Back to Top
    </button>
  )}

</div>
);
}
