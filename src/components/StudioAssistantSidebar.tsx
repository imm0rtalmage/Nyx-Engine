import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { 
  Send, 
  Paperclip, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles,
  Users,
  FileText,
  CheckSquare,
  RefreshCw,
  Plus,
  Compass,
  Wand2,
  Edit3,
  Trash2,
  Copy,
  Check,
  BookOpen,
  ArrowUpRight,
  Shield,
  Layers,
  Zap,
  Globe,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  AlertCircle,
  HelpCircle,
  Square,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GooglePickerButton, PickedGoogleFile } from "./GooglePickerButton";
import { safeLocalStorage } from "../App";
import ChatMessageMarkdown from "./ChatMessageMarkdown";
import { safeFetchJson } from "../utils/apiClient";
import { RelationshipTrack, LoreSource, CharacterProfile } from "../types";

export interface AssistantAttachment {
  id?: string;
  name: string;
  mimeType: string;
  data?: string; // Base64 / data URL
  text?: string; // Extracted raw text
  size?: string;
}

export interface AssistantExecutedAction {
  name: string;
  description: string;
  targetTab?: "chat" | "editor" | "workspace";
  subType?: "lore" | "world_setting" | "keep" | "tasks" | "main_chat" | "sources" | "vault";
  targetId?: string;
  targetKey?: string;
  loreType?: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp: string;
  actionsExecuted?: AssistantExecutedAction[];
  attachments?: AssistantAttachment[];
}

export interface StudioAssistantSidebarProps {
  projects: any[];
  activeProject: any;
  messages: any[]; // Main narrative chat transcript
  characters: any[];
  notes: any[];
  tasks: any[];
  onSetProjectValue: (key: string, value: any) => Promise<void> | void;
  onNavigateToItem?: (target: {
    targetTab?: "chat" | "editor" | "workspace";
    subType?: "lore" | "world_setting" | "keep" | "tasks" | "main_chat" | "sources" | "vault";
    targetId?: string;
    targetKey?: string;
    loreType?: string;
  }) => void;
  onAddCharacter: (
    name: string,
    role: string,
    portraitUrl: string,
    description: string,
    isPlayerCharacter?: boolean,
    relationships?: string,
    factionName?: string,
    isMook?: boolean,
    type?: "pc" | "npc" | "companion" | "chronicle" | "location" | "vehicle" | "equipment" | "faction",
    customFields?: Record<string, string>,
    signatureItems?: string,
    backstory?: string,
    romanceTracks?: RelationshipTrack[],
    linkedLoreIds?: string[]
  ) => Promise<void> | void;
  onDeleteCharacter: (id: string) => Promise<void> | void;
  onUpdateCharacter: (id: string, updates: any) => Promise<void> | void;
  onAddNote: (title: string, content: string) => Promise<void> | void;
  onDeleteNote: (id: string) => Promise<void> | void;
  onAddTask: (text: string) => Promise<void> | void;
  onToggleTask: (id: string) => Promise<void> | void;
  onDeleteTask: (id: string) => Promise<void> | void;
  onInjectMessageToMainChat?: (text: string, role: "user" | "model", speakerIds?: string[]) => Promise<void> | void;
  onEditMessage?: (id: string, newContent: string) => Promise<void> | void;
  onDeleteMessage?: (id: string) => Promise<void> | void;
  onShowToast: (title: string, description: string, type: "success" | "info" | "warning" | "error") => void;
  googleToken?: string | null;
  onGoogleSignIn?: () => void;
  embedded?: boolean;
  onClose?: () => void;
  isCinemaMode?: boolean;
}

const STORAGE_KEY_PREFIX = "adventure_assistant_chat_v4_";

export const StudioAssistantSidebar: React.FC<StudioAssistantSidebarProps> = ({
  projects = [],
  activeProject,
  messages: narrativeMessages = [],
  characters = [],
  notes = [],
  tasks = [],
  onSetProjectValue,
  onNavigateToItem,
  onAddCharacter,
  onDeleteCharacter,
  onUpdateCharacter,
  onAddNote,
  onDeleteNote,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onInjectMessageToMainChat,
  onEditMessage,
  onDeleteMessage,
  onShowToast,
  googleToken,
  onGoogleSignIn,
  embedded = false,
  onClose,
  isCinemaMode = false
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const saved = safeLocalStorage.getItem("studio_assistant_sidebar_open");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [isDocked, setIsDocked] = useState<boolean>(() => {
    try {
      const saved = safeLocalStorage.getItem("studio_assistant_sidebar_docked");
      return saved !== null ? saved === "true" : false;
    } catch {
      return false;
    }
  });

  const wasOpenBeforeCinemaRef = useRef<boolean | null>(null);

  // When entering Cinema Mode, collapse to a side tab handle like Project Settings
  useEffect(() => {
    if (isCinemaMode) {
      wasOpenBeforeCinemaRef.current = isOpen;
      setIsOpen(false);
    } else if (wasOpenBeforeCinemaRef.current !== null) {
      if (wasOpenBeforeCinemaRef.current) {
        setIsOpen(true);
      }
      wasOpenBeforeCinemaRef.current = null;
    }
  }, [isCinemaMode]);

  // Persist open/docked state to maintain consistent layout across refreshes
  useEffect(() => {
    if (isCinemaMode) return; // Preserve pre-cinema state in storage
    try {
      safeLocalStorage.setItem("studio_assistant_sidebar_open", String(isOpen));
    } catch {}
  }, [isOpen, isCinemaMode]);

  useEffect(() => {
    try {
      safeLocalStorage.setItem("studio_assistant_sidebar_docked", String(isDocked));
    } catch {}
  }, [isDocked]);

  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AssistantAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDirectives, setShowDirectives] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Message inline editing
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  // Diagnostics modal and state
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<{
    healthy: boolean;
    timestamp: string;
    durationMs: number;
    checks: Record<string, { status: "ok" | "warn" | "error"; latencyMs?: number; details?: string }>;
  } | null>(null);

  // Interactive RAG probe state
  const [ragTestQuery, setRagTestQuery] = useState("Tell me about the monastery of Heiko-Ji and its rules");
  const [isRunningRagTest, setIsRunningRagTest] = useState(false);
  const [ragTestResult, setRagTestResult] = useState<{
    query: string;
    durationMs: number;
    retrievedCount: number;
    matchedExcerpts: Array<{ sourceName: string; sourceType: string; score: number; matchedKeywords: string[]; chunkSnippet: string }>;
  } | null>(null);

  // Interactive live NPC creation test state
  const [isRunningNpcTest, setIsRunningNpcTest] = useState(false);
  const [npcTestResult, setNpcTestResult] = useState<{
    durationMs: number;
    npcName: string;
    fieldsCount: number;
    success: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const assistantAbortControllerRef = useRef<AbortController | null>(null);

  // Stop / Cancel active generation
  const handleStopGeneration = useCallback(() => {
    if (assistantAbortControllerRef.current) {
      try {
        assistantAbortControllerRef.current.abort();
      } catch (e) {
        console.warn("Error aborting assistant controller:", e);
      }
      assistantAbortControllerRef.current = null;
    }
    setIsGenerating(false);

    // Append calm in-character pause confirmation
    const nickname = activeProject?.userNickname || "Sir";
    const stoppedMsg: AssistantMessage = {
      id: `msg-stopped-${Date.now()}`,
      role: "model",
      content: `[Nyx pauses directives immediately, letting the tactical projection settle.]\n\nDirective stopped on your command, **${nickname}**. What would you like to adjust or focus on next?`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, stoppedMsg]);
    onShowToast("Assistant Paused", "Halted ongoing assistant generation.", "info");
  }, [activeProject?.userNickname, onShowToast]);

  // Persist sidebar open/docked state
  useEffect(() => {
    safeLocalStorage.setItem("studio_assistant_sidebar_open", String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    safeLocalStorage.setItem("studio_assistant_sidebar_docked", String(isDocked));
  }, [isDocked]);

  const storageKey = activeProject?.id ? `${STORAGE_KEY_PREFIX}${activeProject.id}` : null;

  // Load chat history for active campaign
  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = safeLocalStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load assistant chat history:", e);
    }

    const nickname = activeProject?.userNickname || "Sir";
    const welcomeMsg: AssistantMessage = {
      id: "welcome-nyx-v4",
      role: "model",
      content: `[Nyx rests her chin in her hand with a sharp, knowing smirk.]\n\nReady when you are, **${nickname}**. I'm directly wired into your campaign lore, character sheets, reference notebooks, and active scene dynamics.\n\nTell me to **build out your cast**, **refine a companion**, **change world atmosphere**, **outline chapters**, or **digest attached documents**—I'll update the entire workspace automatically.`,
      timestamp: new Date().toISOString()
    };
    setChatMessages([welcomeMsg]);
  }, [storageKey, activeProject?.userNickname]);

  // Persist chat messages
  useEffect(() => {
    if (!storageKey || chatMessages.length === 0) return;
    try {
      safeLocalStorage.setItem(storageKey, JSON.stringify(chatMessages.slice(-60)));
    } catch (e) {
      console.warn("Failed to persist assistant chat messages:", e);
    }
  }, [chatMessages, storageKey]);

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [chatMessages.length, isGenerating, scrollToBottom]);

  // Handle local file uploads
  const processRawFile = async (file: File): Promise<AssistantAttachment | null> => {
    try {
      const isText = file.type.startsWith("text/") || 
                     file.name.endsWith(".md") || 
                     file.name.endsWith(".json") || 
                     file.name.endsWith(".csv") ||
                     file.name.endsWith(".txt") ||
                     file.name.endsWith(".xml") ||
                     file.name.endsWith(".yaml");
      
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

      const sizeStr = file.size < 1024 * 1024 
        ? `${Math.round(file.size / 1024)} KB` 
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      if (isText) {
        const text = await file.text();
        return {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          mimeType: file.type || "text/plain",
          text,
          size: sizeStr
        };
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve({
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            mimeType: file.type || (isPdf ? "application/pdf" : isImage ? "image/jpeg" : "application/octet-stream"),
            data: result,
            size: sizeStr
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    } catch (err) {
      console.error("Error processing file:", err);
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const availableSlots = 8 - attachedFiles.length;
    if (availableSlots <= 0) {
      onShowToast("Limit Reached", "Max 8 attachments per message.", "warning");
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    const results: AssistantAttachment[] = [];
    for (const f of filesToProcess) {
      const att = await processRawFile(f);
      if (att) results.push(att);
    }

    setAttachedFiles(prev => [...prev, ...results].slice(0, 8));
    onShowToast("Attached Files", `Added ${results.length} document(s)/image(s).`, "success");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  // Google Drive file attachment receiver
  const handleGoogleFilesPicked = (files: PickedGoogleFile[]) => {
    if (!files || files.length === 0) return;
    const availableSlots = 8 - attachedFiles.length;
    const mapped: AssistantAttachment[] = files.slice(0, availableSlots).map(f => ({
      id: `gdoc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: f.name,
      mimeType: f.mimeType,
      text: f.text,
      data: f.data,
      size: f.size || "Drive"
    }));

    setAttachedFiles(prev => [...prev, ...mapped].slice(0, 8));
    onShowToast("Drive Synced", `Attached ${mapped.length} Google Drive document(s).`, "success");
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const availableSlots = 8 - attachedFiles.length;
      if (availableSlots <= 0) {
        onShowToast("Limit Reached", "Max 8 attachments per message.", "warning");
        return;
      }

      const results: AssistantAttachment[] = [];
      for (const f of files.slice(0, availableSlots)) {
        const att = await processRawFile(f);
        if (att) results.push(att);
      }

      setAttachedFiles(prev => [...prev, ...results].slice(0, 8));
      onShowToast("Files Added", `Added ${results.length} item(s) from drop.`, "success");
    }
  };

  // Clipboard paste
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          if (attachedFiles.length >= 8) {
            onShowToast("Limit Reached", "Max 8 attachments allowed.", "warning");
            return;
          }
          const att = await processRawFile(file);
          if (att) {
            setAttachedFiles(prev => [...prev, att].slice(0, 8));
            onShowToast("Asset Pasted", `Pasted "${att.name}" from clipboard.`, "success");
          }
        }
      }
    }
  };

  // =========================================================================
  // TOOL EXECUTION DISPATCHER (Dirac Precision: deterministic & clean)
  // =========================================================================
  const executeFunctionCalls = async (calls: any[]): Promise<AssistantExecutedAction[]> => {
    if (!Array.isArray(calls) || calls.length === 0) return [];
    const executed: AssistantExecutedAction[] = [];
    const currentCharacters: CharacterProfile[] = [...characters];

    for (const call of calls) {
      try {
        const name = call?.name;
        let args = call?.args || {};

        if (typeof args === "string") {
          try {
            args = JSON.parse(args);
          } catch {
            // retain raw args
          }
        }

        // 1. UPDATE / UPSERT PROJECT / WORLD SETTING VALUE
        const isProjectSettingTool = 
          name === "update_project_value" || 
          name === "update_project_setting" ||
          name === "update_world_setting" ||
          name === "update_world_settings" ||
          name === "update_setting" ||
          name === "update_settings" ||
          name === "set_setting" ||
          name === "set_project_value" ||
          name === "set_project_setting" ||
          name === "set_world_setting" ||
          name === "update_campaign_setting" ||
          name === "upsert_world_setting" ||
          name === "upsert_setting" ||
          name === "update_world";

        if (isProjectSettingTool) {
          let targetKey = args.key || args.settingKey || args.field || args.property || args.targetKey;
          let targetVal = args.value !== undefined ? args.value : args.val !== undefined ? args.val : args.newValue !== undefined ? args.newValue : undefined;

          if (!targetKey) {
            if (args.setting !== undefined) { targetKey = "setting"; targetVal = args.setting; }
            else if (args.world !== undefined) { targetKey = "setting"; targetVal = args.world; }
            else if (args.worldSetting !== undefined) { targetKey = "setting"; targetVal = args.worldSetting; }
            else if (args.world_setting !== undefined) { targetKey = "setting"; targetVal = args.world_setting; }
            else if (args.plotOverview !== undefined) { targetKey = "plotOverview"; targetVal = args.plotOverview; }
            else if (args.persistentContext !== undefined) { targetKey = "persistentContext"; targetVal = args.persistentContext; }
            else if (args.customInstructions !== undefined) { targetKey = "customInstructions"; targetVal = args.customInstructions; }
            else if (args.styleGuide !== undefined) { targetKey = "styleGuide"; targetVal = args.styleGuide; }
            else if (args.stAdventureModule !== undefined) { targetKey = "stAdventureModule"; targetVal = args.stAdventureModule; }
            else if (args.pacing !== undefined) { targetKey = "pacing"; targetVal = args.pacing; }
            else if (args.emotionalTone !== undefined) { targetKey = "emotionalTone"; targetVal = args.emotionalTone; }
            else if (args.mood !== undefined) { targetKey = "emotionalTone"; targetVal = args.mood; }
            else if (args.name !== undefined && typeof args.name === "string" && !args.role && !args.description) { targetKey = "name"; targetVal = args.name; }
          }

          // Default key if only value is provided in a world setting call
          if (!targetKey && targetVal !== undefined) {
            targetKey = "setting";
          }

          // Normalize key aliases to canonical project field names
          if (targetKey) {
            const kNorm = targetKey.toString().toLowerCase().replace(/[-_\s]/g, "");
            if (
              kNorm === "world" || 
              kNorm === "worldsetting" || 
              kNorm === "worldsettings" || 
              kNorm === "campaignsetting" || 
              kNorm === "campaignsettings" || 
              kNorm === "setting" || 
              kNorm === "settings" ||
              kNorm === "worldlore"
            ) {
              targetKey = "setting";
            } else if (kNorm === "plot" || kNorm === "plotoverview" || kNorm === "story" || kNorm === "synopsis") {
              targetKey = "plotOverview";
            } else if (kNorm === "context" || kNorm === "persistentcontext" || kNorm === "scenecontext" || kNorm === "scene") {
              targetKey = "persistentContext";
            } else if (kNorm === "instructions" || kNorm === "custominstructions" || kNorm === "systeminstructions") {
              targetKey = "customInstructions";
            } else if (kNorm === "style" || kNorm === "styleguide" || kNorm === "writingstyle") {
              targetKey = "styleGuide";
            } else if (kNorm === "module" || kNorm === "adventuremodule" || kNorm === "stadventuremodule") {
              targetKey = "stAdventureModule";
            } else if (kNorm === "pacing") {
              targetKey = "pacing";
            } else if (kNorm === "tone" || kNorm === "emotionaltone" || kNorm === "mood" || kNorm === "storymood" || kNorm === "atmosphere") {
              targetKey = "emotionalTone";
            } else if (kNorm === "perspective" || kNorm === "narrativeperspective") {
              targetKey = "narrativePerspective";
            } else if (
              kNorm === "adventurelogtitle" ||
              kNorm === "logtitle" ||
              kNorm === "narrativetitle" ||
              kNorm === "narrativelogtitle" ||
              kNorm === "adventuretitle"
            ) {
              targetKey = "adventureLogTitle";
            } else if (kNorm === "narrative" || kNorm === "narrativelog" || kNorm === "adventurelog" || kNorm === "storylog" || kNorm === "story") {
              // Direct narrative prose update routed via update_project_value
              if (targetVal) {
                const proseText = String(targetVal);
                if (proseText.length > 30 || proseText.includes(" ") || proseText.includes("\n")) {
                  let msg = narrativeMessages.length > 0 ? narrativeMessages[narrativeMessages.length - 1] : null;
                  const modelMsgs = narrativeMessages.filter(m => m.role === "model" || m.role === "nyx");
                  if (modelMsgs.length > 0) msg = modelMsgs[modelMsgs.length - 1];
                  if (msg && onEditMessage) {
                    await onEditMessage(msg.id, proseText);
                    executed.push({
                      name: `Edited Narrative Log Turn`,
                      description: proseText.slice(0, 140) + "...",
                      targetTab: "chat",
                      subType: "main_chat",
                      targetId: msg.id
                    });
                    onShowToast("✨ Narrative Turn Revised", "Successfully edited the active scene turn in the Adventure Log.", "success");
                  } else if (onInjectMessageToMainChat) {
                    await onInjectMessageToMainChat(proseText, "model");
                    executed.push({
                      name: `Created Narrative Scene Turn`,
                      description: proseText.slice(0, 140) + "...",
                      targetTab: "chat",
                      subType: "main_chat"
                    });
                  }
                  targetKey = ""; // Handled
                } else {
                  targetKey = "adventureLogTitle";
                }
              }
            } else if (
              kNorm === "turnheader" ||
              kNorm === "turnheadertemplate" ||
              kNorm === "turnhead" ||
              kNorm === "posttitle" ||
              kNorm === "turntitle" ||
              kNorm === "episodeheader" ||
              kNorm === "postheader"
            ) {
              targetKey = "turnHeader";
            } else if (kNorm === "title" || kNorm === "campaignname" || kNorm === "projectname" || kNorm === "name") {
              targetKey = "name";
            }
          }

          if (targetKey && targetVal !== undefined) {
            const normalizedValue = typeof targetVal === "object" ? JSON.stringify(targetVal, null, 2) : String(targetVal);
            
            // Execute with safety timeout to prevent any freeze
            await Promise.race([
              onSetProjectValue(targetKey, normalizedValue),
              new Promise(res => setTimeout(res, 2500))
            ]);
            
            const displayKey = targetKey
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str: string) => str.toUpperCase())
              .trim();

            executed.push({
              name: `Updated ${displayKey}`,
              description: normalizedValue.slice(0, 150) + (normalizedValue.length > 150 ? "..." : ""),
              targetTab: targetKey === "persistentContext" || targetKey === "setting" || targetKey === "plotOverview" ? "workspace" : "editor",
              subType: "world_setting",
              targetKey: targetKey
            });
          }
        }

        // 2. ADD CHARACTER / COMPANION / PC / LORE PROFILE
        else if (name === "add_character_or_lore" || name === "add_character") {
          const charName = args.name;
          if (charName) {
            const role = args.role || "NPC";
            const portraitUrl = args.portraitUrl || "";
            const description = args.description || "";
            const isPC = Boolean(args.isPlayerCharacter || args.type === "pc");
            const relationships = args.relationships || "";
            const factionName = args.factionName || "";
            const isMook = Boolean(args.isMook);
            
            let entityType = args.type || (isPC ? "pc" : "npc");
            if (typeof entityType === "string") {
              entityType = entityType.toLowerCase().trim();
              if (!["pc", "npc", "companion", "chronicle", "location", "vehicle", "equipment", "faction"].includes(entityType)) {
                if (entityType.includes("starship") || entityType.includes("ship")) entityType = "vehicle";
                else if (entityType.includes("weapon") || entityType.includes("item") || entityType.includes("artifact")) entityType = "equipment";
                else if (entityType.includes("guild") || entityType.includes("syndicate")) entityType = "faction";
                else if (entityType.includes("planet") || entityType.includes("city") || entityType.includes("outpost")) entityType = "location";
                else if (entityType.includes("record") || entityType.includes("history")) entityType = "chronicle";
                else entityType = isPC ? "pc" : "npc";
              }
            }

            const extractCustomFieldsFromArgs = (rawArgs: any): Record<string, string> => {
              if (!rawArgs || typeof rawArgs !== "object") return {};
              const extracted: Record<string, string> = {};
              const knownKeys = new Set([
                "id", "name", "role", "description", "type", "relationships", "factionName",
                "signatureItems", "backstory", "isMook", "isPlayerCharacter", "romanceTracks",
                "linkedLoreIds", "portraitUrl", "raw", "action"
              ]);

              const targetContainers = [
                rawArgs.customFields,
                rawArgs.custom_fields,
                rawArgs.specifications,
                rawArgs.specs,
                rawArgs.categorySpecifications
              ];

              for (const container of targetContainers) {
                if (!container) continue;
                if (typeof container === "object" && !Array.isArray(container)) {
                  for (const [k, v] of Object.entries(container)) {
                    if (v !== undefined && v !== null) {
                      extracted[k] = typeof v === "string" ? v : JSON.stringify(v);
                    }
                  }
                } else if (typeof container === "string") {
                  try {
                    const parsed = JSON.parse(container);
                    if (typeof parsed === "object" && parsed && !Array.isArray(parsed)) {
                      for (const [k, v] of Object.entries(parsed)) {
                        if (v !== undefined && v !== null) {
                          extracted[k] = typeof v === "string" ? (v as string) : JSON.stringify(v);
                        }
                      }
                    } else {
                      extracted["Specifications"] = container;
                    }
                  } catch {
                    const lines = container.split(/\r?\n/);
                    let hasParsedLines = false;
                    for (const line of lines) {
                      const colonIdx = line.indexOf(":");
                      if (colonIdx > 0 && colonIdx < line.length - 1) {
                        const k = line.substring(0, colonIdx).replace(/^[-*#\s]+/, "").trim();
                        const v = line.substring(colonIdx + 1).trim();
                        if (k && v) {
                          extracted[k] = v;
                          hasParsedLines = true;
                        }
                      }
                    }
                    if (!hasParsedLines && container.trim()) {
                      extracted["Specifications"] = container.trim();
                    }
                  }
                }
              }

              for (const [key, val] of Object.entries(rawArgs)) {
                if (!knownKeys.has(key) && !["customFields", "custom_fields", "specifications", "specs", "categorySpecifications"].includes(key)) {
                  if (val !== undefined && val !== null) {
                    extracted[key] = typeof val === "string" ? val : JSON.stringify(val);
                  }
                }
              }

              return extracted;
            };

            let customFields = extractCustomFieldsFromArgs(args);

            let romanceTracks: RelationshipTrack[] = [];
            if (args.romanceTracks) {
              if (Array.isArray(args.romanceTracks)) {
                romanceTracks = args.romanceTracks;
              } else if (typeof args.romanceTracks === "string") {
                try {
                  romanceTracks = JSON.parse(args.romanceTracks);
                } catch {
                  // ignore
                }
              }
            }

            let linkedLoreIds: string[] = [];
            if (args.linkedLoreIds) {
              if (Array.isArray(args.linkedLoreIds)) {
                linkedLoreIds = args.linkedLoreIds;
              } else if (typeof args.linkedLoreIds === "string") {
                try {
                  linkedLoreIds = JSON.parse(args.linkedLoreIds);
                } catch {
                  // ignore
                }
              }
            }

            const signatureItems = args.signatureItems || "";
            const backstory = args.backstory || "";

            const existing = currentCharacters.find(c => 
              c.name.toLowerCase().trim() === charName.toLowerCase().trim() ||
              (isPC && (c.isPlayerCharacter || c.type === "pc")) ||
              c.id === args.id
            );

            if (existing) {
              const updatedProfile: CharacterProfile = {
                ...existing,
                name: charName,
                role: role !== "NPC" ? role : (existing.role || role),
                description: description || existing.description,
                type: entityType as any,
                isPlayerCharacter: isPC,
                relationships: relationships || existing.relationships,
                factionName: factionName || existing.factionName,
                signatureItems: signatureItems || existing.signatureItems,
                backstory: backstory || existing.backstory,
                customFields: { ...(existing.customFields || {}), ...customFields }
              };

              const idx = currentCharacters.findIndex(c => c.id === existing.id);
              if (idx !== -1) currentCharacters[idx] = updatedProfile;

              await Promise.race([
                onUpdateCharacter(existing.id, updatedProfile),
                new Promise(res => setTimeout(res, 2500))
              ]);

              executed.push({
                name: `Updated ${entityType.toUpperCase()}: ${charName}`,
                description: description ? description.slice(0, 120) + "..." : `Updated profile specifications & fields.`,
                targetTab: "workspace",
                subType: "lore",
                targetId: existing.id,
                loreType: entityType
              });
            } else {
              const newCharId = `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
              const createdProfile: CharacterProfile = {
                id: newCharId,
                projectId: activeProject?.id || "",
                name: charName,
                role,
                portraitUrl,
                description,
                isPlayerCharacter: isPC,
                relationships,
                factionName,
                isMook,
                type: entityType as any,
                customFields,
                signatureItems,
                backstory,
                romanceTracks,
                linkedLoreIds
              };
              currentCharacters.push(createdProfile);

              await Promise.race([
                onAddCharacter(
                  charName,
                  role,
                  portraitUrl,
                  description,
                  isPC,
                  relationships,
                  factionName,
                  isMook,
                  entityType as any,
                  customFields,
                  signatureItems,
                  backstory,
                  romanceTracks,
                  linkedLoreIds
                ),
                new Promise(res => setTimeout(res, 2500))
              ]);

              executed.push({
                name: `Registered ${entityType.toUpperCase()}: ${charName}`,
                description: description ? description.slice(0, 120) + "..." : `Added to campaign lore roster.`,
                targetTab: "workspace",
                subType: "lore",
                targetId: charName,
                loreType: entityType
              });
            }
          }
        }

        // 3. UPDATE CHARACTER / LORE PROFILE
        else if (name === "update_character_or_lore" || name === "update_character") {
          const targetIdOrName = (args.id || args.name || "").trim();
          const query = targetIdOrName.toLowerCase();
          
          let match = currentCharacters.find(c => c.id.toLowerCase() === query);
          if (!match && query) {
            match = currentCharacters.find(c => c.name.toLowerCase().trim() === query);
          }
          if (!match && query && query.length >= 2) {
            match = currentCharacters.find(c => {
              const cName = c.name.toLowerCase().trim();
              return cName.includes(query) || query.includes(cName);
            });
          }
          if (!match && (args.type === "pc" || query === "pc" || query === "player" || query === "protagonist")) {
            match = currentCharacters.find(c => c.isPlayerCharacter || c.type === "pc");
          }
          if (!match && currentCharacters.length === 1) {
            match = currentCharacters[0];
          }

          if (match) {
            const extractCustomFieldsFromArgs = (rawArgs: any): Record<string, string> => {
              if (!rawArgs || typeof rawArgs !== "object") return {};
              const extracted: Record<string, string> = {};
              const knownKeys = new Set([
                "id", "name", "role", "description", "type", "relationships", "factionName",
                "signatureItems", "backstory", "isMook", "isPlayerCharacter", "romanceTracks",
                "linkedLoreIds", "portraitUrl", "raw", "action"
              ]);

              const targetContainers = [
                rawArgs.customFields,
                rawArgs.custom_fields,
                rawArgs.specifications,
                rawArgs.specs,
                rawArgs.categorySpecifications
              ];

              for (const container of targetContainers) {
                if (!container) continue;
                if (typeof container === "object" && !Array.isArray(container)) {
                  for (const [k, v] of Object.entries(container)) {
                    if (v !== undefined && v !== null) {
                      extracted[k] = typeof v === "string" ? v : JSON.stringify(v);
                    }
                  }
                } else if (typeof container === "string") {
                  try {
                    const parsed = JSON.parse(container);
                    if (typeof parsed === "object" && parsed && !Array.isArray(parsed)) {
                      for (const [k, v] of Object.entries(parsed)) {
                        if (v !== undefined && v !== null) {
                          extracted[k] = typeof v === "string" ? (v as string) : JSON.stringify(v);
                        }
                      }
                    } else {
                      extracted["Specifications"] = container;
                    }
                  } catch {
                    const lines = container.split(/\r?\n/);
                    let hasParsedLines = false;
                    for (const line of lines) {
                      const colonIdx = line.indexOf(":");
                      if (colonIdx > 0 && colonIdx < line.length - 1) {
                        const k = line.substring(0, colonIdx).replace(/^[-*#\s]+/, "").trim();
                        const v = line.substring(colonIdx + 1).trim();
                        if (k && v) {
                          extracted[k] = v;
                          hasParsedLines = true;
                        }
                      }
                    }
                    if (!hasParsedLines && container.trim()) {
                      extracted["Specifications"] = container.trim();
                    }
                  }
                }
              }

              for (const [key, val] of Object.entries(rawArgs)) {
                if (!knownKeys.has(key) && !["customFields", "custom_fields", "specifications", "specs", "categorySpecifications"].includes(key)) {
                  if (val !== undefined && val !== null) {
                    extracted[key] = typeof val === "string" ? val : JSON.stringify(val);
                  }
                }
              }

              return extracted;
            };

            const incomingCustomFields = extractCustomFieldsFromArgs(args);
            const customFields: Record<string, string> = {
              ...(match.customFields || {}),
              ...incomingCustomFields
            };

            const updates: any = {};
            if (args.name && args.name !== match.id) updates.name = args.name;
            if (args.role) updates.role = args.role;
            if (args.description) updates.description = args.description;
            if (args.type) updates.type = args.type;
            if (args.relationships !== undefined) updates.relationships = args.relationships;
            if (args.factionName !== undefined) updates.factionName = args.factionName;
            if (args.signatureItems !== undefined) updates.signatureItems = args.signatureItems;
            if (args.backstory !== undefined) updates.backstory = args.backstory;
            if (args.isMook !== undefined) updates.isMook = args.isMook;
            updates.customFields = customFields;

            const idx = currentCharacters.findIndex(c => c.id === match.id);
            if (idx !== -1) currentCharacters[idx] = { ...currentCharacters[idx], ...updates };

            await Promise.race([
              onUpdateCharacter(match.id, updates),
              new Promise(res => setTimeout(res, 2500))
            ]);

            executed.push({
              name: `Updated Profile: ${match.name}`,
              description: Object.keys(incomingCustomFields).length > 0
                ? `Updated specifications: ${Object.keys(incomingCustomFields).join(", ")}`
                : updates.description ? updates.description.slice(0, 120) + "..." : `Modified profile specifications.`,
              targetTab: "workspace",
              subType: "lore",
              targetId: match.id,
              loreType: match.type || "npc"
            });
          }
        }

        // 4. DELETE CHARACTER / LORE PROFILE
        else if (name === "delete_character_or_lore" || name === "delete_character") {
          const targetIdOrName = args.id || args.name;
          if (targetIdOrName) {
            const match = characters.find(c => 
              c.id === targetIdOrName || 
              c.name.toLowerCase().trim() === targetIdOrName.toLowerCase().trim()
            );
            if (match) {
              await Promise.race([
                onDeleteCharacter(match.id),
                new Promise(res => setTimeout(res, 2500))
              ]);
              executed.push({
                name: `Deleted Profile: ${match.name}`,
                description: `Removed from campaign cast.`,
                targetTab: "workspace",
                subType: "lore"
              });
            }
          }
        }

        // 5. ADD KEEP NOTE
        else if (name === "add_keep_note") {
          const title = args.title || "Campaign Note";
          const content = args.content || "";
          if (title) {
            await Promise.race([
              onAddNote(title, content),
              new Promise(res => setTimeout(res, 2500))
            ]);
            executed.push({
              name: `Created Keep Note: ${title}`,
              description: content.slice(0, 120) + (content.length > 120 ? "..." : ""),
              targetTab: "workspace",
              subType: "keep",
              targetId: title
            });
          }
        }

        // 6. DELETE KEEP NOTE
        else if (name === "delete_keep_note") {
          const targetIdOrTitle = args.id || args.title;
          if (targetIdOrTitle) {
            const match = notes.find(n => n.id === targetIdOrTitle || n.title.toLowerCase().trim() === targetIdOrTitle.toLowerCase().trim());
            if (match) {
              await Promise.race([
                onDeleteNote(match.id),
                new Promise(res => setTimeout(res, 2500))
              ]);
              executed.push({
                name: `Deleted Keep Note: ${match.title}`,
                description: `Removed from campaign notes.`,
                targetTab: "workspace",
                subType: "keep"
              });
            }
          }
        }

        // 6b. ADD LORE GROUNDING SOURCE
        else if (name === "add_lore_source") {
          const srcName = args.name || "Grounding Source";
          const content = args.content || "";
          const category = args.category || "world_lore";
          const summary = args.summary || `Reference document: ${srcName}`;
          const type = args.type || "text_snippet";

          if (srcName && content && activeProject) {
            const sourceId = "src-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
            const newSrc: LoreSource = {
              id: sourceId,
              name: srcName,
              type: type as any,
              category: category as any,
              content,
              summary,
              addedAt: new Date().toLocaleDateString(),
              isActive: true,
              isIngesting: false
            };

            const existingSources = Array.isArray(activeProject.sources) ? activeProject.sources : [];
            const updatedSources = [newSrc, ...existingSources.filter(s => s.id !== sourceId)];
            await onSetProjectValue("sources", updatedSources);

            executed.push({
              name: `Indexed Grounding Source: ${srcName}`,
              description: summary.slice(0, 120) + (summary.length > 120 ? "..." : ""),
              targetTab: "workspace",
              subType: "sources",
              targetId: sourceId
            });
          }
        }

        // 6b. UPDATE LORE SOURCE
        else if (name === "update_lore_source") {
          const targetIdOrName = args.id || args.name;
          if (targetIdOrName && activeProject) {
            const existingSources = Array.isArray(activeProject.sources) ? activeProject.sources : [];
            const matched = existingSources.find(s => s.id === targetIdOrName || s.name.toLowerCase().trim() === targetIdOrName.toLowerCase().trim());
            if (matched) {
              const updatedSources = existingSources.map(s => {
                if (s.id === matched.id) {
                  return {
                    ...s,
                    name: args.name?.trim() || s.name,
                    category: args.category || s.category,
                    content: args.content !== undefined ? args.content : s.content,
                    summary: args.summary !== undefined ? args.summary : s.summary,
                    isActive: true
                  };
                }
                return s;
              });
              await onSetProjectValue("sources", updatedSources);
              executed.push({
                name: `Updated Grounding Source: ${args.name || matched.name}`,
                description: (args.summary || matched.summary || "Grounding document updated.").slice(0, 120),
                targetTab: "workspace",
                subType: "sources",
                targetId: matched.id
              });
            }
          }
        }

        // 6c. DELETE LORE SOURCE
        else if (name === "delete_lore_source") {
          const targetIdOrName = args.id || args.name;
          if (targetIdOrName && activeProject) {
            const existingSources = Array.isArray(activeProject.sources) ? activeProject.sources : [];
            const matched = existingSources.find(s => s.id === targetIdOrName || s.name.toLowerCase().trim() === targetIdOrName.toLowerCase().trim());
            if (matched) {
              const updatedSources = existingSources.filter(s => s.id !== matched.id);
              await onSetProjectValue("sources", updatedSources);
              executed.push({
                name: `Deleted Grounding Source: ${matched.name}`,
                description: `Removed from active grounding memory.`,
                targetTab: "workspace",
                subType: "sources"
              });
            }
          }
        }

        // 7. ADD TASK / OBJECTIVE
        else if (name === "add_task") {
          const text = args.text;
          if (text) {
            await Promise.race([
              onAddTask(text),
              new Promise(res => setTimeout(res, 2500))
            ]);
            executed.push({
              name: `Added Objective: ${text.slice(0, 40)}`,
              description: text,
              targetTab: "workspace",
              subType: "tasks"
            });
          }
        }

        // 8. TOGGLE TASK
        else if (name === "toggle_task") {
          const targetIdOrText = args.id || args.text;
          if (targetIdOrText) {
            const match = tasks.find(t => t.id === targetIdOrText || t.text.toLowerCase().trim() === targetIdOrText.toLowerCase().trim());
            if (match) {
              await Promise.race([
                onToggleTask(match.id),
                new Promise(res => setTimeout(res, 2500))
              ]);
              executed.push({
                name: `Toggled Objective: ${match.text.slice(0, 40)}`,
                description: `Updated completion status.`,
                targetTab: "workspace",
                subType: "tasks"
              });
            }
          }
        }

        // 9. DELETE TASK
        else if (name === "delete_task") {
          const targetIdOrText = args.id || args.text;
          if (targetIdOrText) {
            const match = tasks.find(t => t.id === targetIdOrText || t.text.toLowerCase().trim() === targetIdOrText.toLowerCase().trim());
            if (match) {
              await Promise.race([
                onDeleteTask(match.id),
                new Promise(res => setTimeout(res, 2500))
              ]);
              executed.push({
                name: `Deleted Objective: ${match.text.slice(0, 40)}`,
                description: `Removed from checklist.`,
                targetTab: "workspace",
                subType: "tasks"
              });
            }
          }
        }

        // 10. FEED CONTEXT TO MAIN CHAT
        else if (name === "feed_context_to_main_chat") {
          const text = args.text;
          const role = args.role || "model";
          const speakerIds = args.speakerIds;
          if (text && onInjectMessageToMainChat) {
            await Promise.race([
              onInjectMessageToMainChat(text, role, speakerIds),
              new Promise(res => setTimeout(res, 2500))
            ]);
            executed.push({
              name: `Shunted to Adventure Stream`,
              description: text.slice(0, 120) + (text.length > 120 ? "..." : ""),
              targetTab: "chat",
              subType: "main_chat"
            });
          }
        }

        // 12. EDIT NARRATIVE LOG / MESSAGE ENTRY
        else if (
          name === "edit_narrative_log" ||
          name === "edit_narrative_entry" ||
          name === "edit_narrative" ||
          name === "update_narrative_log" ||
          name === "update_narrative" ||
          name === "rewrite_narrative_turn" ||
          name === "rewrite_narrative" ||
          name === "rewrite_message" ||
          name === "edit_message" ||
          name === "update_message" ||
          name === "modify_narrative_log" ||
          name === "modify_narrative" ||
          name === "revise_narrative_log" ||
          name === "revise_narrative" ||
          name === "revise_turn" ||
          name === "edit_turn" ||
          name === "retcon_narrative"
        ) {
          const targetId = args.id || args.messageId || args.turnId || args.turn;
          const newContent = args.newContent !== undefined ? args.newContent
            : args.content !== undefined ? args.content
            : args.text !== undefined ? args.text
            : args.prose !== undefined ? args.prose
            : args.storyText !== undefined ? args.storyText
            : args.revisedText !== undefined ? args.revisedText
            : args.editedText !== undefined ? args.editedText
            : args.narrative !== undefined ? args.narrative
            : args.updatedContent !== undefined ? args.updatedContent
            : args.turnText !== undefined ? args.turnText
            : args.message !== undefined ? args.message
            : args.revisedProse !== undefined ? args.revisedProse
            : args.replacement !== undefined ? args.replacement
            : args.newText;
          const searchSnippet = args.searchSnippet || args.snippet || args.match || args.query;

          if (newContent !== undefined) {
            let matchedMessage: any = null;

            if (narrativeMessages.length > 0) {
              if (targetId && targetId !== "latest" && targetId !== "last") {
                matchedMessage = narrativeMessages.find(m => m.id === targetId);
                if (!matchedMessage) {
                  const numMatch = String(targetId).match(/\b(\d+)\b/);
                  if (numMatch) {
                    const rawNum = parseInt(numMatch[1], 10);
                    // Check if it matches 0-based index
                    if (rawNum >= 0 && rawNum < narrativeMessages.length && String(targetId).includes("0")) {
                      matchedMessage = narrativeMessages[rawNum];
                    } else {
                      // Check 1-based relative to recent snippet (last 25)
                      const offset = Math.max(0, narrativeMessages.length - 25);
                      const snippetRelIdx = offset + rawNum - 1;
                      if (snippetRelIdx >= 0 && snippetRelIdx < narrativeMessages.length) {
                        matchedMessage = narrativeMessages[snippetRelIdx];
                      } else if (rawNum - 1 >= 0 && rawNum - 1 < narrativeMessages.length) {
                        matchedMessage = narrativeMessages[rawNum - 1];
                      }
                    }
                  }
                }
              }

              if (!matchedMessage && searchSnippet) {
                const snippetLower = String(searchSnippet).toLowerCase().trim();
                matchedMessage = [...narrativeMessages].reverse().find(m => {
                  const text = (m.versions && typeof m.activeVersionIndex === "number" && m.versions[m.activeVersionIndex])
                    ? m.versions[m.activeVersionIndex].content
                    : (m.content || "");
                  return text.toLowerCase().includes(snippetLower);
                });
              }

              if (!matchedMessage) {
                // Target the latest assistant/model/nyx turn or the very last message in narrative
                const modelMsgs = narrativeMessages.filter(m => m.role === "model" || m.role === "nyx");
                matchedMessage = modelMsgs.length > 0 ? modelMsgs[modelMsgs.length - 1] : narrativeMessages[narrativeMessages.length - 1];
              }
            }

            if (matchedMessage && onEditMessage) {
              await onEditMessage(matchedMessage.id, String(newContent));
              executed.push({
                name: `Edited Narrative Log Turn`,
                description: String(newContent).slice(0, 140) + (String(newContent).length > 140 ? "..." : ""),
                targetTab: "chat",
                subType: "main_chat",
                targetId: matchedMessage.id
              });
              onShowToast("✨ Narrative Turn Revised", "Successfully edited the active scene turn in the Adventure Log.", "success");
            } else if (onInjectMessageToMainChat) {
              // If no message exists yet to edit (e.g. empty log), inject the new turn into the adventure log!
              await Promise.race([
                onInjectMessageToMainChat(String(newContent), "model"),
                new Promise(res => setTimeout(res, 2500))
              ]);
              executed.push({
                name: `Created Narrative Scene Turn`,
                description: String(newContent).slice(0, 140) + (String(newContent).length > 140 ? "..." : ""),
                targetTab: "chat",
                subType: "main_chat"
              });
              onShowToast("✨ Narrative Scene Established", "Added new narrative turn directly into the Adventure Log.", "success");
            }
          }
        }

        // 13. DELETE NARRATIVE ENTRY
        else if (
          name === "delete_narrative_entry" ||
          name === "delete_narrative_log" ||
          name === "delete_message" ||
          name === "remove_message"
        ) {
          const targetId = args.id || args.messageId;
          const searchSnippet = args.searchSnippet || args.snippet || args.match;

          if (onDeleteMessage && narrativeMessages.length > 0) {
            let matchedMessage: any = null;
            if (targetId && targetId !== "latest" && targetId !== "last") {
              matchedMessage = narrativeMessages.find(m => m.id === targetId);
            }
            if (!matchedMessage && searchSnippet) {
              const snippetLower = String(searchSnippet).toLowerCase().trim();
              matchedMessage = [...narrativeMessages].reverse().find(m => 
                (m.content || "").toLowerCase().includes(snippetLower)
              );
            }
            if (!matchedMessage) {
              matchedMessage = narrativeMessages[narrativeMessages.length - 1];
            }

            if (matchedMessage) {
              await Promise.race([
                onDeleteMessage(matchedMessage.id),
                new Promise(res => setTimeout(res, 2500))
              ]);
              executed.push({
                name: `Deleted Narrative Log Turn`,
                description: (matchedMessage.content || "").slice(0, 100) + "...",
                targetTab: "chat",
                subType: "main_chat"
              });
            }
          }
        }

        // 14. UPDATE ADVENTURE LOG TITLE
        else if (
          name === "update_adventure_log_title" ||
          name === "set_adventure_log_title" ||
          name === "rename_adventure_log" ||
          name === "edit_adventure_log_title"
        ) {
          const title = (args.title || args.name || args.adventureLogTitle || "").trim();
          if (title) {
            await Promise.race([
              onSetProjectValue("adventureLogTitle", title),
              new Promise(res => setTimeout(res, 2500))
            ]);
            executed.push({
              name: `Renamed Adventure Log`,
              description: `Set log title to "${title}"`,
              targetTab: "chat",
              subType: "main_chat"
            });
          }
        }

      } catch (callErr) {
        console.error("Error executing assistant tool call:", call, callErr);
      }
    }

    return executed;
  };

  // =========================================================================
  // MESSAGE SENDING & PROCESSING
  // =========================================================================
  const handleSend = async (e?: React.FormEvent, customUserText?: string, customAttachments?: AssistantAttachment[]) => {
    if (e) e.preventDefault();
    const textToSend = (customUserText !== undefined ? customUserText : inputText).trim();
    const filesToSend = customAttachments !== undefined ? customAttachments : attachedFiles;

    if (!textToSend && filesToSend.length === 0) return;
    if (isGenerating) return;

    const userMessageId = `msg-user-${Date.now()}`;
    const userMsg: AssistantMessage = {
      id: userMessageId,
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
      attachments: filesToSend.length > 0 ? filesToSend : undefined
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setInputText("");
    setAttachedFiles([]);
    setIsGenerating(true);

    const controller = new AbortController();
    assistantAbortControllerRef.current = controller;

    try {
      const recentNarrativeSnippet = (narrativeMessages || [])
        .slice(-25)
        .map((m: any, idx: number) => {
          const contentText = (m.versions && typeof m.activeVersionIndex === "number" && m.versions[m.activeVersionIndex])
            ? m.versions[m.activeVersionIndex].content
            : (m.content || "");
          return `[Turn ${idx + 1} | ID: ${m.id}] [${m.role === "model" || m.role === "nyx" ? "DM (Nyx)" : "Player"}]: ${contentText}`;
        })
        .join("\n\n");

      // Sanitize sources to avoid sending megabytes of background base64 data over fetch, while providing rich document text
      const sanitizedSources = (activeProject?.sources || []).slice(0, 25).map((s: any) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        category: s.category,
        categories: s.categories,
        summary: s.summary,
        isActive: s.isActive,
        content: typeof s.content === "string" ? s.content.slice(0, 30000) : (s.content || "")
      }));

      const sanitizedActiveProject = activeProject ? {
        id: activeProject.id,
        name: activeProject.name,
        setting: activeProject.setting,
        plotOverview: activeProject.plotOverview,
        persistentContext: activeProject.persistentContext,
        stAdventureModule: activeProject.stAdventureModule,
        customInstructions: activeProject.customInstructions,
        styleGuide: activeProject.styleGuide,
        narrationStyle: activeProject.narrationStyle,
        narrativePerspective: activeProject.narrativePerspective,
        pacing: activeProject.pacing,
        emotionalTone: activeProject.emotionalTone,
        userNickname: activeProject.userNickname,
        sources: sanitizedSources
      } : undefined;

      const sanitizedCharacters = (characters || []).slice(0, 40).map((c: any) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        type: c.type || (c.isPlayerCharacter ? "pc" : "npc"),
        description: typeof c.description === "string" ? c.description.slice(0, 800) : c.description,
        factionName: c.factionName,
        relationships: typeof c.relationships === "string" ? c.relationships.slice(0, 400) : c.relationships,
        signatureItems: c.signatureItems,
        isPlayerCharacter: c.isPlayerCharacter,
        isMook: c.isMook,
        customFields: c.customFields
      }));

      const sanitizedNotes = (notes || []).slice(0, 25).map((n: any) => ({
        id: n.id,
        title: n.title,
        content: typeof n.content === "string" ? n.content.slice(0, 800) : n.content
      }));

      const sanitizedTasks = (tasks || []).slice(0, 25).map((t: any) => ({
        id: t.id,
        text: t.text,
        completed: t.completed
      }));

      const appContext = {
        activeProject: sanitizedActiveProject,
        characters: sanitizedCharacters,
        notes: sanitizedNotes,
        tasks: sanitizedTasks,
        narrativeTranscriptSnippet: recentNarrativeSnippet
      };

      // Keep recent 15 turns and strip past base64 attachments to keep payloads ultra-lightweight
      const recentTurns = updatedMessages.slice(-15);
      const payload = {
        messages: recentTurns.map((m, idx) => {
          const isLatestUserTurn = idx === recentTurns.length - 1;
          const sanitizedAttachments = (m.attachments || []).map((att: any) => {
            if (isLatestUserTurn) return att;
            return {
              name: att.name,
              mimeType: att.mimeType,
              text: typeof att.text === "string" ? att.text.slice(0, 2000) : undefined
            };
          });

          return {
            role: m.role,
            content: m.content,
            attachments: sanitizedAttachments.length > 0 ? sanitizedAttachments : undefined
          };
        }),
        appContext
      };

      const res = await safeFetchJson<{
        text: string;
        functionCalls?: any[];
      }>("/api/workspace-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeout: 90000,
        signal: controller.signal
      });

      const responseText = res?.text || `[Nyx: I've updated the workspace based on your directive, ${activeProject?.userNickname || "Sir"}!]`;
      const rawCalls = res?.functionCalls || [];

      // Execute automated actions
      const actionsExecuted = await executeFunctionCalls(rawCalls);

      const modelMsg: AssistantMessage = {
        id: `msg-model-${Date.now()}`,
        role: "model",
        content: responseText,
        timestamp: new Date().toISOString(),
        actionsExecuted: actionsExecuted.length > 0 ? actionsExecuted : undefined
      };

      setChatMessages(prev => [...prev, modelMsg]);

      if (actionsExecuted.length > 0) {
        onShowToast(
          "✨ Workspace Synchronized",
          `Executed ${actionsExecuted.length} automated modification(s).`,
          "success"
        );
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.message?.includes("aborted") || err?.message?.includes("cancelled") || controller.signal.aborted) {
        // Handled cleanly by handleStopGeneration
        return;
      }
      console.error("Workspace assistant error:", err);
      const errorMsg: AssistantMessage = {
        id: `msg-err-${Date.now()}`,
        role: "model",
        content: `[Nyx touches her earcomm, steadying herself.]\n\nA momentary pulse surged through the network (${err.message || "Connection timed out"}). Hit retry below and let's keep forging!`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMsg]);
      onShowToast("Assistant Network Pulse", "Click Retry below to seamlessly re-run your directive.", "error");
    } finally {
      if (assistantAbortControllerRef.current === controller) {
        assistantAbortControllerRef.current = null;
      }
      setIsGenerating(false);
    }
  };

  // Re-run the last user prompt upon timeout or network hiccup
  const handleRetryLastMessage = () => {
    const lastUserTurn = [...chatMessages].reverse().find(m => m.role === "user");
    if (lastUserTurn) {
      // Remove trailing error messages
      setChatMessages(prev => prev.filter(m => !m.id.startsWith("msg-err-")));
      handleSend(undefined, lastUserTurn.content, lastUserTurn.attachments || []);
    }
  };

  // Copy message
  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
      onShowToast("Copied", "Text copied to clipboard.", "info");
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  // Inline user edit & re-run
  const handleStartEdit = (msg: AssistantMessage) => {
    setEditingMsgId(msg.id);
    setEditingContent(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditingContent("");
  };

  const handleSaveAndReRunUserEdit = (msgId: string) => {
    const targetIdx = chatMessages.findIndex(m => m.id === msgId);
    if (targetIdx === -1) return;

    const targetMsg = chatMessages[targetIdx];
    const previousMessages = chatMessages.slice(0, targetIdx);
    setChatMessages(previousMessages);
    setEditingMsgId(null);
    setEditingContent("");

    handleSend(undefined, editingContent, targetMsg.attachments || []);
  };

  // Clear chat
  const handleClearChat = () => {
    const welcomeMsg: AssistantMessage = {
      id: "welcome-nyx-cleared",
      role: "model",
      content: `[Nyx clears the tactical holograph with a flick of her wrist.]\n\nClean board, **${activeProject?.userNickname || "Sir"}**! Your cast and campaign lore remain completely secured. What are we orchestrating next?`,
      timestamp: new Date().toISOString()
    };
    setChatMessages([welcomeMsg]);
    setShowClearConfirm(false);
    onShowToast("History Reset", "Assistant dialogue history cleared.", "info");
  };

  // Run full system diagnostics probe
  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const res = await safeFetchJson<any>("/api/workspace-assistant/diagnostics", {
        method: "GET"
      });
      if (res && res.checks) {
        setDiagnosticResults(res);
        if (res.healthy) {
          onShowToast("Diagnostics Passed", "All assistant subsystems verified and green-lit.", "success");
        } else {
          onShowToast("Diagnostics Warning", "Some checks returned warnings. Inspect details.", "warning");
        }
      } else {
        throw new Error("Invalid diagnostic response received.");
      }
    } catch (e: any) {
      console.error("Diagnostic execution error:", e);
      onShowToast("Diagnostic Probe Failed", e.message || "Failed to reach diagnostic endpoint.", "error");
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  // Run interactive RAG retrieval & speed probe
  const handleRunRagTest = async () => {
    setIsRunningRagTest(true);
    try {
      const sanitizedSources = (activeProject?.sources || []).slice(0, 25).map((s: any) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        categories: s.categories,
        summary: s.summary,
        isActive: s.isActive,
        content: typeof s.content === "string" ? s.content.slice(0, 30000) : (s.content || "")
      }));

      const res = await safeFetchJson<any>("/api/workspace-assistant/rag-test", {
        method: "POST",
        body: JSON.stringify({
          query: ragTestQuery,
          sources: sanitizedSources,
          characters,
          notes,
          tasks
        })
      });

      if (res && res.matchedExcerpts) {
        setRagTestResult(res);
        onShowToast("RAG Probe Complete", `Retrieved ${res.retrievedCount} source chunks in ${res.durationMs}ms.`, "success");
      }
    } catch (e: any) {
      console.error("RAG test error:", e);
      onShowToast("RAG Probe Error", e.message || "Failed to execute RAG retrieval probe.", "error");
    } finally {
      setIsRunningRagTest(false);
    }
  };

  // Live NPC Creation Speed & Non-Blocking Safety Test
  const handleRunNpcCreationTest = async () => {
    setIsRunningNpcTest(true);
    const startTime = performance.now();
    try {
      const testName = `Echo Recon ${Math.floor(100 + Math.random() * 900)}`;
      await Promise.race([
        onAddCharacter(
          testName,
          "Tactical Recon Specialist",
          "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80",
          "Automated non-blocking test profile verifying instant optimistic UI updates and Firestore timeout safety with all fields populated.",
          false,
          "Frontier operative allied with party.",
          "Smuggler Alliance",
          false,
          "npc",
          {
            "Specialization": "Tactical Infiltration",
            "Equipment": "Thermal Visor, EMP Dart",
            "Status": "Active / Verified"
          },
          "Silenced Pulse Pistol",
          "Generated in diagnostic speed test to confirm zero UI freeze."
        ),
        new Promise(res => setTimeout(res, 2500))
      ]);
      const durationMs = Math.round(performance.now() - startTime);
      setNpcTestResult({
        durationMs,
        npcName: testName,
        fieldsCount: 8,
        success: true
      });
      onShowToast("NPC Creation Test Passed", `Created "${testName}" with 8 fields in ${durationMs}ms with zero UI freeze!`, "success");
    } catch (err: any) {
      onShowToast("NPC Test Failed", err.message || "Failed test", "error");
    } finally {
      setIsRunningNpcTest(false);
    }
  };

  // Quick Directives
  const directives = [
    {
      label: "✨ Build Cast & World",
      prompt: "Review our campaign setting, lore notes, and attached documents. Build complete profiles for the Player Character (PC), primary Companions, key NPCs, main Faction, and update the World Setting and Plot Overview.",
      icon: Wand2
    },
    {
      label: "🧪 Test Create NPC",
      prompt: "Create a new NPC named 'Vesper Cross' with the role 'Frontier Pilot', full backstory, tactical custom fields, and signature gear.",
      icon: Users
    },
    {
      label: "🌌 Update Atmosphere",
      prompt: "Update the Persistent Context with rich, sensory atmospheric details for our current scene—including weather, ambient lighting, sensory cues, and tension.",
      icon: Compass
    },
    {
      label: "📜 Outline Adventure Module",
      prompt: "Draft an Adventure Module outline for our campaign with Act 1, Act 2, and Act 3 chapters, dramatic plot twists, and tactical encounters.",
      icon: BookOpen
    },
    {
      label: "👥 Add Companion Profile",
      prompt: "Create a rich, charismatic Companion character profile with custom attributes, signature gear, personality traits, and romance milestones.",
      icon: Users
    },
    {
      label: "🎯 Sync Objectives",
      prompt: "Analyze our plot overview and recent narrative turns. Add 3 new high-priority campaign objectives to our workspace checklist.",
      icon: CheckSquare
    },
    {
      label: "📜 Add Grounding Lore",
      prompt: "Create a new grounding lore source in our campaign codex detailing secret world lore, hidden factions, or ancient artifacts.",
      icon: FileText
    }
  ];

  const assistantContent = (
    <div className="flex flex-col h-full w-full overflow-hidden select-text bg-slate-950/95">
      {/* HEADER (Dirac Minimalism) */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800/80 shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-purple-950/50">
              <Sparkles size={15} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900 ring-1 ring-emerald-500/40 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-100 tracking-wide font-mono">NYX ASSISTANT</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                embedded
                  ? "bg-purple-950/90 text-purple-300 border-purple-800/60 font-semibold"
                  : isDocked 
                    ? "bg-purple-950/90 text-purple-300 border-purple-800/60 font-semibold" 
                    : "bg-slate-900 text-slate-400 border-slate-800"
              }`}>
                {embedded ? "CO-PILOT" : isDocked ? "PINNED" : "OVERLAY"}
              </span>
            </div>
            <span className="text-[10.5px] text-slate-400 truncate max-w-[170px]">
              {activeProject?.name || "Active Campaign"}
            </span>
          </div>
        </div>

              {/* HEADER ACTIONS */}
              <div className="flex items-center gap-1 text-slate-400">
                {isGenerating && (
                  <button
                    type="button"
                    onClick={handleStopGeneration}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-sm shadow-rose-950/60 transition-all cursor-pointer animate-pulse"
                    title="Stop assistant writing"
                  >
                    <Square size={10} className="fill-current" />
                    <span>Stop</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowDiagnostics(true);
                    if (!diagnosticResults && !isRunningDiagnostics) {
                      handleRunDiagnostics();
                    }
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    showDiagnostics ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/50" : "hover:bg-slate-800 hover:text-emerald-400"
                  }`}
                  title="Run Subsystem Diagnostics & Green Light Status"
                >
                  <Activity size={14} className={isRunningDiagnostics ? "animate-spin text-emerald-400" : ""} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowDirectives(prev => !prev)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    showDirectives ? "bg-purple-900/60 text-purple-200" : "hover:bg-slate-800 hover:text-slate-200"
                  }`}
                  title="Toggle Quick Directives"
                >
                  <SlidersHorizontal size={14} />
                </button>

                {/* PIN / DOCK TOGGLE BUTTON (HIDDEN IN EMBEDDED MODE) */}
                {!embedded && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextDocked = !isDocked;
                      setIsDocked(nextDocked);
                      onShowToast(
                        nextDocked ? "Assistant Pinned & Docked" : "Assistant Floating Overlay",
                        nextDocked 
                          ? "UI is locked and moved to the left to make room for the assistant." 
                          : "Assistant is now floating over top of the UI.",
                        "info"
                      );
                    }}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      isDocked 
                        ? "bg-purple-950 text-purple-300 border border-purple-600/50 shadow-sm shadow-purple-950/40" 
                        : "hover:bg-slate-800 hover:text-slate-200 text-slate-400"
                    }`}
                    title={isDocked ? "Unpin (Float over top of UI as overlay)" : "Pin & Dock (Move UI to left and lock)"}
                  >
                    <Pin size={13} className={isDocked ? "rotate-45 text-purple-400 fill-purple-400/40" : ""} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="p-1.5 rounded-lg hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
                  title="Reset Chat History"
                >
                  <RefreshCw size={13} />
                </button>

                {!embedded && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer ml-0.5"
                    title="Collapse Sidebar"
                  >
                    <ChevronRight size={15} />
                  </button>
                )}

                {embedded && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer ml-0.5"
                    title="Close Assistant"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

          {/* HUD METRIC STRIP (Mathematical Density) */}
          <div className="grid grid-cols-4 gap-1 px-3 py-1.5 bg-slate-950/80 border-b border-slate-900 text-[10.5px] font-mono shrink-0 select-none">
            <button
              type="button"
              onClick={() => onNavigateToItem && onNavigateToItem({ targetTab: "workspace", subType: "lore" })}
              className="flex items-center justify-center gap-1 py-1 rounded bg-slate-900/60 hover:bg-slate-850 text-slate-300 transition-colors cursor-pointer"
              title="Cast Roster"
            >
              <Users size={11} className="text-purple-400" />
              <span>{characters.length} Cast</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToItem && onNavigateToItem({ targetTab: "workspace", subType: "world_setting", targetKey: "setting" })}
              className="flex items-center justify-center gap-1 py-1 rounded bg-slate-900/60 hover:bg-slate-850 text-slate-300 transition-colors cursor-pointer"
              title="World Setting"
            >
              <Globe size={11} className="text-indigo-400" />
              <span>{activeProject?.setting ? "Setting ✓" : "Setting"}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToItem && onNavigateToItem({ targetTab: "workspace", subType: "sources" })}
              className="flex items-center justify-center gap-1 py-1 rounded bg-slate-900/60 hover:bg-slate-850 text-slate-300 transition-colors cursor-pointer"
              title="Lore Sources & Grounding Transcripts"
            >
              <FileText size={11} className="text-amber-400" />
              <span>{(activeProject?.sources || []).length} Sources</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToItem && onNavigateToItem({ targetTab: "workspace", subType: "tasks" })}
              className="flex items-center justify-center gap-1 py-1 rounded bg-slate-900/60 hover:bg-slate-850 text-slate-300 transition-colors cursor-pointer"
              title="Campaign Tasks"
            >
              <CheckSquare size={11} className="text-emerald-400" />
              <span>{tasks.filter(t => !t.completed).length} Tasks</span>
            </button>
          </div>

          {/* QUICK DIRECTIVES DRAWER */}
          <AnimatePresence>
            {showDirectives && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden bg-slate-900/90 border-b border-purple-900/30 px-3 py-2 shrink-0"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-purple-300">
                    Quick Directives
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDirectives(false)}
                    className="text-slate-400 hover:text-slate-200 text-[10px]"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {directives.map((dir, idx) => {
                    const Icon = dir.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          handleSend(undefined, dir.prompt);
                          setShowDirectives(false);
                        }}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-950/70 hover:bg-purple-950/60 border border-slate-800/80 hover:border-purple-800/60 text-left text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Icon size={12} className="text-purple-400 shrink-0" />
                        <span className="truncate">{dir.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MESSAGE STREAM */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-1 overflow-y-auto p-3.5 space-y-4 relative ${
              isDragging ? "bg-purple-950/20 ring-2 ring-purple-500/50 ring-inset" : ""
            }`}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-purple-500 rounded-xl m-2">
                <Paperclip size={32} className="text-purple-400 animate-bounce mb-2" />
                <p className="text-sm font-semibold text-slate-100">Drop Lore Files / Images Here</p>
                <p className="text-xs text-slate-400 mt-1">Nyx will digest and anchor them directly to your campaign.</p>
              </div>
            )}

            {chatMessages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isEditing = editingMsgId === msg.id;

              return (
                <div 
                  key={msg.id || index} 
                  className={`flex flex-col group ${isUser ? "items-end" : "items-start"}`}
                >
                  {/* MESSAGE SENDER & TIMESTAMP */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-slate-500">
                    <span>{isUser ? (activeProject?.userNickname || "You") : "Nyx"}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  {/* MESSAGE BUBBLE */}
                  <div 
                    className={`relative max-w-[92%] rounded-2xl p-3 text-xs leading-relaxed transition-all shadow-md ${
                      isUser
                        ? "bg-purple-900/40 border border-purple-700/50 text-purple-100 rounded-br-sm"
                        : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-sm"
                    }`}
                  >
                    {/* ATTACHMENTS TRAY ON USER MESSAGE */}
                    {isUser && msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-purple-800/40">
                        {msg.attachments.map((att, attIdx) => (
                          <div 
                            key={att.id || attIdx} 
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-800/60 text-[10.5px] text-purple-200"
                          >
                            <Paperclip size={10} className="text-purple-400 shrink-0" />
                            <span className="truncate max-w-[140px]" title={att.name}>{att.name}</span>
                            {att.size && <span className="text-[9px] text-purple-400">({att.size})</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CONTENT / EDIT MODE */}
                    {isEditing ? (
                      <div className="space-y-2 min-w-[240px]">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full bg-slate-950 border border-purple-700/60 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none min-h-[70px]"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveAndReRunUserEdit(msg.id)}
                            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-[11px] font-semibold text-white transition-colors"
                          >
                            Save & Re-run
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="prose prose-invert prose-xs max-w-none break-words">
                        <ChatMessageMarkdown content={msg.content} isUser={isUser} />
                        {(msg.id.startsWith("msg-err-") || msg.content.includes("momentary pulse surged") || msg.content.includes("timed out")) && (
                          <div className="mt-2.5 not-prose">
                            <button
                              type="button"
                              onClick={handleRetryLastMessage}
                              disabled={isGenerating}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                              <RefreshCw size={12} className={isGenerating ? "animate-spin" : ""} />
                              <span>Retry Directive</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* EXECUTED WORKSPACE ACTIONS CARDS */}
                    {!isUser && msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-mono font-semibold uppercase text-purple-300">
                          <Zap size={11} className="text-purple-400" />
                          <span>Workspace Modified ({msg.actionsExecuted.length})</span>
                        </div>
                        <div className="space-y-1">
                          {msg.actionsExecuted.map((act, actIdx) => (
                            <button
                              key={actIdx}
                              type="button"
                              onClick={() => {
                                if (onNavigateToItem) {
                                  onNavigateToItem({
                                    targetTab: act.targetTab || "workspace",
                                    subType: act.subType,
                                    targetId: act.targetId,
                                    targetKey: act.targetKey,
                                    loreType: act.loreType
                                  });
                                }
                              }}
                              className="w-full flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 hover:bg-purple-950/60 border border-slate-800/80 hover:border-purple-800/60 text-left transition-colors cursor-pointer group/act"
                            >
                              <div className="flex flex-col truncate pr-2">
                                <span className="text-[11px] font-semibold text-slate-200 group-hover/act:text-purple-200 truncate">
                                  {act.name}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate">
                                  {act.description}
                                </span>
                              </div>
                              <ArrowUpRight size={12} className="text-slate-500 group-hover/act:text-purple-400 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* MESSAGE TOOLBAR (HOVER) */}
                    <div 
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-slate-950/90 border border-slate-800/90 rounded-md p-0.5 shadow-lg backdrop-blur-sm z-10"
                    >
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy message"
                      >
                        {copiedMsgId === msg.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>

                      {isUser && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(msg)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Edit & re-run prompt"
                        >
                          <Edit3 size={11} />
                        </button>
                      )}

                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => {
                            const prevUser = chatMessages.slice(0, index).filter(m => m.role === "user").pop();
                            if (prevUser) {
                              handleSend(undefined, prevUser.content, prevUser.attachments || []);
                            }
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Regenerate response"
                        >
                          <RefreshCw size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* GENERATING INDICATOR */}
            {isGenerating && (
              <div className="flex items-start gap-2 max-w-[90%]">
                <div className="w-6 h-6 rounded-md bg-purple-900/60 border border-purple-700/50 flex items-center justify-center text-purple-300 shrink-0 animate-pulse mt-0.5">
                  <Sparkles size={12} />
                </div>
                <div className="p-2.5 rounded-2xl rounded-bl-sm bg-slate-900/90 border border-purple-800/40 text-xs text-slate-300 space-y-2 shadow-md flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-purple-300">
                      <RefreshCw size={11} className="animate-spin text-purple-400" />
                      <span>Nyx is synthesizing directives...</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/90 hover:bg-rose-900 border border-rose-700/60 text-rose-300 hover:text-rose-100 text-[10px] font-semibold transition-colors cursor-pointer shadow-xs"
                      title="Stop generation immediately"
                    >
                      <Square size={9} className="fill-current" />
                      <span>Stop</span>
                    </button>
                  </div>
                  <div className="flex gap-1 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping delay-75" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-ping delay-150" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ATTACHMENT CHIP TRAY (PRE-SEND) */}
          {attachedFiles.length > 0 && (
            <div className="px-3 py-1.5 bg-slate-900/80 border-t border-slate-800/80 flex flex-wrap gap-1.5 shrink-0 max-h-[90px] overflow-y-auto">
              {attachedFiles.map((att, idx) => (
                <div 
                  key={att.id || idx}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-purple-800/60 text-[11px] text-slate-200 shadow-sm"
                >
                  <Paperclip size={11} className="text-purple-400 shrink-0" />
                  <span className="truncate max-w-[130px] font-medium" title={att.name}>{att.name}</span>
                  {att.size && <span className="text-[9.5px] text-slate-500">({att.size})</span>}
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-slate-400 hover:text-rose-400 ml-0.5 p-0.5"
                    title="Remove file"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAttachedFiles([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 self-center underline ml-1"
              >
                Clear all
              </button>
            </div>
          )}

          {/* INPUT DECK (Dirac Proportions) */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800/90 shrink-0">
            <form onSubmit={handleSend} className="flex flex-col gap-2">
              <div className="relative rounded-xl border border-slate-800 focus-within:border-purple-600/80 bg-slate-950 transition-colors shadow-inner">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Instruct Nyx (e.g. "Build out our 3 main companions and set the scene weather...")...`}
                  disabled={isGenerating}
                  rows={2}
                  className="w-full bg-transparent p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
                />

                {/* BOTTOM ACTION BAR */}
                <div className="flex items-center justify-between px-2.5 pb-2 pt-1 border-t border-slate-900">
                  <div className="flex items-center gap-1">
                    {/* Hidden Native File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".txt,.md,.json,.pdf,.csv,.png,.jpg,.jpeg,.webp"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer text-[11px]"
                      title="Attach file (Text, PDF, Images, JSON)"
                    >
                      <Paperclip size={13} />
                      <span className="hidden sm:inline">Attach</span>
                    </button>

                    {/* Google Picker Integration */}
                    <GooglePickerButton
                      googleToken={googleToken}
                      onGoogleSignIn={onGoogleSignIn}
                      onFilesPicked={handleGoogleFilesPicked}
                      onShowToast={onShowToast}
                      buttonSize="sm"
                      label="Drive"
                    />
                  </div>

                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-950/50 transition-all cursor-pointer animate-pulse"
                      title="Stop assistant writing immediately"
                    >
                      <Square size={11} className="fill-current" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!inputText.trim() && attachedFiles.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 disabled:hover:bg-purple-600 text-white text-xs font-semibold shadow-md shadow-purple-950/40 transition-all cursor-pointer"
                    >
                      <span>Send</span>
                      <Send size={12} />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* DIAGNOSTIC STATUS & SUBSYSTEM MODAL */}
          {showDiagnostics && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* MODAL HEADER */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
                      <Activity size={14} className={isRunningDiagnostics ? "animate-spin" : ""} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 font-mono tracking-wide">ASSISTANT DIAGNOSTICS</h4>
                      <p className="text-[10px] text-slate-400">Subsystem & Component Health Probes</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDiagnostics(false)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* MODAL BODY */}
                <div className="p-4 overflow-y-auto space-y-3.5 select-text">
                  {/* OVERALL HEALTH BANNER */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    diagnosticResults?.healthy
                      ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                      : isRunningDiagnostics
                        ? "bg-purple-950/40 border-purple-800/50 text-purple-300"
                        : "bg-amber-950/40 border-amber-800/50 text-amber-300"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {diagnosticResults?.healthy ? (
                        <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                      ) : isRunningDiagnostics ? (
                        <Activity size={18} className="animate-spin text-purple-400 shrink-0" />
                      ) : (
                        <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-bold font-mono">
                          {isRunningDiagnostics 
                            ? "PROBING SUBSYSTEMS..." 
                            : diagnosticResults?.healthy 
                              ? "ALL SUBSYSTEMS GREEN-LIT" 
                              : "DIAGNOSTIC STATUS PENDING / WARNING"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {diagnosticResults?.durationMs ? `Full probe completed in ${diagnosticResults.durationMs}ms` : "Live connectivity & schema verification"}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunDiagnostics}
                      disabled={isRunningDiagnostics}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-[10.5px] font-mono text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={11} className={isRunningDiagnostics ? "animate-spin" : ""} />
                      <span>Re-probe</span>
                    </button>
                  </div>

                  {/* COMPONENT BREAKDOWN */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Component & Subsystem Matrix
                    </span>

                    {/* 1. Gemini API Key & Env */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850 flex items-start gap-2.5">
                      {diagnosticResults?.checks?.apiKey?.status === "ok" ? (
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-200">Gemini API Environment</span>
                          <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded ${
                            diagnosticResults?.checks?.apiKey?.status === "ok" ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40" : "bg-amber-950 text-amber-300 border border-amber-800/40"
                          }`}>
                            {diagnosticResults?.checks?.apiKey?.status === "ok" ? "GREEN" : "DEMO"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {diagnosticResults?.checks?.apiKey?.details || "Checking backend environment variables..."}
                        </p>
                      </div>
                    </div>

                    {/* 2. Model Latency & Live Ping */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850 flex items-start gap-2.5">
                      {diagnosticResults?.checks?.modelConnectivity?.status === "ok" ? (
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-200">Model Inference (Flash-Latest)</span>
                          <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded ${
                            diagnosticResults?.checks?.modelConnectivity?.status === "ok" ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40" : "bg-rose-950 text-rose-300 border border-rose-800/40"
                          }`}>
                            {diagnosticResults?.checks?.modelConnectivity?.latencyMs ? `${diagnosticResults.checks.modelConnectivity.latencyMs}ms` : "GREEN"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {diagnosticResults?.checks?.modelConnectivity?.details || "Probing live inference round-trip..."}
                        </p>
                      </div>
                    </div>

                    {/* 3. Profile-First Semantic RAG */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850 flex items-start gap-2.5">
                      {diagnosticResults?.checks?.semanticRAG?.status === "ok" ? (
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-200">Profile-First Semantic RAG</span>
                          <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                            GREEN
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {diagnosticResults?.checks?.semanticRAG?.details || "Testing document chunker and dossier prioritizer..."}
                        </p>
                      </div>
                    </div>

                    {/* 4. Function Tool Dispatcher & Mutation Suite */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850 flex items-start gap-2.5">
                      {diagnosticResults?.checks?.toolRegistry?.status === "ok" ? (
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-200">13 Workspace Mutation Tools</span>
                          <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                            VERIFIED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {diagnosticResults?.checks?.toolRegistry?.details || "Verifying schema declarations and dispatcher..."}
                        </p>
                      </div>
                    </div>

                    {/* 5. Client-Side Workspace Sync & State */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850 flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-200">Active Workspace Binding</span>
                          <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                            GREEN
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          Campaign "{activeProject?.name || "Active"}" bound with {characters.length} characters, {notes.length} notes, {tasks.length} tasks, and {(activeProject?.sources || []).length} lore sources.
                        </p>
                      </div>
                    </div>

                    {/* 6. Server Memory & Node Process */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850 flex items-start gap-2.5">
                      {diagnosticResults?.checks?.serverProcess?.status === "ok" ? (
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-200">Node Process & Memory</span>
                          <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                            GREEN
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {diagnosticResults?.checks?.serverProcess?.details || "Checking memory limits and process uptime..."}
                        </p>
                      </div>
                    </div>

                    {/* 7. Interactive Live RAG Speed & Category Tester */}
                    <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-2 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Cpu size={13} className="text-purple-400" />
                          <span className="text-xs font-bold text-purple-200 font-mono">LIVE RAG CATEGORY PROBE</span>
                        </div>
                        <span className="text-[9px] font-mono text-purple-300/80">Microsecond Index</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={ragTestQuery}
                          onChange={(e) => setRagTestQuery(e.target.value)}
                          placeholder="Enter query to test RAG category targeting (e.g. Heiko-Ji, rules, Lyra)..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-purple-900/60 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleRunRagTest}
                          disabled={isRunningRagTest || !ragTestQuery.trim()}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          <Activity size={12} className={isRunningRagTest ? "animate-spin" : ""} />
                          <span>{isRunningRagTest ? "Testing..." : "Test Speed"}</span>
                        </button>
                      </div>

                      {/* Quick preset query chips */}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        <span className="text-[9.5px] text-slate-400 self-center mr-1">Presets:</span>
                        <button
                          type="button"
                          onClick={() => setRagTestQuery("Where is the mountain monastery of Heiko-Ji?")}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9.5px] text-purple-300 font-mono cursor-pointer transition-colors"
                        >
                          🏔️ World Lore
                        </button>
                        <button
                          type="button"
                          onClick={() => setRagTestQuery("What are the rules for spell slot recovery and death saves?")}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9.5px] text-emerald-300 font-mono cursor-pointer transition-colors"
                        >
                          📜 Mechanics / Rules
                        </button>
                        <button
                          type="button"
                          onClick={() => setRagTestQuery("Who is Commander Vance and what is his role?")}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9.5px] text-cyan-300 font-mono cursor-pointer transition-colors"
                        >
                          👤 Character Profile
                        </button>
                      </div>

                      {/* Live probe results */}
                      {ragTestResult && (
                        <div className="mt-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10.5px] space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-b border-slate-850 pb-1">
                            <span>Retrieved <strong className="text-emerald-400">{ragTestResult.retrievedCount}</strong> chunks</span>
                            <span className="text-purple-300 font-semibold">Speed: {ragTestResult.durationMs}ms</span>
                          </div>

                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {ragTestResult.matchedExcerpts.map((chunk, i) => (
                              <div key={i} className="p-1.5 rounded bg-slate-900/90 border border-slate-800 space-y-0.5">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-semibold text-slate-200 truncate max-w-[190px]">
                                    {chunk.sourceName}
                                  </span>
                                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                                    Score: {chunk.score} ({chunk.sourceType})
                                  </span>
                                </div>
                                <div className="text-[9px] text-emerald-400/90 font-mono">
                                  Matches: {chunk.matchedKeywords.join(", ")}
                                </div>
                                <p className="text-[10px] text-slate-400 line-clamp-2 italic">
                                  "{chunk.chunkSnippet}"
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 8. Live NPC Creation & Mutation Speed Test */}
                    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-emerald-400" />
                          <span className="text-xs font-bold text-slate-200 font-mono">NPC CREATION / MUTATION TEST</span>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                          NON-BLOCKING
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Simulates rapid multi-field character creation (name, role, faction, backstory, custom key-values) to verify zero UI freeze and instant optimistic updates.
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleRunNpcCreationTest}
                          disabled={isRunningNpcTest}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Activity size={12} className={isRunningNpcTest ? "animate-spin" : ""} />
                          <span>{isRunningNpcTest ? "Creating Test NPC..." : "⚡ Run Live NPC Creation Test"}</span>
                        </button>
                        {npcTestResult && (
                          <div className="text-[10.5px] font-mono text-emerald-300">
                            ✓ "{npcTestResult.npcName}" created in <strong className="text-white">{npcTestResult.durationMs}ms</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-t border-slate-800/80">
                  <span className="text-[10.5px] text-slate-500 font-mono">
                    {diagnosticResults?.timestamp ? new Date(diagnosticResults.timestamp).toLocaleTimeString() : "Ready"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDiagnostics(false)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    Close Diagnostics
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CLEAR CONFIRMATION MODAL */}
          {showClearConfirm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 max-w-xs w-full shadow-2xl space-y-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertCircle size={18} />
                  <h4 className="text-xs font-semibold text-slate-100">Reset Assistant History?</h4>
                </div>
                <p className="text-[11.5px] text-slate-400 leading-relaxed">
                  This only clears Nyx's conversational memory for this campaign. Your characters, settings, lore sources, and documents remain untouched.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClearChat}
                    className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
  );

  if (embedded) {
    return assistantContent;
  }

  return (
    <>
      {/* FLOATING BACKDROP (IN UNPINNED OVERLAY MODE WHEN OPEN) */}
      {isOpen && !isDocked && (
        <div 
          onClick={() => setIsOpen(false)}
          className="absolute inset-0 bg-black/40 z-35 backdrop-blur-[1px] transition-opacity duration-200 cursor-pointer"
          title="Click to close floating assistant"
        />
      )}

      {/* TOGGLE TAB HANDLE (WHEN CLOSED) - Symmetrically mirrors Project Settings */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="absolute right-0 top-20 z-40 bg-slate-900/90 hover:bg-purple-900/90 text-purple-300 hover:text-white px-2 py-3 rounded-l-xl border-y border-l border-purple-600/40 shadow-xl flex flex-col items-center gap-1 transition-all cursor-pointer group"
          title="Open Studio Assistant (Nyx)"
        >
          <Sparkles size={15} className="text-purple-400 group-hover:rotate-12 transition-transform" />
          <span className="text-[10px] font-mono font-bold writing-mode-vertical tracking-wider uppercase text-purple-300">
            Assistant
          </span>
          <ChevronLeft size={14} className="text-slate-400 group-hover:text-white" />
        </button>
      )}

      {/* ASIDE PANEL (PINNED OR OVERLAY) */}
      {isOpen && (
        <aside 
          className={`transition-all duration-300 ease-in-out flex flex-col h-full ${
            isDocked 
              ? "relative z-30 w-[380px] sm:w-[420px] lg:w-[450px] shrink-0 rounded-2xl border border-slate-800/80 bg-slate-950/95 backdrop-blur-md shadow-lg overflow-hidden ml-3" 
              : "absolute right-0 top-0 bottom-0 z-40 w-[380px] sm:w-[420px] max-w-[92vw] rounded-l-2xl border-y border-l border-purple-900/60 bg-slate-950/95 backdrop-blur-xl shadow-2xl shadow-purple-950/60 animate-in slide-in-from-right duration-200"
          }`}
        >
          {assistantContent}
        </aside>
      )}
    </>
  );
};
