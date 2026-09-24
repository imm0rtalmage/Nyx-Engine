import React, { useState, useRef, useEffect, useCallback } from "react";
import { Message, Project, CharacterProfile, RelationshipTrack, LoreSource, DEFAULT_INITIAL_PROJECT } from "../types";
import { LoreSourceStatusBadge, getSourceProcessingState } from "./LoreSourceStatusBadge";
import { safeLocalStorage, loadProjectMessagesSafely } from "../App";
import { 
  Send, Edit3, Trash2, HelpCircle, RefreshCw, ChevronLeft, 
  ChevronRight, Brain, Sparkles, Check, X, AlertTriangle, ListFilter,
  Users, Palette, Layout, Upload, Image as ImageIcon, Sparkle, UserPlus,
  ArrowLeftRight, CheckCircle2, Camera, FileText, Download,
  Paperclip, FolderOpen, Clock, Eye, EyeOff, ClipboardList,
  User, Ghost, Scroll, MapPin, Rocket, Shield, Flag, Lock, Unlock, XCircle, Heart,
  Maximize2, Minimize2, Copy, ChevronDown, ChevronUp, Sliders, Type, Save,
  Bold, Italic, Code as CodeIcon, Quote, List as ListIcon, BookOpen, Square, Loader2, Plus, Zap, Info, Layers, Database, Coins, Globe,
  Pin, SlidersHorizontal
} from "lucide-react";
import { THEME_PRESETS, CHAT_BG_PRESETS, BUBBLE_STYLE_PRESETS } from "../utils/themes";
import ThematicDashboardBanner, { getDynamicArchetype } from "./ThematicDashboardBanner";
import ChatMessageMarkdown from "./ChatMessageMarkdown";
import MessageItem from "./MessageItem";
import MessageErrorBoundary from "./MessageErrorBoundary";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import { listGoogleDocs, fetchGoogleFile } from "../utils/googleWorkspace";
import { GooglePickerButton } from "./GooglePickerButton";
import { SaveToDrivePickerModal } from "./SaveToDrivePickerModal";
import { ContextHUDModal } from "./ContextHUDModal";
import { AuthorStyleModal } from "./AuthorStyleModal";
import { computeGranularLoreContext } from "../lib/nyxLoreEngine";
import { useFunnyLoading, triggerNextLoreFact } from "../utils/useFunnyLoading";
import { LoreCodexModal } from "./LoreCodexModal";
import { TokenBreakdownModal } from "./TokenBreakdownModal";
import { CanonDeltaStudioModal } from "./CanonDeltaStudioModal";
import { safeFetchJson } from "../utils/apiClient";

export const NARRATIVE_FONT_SIZES: Record<string, { label: string; class: string; short: string; px: string }> = {
  xs: { label: "Compact", class: "text-xs leading-relaxed", short: "12px", px: "12px" },
  sm: { label: "Normal", class: "text-sm leading-relaxed", short: "14px", px: "14px" },
  base: { label: "Medium", class: "text-base leading-relaxed", short: "16px", px: "16px" },
  lg: { label: "Large", class: "text-lg leading-relaxed", short: "18px", px: "18px" },
  xl: { label: "X-Large", class: "text-xl leading-relaxed", short: "20px", px: "20px" },
  "2xl": { label: "Jumbo", class: "text-2xl leading-relaxed", short: "24px", px: "24px" },
};
export const FONT_SIZE_KEYS = ["xs", "sm", "base", "lg", "xl", "2xl"];

interface WorkspaceFile {
  id: string;
  name: string;
  size: string;
  folder: string;
  lastModified: string;
  text: string;
  fileBase64?: string;
  fileMimeType?: string;
  isRealDoc?: boolean;
}

interface AdventureChatProps {
  project: Project;
  messages: Message[];
  characters: CharacterProfile[];
  onSendMessage: (text: string, thinkingLevel: string, attachments?: any[]) => Promise<void>;
  onRegenerateResponse: (thinkingLevel: string, targetMessageId?: string) => Promise<void>;
  onSelectMessageVersion?: (messageId: string, versionIndex: number) => void;
  onEditMessage: (id: string, newContent: string) => void;
  onDeleteMessage: (id: string) => void;
  onUpdateNickname: (name: string) => void;
  isGenerating: boolean;
  onStopGeneration?: () => void;
  onClearChat: () => void;
  onSetProjectValue: (key: string, val: any) => void;
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
    linkedLoreIds?: string[],
    isInScene?: boolean,
    activationKeys?: string[]
  ) => void;
  onDeleteCharacter: (id: string) => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterProfile>) => void;
  googleToken?: string | null;
  onGoogleSignIn?: () => Promise<string | undefined> | void;
  onClearGoogleToken?: () => void;
  onShowToast?: (title: string, description: string, type?: "success" | "error" | "info") => void;
  setActiveTab?: (tab: "chat" | "editor" | "workspace") => void;
  navigationTarget?: any;
  isCinemaMode?: boolean;
  onToggleCinemaMode?: () => void;
  onOpenStoryArchives?: () => void;
  isMobileLite?: boolean;
}

const LORE_CUSTOM_FIELDS: Record<string, string[]> = {
  pc: [
    "Physical Profile & Metrics",
    "Cyber-Handles & Digital Identity",
    "Biological Mutations & Senses",
    "Supernatural Powers & Limits",
    "Suit Design & Costume",
    "Armor & Weapons Specs",
    "Infiltration & Utility Rig",
    "Specialized Combat & Technical Skills",
    "Backstory & Mentors",
    "Relationship Matrix & Milestones"
  ],
  npc: [
    "Physical Profile & Manifestation",
    "Behavioral Framework & Personality Protocols",
    "Combat Protocols & Systems Control",
    "Backstory & Origins",
    "Abilities & Skills",
    "Weaknesses",
    "Linguistic Patterns & Dialogue Samples",
    "Relationship Matrix & Milestones"
  ],
  chronicle: [
    "Date / Timeline",
    "Key Figures",
    "Outcomes & Consequences",
    "Location",
    "Chronological Milestones & Discoveries",
    "First-Time Narrative Uses (The Log)",
    "Episode Architecture & Story Phase Log",
    "Sensory Palette & Environmental Cues"
  ],
  location: [
    "Geography & Climate",
    "Inhabitants & Species",
    "Primary Hazards",
    "Points of Interest",
    "Defense / Security Level",
    "Communal Logistics & Infrastructure",
    "Aesthetic Vibe & Sensory Palette"
  ],
  vehicle: [
    "Model & Class",
    "Manufacturer",
    "Speed & Propulsion",
    "Crew Capacity",
    "Armament & Shields",
    "Cargo Capacity",
    "Technical Origin & Frame Integration",
    "Emission Shunt & Projection Core",
    "Stowed Cargo & Compartments",
    "Autonomous Systems & Controls Override"
  ],
  equipment: [
    "Classification & Type",
    "Manufacturer",
    "Damage / Defense Specs",
    "Ammo Type / Energy Source",
    "Rarity & Legal Status",
    "Weight & Portability",
    "Inscriptions & Engravings",
    "Physical Design & Aesthetic Details",
    "Specialized Structural Ports & Slots",
    "Mounting & Deployment Mechanism",
    "Electronics & Utility Modules",
    "Medical & Protective Attributes"
  ],
  faction: [
    "Ideology & Core Beliefs",
    "Headquarters / My Base",
    "Size & Military Scale",
    "Leaders & Key Contacts",
    "Resources & Influence",
    "Allies & Rivals",
    "Unifying Creed & Philosophy",
    "Mentors, Teachers & Partners",
    "Logistics & External Communication"
  ]
};

export const getSettingSpecificDefaultFields = (type: string, setting: string = ""): string[] => {
  const normSetting = (setting || "").toLowerCase();
  
  // 1. STAR WARS SPECIFIC (Explicitly checks for Star Wars/Jedi terms)
  if (normSetting.includes("star wars") || normSetting.includes("starwars") || normSetting.includes("jedi") || normSetting.includes("sith") || normSetting.includes("yavin")) {
    if (type === "pc" || type === "npc") {
      return [
        "Species / Subspecies",
        "Alliance & Affiliation",
        "Obligation / Bounty / Debt",
        "Force Sensitivity & Lightsaber Style",
        "Weapons & Gear Layout",
        "Starship & Pilot Specs"
      ];
    }
    if (type === "vehicle") {
      return [
        "Model & Manufacturer",
        "Hyperdrive Rating & Engines",
        "Weapons Array & Shielding",
        "Cargo Capacity & Passengers",
        "Famous Pilots & Crew"
      ];
    }
    if (type === "location") {
      return [
        "Coordinates / Sector / Planet",
        "Atmosphere & Gravity",
        "Dominant Species & Factions",
        "Points of Interest",
        "System Authority & Law Level"
      ];
    }
    if (type === "faction") {
      return [
        "HQ & Operational Sector",
        "Primary Resources & Fleets",
        "Leader & High Command",
        "Ideology & Secret Goals"
      ];
    }
    if (type === "equipment") {
      return [
        "Manufacturer & Rarity",
        "Power Cell / Ammunition",
        "Targeting & Upgrades",
        "Illegal Mods & Tech Hacks"
      ];
    }
    if (type === "chronicle") {
      return [
        "Galactic Standard Date",
        "Sectors / Worlds Impacted",
        "Key Historical Figures",
        "Outcomes & Consequences"
      ];
    }
  }

  // 2. CYBERPUNK / SYNTHWAVE
  if (normSetting.includes("cyberpunk") || normSetting.includes("synthwave") || normSetting.includes("neon") || normSetting.includes("corporate") || normSetting.includes("netrunner")) {
    if (type === "pc" || type === "npc") {
      return [
        "Street Alias / Cyber-Handle",
        "Cyberware & Neural Implants",
        "Street Cred & Reputation",
        "Corporate Debt & Backers",
        "Combat Deck & Programs",
        "Primary Weapons & Armor"
      ];
    }
    if (type === "vehicle") {
      return [
        "Chassis Model & Manufacturer",
        "Autopilot / AI Core",
        "Armor plating & ECM suite",
        "Nitro & Engine Overclocks"
      ];
    }
    if (type === "location") {
      return [
        "District & Safety Rating (Zone)",
        "Corporate Control Status",
        "Underground Markets & Ripperdocs",
        "Key Grid/Subnet Nodes"
      ];
    }
    if (type === "faction") {
      return [
        "Megacorp division / Gang turf",
        "Primary Net Access Ports",
        "CEO / Gang Leader",
        "Corporate Assets & Hit Squads"
      ];
    }
    if (type === "equipment") {
      return [
        "Black Market value / Illegality",
        "Neural Interface specs",
        "Firmware & Hack-slots",
        "Battery & Recharge protocols"
      ];
    }
    if (type === "chronicle") {
      return [
        "Timestamp / Grid Calendar Year",
        "Corporate or Street Sectors Impacted",
        "Key Infiltrators & Actors",
        "Outcomes & Consequences"
      ];
    }
  }

  // 3. SUPERHERO / MUTANTS
  if (normSetting.includes("superhero") || normSetting.includes("comics") || normSetting.includes("marvel") || normSetting.includes("dc") || normSetting.includes("mutant") || normSetting.includes("powers")) {
    if (type === "pc" || type === "npc") {
      return [
        "Real Name & Superhero Alias",
        "Superhero Powers & Abilities",
        "Source of Powers (Origin)",
        "Weaknesses & Vulnerabilities",
        "Team Affiliation (e.g. Avengers)",
        "Base of Operations & Secret Identity status"
      ];
    }
    if (type === "vehicle") {
      return [
        "Model & Gadgets/Weapons",
        "Armor & Stealth Capabilities",
        "Propulsion & Speed Specs",
        "Remote Controls & AI Link"
      ];
    }
    if (type === "location") {
      return [
        "City & Neighborhood",
        "Threat Level & Supervillain Activity",
        "Underground Bases / Hideouts",
        "Famous Landmarks"
      ];
    }
    if (type === "faction") {
      return [
        "Alliance Name / Syndicate",
        "HQ Location",
        "Primary Leader & Elite Members",
        "Public Reputation & Agenda"
      ];
    }
    if (type === "equipment") {
      return [
        "Item Type & Unique Properties",
        "Power Source / Charges",
        "Specialized Combat Functions",
        "Creator / Origin Story"
      ];
    }
    if (type === "chronicle") {
      return [
        "Episode / Issue Number",
        "Involved Heroes & Villains",
        "Collateral Damage & Public Reaction",
        "Aftermath & Plot Hooks"
      ];
    }
  }
  
  // 4. FANTASY / FORGOTTEN REALMS / DND
  if (normSetting.includes("faerun") || normSetting.includes("dnd") || normSetting.includes("d&d") || normSetting.includes("fantasy") || normSetting.includes("realms") || normSetting.includes("magic") || normSetting.includes("elder scrolls") || normSetting.includes("skyrim") || normSetting.includes("pathfinder")) {
    if (type === "pc" || type === "npc") {
      return [
        "Race & Subrace",
        "Class & Subclass (e.g. Assassin, Wizard)",
        "Spellcasting & Cantrips",
        "Patron Deity or Guild",
        "Stat Highlights (STR/DEX/INT etc)",
        "Magical Items & Attunement"
      ];
    }
    if (type === "vehicle") {
      return [
        "Propulsion (Sails, Oars, Magic)",
        "Armored Hull & Cannons",
        "Crew Capacity & Rations",
        "Magical Upgrades & Flight speed"
      ];
    }
    if (type === "location") {
      return [
        "Region / Realm / Plane",
        "Local Ruling Noble / Lord",
        "Deities Worshiped",
        "Taverns & Points of Interest",
        "Active Dangers & Monsters"
      ];
    }
    if (type === "faction") {
      return [
        "Seat of Power & Guildhalls",
        "Influence & Notoriety",
        "Grand Master / Leader",
        "Allies, Rival Guilds & Operations"
      ];
    }
    if (type === "equipment") {
      return [
        "Item Type & Attunement Requirement",
        "Spells Stored / Charges",
        "Weight & Material (Mithral, etc)",
        "Curse / Lore Backstory"
      ];
    }
    if (type === "chronicle") {
      return [
        "Era / Year of the Campaign",
        "Realms Affected",
        "Key Historical Figures",
        "Outcomes & Consequences"
      ];
    }
  }

  // 5. GENERAL SCI-FI / FUTURE / SPACE (Fallback for other sci-fi)
  if (normSetting.includes("sci-fi") || normSetting.includes("space") || normSetting.includes("galaxy") || normSetting.includes("stellar") || normSetting.includes("trek") || normSetting.includes("mass effect") || normSetting.includes("scifi")) {
    if (type === "pc" || type === "npc") {
      return [
        "Species / Subspecies",
        "System Affiliation & Rank",
        "Augmentations & Enhancements",
        "Primary Tech & Weapons Loadout",
        "Spacefaring Licences & Debt"
      ];
    }
    if (type === "vehicle") {
      return [
        "Starship Class & Model",
        "Engine Specs & Warp/FSD Speed",
        "Weapons Array & Thermal Shields",
        "Cargo Bay & Ship's Crew"
      ];
    }
  }

  // Fallback to beautiful general-purpose lore fields from LORE_CUSTOM_FIELDS
  return LORE_CUSTOM_FIELDS[type] || [];
};

export default function AdventureChat({
  project,
  messages,
  characters,
  onSendMessage,
  onRegenerateResponse,
  onSelectMessageVersion,
  onEditMessage,
  onDeleteMessage,
  onUpdateNickname,
  isGenerating,
  onStopGeneration,
  onClearChat,
  onSetProjectValue,
  onAddCharacter,
  onDeleteCharacter,
  onUpdateCharacter,
  googleToken,
  onGoogleSignIn,
  onClearGoogleToken,
  onShowToast,
  setActiveTab,
  navigationTarget,
  isCinemaMode: isCinemaModeProp,
  onToggleCinemaMode,
  onOpenStoryArchives,
  isMobileLite = false,
}: AdventureChatProps) {
  const safeProject = project || DEFAULT_INITIAL_PROJECT;
  const projectId = safeProject.id || "default-campaign";

  const [isDragging, setIsDragging] = useState(false);
  const [inputText, setInputText] = useState(() => {
    try {
      return safeLocalStorage.getItem(`nyx_chat_draft_${projectId}`) || "";
    } catch {
      return "";
    }
  });

  const prevDraftProjectIdRef = useRef(projectId);

  // Restore/update draft state when switching active project
  useEffect(() => {
    if (prevDraftProjectIdRef.current !== projectId) {
      prevDraftProjectIdRef.current = projectId;
      try {
        const saved = safeLocalStorage.getItem(`nyx_chat_draft_${projectId}`) || "";
        setInputText(saved);
      } catch {
        setInputText("");
      }
    }
  }, [projectId]);

  // Debounced auto-save draft in safeLocalStorage whenever inputText changes for active project
  useEffect(() => {
    if (prevDraftProjectIdRef.current === projectId) {
      const timer = setTimeout(() => {
        try {
          if (inputText.trim()) {
            safeLocalStorage.setItem(`nyx_chat_draft_${projectId}`, inputText);
          } else {
            safeLocalStorage.removeItem(`nyx_chat_draft_${projectId}`);
          }
        } catch {}
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [inputText, projectId]);
  const [thinkingLevel, setThinkingLevel] = useState("Low");
  const [generatingElapsedSeconds, setGeneratingElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isGenerating) {
      setGeneratingElapsedSeconds(0);
      interval = setInterval(() => {
        setGeneratingElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setGeneratingElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(() => {
    if (isMobileLite) return false;
    try {
      const saved = safeLocalStorage.getItem("project_settings_open");
      return saved !== null ? saved === "true" : false;
    } catch {
      return false;
    }
  });

  const [isLeftPanelPinned, setIsLeftPanelPinned] = useState<boolean>(() => {
    try {
      const saved = safeLocalStorage.getItem("project_settings_pinned");
      return saved !== null ? saved === "true" : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      safeLocalStorage.setItem("project_settings_open", String(showLeftPanel));
    } catch (e) {
      console.warn("Failed to persist project_settings_open:", e);
    }
  }, [showLeftPanel]);

  useEffect(() => {
    try {
      safeLocalStorage.setItem("project_settings_pinned", String(isLeftPanelPinned));
    } catch (e) {
      console.warn("Failed to persist project_settings_pinned:", e);
    }
  }, [isLeftPanelPinned]);

  // Cinema focus mode to hide non-narrative sidebars and top headers
  const [localCinemaMode, setLocalCinemaMode] = useState(false);
  const cinemaMode = isCinemaModeProp !== undefined ? isCinemaModeProp : localCinemaMode;
  const [showPacingControls, setShowPacingControls] = useState(false);

  // Editable Adventure Log Header Title State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [customTitle, setCustomTitle] = useState(
    project.adventureLogTitle || project.name || "ADVENTURE LOG"
  );

  useEffect(() => {
    setCustomTitle(project.adventureLogTitle || project.name || "ADVENTURE LOG");
  }, [project.adventureLogTitle, project.name]);

  const handleSaveTitle = () => {
    const trimmed = customTitle.trim();
    const finalTitle = trimmed || project.name || "ADVENTURE LOG";
    onSetProjectValue("adventureLogTitle", finalTitle);
    setIsEditingTitle(false);
    onShowToast?.("Adventure Log Title", `Updated to "${finalTitle}"`, "success");
  };

  const currentFontSizeKey = project.narrativeFontSize || "xs";
  const currentFontSizeObj = NARRATIVE_FONT_SIZES[currentFontSizeKey] || NARRATIVE_FONT_SIZES["xs"];

  const handleStepFontSize = (delta: -1 | 1) => {
    const currentIndex = FONT_SIZE_KEYS.indexOf(currentFontSizeKey);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const newIndex = Math.max(0, Math.min(FONT_SIZE_KEYS.length - 1, safeIndex + delta));
    const newKey = FONT_SIZE_KEYS[newIndex];
    if (newKey !== currentFontSizeKey) {
      onSetProjectValue("narrativeFontSize", newKey);
      onShowToast?.(
        "Text Size Updated",
        `Narrative font size set to ${NARRATIVE_FONT_SIZES[newKey].label} (${NARRATIVE_FONT_SIZES[newKey].px})`,
        "info"
      );
    }
  };

  const handleToggleCinemaMode = () => {
    const next = !cinemaMode;
    if (onToggleCinemaMode) {
      onToggleCinemaMode();
    } else {
      setLocalCinemaMode(next);
    }
    if (next) {
      setShowLeftPanel(false);
    } else {
      setShowLeftPanel(true);
    }
  };

  const formatMsgTimestamp = (ts?: string) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) {
        return ts;
      }
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts || "";
    }
  };

  // --- LOCAL WORLD SETTINGS STATES & DEBOUNCED SYNCING TO AVOID FIRESTORE TYPING LAG ---
  const [showSaveDrivePickerModal, setShowSaveDrivePickerModal] = useState(false);
  const [showAuthorStyleModal, setShowAuthorStyleModal] = useState(false);
  const [showSparkExportModal, setShowSparkExportModal] = useState(false);
  const [sparkThreadTitle, setSparkThreadTitle] = useState(`${project.name} - Thread Log ${new Date().toLocaleDateString()}`);
  const [isSparkExporting, setIsSparkExporting] = useState(false);

  // --- NARRATIVE INPUT EXPANSION & AUTO-RESIZE STATES ---
  const [isExpandedInput, setIsExpandedInput] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const expandedInputRef = useRef<HTMLTextAreaElement>(null);

  // Markdown formatting insertion helper
  const handleInsertMarkdown = (
    format: "bold" | "italic" | "code" | "codeblock" | "quote" | "list" | "ooc" | "dialogue",
    targetRef?: React.RefObject<HTMLTextAreaElement | null>
  ) => {
    const el = targetRef?.current || chatInputRef.current;
    if (!el) {
      switch (format) {
        case "bold": setInputText(prev => prev + "**bold text**"); break;
        case "italic": setInputText(prev => prev + "*italic text*"); break;
        case "code": setInputText(prev => prev + "`code`"); break;
        case "codeblock": setInputText(prev => prev + (prev && !prev.endsWith("\n") ? "\n" : "") + "```\ncode block\n```\n"); break;
        case "quote": setInputText(prev => prev + (prev && !prev.endsWith("\n") ? "\n" : "") + "> quote"); break;
        case "list": setInputText(prev => prev + (prev && !prev.endsWith("\n") ? "\n" : "") + "- list item"); break;
        case "ooc": setInputText(prev => prev + (prev && !prev.endsWith(" ") ? " " : "") + "[OOC: note]"); break;
        case "dialogue": setInputText(prev => prev + (prev && !prev.endsWith(" ") ? " " : "") + '"dialogue"'); break;
      }
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = el.value.substring(start, end);
    let replacement = "";
    let cursorOffset = 0;

    switch (format) {
      case "bold":
        replacement = selectedText ? `**${selectedText}**` : "**bold text**";
        cursorOffset = selectedText ? replacement.length : 2;
        break;
      case "italic":
        replacement = selectedText ? `*${selectedText}*` : "*italic text*";
        cursorOffset = selectedText ? replacement.length : 1;
        break;
      case "code":
        replacement = selectedText ? `\`${selectedText}\`` : "`code`";
        cursorOffset = selectedText ? replacement.length : 1;
        break;
      case "codeblock":
        replacement = selectedText ? `\`\`\`\n${selectedText}\n\`\`\`\n` : "```\ncode block\n```\n";
        cursorOffset = selectedText ? replacement.length : 4;
        break;
      case "quote":
        replacement = selectedText ? `> ${selectedText}\n` : "> quote\n";
        cursorOffset = selectedText ? replacement.length : 2;
        break;
      case "list":
        replacement = selectedText ? `- ${selectedText}\n` : "- list item\n";
        cursorOffset = selectedText ? replacement.length : 2;
        break;
      case "ooc":
        replacement = selectedText ? `[OOC: ${selectedText}]` : "[OOC: note]";
        cursorOffset = selectedText ? replacement.length : 6;
        break;
      case "dialogue":
        replacement = selectedText ? `"${selectedText}"` : '"dialogue"';
        cursorOffset = selectedText ? replacement.length : 1;
        break;
    }

    const updated = el.value.substring(0, start) + replacement + el.value.substring(end);
    setInputText(updated);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + cursorOffset, start + cursorOffset + (selectedText ? 0 : replacement.length - (cursorOffset * 2 > replacement.length ? 0 : cursorOffset * 2)));
    }, 10);
  };

  // Auto-reset height on input clear
  useEffect(() => {
    if (!inputText && chatInputRef.current) {
      chatInputRef.current.style.height = "auto";
    }
  }, [inputText]);

  const handleDumpToSparkArchive = async () => {
    if (!messages || messages.length === 0) {
      onShowToast?.("Log Empty", "There are no messages in the active log to dump.", "error");
      return;
    }
    setIsSparkExporting(true);
    try {
      let currentToken = googleToken;
      if (!currentToken && onGoogleSignIn) {
        currentToken = (await onGoogleSignIn()) || null;
      }
      const transcriptText = messages.map(m => `[${m.role.toUpperCase()} - ${formatMsgTimestamp(m.timestamp)}]:\n${m.content}`).join("\n\n---\n\n");
      let data: any;
      try {
        data = await safeFetchJson<any>("/api/spark/export-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: currentToken || "",
            projectId: project.id,
            threadTitle: sparkThreadTitle,
            transcriptText
          }),
          timeout: 90000
        });
      } catch (exportErr: any) {
        data = { success: false, error: exportErr.message };
      }

      if (!data || !data.success) {
        if (data?.isAuthError) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("nyx_google_auth_expired"));
          }
          if (onGoogleSignIn) {
            onShowToast?.("Re-authenticating...", "Google Drive token expired. Opening Google Sign In...", "info");
            const refreshedToken = await onGoogleSignIn();
            if (refreshedToken) {
              const retryData = await safeFetchJson<any>("/api/spark/export-thread", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token: refreshedToken,
                  projectId: project.id,
                  threadTitle: sparkThreadTitle,
                  transcriptText
                }),
                timeout: 90000
              });
              if (retryData && retryData.success) {
                if (retryData.rawThreadsFolderId) {
                  onSetProjectValue("sparkRawThreadsFolderId", retryData.rawThreadsFolderId);
                }
                setShowSparkExportModal(false);
                onShowToast?.("✨ Spark Archive Ingested!", "Thread sent to Spark Archivist! Background lore parsing is active in Drive.", "success");
                return;
              }
            }
          }
        }
        throw new Error(data?.error || "Failed to export thread to Spark Archive");
      }
      if (data.rawThreadsFolderId) {
        onSetProjectValue("sparkRawThreadsFolderId", data.rawThreadsFolderId);
      }
      setShowSparkExportModal(false);
      onShowToast?.("✨ Spark Archive Ingested!", "Thread sent to Spark Archivist! Background lore parsing is active in Drive.", "success");
    } catch (err: any) {
      console.error("Spark Dump error:", err);
      onShowToast?.("Spark Export Error", err.message || "Failed to send thread to Spark Archive.", "error");
    } finally {
      setIsSparkExporting(false);
    }
  };
  const [formFields, setFormFields] = useState({
    name: project.name || "",
    userNickname: project.userNickname || "",
    setting: project.setting || "",
    emotionalTone: project.emotionalTone || "",
    pacing: project.pacing || "",
    turnHeader: project.turnHeader || "",
    plotOverview: project.plotOverview || "",
    persistentContext: project.persistentContext || "",
    creatorNames: project.creatorNames || "",
    customInstructions: project.customInstructions || "",
    styleGuide: project.styleGuide || "",
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleFieldChange = (field: keyof typeof formFields, value: string) => {
    setFormFields(prev => ({ ...prev, [field]: value }));
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (field === "userNickname" && onUpdateNickname) {
        onUpdateNickname(value);
      } else {
        onSetProjectValue(field, value);
      }
    }, 600);
  };

  const localName = formFields.name;
  const localNickname = formFields.userNickname;
  const localSetting = formFields.setting;
  const localPlotOverview = formFields.plotOverview;
  const localPersistentContext = formFields.persistentContext;
  const localCreatorNames = formFields.creatorNames;
  const localCustomInstructions = formFields.customInstructions;
  const localStyleGuide = formFields.styleGuide;
  const localMood = formFields.emotionalTone;
  const localPacing = formFields.pacing;
  const localTurnHeader = formFields.turnHeader;

  const setLocalName = (v: string) => handleFieldChange("name", v);
  const setLocalNickname = (v: string) => handleFieldChange("userNickname", v);
  const setLocalSetting = (v: string) => handleFieldChange("setting", v);
  const setLocalPlotOverview = (v: string) => handleFieldChange("plotOverview", v);
  const setLocalPersistentContext = (v: string) => handleFieldChange("persistentContext", v);
  const setLocalCreatorNames = (v: string) => handleFieldChange("creatorNames", v);
  const setLocalCustomInstructions = (v: string) => handleFieldChange("customInstructions", v);
  const setLocalStyleGuide = (v: string) => handleFieldChange("styleGuide", v);
  const setLocalMood = (v: string) => handleFieldChange("emotionalTone", v);
  const setLocalPacing = (v: string) => handleFieldChange("pacing", v);
  const setLocalTurnHeader = (v: string) => handleFieldChange("turnHeader", v);

  const activeSettingResolved = localSetting || project.setting || "";
  const funnyLoadingText = useFunnyLoading(
    isGenerating,
    "Nyx is writing scene narration...",
    7500,
    {
      project: { ...project, setting: activeSettingResolved },
      characters,
      setting: activeSettingResolved,
      activeSetting: activeSettingResolved
    }
  );

  const [isLoreCodexOpen, setIsLoreCodexOpen] = useState(false);
  const [tokenBreakdownTarget, setTokenBreakdownTarget] = useState<{
    msg: Message;
    index: number;
  } | null>(null);

  // --- EXPANDED WORLD SETTINGS MODAL & INLINE EXPAND STATE ---
  const [expandedModalField, setExpandedModalField] = useState<{
    id: string;
    title: string;
    description?: string;
    badge?: string;
  } | null>(null);

  const [expandedInlineRows, setExpandedInlineRows] = useState<Record<string, boolean>>({});

  const toggleInlineRows = (fieldId: string) => {
    setExpandedInlineRows(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const getExpandedFieldValue = (id: string): string => {
    if (id === "setting") return localSetting;
    if (id === "plotOverview") return localPlotOverview;
    if (id === "persistentContext") return localPersistentContext;
    if (id === "creatorNames") return localCreatorNames;
    if (id === "customInstructions") return localCustomInstructions;
    if (id === "styleGuide") return localStyleGuide;
    if (id === "emotionalTone" || id === "mood") return localMood;
    if (id === "pacing") return localPacing;
    if (id === "turnHeader") return localTurnHeader;
    if (id.startsWith("char-desc")) return editDesc;
    if (id.startsWith("char-rel")) return editRelationships;
    if (id.startsWith("char-sig")) return editSignatureItems;
    if (id.startsWith("char-backstory")) return editBackstory;
    return "";
  };

  const setExpandedFieldValue = (id: string, val: string) => {
    if (id === "setting") {
      setLocalSetting(val);
      setFocusedField("setting");
    } else if (id === "plotOverview") {
      setLocalPlotOverview(val);
      setFocusedField("plotOverview");
    } else if (id === "persistentContext") {
      setLocalPersistentContext(val);
      setFocusedField("persistentContext");
    } else if (id === "creatorNames") {
      setLocalCreatorNames(val);
      setFocusedField("creatorNames");
    } else if (id === "customInstructions") {
      setLocalCustomInstructions(val);
      setFocusedField("customInstructions");
    } else if (id === "styleGuide") {
      setLocalStyleGuide(val);
      setFocusedField("styleGuide");
    } else if (id === "emotionalTone" || id === "mood") {
      setLocalMood(val);
      setFocusedField("emotionalTone");
    } else if (id === "pacing") {
      setLocalPacing(val);
      setFocusedField("pacing");
    } else if (id === "turnHeader") {
      setLocalTurnHeader(val);
      setFocusedField("turnHeader");
    } else if (id.startsWith("char-desc")) {
      setEditDesc(val);
    } else if (id.startsWith("char-rel")) {
      setEditRelationships(val);
    } else if (id.startsWith("char-sig")) {
      setEditSignatureItems(val);
    } else if (id.startsWith("char-backstory")) {
      setEditBackstory(val);
    }
  };

  const handleCloseExpandedModal = () => {
    if (expandedModalField) {
      const fieldId = expandedModalField.id;
      if (["setting", "plotOverview", "persistentContext", "creatorNames", "customInstructions", "styleGuide", "emotionalTone", "mood", "pacing", "turnHeader"].includes(fieldId)) {
        const currentVal = getExpandedFieldValue(fieldId);
        handleFieldBlur(fieldId === "mood" ? "emotionalTone" : fieldId, currentVal);
      }
      setExpandedModalField(null);
    }
  };

  // Close modal or exit Cinema Mode on Escape / F11 key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (expandedModalField && e.key === "Escape") {
        handleCloseExpandedModal();
      } else if (e.key === "F11") {
        e.preventDefault();
        handleToggleCinemaMode();
      } else if (cinemaMode && e.key === "Escape" && !expandedModalField) {
        handleToggleCinemaMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedModalField, cinemaMode, onToggleCinemaMode]);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Full reset when project.id changes
  useEffect(() => {
    setFormFields({
      name: project.name || "",
      userNickname: project.userNickname || "",
      setting: project.setting || "",
      emotionalTone: project.emotionalTone || "",
      pacing: project.pacing || "",
      turnHeader: project.turnHeader || "",
      plotOverview: project.plotOverview || "",
      persistentContext: project.persistentContext || "",
      creatorNames: project.creatorNames || "",
      customInstructions: project.customInstructions || "",
      styleGuide: project.styleGuide || "",
    });
  }, [project.id]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Target item navigation handler from assistant actions
  useEffect(() => {
    if (!navigationTarget) return;

    const { targetTab, subType, targetKey, targetId, loreType } = navigationTarget;
    if (targetTab && targetTab !== "chat") return;

    if (subType === "world_setting") {
      setShowLeftPanel(true);
      setLeftTab("lore");
      if (targetKey) {
        setFocusedField(targetKey);
        setTimeout(() => {
          const el = document.getElementById(`setting-field-${targetKey}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.focus();
          }
        }, 150);
      }
    } else if (subType === "lore") {
      setShowLeftPanel(true);
      setLeftTab("cast");
      if (loreType && ["pc", "npc", "companion", "chronicle", "location", "vehicle", "equipment", "faction"].includes(loreType)) {
        setLoreTab(loreType as any);
      }
      if (targetId) {
        const found = characters.find(c => c.id === targetId || c.name.toLowerCase() === targetId.toLowerCase() || c.name.toLowerCase().includes(targetId.toLowerCase()));
        if (found) {
          if (found.type) setLoreTab(found.type as any);
          setExpandedEntityId(found.id);
          setTimeout(() => {
            const el = document.getElementById(`entity-card-${found.id}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 150);
        }
      }
    } else if (subType === "main_chat") {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  }, [navigationTarget]);

  const handleFieldBlur = (field: string, value: string) => {
    setFocusedField(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (field === "userNickname") {
      onUpdateNickname(value);
    } else {
      onSetProjectValue(field, value);
    }
  };

  // Column sizes (percentages)
  const [leftWidth, setLeftWidth] = useState(28); // %

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tabs for settings panel: lore, cast of characters
  const [leftTab, setLeftTab] = useState<"lore" | "cast">("lore");

  // New character creation state
  const [charName, setCharName] = useState("");
  const [charRole, setCharRole] = useState("Companion"); // e.g. Companion, Protagonist, Villain, NPC
  const [portraitType, setPortraitType] = useState<"url" | "upload">("upload");
  const [charUrl, setCharUrl] = useState("");
  const [charDesc, setCharDesc] = useState("");

  // Advanced fields for PC/NPC differentiation, Factions, Relationships
  const [charIsPC, setCharIsPC] = useState(false);
  const [charRelationships, setCharRelationships] = useState("");
  const [charFactionName, setCharFactionName] = useState("");
  const [charSignatureItems, setCharSignatureItems] = useState("");
  const [charBackstory, setCharBackstory] = useState("");
  const [charRomanceTracks, setCharRomanceTracks] = useState<RelationshipTrack[]>([]);
  const [charLinkedLoreIds, setCharLinkedLoreIds] = useState<string[]>([]);
  const [charIsMook, setCharIsMook] = useState(false);
  const [showRegisterActor, setShowRegisterActor] = useState(false); // Default to closed (advanced)
  const [loreTab, setLoreTab] = useState<"pc" | "npc" | "companion" | "chronicle" | "location" | "vehicle" | "equipment" | "faction">("pc");

  // Lore entity interaction states
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editRelationships, setEditRelationships] = useState("");
  const [editFactionName, setEditFactionName] = useState("");
  const [editSignatureItems, setEditSignatureItems] = useState("");
  const [editBackstory, setEditBackstory] = useState("");
  const [editRomanceTracks, setEditRomanceTracks] = useState<RelationshipTrack[]>([]);
  const [editLinkedLoreIds, setEditLinkedLoreIds] = useState<string[]>([]);
  const [editPortraitUrl, setEditPortraitUrl] = useState("");
  const [editPortraitType, setEditPortraitType] = useState<"url" | "upload">("upload");
  const [editType, setEditType] = useState<CharacterProfile["type"]>("companion");
  const [editIsInScene, setEditIsInScene] = useState<boolean>(false);
  const [editActivationKeys, setEditActivationKeys] = useState<string>("");
  const [charActivationKeys, setCharActivationKeys] = useState<string>("");

  // Category custom fields state
  const [manualCustomFields, setManualCustomFields] = useState<Record<string, string>>({});
  const [editCustomFields, setEditCustomFields] = useState<Record<string, string>>({});
  
  // Field locking states
  const [creationLockedFields, setCreationLockedFields] = useState<Record<string, boolean>>({});
  const [editingLockedFields, setEditingLockedFields] = useState<Record<string, boolean>>({});

  // Dynamic custom fields creation
  const [newFieldNameCreation, setNewFieldNameCreation] = useState("");

  // 2.0 Dynamic Sliding Context & Scene Roster state
  const [showContextHUDModal, setShowContextHUDModal] = useState(false);
  const [newFieldNameEditing, setNewFieldNameEditing] = useState("");

  // Relational/Romance tracking inputs
  const [newRelName, setNewRelName] = useState("");
  const [newRelStatus, setNewRelStatus] = useState("");
  const [newRelMilestones, setNewRelMilestones] = useState("");
  const [newRelOpenness, setNewRelOpenness] = useState("");

  const [editRelName, setEditRelName] = useState("");
  const [editRelStatus, setEditRelStatus] = useState("");
  const [editRelMilestones, setEditRelMilestones] = useState("");
  const [editRelOpenness, setEditRelOpenness] = useState("");

  // Granular Character Accuracy Breakdown state (edit mode)
  const [editAppearanceBuild, setEditAppearanceBuild] = useState("");
  const [editDistinguishingMarks, setEditDistinguishingMarks] = useState("");
  const [editAttireWardrobe, setEditAttireWardrobe] = useState("");
  const [editVoiceCadence, setEditVoiceCadence] = useState("");
  const [editMannerisms, setEditMannerisms] = useState("");
  const [editTemperament, setEditTemperament] = useState("");
  const [editMotivationsSecrets, setEditMotivationsSecrets] = useState("");
  const [editTacticalStyle, setEditTacticalStyle] = useState("");

  // Canon & Delta Tracking state (edit mode)
  const [editCanonSource, setEditCanonSource] = useState("");
  const [editTimelineStage, setEditTimelineStage] = useState("");
  const [editCanonDelta, setEditCanonDelta] = useState("");

  // Canon Delta Studio Modal states
  const [showCanonDeltaStudio, setShowCanonDeltaStudio] = useState(false);
  const [canonStudioTargetChar, setCanonStudioTargetChar] = useState<CharacterProfile | null>(null);
  const [showGranularSectionInEdit, setShowGranularSectionInEdit] = useState(false);

  // Import Doc Profile
  const [isPullingApart, setIsPullingApart] = useState(false);

  // AI-powered dynamic lore update state & handler
  const [aiUpdatingCharId, setAiUpdatingCharId] = useState<string | null>(null);
  const [isAiGeneratingEntity, setIsAiGeneratingEntity] = useState(false);
  const [isAiGeneratingEditEntity, setIsAiGeneratingEditEntity] = useState(false);

  const handleAiAutoFillEntity = async (onlyCustomFields: boolean = false) => {
    setIsAiGeneratingEntity(true);
    try {
      const existingFields: Record<string, string> = {};
      if (creationLockedFields.name && charName) existingFields.name = charName;
      if (creationLockedFields.role && charRole) existingFields.role = charRole;
      if (creationLockedFields.description && charDesc) existingFields.description = charDesc;
      if (creationLockedFields.backstory && charBackstory) existingFields.backstory = charBackstory;
      if (creationLockedFields.signatureItems && charSignatureItems) existingFields.signatureItems = charSignatureItems;
      if (creationLockedFields.factionName && charFactionName) existingFields.factionName = charFactionName;
      if (creationLockedFields.relationships && charRelationships) existingFields.relationships = charRelationships;

      const targetFieldKeys = getSettingSpecificDefaultFields(loreTab || "npc", project?.setting);

      const data = await safeFetchJson<any>("/api/ai-generate-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: charName.trim(),
          role: charRole.trim(),
          type: loreTab || "npc",
          projectSetting: project?.setting || "",
          existingFields,
          targetFieldKeys
        }),
        timeout: 60000
      });

      if (data.error) throw new Error(data.error);

      if (!onlyCustomFields) {
        if (!creationLockedFields.name && data.name) setCharName(data.name);
        if (!creationLockedFields.role && data.role) setCharRole(data.role);
        if (!creationLockedFields.description && data.description) setCharDesc(data.description);
        if (!creationLockedFields.backstory && data.backstory) setCharBackstory(data.backstory);
        if (!creationLockedFields.signatureItems && data.signatureItems) setCharSignatureItems(data.signatureItems);
        if (!creationLockedFields.factionName && data.factionName) setCharFactionName(data.factionName);
        if (!creationLockedFields.relationships && data.relationships) setCharRelationships(data.relationships);
      }

      if (data.customFields && typeof data.customFields === "object") {
        setManualCustomFields(prev => {
          const merged = { ...prev };
          Object.entries(data.customFields).forEach(([k, v]) => {
            if (!creationLockedFields[k] && (!merged[k] || !merged[k].trim() || !onlyCustomFields)) {
              merged[k] = v as string;
            }
          });
          return merged;
        });
      }

      onShowToast?.("✨ Specifications Filled", `Populated all category specifications for ${data.name || charName || "entity"}!`, "success");
    } catch (err: any) {
      console.error(err);
      onShowToast?.("❌ Generation Failed", err.message || "Failed to auto-generate specifications.", "error");
    } finally {
      setIsAiGeneratingEntity(false);
    }
  };

  const handleAiAutoFillEditEntity = async (onlyCustomFields: boolean = false) => {
    setIsAiGeneratingEditEntity(true);
    try {
      const existingFields: Record<string, string> = {};
      if (editingLockedFields.name && editName) existingFields.name = editName;
      if (editingLockedFields.role && editRole) existingFields.role = editRole;
      if (editingLockedFields.description && editDesc) existingFields.description = editDesc;
      if (editingLockedFields.backstory && editBackstory) existingFields.backstory = editBackstory;
      if (editingLockedFields.signatureItems && editSignatureItems) existingFields.signatureItems = editSignatureItems;
      if (editingLockedFields.factionName && editFactionName) existingFields.factionName = editFactionName;
      if (editingLockedFields.relationships && editRelationships) existingFields.relationships = editRelationships;

      const targetFieldKeys = getSettingSpecificDefaultFields(editType || "npc", project?.setting);

      const data = await safeFetchJson<any>("/api/ai-generate-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          role: editRole.trim(),
          type: editType || "npc",
          projectSetting: project?.setting || "",
          existingFields,
          targetFieldKeys
        }),
        timeout: 60000
      });

      if (data.error) throw new Error(data.error);

      if (!onlyCustomFields) {
        if (!editingLockedFields.name && data.name) setEditName(data.name);
        if (!editingLockedFields.role && data.role) setEditRole(data.role);
        if (!editingLockedFields.description && data.description) setEditDesc(data.description);
        if (!editingLockedFields.backstory && data.backstory) setEditBackstory(data.backstory);
        if (!editingLockedFields.signatureItems && data.signatureItems) setEditSignatureItems(data.signatureItems);
        if (!editingLockedFields.factionName && data.factionName) setEditFactionName(data.factionName);
        if (!editingLockedFields.relationships && data.relationships) setEditRelationships(data.relationships);
      }

      if (data.customFields && typeof data.customFields === "object") {
        setEditCustomFields(prev => {
          const merged = { ...prev };
          Object.entries(data.customFields).forEach(([k, v]) => {
            if (!editingLockedFields[k] && (!merged[k] || !merged[k].trim() || !onlyCustomFields)) {
              merged[k] = v as string;
            }
          });
          return merged;
        });
      }

      onShowToast?.("✨ Specifications Filled", `Populated all custom category specifications for ${editName || 'entity'}!`, "success");
    } catch (err: any) {
      console.error(err);
      onShowToast?.("❌ Generation Failed", err.message || "Failed to populate category specifications.", "error");
    } finally {
      setIsAiGeneratingEditEntity(false);
    }
  };

  const handleAiUpdateLore = async (entity: CharacterProfile) => {
    setAiUpdatingCharId(entity.id);
    try {
      // Get the last 150 messages from the chat history for rich long-term campaign tracking
      const recent = messages.slice(-150);
      
      const data = await safeFetchJson<any>("/api/ai-update-lore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: entity,
          recentMessages: recent.map(m => ({ role: m.role, content: m.content })),
          projectSetting: project?.setting || ""
        }),
        timeout: 90000
      });
      if (data.error) throw new Error(data.error);

      // Perform local update
      onUpdateCharacter(entity.id, {
        role: data.role || entity.role,
        description: data.description || entity.description,
        relationships: data.relationships || entity.relationships,
        factionName: data.factionName || entity.factionName,
        customFields: data.customFields || entity.customFields
      });

      onShowToast?.("🪄 Lore Updated", data.summaryOfChanges || `Successfully synced ${entity.name} with recent narrative!`, "success");
    } catch (err: any) {
      console.error(err);
      onShowToast?.("❌ Sync Failed", err.message || "Failed to auto-update lore using AI.", "error");
    } finally {
      setAiUpdatingCharId(null);
    }
  };

  const resetCreationForm = () => {
    setCharName("");
    setCharUrl("");
    setCharDesc("");
    setCharRelationships("");
    setCharFactionName("");
    setCharSignatureItems("");
    setCharBackstory("");
    setCharRomanceTracks([]);
    setCharLinkedLoreIds([]);
    setCharIsMook(false);
    setManualCustomFields({});
    setCreationLockedFields({});
  };

  useEffect(() => {
    resetCreationForm();
    setShowRegisterActor(false);
    switch (loreTab) {
      case "pc": setCharRole("Protagonist"); setCharIsPC(true); break;
      case "companion": setCharRole("Expanded NPC Companion"); setCharIsPC(false); break;
      case "npc": setCharRole("General NPC"); setCharIsPC(false); break;
      case "chronicle": setCharRole("Major Campaign Arc"); setCharIsPC(false); break;
      case "location": setCharRole("Setting Location"); setCharIsPC(false); break;
      case "vehicle": setCharRole("Transport / Starship"); setCharIsPC(false); break;
      case "equipment": setCharRole("Item / Weapon"); setCharIsPC(false); break;
      case "faction": setCharRole("Faction / Syndicate"); setCharIsPC(false); break;
    }
  }, [loreTab]);

  // Clear Log Confirmation Modal State
  const [showClearLogModal, setShowClearLogModal] = useState(false);

  // Google Workspace file browser states
  const [showWorkspaceBrowser, setShowWorkspaceBrowser] = useState<"drive" | "photos" | null>(null);
  const [browserSearch, setBrowserSearch] = useState("");
  const [selectedBrowserFiles, setSelectedBrowserFiles] = useState<string[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const ingestAbortControllerRef = useRef<AbortController | null>(null);
  const [confidenceReport, setConfidenceReport] = useState<any>(null);

  // Attachment states (up to 10 files)
  const [assistantAttachments, setAssistantAttachments] = useState<any[]>([]);
  const [isChatDragging, setIsChatDragging] = useState(false);

  const handleAssistantFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    const isImage = file.type.startsWith("image/");
    
    reader.onloadend = () => {
      const resultData = reader.result as string;
      setAssistantAttachments(prev => {
        if (prev.length >= 10) {
          onShowToast("⚠️ Limit Reached", "Maximum of 10 attachments can be uploaded at a time.", "info");
          return prev;
        }
        return [...prev, {
          id: "att-" + Date.now(),
          name: file.name,
          type: isImage ? "image" : "document",
          url: resultData, // Base64 DataURL
          mimeType: file.type
        }];
      });
      onShowToast("📎 File Attached", `"${file.name}" is attached to your message!`, "success");
    };

    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const handleAssistantFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAssistantFileUpload(file);
    }
  };

  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [isFetchingDocText, setIsFetchingDocText] = useState(false);

  useEffect(() => {
    async function loadRealDriveDocs() {
      if ((showWorkspaceBrowser === "drive" || showWorkspaceBrowser === "photos") && googleToken) {
        setIsLoadingDriveFiles(true);
        try {
          const docs = await listGoogleDocs(googleToken);
          if (docs && docs.length > 0) {
            // Filter standard documents and text files
            const driveDocs = docs.filter((doc: any) => !doc.mimeType || !doc.mimeType.startsWith("image/"));
            const driveImages = docs.filter((doc: any) => doc.mimeType && doc.mimeType.startsWith("image/"));

            if (driveDocs.length > 0) {
              const mappedDocs: WorkspaceFile[] = driveDocs.map((doc: any) => ({
                id: doc.id,
                name: doc.name || "Untitled Google Doc",
                size: doc.size ? `${Math.round(parseInt(doc.size) / 1024)} KB` : "10 KB",
                folder: "Google Drive",
                lastModified: doc.modifiedTime ? new Date(doc.modifiedTime).toLocaleDateString() : "Unknown",
                text: "", // Fetch on demand
                fileMimeType: doc.mimeType,
                isRealDoc: true
              }));
              
              setDriveFiles(prev => {
                const existingLocalAndMocks = prev.filter(f => !f.isRealDoc);
                const filteredMappedDocs = mappedDocs.filter(d => !existingLocalAndMocks.some(x => x.id === d.id));
                return [...existingLocalAndMocks, ...filteredMappedDocs];
              });
            }

            if (driveImages.length > 0) {
              const mappedPhotos = driveImages.map((img: any) => ({
                id: img.id,
                name: img.name || "Untitled Image",
                url: img.thumbnailLink || "https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&q=80&w=600",
                date: img.modifiedTime ? new Date(img.modifiedTime).toLocaleDateString() : "Unknown",
                isRealPhoto: true,
                mimeType: img.mimeType
              }));

              setPhotosFiles(prev => {
                const existingLocalAndMocks = prev.filter((p: any) => !p.isRealPhoto);
                const filteredMappedPhotos = mappedPhotos.filter((p: any) => !existingLocalAndMocks.some((x: any) => x.id === p.id));
                return [...existingLocalAndMocks, ...filteredMappedPhotos];
              });
            }
          }
        } catch (err: any) {
          const errMsg = err.message || "";
          if (errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("Unauthorized") || errMsg.includes("Forbidden")) {
            console.warn("Failed to load Google Drive files in AdventureChat due to expired/unauthorized session. Clearing token.");
            if (onClearGoogleToken) {
              onClearGoogleToken();
            }
          } else {
            console.error("Failed to load Google Drive files:", err);
          }
        } finally {
          setIsLoadingDriveFiles(false);
        }
      }
    }
    loadRealDriveDocs();
  }, [showWorkspaceBrowser, googleToken]);

  const handleSelectBrowserFile = async (fileId: string) => {
    setSelectedBrowserFiles([fileId]);
    
    const driveFile = driveFiles.find(f => f.id === fileId);
    if (driveFile && driveFile.isRealDoc && !driveFile.text && googleToken) {
      setIsFetchingDocText(true);
      try {
        const res = await fetchGoogleFile(googleToken, fileId, driveFile.fileMimeType);
        setDriveFiles(prev => prev.map(f => f.id === fileId ? { 
          ...f, 
          text: res.text,
          fileBase64: res.fileBase64,
          fileMimeType: res.fileMimeType
        } : f));
      } catch (err: any) {
        console.error("Fetch document error:", err);
        const errMsg = err.message || "";
        if (errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("Unauthorized") || errMsg.includes("Forbidden")) {
          onShowToast?.("Google Session Expired", "Google Session expired or insufficient permissions. Please connect or sign in again to grant permissions.", "error");
          if (onClearGoogleToken) {
            onClearGoogleToken();
          }
        } else {
          onShowToast?.("Google Drive Error", "Failed to fetch document content: " + err.message, "error");
        }
      } finally {
        setIsFetchingDocText(false);
      }
    }

    const photoFile = photosFiles.find(f => f.id === fileId) as any;
    if (photoFile && photoFile.isRealPhoto && googleToken) {
      // If we haven't fetched the full high-quality base64 image yet
      if (!photoFile.url || photoFile.url.startsWith("http://") || photoFile.url.includes("googleusercontent.com")) {
        setIsFetchingDocText(true);
        try {
          const res = await fetchGoogleFile(googleToken, fileId, photoFile.mimeType);
          if (res.fileBase64) {
            setPhotosFiles(prev => prev.map(p => p.id === fileId ? { ...p, url: res.fileBase64 } : p));
          }
        } catch (err: any) {
          console.error("Failed to fetch high-quality image content:", err);
        } finally {
          setIsFetchingDocText(false);
        }
      }
    }
  };

  const processUploadedFile = (file: File) => {
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || "";
    const fileSizeStr = `${Math.round(file.size / 1024)} KB`;
    
    if (showWorkspaceBrowser === "drive") {
      const newId = "drv-" + Date.now();
      
      const handleReadText = (text: string) => {
        setDriveFiles(prev => [
          {
            id: newId,
            name: fileName,
            size: fileSizeStr,
            folder: "Local Uploads",
            lastModified: "Just now",
            text: text,
            isRealDoc: false
          },
          ...prev
        ]);
        setSelectedBrowserFiles([newId]);
        if (onShowToast) {
          onShowToast("📁 File Uploaded", `"${fileName}" is ready for ingestion!`, "success");
        }
      };
      
      const handleReadBinary = (base64Data: string, mimeType: string) => {
        setDriveFiles(prev => [
          {
            id: newId,
            name: fileName,
            size: fileSizeStr,
            folder: "Local Uploads",
            lastModified: "Just now",
            text: `[Binary File Attached: ${fileName} (${mimeType}) - Will be analyzed by Gemini API]`,
            fileBase64: base64Data,
            fileMimeType: mimeType,
            isRealDoc: false
          },
          ...prev
        ]);
        setSelectedBrowserFiles([newId]);
        if (onShowToast) {
          onShowToast("📁 Binary File Uploaded", `"${fileName}" is ready for multi-modal ingestion!`, "success");
        }
      };
      
      if (fileExtension === "txt" || fileExtension === "md" || fileExtension === "json" || fileExtension === "csv" || fileExtension === "xml" || fileExtension === "html") {
        const reader = new FileReader();
        reader.onloadend = () => {
          handleReadText(reader.result as string);
        };
        reader.readAsText(file);
      } else if (fileExtension === "docx") {
        const zip = new JSZip();
        zip.loadAsync(file).then(zipFile => {
          const docXmlFile = zipFile.file("word/document.xml");
          if (!docXmlFile) {
            handleReadText(`[Error reading docx: Could not find word/document.xml]`);
            return;
          }
          docXmlFile.async("text").then(xmlText => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "application/xml");
            const textNodes = xmlDoc.getElementsByTagName("w:t");
            let result = "";
            for (let i = 0; i < textNodes.length; i++) {
              result += textNodes[i].textContent || "";
            }
            handleReadText(result || "[Empty Document]");
          }).catch(err => {
            handleReadText(`[Error unzipping docx text: ${err.message}]`);
          });
        }).catch(err => {
          handleReadText(`[Error loading zip for docx: ${err.message}]`);
        });
      } else if (fileExtension === "pdf") {
        const reader = new FileReader();
        reader.onloadend = () => {
          handleReadBinary(reader.result as string, "application/pdf");
        };
        reader.readAsDataURL(file);
      } else if (["png", "jpg", "jpeg", "webp"].includes(fileExtension)) {
        const reader = new FileReader();
        reader.onloadend = () => {
          let mime = "image/jpeg";
          if (fileExtension === "png") mime = "image/png";
          if (fileExtension === "webp") mime = "image/webp";
          handleReadBinary(reader.result as string, mime);
        };
        reader.readAsDataURL(file);
      } else {
        // Default fallback: read as text
        const reader = new FileReader();
        reader.onloadend = () => {
          handleReadText(reader.result as string);
        };
        reader.readAsText(file);
      }
    } else {
      // For Photos, use base64 data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const newId = "pht-" + Date.now();
        setPhotosFiles(prev => [
          {
            id: newId,
            name: fileName,
            url: reader.result as string,
            date: "Just now"
          },
          ...prev
        ]);
        setSelectedBrowserFiles([newId]);
        if (onShowToast) {
          onShowToast("🖼️ Photo Selected", `"${fileName}" is selected as active photo!`, "success");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [driveFiles, setDriveFiles] = useState<WorkspaceFile[]>([]);

  const [photosFiles, setPhotosFiles] = useState([
    { id: "pht-1", name: "cyber_scout_saito.jpg", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400", date: "2 hours ago" },
    { id: "pht-2", name: "desert_outpost_vista.jpg", url: "https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&q=80&w=600", date: "Yesterday" },
    { id: "pht-3", name: "ranger_elion_forest.jpg", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400", date: "Yesterday" },
    { id: "pht-4", name: "neon_metropolis_concept.jpg", url: "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&q=80&w=600", date: "3 days ago" },
    { id: "pht-5", name: "soldier_vance_headshot.jpg", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400", date: "4 days ago" }
  ]);

  const handleIngestFile = async (fileText: string, fileName: string, fileBase64?: string, fileMimeType?: string) => {
    setIsIngesting(true);
    setConfidenceReport(null);
    const controller = new AbortController();
    ingestAbortControllerRef.current = controller;
    const signal = controller.signal;

    try {
      // Call the unified AI-powered ingestion API (45s timeout)
      const data = await safeFetchJson<any>("/api/ingest-gdoc-lore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          docText: fileText,
          fileBase64,
          fileMimeType
        }),
        signal,
        timeout: 90000
      });
      if (data.error) throw new Error(data.error);

      if (signal.aborted) return;

      const entities = data.entities || [];
      const importedNpcs: any[] = [];
      const stats: Record<string, number> = {};

      const extractEntityProfileData = (entity: any) => {
        const custom = entity.customFields || {};

        let backstoryVal = entity.backstory || "";
        if (!backstoryVal) {
          const keys = Object.keys(custom).filter(k => 
            /backstory|genesis|origin|history|biography|bio|deed|narrative|chronology|lore/i.test(k)
          );
          backstoryVal = keys.map(k => `${k}:\n${custom[k]}`).join("\n\n");
        }

        let signatureItemsVal = entity.signatureItems || "";
        if (!signatureItemsVal) {
          const keys = Object.keys(custom).filter(k => 
            /item|gear|weapon|armor|rig|costume|carried|possession|equipment|cybernetic|bioware|loadout|inventory|fetish/i.test(k)
          );
          signatureItemsVal = keys.map(k => `${k}:\n${custom[k]}`).join("\n\n");
        }

        let relationshipsVal = entity.relationships || "";
        if (!relationshipsVal) {
          const keys = Object.keys(custom).filter(k => 
            /relationship|matrix|co-pilot|ally|rival|mentor|companion|perception/i.test(k)
          );
          relationshipsVal = keys.map(k => `${k}:\n${custom[k]}`).join("\n\n");
        }

        let factionNameVal = entity.factionName || "";
        if (!factionNameVal) {
          const keys = Object.keys(custom).filter(k => 
            /faction|affiliation|standing|office|tribe|syndicate|guild|house/i.test(k)
          );
          factionNameVal = keys.map(k => custom[k]).join("; ");
        }

        let descriptionVal = entity.description || "";
        if (!descriptionVal || descriptionVal.length < 20) {
          const keys = Object.keys(custom).filter(k => 
            /profile|identity|vibe|aesthetic|appearance|attributes|metrics|facts|stats/i.test(k)
          );
          if (keys.length > 0) {
            descriptionVal = keys.map(k => `${k}:\n${custom[k]}`).join("\n\n");
          }
        }

        return { backstoryVal, signatureItemsVal, relationshipsVal, factionNameVal, descriptionVal };
      };

      entities.forEach((entity: any) => {
        if (!entity.name) return;
        const type = entity.type || "npc";
        const isPC = type === "pc" || (entity.role && entity.role.toLowerCase().includes("protagonist"));
        stats[type] = (stats[type] || 0) + 1;

        const { backstoryVal, signatureItemsVal, relationshipsVal, factionNameVal, descriptionVal } = extractEntityProfileData(entity);

        onAddCharacter(
          entity.name,
          entity.role || (isPC ? "Protagonist" : "Companion"),
          entity.portraitUrl || "", // portrait URL
          descriptionVal,
          isPC, // isPlayerCharacter
          relationshipsVal,
          factionNameVal,
          false, // isMook
          type,
          entity.customFields || {},
          signatureItemsVal,
          backstoryVal
        );

        importedNpcs.push({
          name: entity.name,
          role: entity.role || "Record",
          type: type
        });
      });

      // Extract general settings/style guide from the same unified payload!
      const styleFields = [
        { key: "creatorNames", name: "Creators Mix", value: data.creatorNames || "", confidence: data.creatorNames ? 100 : 0 },
        { key: "setting", name: "Active Setting", value: data.setting || "", confidence: data.setting ? 100 : 0 },
        { key: "styleGuide", name: "Canon Style Guide", value: data.styleGuide || "", confidence: data.styleGuide ? 100 : 0 },
        { key: "customInstructions", name: "Customized Instructions", value: data.customInstructions || "", confidence: data.customInstructions ? 100 : 0 }
      ];

      styleFields.forEach(f => {
        if (f.value && f.value !== "[No Info]" && f.value !== "None") {
          onSetProjectValue(f.key, f.value);
        }
      });

      if (signal.aborted) return;

      // Save attached doc ID/name to project attachedDocId list
      const existingDocs = project.attachedDocId ? project.attachedDocId.split(", ").filter(Boolean) : [];
      if (!existingDocs.includes(fileName)) {
        onSetProjectValue("attachedDocId", [...existingDocs, fileName].join(", "));
      }

      setConfidenceReport({
        fileName,
        fields: styleFields,
        npcs: importedNpcs
      });

      if (onShowToast) {
        const statsSummary = Object.entries(stats)
          .map(([t, count]) => `${count} ${t.toUpperCase()}`)
          .join(", ") || "0 records";
        onShowToast("Ingestion Complete", `Extracted: ${statsSummary} from "${fileName}".`, "success");
      }

    } catch (err: any) {
      if (err.name === "AbortError" || signal.aborted) {
        console.log("Ingestion aborted for file:", fileName);
        return;
      }
      onShowToast?.("Ingestion Error", "Error ingesting document: " + err.message, "error");
    } finally {
      setIsIngesting(false);
      if (ingestAbortControllerRef.current === controller) {
        ingestAbortControllerRef.current = null;
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Dynamic Theme Styling mappings
  const activeTheme = THEME_PRESETS[project.themeId || "slate"] || THEME_PRESETS["slate"];
  const activeBubbleStyle = BUBBLE_STYLE_PRESETS[project.chatBubbleStyle || "glass"] || BUBBLE_STYLE_PRESETS["glass"];
  const activeChatBg = CHAT_BG_PRESETS[project.chatBgPreset || "none"] || CHAT_BG_PRESETS["none"];

  // Compute dynamic background based on setting/project name archetype
  const archetype = getDynamicArchetype(project.setting || "", project.name || "");
  let dynamicBgStyle = activeChatBg.cssStyle;
  if (!project.chatBgPreset || project.chatBgPreset === "none") {
    if (archetype === "space") {
      dynamicBgStyle = "radial-gradient(ellipse at bottom, #090a1f 0%, #030308 100%)";
    } else if (archetype === "fantasy") {
      dynamicBgStyle = "linear-gradient(to bottom, #0d1a0e 0%, #020502 100%)";
    } else if (archetype === "cyberpunk") {
      dynamicBgStyle = "radial-gradient(circle at center, #1e0b24 0%, #050206 100%)";
    } else if (archetype === "military") {
      dynamicBgStyle = "linear-gradient(to bottom, #111b15 0%, #050a06 100%)";
    }
  }

  // Handle message send & 2.0 Slash Commands
  const handleSend = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    const txt = inputText.trim();

    // 2.0 Quick Slash Commands: /inscene, /leave, /scene, /clearscene, /hud
    if (txt.startsWith("/")) {
      const parts = txt.split(" ");
      const cmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(" ").trim().toLowerCase();

      if (cmd === "/inscene" || cmd === "/join" || cmd === "/enter") {
        if (!arg) {
          onShowToast?.("⚠️ In-Scene Command", "Usage: /inscene <character or entity name>", "info");
          return;
        }
        const target = characters.find(c => c.name.toLowerCase().includes(arg));
        if (target) {
          await onUpdateCharacter(target.id, { isInScene: true });
          onShowToast?.("🟢 Scene Joined", `"${target.name}" is now in the active scene (Tier 2 injection).`, "success");
          setInputText("");
          return;
        } else {
          onShowToast?.("❌ Character Not Found", `Could not find entity matching "${arg}" in Lorebook.`, "error");
          return;
        }
      }

      if (cmd === "/leave" || cmd === "/exit" || cmd === "/offscene") {
        if (!arg) {
          onShowToast?.("⚠️ Leave Command", "Usage: /leave <character name>", "info");
          return;
        }
        const target = characters.find(c => c.name.toLowerCase().includes(arg));
        if (target) {
          await onUpdateCharacter(target.id, { isInScene: false });
          onShowToast?.("⚪ Scene Left", `"${target.name}" returned to background Lorebook.`, "info");
          setInputText("");
          return;
        } else {
          onShowToast?.("❌ Character Not Found", `Could not find entity matching "${arg}" in Lorebook.`, "error");
          return;
        }
      }

      if (cmd === "/scene" || cmd === "/roster") {
        const inSceneNames = inSceneCharacters.map(c => c.name).join(", ");
        onShowToast?.("🎭 Active Scene Roster", inSceneNames ? `In Scene: ${inSceneNames}` : "No characters currently marked in-scene.", "info");
        setInputText("");
        return;
      }

      if (cmd === "/clearscene") {
        const toClear = characters.filter(c => c.isInScene && !c.isPlayerCharacter && c.type !== "companion");
        for (const c of toClear) {
          await onUpdateCharacter(c.id, { isInScene: false });
        }
        onShowToast?.("🧹 Scene Cleared", `Reset ${toClear.length} entity/entities to background Lorebook.`, "info");
        setInputText("");
        return;
      }

      if (cmd === "/hud" || cmd === "/context" || cmd === "/memory") {
        setShowContextHUDModal(true);
        setInputText("");
        return;
      }
    }

    setInputText("");
    try {
      safeLocalStorage.removeItem(`nyx_chat_draft_${project.id}`);
    } catch {}
    await onSendMessage(txt, thinkingLevel, assistantAttachments);
    setAssistantAttachments([]);
  };

  // Memoized message event callbacks to keep MessageItem pure and avoid typing lag
  const handleSaveEdit = useCallback((id: string) => {
    onEditMessage(id, editText);
    setEditingMessageId(null);
  }, [editText, onEditMessage]);

  const handleStartEdit = useCallback((id: string, content: string) => {
    setEditingMessageId(id);
    setEditText(content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const handleEditTextChange = useCallback((text: string) => {
    setEditText(text);
  }, []);

  const handleStoreFact = useCallback(async (text: string) => {
    try {
      const data = await safeFetchJson<any>("/api/store-fact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        timeout: 30000
      });
      if (data.fact) {
        const current = project.persistentContext || "";
        const updated = current ? `${current}\n- ${data.fact}` : `- ${data.fact}`;
        onSetProjectValue("persistentContext", updated);
        onShowToast?.("Fact Distilled & Stored", `Added to Persistent Context:\n"${data.fact}"`, "success");
      } else {
        throw new Error("No fact returned");
      }
    } catch (err: any) {
      onShowToast?.("Store Fact Error", "Failed to store fact: " + err.message, "error");
    }
  }, [project.persistentContext, onSetProjectValue]);

  const handleMessageClick = useCallback((_msg: Message) => {
    // Clicked message handler
  }, []);

  // Drag resizing left panel
  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const percentage = (moveEvent.clientX / window.innerWidth) * 100;
      if (percentage > 15 && percentage < 45) {
        setLeftWidth(percentage);
      }
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleAutoFillFromGDoc = async (docIdOrText: string, mimeType?: string, isDirectText = false) => {
    setIsPullingApart(true);
    try {
      let text = "";
      if (isDirectText) {
        text = docIdOrText;
      } else {
        if (!googleToken) {
          throw new Error("Google Drive is not connected. Please connect it in settings first.");
        }
        const token = googleToken;
        const resFile = await fetchGoogleFile(token, docIdOrText, mimeType);
        text = resFile.text || "";
      }
      
      const data = await safeFetchJson<any>("/api/ingest-gdoc-lore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docText: text }),
        timeout: 90000
      });
      if (data.error) throw new Error(data.error);
      
      const entities = data.entities || [];
      if (entities.length === 0) {
        onShowToast?.("No Entities Found", "No character profiles or entities were found in this document. Please make sure the document describes characters/NPCs.", "info");
        return;
      }
      
      let entity = entities.find((e: any) => charName && e.name?.toLowerCase().includes(charName.toLowerCase()));
      if (!entity) {
        entity = entities.find((e: any) => e.type === "pc" || e.type === "npc");
      }
      if (!entity) {
        entity = entities[0];
      }
      
      if (entity) {
        const custom = entity.customFields || {};

        let backstoryVal = entity.backstory || "";
        if (!backstoryVal) {
          const keys = Object.keys(custom).filter(k => 
            /backstory|genesis|origin|history|biography|bio|deed|narrative|chronology|lore/i.test(k)
          );
          backstoryVal = keys.map(k => `${k}:\n${custom[k]}`).join("\n\n");
        }

        let signatureItemsVal = entity.signatureItems || "";
        if (!signatureItemsVal) {
          const keys = Object.keys(custom).filter(k => 
            /item|gear|weapon|armor|rig|costume|carried|possession|equipment|cybernetic|bioware|loadout|inventory|fetish/i.test(k)
          );
          signatureItemsVal = keys.map(k => `${k}:\n${custom[k]}`).join("\n\n");
        }

        let relationshipsVal = entity.relationships || "";
        if (!relationshipsVal) {
          const keys = Object.keys(custom).filter(k => 
            /relationship|matrix|co-pilot|ally|rival|mentor|companion|perception/i.test(k)
          );
          relationshipsVal = keys.map(k => `${k}:\n${custom[k]}`).join("\n\n");
        }

        let factionNameVal = entity.factionName || "";
        if (!factionNameVal) {
          const keys = Object.keys(custom).filter(k => 
            /faction|affiliation|standing|office|tribe|syndicate|guild|house/i.test(k)
          );
          factionNameVal = keys.map(k => custom[k]).join("; ");
        }

        let descriptionVal = entity.description || "";
        if (!descriptionVal || descriptionVal.length < 20) {
          const keys = Object.keys(custom).filter(k => 
            /profile|identity|vibe|aesthetic|appearance|attributes|metrics|facts|stats/i.test(k)
          );
          if (keys.length > 0) {
            descriptionVal = keys.map(k => `${k}:\n${custom[k]}`).join("\n\n");
          }
        }

        if (!creationLockedFields["name"] && entity.name) {
          setCharName(entity.name);
        }
        if (!creationLockedFields["role"]) {
          setCharRole(entity.role || (entity.type === "pc" ? "Protagonist" : "Companion"));
        }
        if (!creationLockedFields["description"] && descriptionVal) {
          setCharDesc(descriptionVal);
        }
        if (!creationLockedFields["backstory"] && backstoryVal) {
          setCharBackstory(backstoryVal);
        }
        if (!creationLockedFields["signatureItems"] && signatureItemsVal) {
          setCharSignatureItems(signatureItemsVal);
        }
        if (!creationLockedFields["relationships"] && relationshipsVal) {
          setCharRelationships(relationshipsVal);
        }
        if (!creationLockedFields["factionName"] && factionNameVal) {
          setCharFactionName(factionNameVal);
        }

        if (entity.type === "pc" || loreTab === "pc") {
          setCharIsPC(true);
        }
        
        const newCustomFields = { ...manualCustomFields };
        if (entity.customFields) {
          Object.entries(entity.customFields).forEach(([k, v]) => {
            if (!creationLockedFields[k]) {
              newCustomFields[k] = String(v || "");
            }
          });
        }
        setManualCustomFields(newCustomFields);
        
        if (onShowToast) {
          onShowToast("🪄 Profile Pulled Apart", `Successfully parsed details for "${entity.name}" from your GDoc and auto-filled the form!`, "success");
        }
      }
    } catch (err: any) {
      console.error("Error auto-filling from GDoc:", err);
      onShowToast?.("Character Extraction Error", "Error pulling apart character: " + err.message, "error");
    } finally {
      setIsPullingApart(false);
    }
  };

  // Character/Lore add callback
  const handleCharacterAdd = () => {
    if (!charName.trim() || !charRole.trim()) return;
    const finalUrl = charUrl;
    const parsedKeys = charActivationKeys
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);

    onAddCharacter(
      charName, 
      charRole, 
      finalUrl, 
      charDesc, 
      charIsPC, 
      charRelationships, 
      charFactionName, 
      charIsMook,
      loreTab,
      manualCustomFields,
      charSignatureItems,
      charBackstory,
      charRomanceTracks,
      charLinkedLoreIds,
      loreTab === "companion" || loreTab === "pc",
      parsedKeys
    );
    // Reset form fields
    resetCreationForm();
  };

  const startEditingEntity = (entity: CharacterProfile) => {
    setEditingEntityId(entity.id);
    setEditName(entity.name || "");
    setEditRole(entity.role || "");
    setEditDesc(entity.description || "");
    setEditRelationships(entity.relationships || "");
    setEditFactionName(entity.factionName || "");
    setEditSignatureItems(entity.signatureItems || "");
    setEditBackstory(entity.backstory || "");
    setEditRomanceTracks(entity.romanceTracks || []);
    setEditLinkedLoreIds(entity.linkedLoreIds || []);
    setEditPortraitUrl(entity.portraitUrl || "");
    setEditPortraitType(entity.portraitUrl?.startsWith("http") ? "url" : "upload");
    setEditCustomFields(entity.customFields || {});
    const currentType = entity.type || (entity.isPlayerCharacter ? "pc" : "npc");
    setEditType(currentType);
    setEditIsInScene(!!entity.isInScene);
    setEditActivationKeys((entity.activationKeys || []).join(", "));
    // Granular character accuracy and canon delta specs
    setEditAppearanceBuild(entity.appearanceBuild || "");
    setEditDistinguishingMarks(entity.distinguishingMarks || "");
    setEditAttireWardrobe(entity.attireWardrobe || "");
    setEditVoiceCadence(entity.voiceCadence || "");
    setEditMannerisms(entity.mannerisms || "");
    setEditTemperament(entity.temperament || "");
    setEditMotivationsSecrets(entity.motivationsSecrets || "");
    setEditTacticalStyle(entity.tacticalStyle || "");
    setEditCanonSource(entity.canonSource || "");
    setEditTimelineStage(entity.timelineStage || "");
    setEditCanonDelta(entity.canonDelta || "");
  };

  const handleMoveLoreCategory = (char: CharacterProfile, targetCategory: "pc" | "npc" | "companion" | "chronicle" | "location" | "vehicle" | "equipment" | "faction") => {
    const currentCategory = char.type || (char.isPlayerCharacter ? "pc" : "npc");
    if (targetCategory === currentCategory) return;

    onUpdateCharacter(char.id, {
      type: targetCategory,
      isPlayerCharacter: targetCategory === "pc"
    });

    setLoreTab(targetCategory);
    setExpandedEntityId(char.id);

    if (onShowToast) {
      const categoryLabels: Record<string, string> = {
        pc: "Player Character (PC)",
        companion: "Companion",
        npc: "NPC",
        chronicle: "Chronicle Log",
        location: "Location",
        vehicle: "Vehicle",
        equipment: "Equipment",
        faction: "Faction"
      };
      onShowToast(
        "📁 Lore Entry Moved",
        `Moved "${char.name}" to ${categoryLabels[targetCategory] || targetCategory.toUpperCase()} category!`,
        "info"
      );
    }
  };

  const saveEditedEntity = () => {
    if (!editingEntityId) return;
    const original = characters.find(c => c.id === editingEntityId);
    const oldType = original?.type || (original?.isPlayerCharacter ? "pc" : "npc");

    const parsedKeys = editActivationKeys
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);

    onUpdateCharacter(editingEntityId, {
      name: editName,
      role: editRole,
      description: editDesc,
      relationships: editRelationships,
      factionName: editFactionName,
      signatureItems: editSignatureItems,
      backstory: editBackstory,
      romanceTracks: editRomanceTracks,
      linkedLoreIds: editLinkedLoreIds,
      portraitUrl: editPortraitUrl,
      customFields: editCustomFields,
      type: editType,
      isPlayerCharacter: editType === "pc",
      isInScene: editIsInScene,
      activationKeys: parsedKeys,
      appearanceBuild: editAppearanceBuild,
      distinguishingMarks: editDistinguishingMarks,
      attireWardrobe: editAttireWardrobe,
      voiceCadence: editVoiceCadence,
      mannerisms: editMannerisms,
      temperament: editTemperament,
      motivationsSecrets: editMotivationsSecrets,
      tacticalStyle: editTacticalStyle,
      canonSource: editCanonSource,
      timelineStage: editTimelineStage,
      canonDelta: editCanonDelta
    });

    if (oldType !== editType) {
      setLoreTab(editType);
      if (onShowToast) {
        const categoryLabels: Record<string, string> = {
          pc: "Player Character (PC)",
          companion: "Companion",
          npc: "NPC",
          chronicle: "Chronicle Log",
          location: "Location",
          vehicle: "Vehicle",
          equipment: "Equipment",
          faction: "Faction"
        };
        onShowToast(
          "📁 Record Category Moved",
          `Moved "${editName || 'Entity'}" to ${categoryLabels[editType] || editType.toUpperCase()} category!`,
          "info"
        );
      }
    }
    setEditingEntityId(null);
  };

  // Reconcile and apply profile from Canon Delta Studio
  const handleApplyCanonProfile = (updatedProfile: Partial<CharacterProfile>, targetCharId?: string) => {
    const existingChar = targetCharId
      ? characters.find(c => c.id === targetCharId)
      : characters.find(c => c.name.trim().toLowerCase() === (updatedProfile.name || "").trim().toLowerCase());

    if (existingChar) {
      onUpdateCharacter(existingChar.id, updatedProfile);
      if (editingEntityId === existingChar.id) {
        if (updatedProfile.name) setEditName(updatedProfile.name);
        if (updatedProfile.role) setEditRole(updatedProfile.role);
        if (updatedProfile.description) setEditDesc(updatedProfile.description);
        if (updatedProfile.backstory) setEditBackstory(updatedProfile.backstory);
        if (updatedProfile.factionName) setEditFactionName(updatedProfile.factionName);
        if (updatedProfile.relationships) setEditRelationships(updatedProfile.relationships);
        if (updatedProfile.signatureItems) setEditSignatureItems(updatedProfile.signatureItems);
        if (updatedProfile.appearanceBuild) setEditAppearanceBuild(updatedProfile.appearanceBuild);
        if (updatedProfile.distinguishingMarks) setEditDistinguishingMarks(updatedProfile.distinguishingMarks);
        if (updatedProfile.attireWardrobe) setEditAttireWardrobe(updatedProfile.attireWardrobe);
        if (updatedProfile.voiceCadence) setEditVoiceCadence(updatedProfile.voiceCadence);
        if (updatedProfile.mannerisms) setEditMannerisms(updatedProfile.mannerisms);
        if (updatedProfile.temperament) setEditTemperament(updatedProfile.temperament);
        if (updatedProfile.motivationsSecrets) setEditMotivationsSecrets(updatedProfile.motivationsSecrets);
        if (updatedProfile.tacticalStyle) setEditTacticalStyle(updatedProfile.tacticalStyle);
        if (updatedProfile.canonSource) setEditCanonSource(updatedProfile.canonSource);
        if (updatedProfile.timelineStage) setEditTimelineStage(updatedProfile.timelineStage);
        if (updatedProfile.canonDelta) setEditCanonDelta(updatedProfile.canonDelta);
      }
      if (onShowToast) {
        onShowToast(
          "Canon Delta Reconciled",
          `Updated "${updatedProfile.name || existingChar.name}" with online canon and campaign narrative delta.`,
          "success"
        );
      }
    } else {
      const charType = (loreTab === "companion" || loreTab === "pc" || loreTab === "npc") ? loreTab : "companion";
      onAddCharacter(
        updatedProfile.name || "Unknown Figure",
        updatedProfile.role || "Operative",
        updatedProfile.portraitUrl || "",
        updatedProfile.description || "",
        charType === "pc",
        updatedProfile.relationships || "",
        updatedProfile.factionName || "",
        false,
        charType,
        updatedProfile.customFields || {},
        updatedProfile.signatureItems || "",
        updatedProfile.backstory || "",
        updatedProfile.romanceTracks || [],
        updatedProfile.linkedLoreIds || [],
        true,
        []
      );

      setTimeout(() => {
        const added = characters.find(c => c.name.trim().toLowerCase() === (updatedProfile.name || "").trim().toLowerCase());
        if (added) {
          onUpdateCharacter(added.id, updatedProfile);
        }
      }, 150);

      if (onShowToast) {
        onShowToast(
          "Canon Character Registered",
          `Added "${updatedProfile.name}" into campaign lore with synthesized delta profile.`,
          "success"
        );
      }
    }
  };

  // Handle direct file upload to base64
  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCharUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Handle direct file upload to base64 for edit mode
  const handleEditDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setEditPortraitUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Nyx Engine v2.0 - Unified Dirac-Compliant Mathematical Lore Context
  const slidingTurnsLimit = project.slidingContextTurns ?? 12;
  const loreEngineResult = computeGranularLoreContext(characters, messages, slidingTurnsLimit);
  const {
    granularEntities,
    allActiveContextLore,
    inSceneEntities: inSceneCharacters,
  } = loreEngineResult;

  // Recommendation for next turn
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === "nyx" || m.role === "assistant");
  const recommendedLevel = lastAssistantMessage?.tokensUsed && lastAssistantMessage.tokensUsed > 15000 ? "High" : "Medium";

  // Helper to render portrait avatar
  const renderPortrait = useCallback((url?: string, name?: string, sizeClass = "w-10 h-10", char?: CharacterProfile) => {
    const portraitName = name || "Character";
    let avatarEl;
    if (url === "nyx") {
      avatarEl = (
        <div className={`${sizeClass} rounded bg-gradient-to-tr from-purple-700 via-slate-900 to-indigo-900 flex flex-col items-center justify-center text-white relative border border-purple-500/30 overflow-hidden shadow-inner group/item`} title={portraitName}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent animate-pulse" />
          <span className="text-[10px] font-bold font-mono tracking-widest text-purple-300">NYX</span>
          <div className="absolute bottom-1 text-[7px] text-purple-400 font-mono tracking-tighter">AI V.2</div>
        </div>
      );
    } else if (url === "hero") {
      avatarEl = (
        <div className={`${sizeClass} rounded bg-gradient-to-tr from-slate-900 via-amber-950 to-slate-900 flex items-center justify-center text-white border border-amber-600/30 shadow-inner`} title={portraitName}>
          <span className="text-lg">⚔️</span>
        </div>
      );
    } else if (url === "mage") {
      avatarEl = (
        <div className={`${sizeClass} rounded bg-gradient-to-tr from-slate-900 via-cyan-950 to-slate-900 flex items-center justify-center text-white border border-cyan-500/30 shadow-inner`} title={portraitName}>
          <span className="text-lg">🔮</span>
        </div>
      );
    } else if (url === "fixer") {
      avatarEl = (
        <div className={`${sizeClass} rounded bg-gradient-to-tr from-zinc-900 via-rose-950 to-slate-900 flex items-center justify-center text-white border border-rose-500/30 shadow-inner`} title={portraitName}>
          <span className="text-lg">🕶️</span>
        </div>
      );
    } else if (url === "shadow") {
      avatarEl = (
        <div className={`${sizeClass} rounded bg-gradient-to-tr from-slate-950 via-zinc-900 to-slate-950 flex items-center justify-center text-white border border-zinc-700/30 shadow-inner`} title={portraitName}>
          <span className="text-lg">🎭</span>
        </div>
      );
    } else if (url === "beast") {
      avatarEl = (
        <div className={`${sizeClass} rounded bg-gradient-to-tr from-red-950 via-slate-900 to-red-950 flex items-center justify-center text-white border border-red-500/30 shadow-inner`} title={portraitName}>
          <span className="text-lg">🐉</span>
        </div>
      );
    } else {
      avatarEl = (
        <img
          src={url || `https://api.dicebear.com/7.x/bottts/svg?seed=${portraitName}`}
          alt={portraitName}
          referrerPolicy="no-referrer"
          className={`${sizeClass} rounded object-cover border border-slate-700/50 shadow-md`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${portraitName}`;
          }}
        />
      );
    }

    return avatarEl;
  }, []);

  return (
    <div className={`flex h-full text-slate-100 rounded-2xl overflow-hidden border ${activeTheme.borderColor} ${activeTheme.bgClass} ${activeTheme.fontFamilyClass} relative`}>
      
      {/* FLOATING BACKDROP (WHEN OPEN IN UNPINNED OVERLAY MODE) */}
      {showLeftPanel && !isLeftPanelPinned && (
        <div 
          onClick={() => setShowLeftPanel(false)}
          className="absolute inset-0 bg-black/40 z-35 backdrop-blur-[1px] transition-opacity duration-200 cursor-pointer"
          title="Click outside to close Project Settings overlay"
        />
      )}

      {/* 1. LEFT PANEL: Dynamic Settings, Themes, and Cast Members */}
      {showLeftPanel && (
        <div 
          style={{ width: isLeftPanelPinned ? `${leftWidth}%` : undefined }}
          className={`h-full flex flex-col overflow-hidden transition-all duration-200 ${activeTheme.cardBgClass} ${
            isLeftPanelPinned 
              ? `min-w-[320px] max-w-[550px] border-r ${activeTheme.borderColor} shrink-0 relative z-30 shadow-md`
              : `absolute left-0 top-0 bottom-0 z-40 w-[380px] sm:w-[420px] max-w-[92vw] border-r border-purple-900/60 bg-slate-950/95 backdrop-blur-xl shadow-2xl shadow-purple-950/70 animate-in slide-in-from-left duration-200`
          }`}
        >
          {/* Header */}
          <div className={`p-3.5 border-b ${activeTheme.borderColor} flex justify-between items-center bg-slate-900/60`}>
            <div className="flex items-center gap-2 min-w-0">
              <SlidersHorizontal size={14} className="text-purple-400 shrink-0" />
              <span className={`text-xs font-bold uppercase tracking-wider ${activeTheme.accentText} truncate`}>Project Settings</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                isLeftPanelPinned 
                  ? "bg-purple-950/90 text-purple-300 border-purple-800/60 font-semibold" 
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}>
                {isLeftPanelPinned ? "PINNED" : "OVERLAY"}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const next = !isLeftPanelPinned;
                  setIsLeftPanelPinned(next);
                  onShowToast?.(
                    next ? "Settings Pinned & Docked" : "Settings Floating Overlay",
                    next 
                      ? "UI is locked and shifted right to make room for Project Settings." 
                      : "Settings is now floating over top of the narration UI without shifting it.",
                    "info"
                  );
                }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  isLeftPanelPinned 
                    ? "bg-purple-950 text-purple-300 border border-purple-600/50 shadow-sm shadow-purple-950/40" 
                    : "hover:bg-slate-800 hover:text-slate-200 text-slate-400"
                }`}
                title={isLeftPanelPinned ? "Unpin (Float over top of narration UI as overlay)" : "Pin & Dock (Shift narration UI and lock panel)"}
              >
                <Pin size={13} className={isLeftPanelPinned ? "rotate-45 text-purple-400 fill-purple-400/40" : ""} />
              </button>

              <button 
                type="button"
                onClick={() => setShowLeftPanel(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="Collapse Project Settings"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>

          {/* Sub Tab Navigation */}
          <div className={`flex border-b ${activeTheme.borderColor} text-center text-xs bg-slate-950/20`}>
            <button
              onClick={() => setLeftTab("lore")}
              className={`flex-1 py-2.5 font-semibold transition-all ${leftTab === "lore" ? `${activeTheme.accentText} border-b-2 border-purple-500 bg-slate-900/60` : "text-slate-400 hover:text-slate-200"}`}
            >
              World settings
            </button>
            <button
              onClick={() => setLeftTab("cast")}
              className={`flex-1 py-2.5 font-semibold transition-all ${leftTab === "cast" ? `${activeTheme.accentText} border-b-2 border-purple-500 bg-slate-900/60` : "text-slate-400 hover:text-slate-200"}`}
            >
              Lore Database ({characters.length})
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            
            {/* Lore Tab */}
            {leftTab === "lore" && (
              <div className="space-y-4">
                {/* Campaign Name */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Campaign / Story Title</label>
                  <input
                    type="text"
                    value={localName}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => {
                      setFocusedField(null);
                      if (localName.trim() && localName !== (project.name || "")) {
                        onSetProjectValue("name", localName.trim());
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (localName.trim() && localName !== (project.name || "")) {
                          onSetProjectValue("name", localName.trim());
                        }
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    onChange={(e) => setLocalName(e.target.value)}
                    placeholder="Campaign Name (e.g. Shima, Night City 2077)..."
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 font-semibold"
                  />
                </div>

                {/* Nickname */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">What Nyx Calls You</label>
                  <input
                    type="text"
                    value={localNickname}
                    onFocus={() => setFocusedField("userNickname")}
                    onBlur={() => handleFieldBlur("userNickname", localNickname)}
                    onChange={(e) => setLocalNickname(e.target.value)}
                    placeholder="Adventurer, Polymath..."
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                {/* Narrative Perspective Toggle */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex justify-between items-center">
                    <span>Narrative Perspective</span>
                    <span className="text-[9px] text-purple-400 font-mono">
                      {project.narrativePerspective === "second_person" ? "Second Person ('You do...')" : "Third Person ('Sena does...')"}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-850 rounded-xl">
                    <button
                      type="button"
                      onClick={() => onSetProjectValue("narrativePerspective", "third_person")}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        (!project.narrativePerspective || project.narrativePerspective === "third_person")
                          ? "bg-purple-600 text-white shadow shadow-purple-900/40"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      }`}
                    >
                      <span>👤 Third Person</span>
                      <span className="text-[9px] opacity-75 font-mono">(Sena)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetProjectValue("narrativePerspective", "second_person")}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        project.narrativePerspective === "second_person"
                          ? "bg-purple-600 text-white shadow shadow-purple-900/40"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      }`}
                    >
                      <span>🎯 Second Person</span>
                      <span className="text-[9px] opacity-75 font-mono">(You)</span>
                    </button>
                  </div>
                </div>

                {/* Strict Player Agency / Story Facilitator Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Story Facilitator / Agency</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-normal bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Zero Puppeteering
                      </span>
                    </label>
                    <span className="text-[9px] text-slate-400">
                      {project.strictPlayerAgency !== false ? "Active" : "Flexible"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = project.strictPlayerAgency === false ? true : false;
                      onSetProjectValue("strictPlayerAgency", nextVal);
                      onShowToast?.(
                        nextVal ? "Strict Facilitator Active" : "Facilitator Guard Relaxed",
                        nextVal 
                          ? "AI is strictly locked to story facilitation. It will never generate spoken quotes or actions for your PC."
                          : "Facilitator guard relaxed.",
                        nextVal ? "success" : "info"
                      );
                    }}
                    className={`w-full py-2 px-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      project.strictPlayerAgency !== false
                        ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-200"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${project.strictPlayerAgency !== false ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-slate-600"}`} />
                        {project.strictPlayerAgency !== false ? "Strict Facilitator Mode Enabled" : "Facilitator Mode Off"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {project.strictPlayerAgency !== false 
                          ? "AI only describes the world & NPCs. Spoken quotes & actions for your PC are strictly prohibited." 
                          : "AI may occasionally extrapolate actions for narrative flow."}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                      project.strictPlayerAgency !== false
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}>
                      {project.strictPlayerAgency !== false ? "ON" : "OFF"}
                    </span>
                  </button>
                </div>

                {/* Turn Header / Episode Code */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>Turn Header (Post Title)</span>
                      <button
                        type="button"
                        onClick={() => onShowToast?.("🏷️ Turn Header", "Custom title or episode format displayed at the top of every narrative turn in the Adventure Log. E.g., 'The Mortician - S01E11' or 'The Household - Fun in the Sun'. Supports tags like {turn}, {speaker}, {time}.", "info")}
                        className="text-slate-500 hover:text-purple-300 font-bold px-1 cursor-pointer"
                        title="How Turn Headers work"
                      >
                        ?
                      </button>
                    </label>
                    <button
                      type="button"
                      onClick={() => setExpandedModalField({
                        id: "turnHeader",
                        title: "🏷️ Turn Header & Post Title Template",
                        description: "Sets the custom title or episode header displayed at the top of each narrative post (e.g. 'The Mortician - S01E11', 'The Household - Fun in the Sun', or '{turn}. {speaker}').",
                        badge: "Post Header"
                      })}
                      className="text-[10px] text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors font-mono cursor-pointer"
                      title="Expand turn header editor"
                    >
                      <Maximize2 size={10} /> Expand
                    </button>
                  </div>
                  <input
                    id="setting-field-turnHeader"
                    type="text"
                    value={localTurnHeader}
                    onFocus={() => setFocusedField("turnHeader")}
                    onBlur={() => handleFieldBlur("turnHeader", localTurnHeader)}
                    onChange={(e) => setLocalTurnHeader(e.target.value)}
                    placeholder="E.g., The Mortician - S01E11, The Household - Fun in the Sun..."
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 font-sans"
                  />
                  {/* Quick Preset Chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[
                      "The Mortician - S01E11",
                      "The Household - Fun in the Sun",
                      "Episode {turn}",
                      "Scene {turn}",
                      "{speaker}"
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setLocalTurnHeader(preset);
                          onSetProjectValue("turnHeader", preset);
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded transition-all font-mono border cursor-pointer ${
                          localTurnHeader === preset
                            ? "bg-purple-950 text-purple-200 border-purple-600 font-semibold shadow-sm"
                            : "bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    {localTurnHeader && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocalTurnHeader("");
                          onSetProjectValue("turnHeader", "");
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded transition-all font-mono border bg-slate-900/80 text-red-400/80 hover:text-red-300 border-slate-800 hover:border-red-900/50 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Current Setting */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Setting</label>
                    <button
                      type="button"
                      onClick={() => setExpandedModalField({
                        id: "setting",
                        title: "🗺️ Active Setting & World Anchor",
                        description: "Defines the primary universe, year, city, timeline branch, or active world setting for this campaign.",
                        badge: "World Anchor"
                      })}
                      className="text-[10px] text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors font-mono cursor-pointer"
                      title="Expand setting editor"
                    >
                      <Maximize2 size={10} /> Expand
                    </button>
                  </div>
                  <input
                    id="setting-field-setting"
                    type="text"
                    value={localSetting}
                    onFocus={() => setFocusedField("setting")}
                    onBlur={() => handleFieldBlur("setting", localSetting)}
                    onChange={(e) => setLocalSetting(e.target.value)}
                    placeholder="Star Wars Canon Year, Jump City, Night City 2077..."
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 font-sans"
                  />
                </div>

                {/* Campaign Fact Index(es) & Lore Grounding */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/20 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Sparkles size={11} className="text-purple-400" />
                      <span>Campaign Fact Index(es)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsLoreCodexOpen(true)}
                      className="text-[9px] text-purple-400 hover:text-purple-200 underline font-mono flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Lore Codex</span>
                      <ChevronRight size={9} />
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-300">
                    {project.activeFactIndexes && project.activeFactIndexes.length > 0 ? (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-slate-500 font-mono">Active:</span>
                        {project.activeFactIndexes.map(idx => (
                          <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-800/60 font-semibold">
                            {idx}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        <span className="text-emerald-400 font-medium font-mono">Auto:</span> Grounds trivia and lore facts automatically to {activeSettingResolved ? `"${activeSettingResolved}"` : "the active setting"}.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsLoreCodexOpen(true)}
                    className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 rounded-lg text-[10px] font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sliders size={11} className="text-amber-400" />
                    <span>Select Fact Index(es) for Campaign</span>
                  </button>
                </div>

                {/* Narrative Mood / Atmosphere */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>Mood / Atmosphere</span>
                      <button
                        type="button"
                        onClick={() => onShowToast?.("🎭 Narrative Mood", "Sets the emotional atmosphere and sensory tone. When set to 'Default to Author(s)' or unadjusted, mood automatically defaults to the signature mood & atmosphere of the author(s) specified in your style.", "info")}
                        className="text-slate-500 hover:text-purple-300 font-bold px-1"
                        title="How AI treats Mood"
                      >
                        ?
                      </button>
                    </label>
                    <button
                      type="button"
                      onClick={() => setExpandedModalField({
                        id: "emotionalTone",
                        title: "🎭 Narrative Mood & Atmosphere",
                        description: "Sets the emotional atmosphere, tone, tension level, and sensory mood for Nyx's narration (e.g. Default to Author(s), Gritty & Dark, Suspenseful Noir, Epic & Grand, Cozy & Introspective).",
                        badge: "Atmosphere Engine"
                      })}
                      className="text-[10px] text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors font-mono cursor-pointer"
                      title="Expand mood editor"
                    >
                      <Maximize2 size={10} /> Expand
                    </button>
                  </div>
                  <input
                    id="setting-field-emotionalTone"
                    type="text"
                    value={localMood}
                    onFocus={() => setFocusedField("emotionalTone")}
                    onBlur={() => handleFieldBlur("emotionalTone", localMood)}
                    onChange={(e) => setLocalMood(e.target.value)}
                    placeholder="Default to Author(s) (or Gritty & Dark, Noir, Cozy...)"
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 font-sans"
                  />
                  {/* Quick Mood Preset Chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[
                      "Default to Author(s)",
                      "Dramatic & Atmospheric",
                      "Gritty & Dark",
                      "Suspenseful Noir",
                      "Lighthearted & Witty",
                      "Epic & Grand",
                      "Eerie Cosmic Horror",
                      "Cozy & Introspective"
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setLocalMood(preset);
                          onSetProjectValue("emotionalTone", preset);
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded transition-all font-mono border ${
                          localMood === preset || (!localMood && preset === "Default to Author(s)")
                            ? "bg-purple-950 text-purple-200 border-purple-600 font-semibold shadow-sm"
                            : "bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Narrative Pacing */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>Story Pacing</span>
                      <button
                        type="button"
                        onClick={() => onShowToast?.("⚡ Story Pacing", "Controls the speed of scene progression and beat intervals. When set to 'Default to Author(s)' or unadjusted, pacing automatically defaults to the signature narrative tempo of the author(s) specified in your style.", "info")}
                        className="text-slate-500 hover:text-purple-300 font-bold px-1"
                        title="How AI treats Pacing"
                      >
                        ?
                      </button>
                    </label>
                    <button
                      type="button"
                      onClick={() => setExpandedModalField({
                        id: "pacing",
                        title: "⚡ Story Pacing & Progression Speed",
                        description: "Governs the rhythm of narrative progression, beat intervals, combat speed, and prose density (e.g. Default to Author(s), Balanced, Fast-Paced & Kinetic, Slow-Burn & Detailed).",
                        badge: "Pacing Controller"
                      })}
                      className="text-[10px] text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors font-mono cursor-pointer"
                      title="Expand pacing editor"
                    >
                      <Maximize2 size={10} /> Expand
                    </button>
                  </div>
                  <input
                    id="setting-field-pacing"
                    type="text"
                    value={localPacing}
                    onFocus={() => setFocusedField("pacing")}
                    onBlur={() => handleFieldBlur("pacing", localPacing)}
                    onChange={(e) => setLocalPacing(e.target.value)}
                    placeholder="Default to Author(s) (or Balanced, Fast-Paced, Slow-Burn...)"
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 font-sans"
                  />
                  {/* Quick Pacing Preset Chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[
                      "Default to Author(s)",
                      "Balanced",
                      "Fast-Paced & Kinetic",
                      "Slow-Burn & Detailed",
                      "Breakneck Adrenaline",
                      "Episodic & Methodical"
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setLocalPacing(preset);
                          onSetProjectValue("pacing", preset);
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded transition-all font-mono border ${
                          localPacing === preset || (!localPacing && preset === "Default to Author(s)")
                            ? "bg-purple-950 text-purple-200 border-purple-600 font-semibold shadow-sm"
                            : "bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plot Overview (Storyteller Outline) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Plot Overview (Storyteller Outline)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleInlineRows("plotOverview")}
                        className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors font-mono cursor-pointer"
                        title={expandedInlineRows.plotOverview ? "Collapse inline rows" : "Expand inline rows"}
                      >
                        {expandedInlineRows.plotOverview ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        <span className="text-[9px]">{expandedInlineRows.plotOverview ? "Compact" : "Tall"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedModalField({
                          id: "plotOverview",
                          title: "📖 Plot Overview & Storyteller Outline",
                          description: "Dungeon Master's overarching campaign arc, key plot secrets, major milestones, and narrative twists.",
                          badge: "DM Plot Vault"
                        })}
                        className="text-[10px] text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors font-mono font-semibold cursor-pointer"
                        title="Expand to Full-Screen Editor"
                      >
                        <Maximize2 size={10} /> Expand
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="setting-field-plotOverview"
                    value={localPlotOverview}
                    onFocus={() => setFocusedField("plotOverview")}
                    onBlur={() => handleFieldBlur("plotOverview", localPlotOverview)}
                    onChange={(e) => setLocalPlotOverview(e.target.value)}
                    placeholder="Dungeon Master's grand plan, secrets, and overarching arc..."
                    rows={expandedInlineRows.plotOverview ? 12 : 5}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-purple-500 resize-y leading-relaxed font-sans transition-all"
                  />
                </div>

                {/* Persistent Scene Context */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>Persistent Scene Context</span>
                      <button
                        type="button"
                        onClick={() => onShowToast?.("📌 Persistent Scene Context", "High-priority factual state (e.g., active injuries, weather conditions, active combat penalties) that is forcefully appended to every prompt so Nyx never forgets.", "info")}
                        className="text-slate-500 hover:text-purple-300 font-bold px-1"
                        title="How AI treats Persistent Scene Context"
                      >
                        ?
                      </button>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleInlineRows("persistentContext")}
                        className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors font-mono cursor-pointer"
                        title={expandedInlineRows.persistentContext ? "Collapse inline rows" : "Expand inline rows"}
                      >
                        {expandedInlineRows.persistentContext ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        <span className="text-[9px]">{expandedInlineRows.persistentContext ? "Compact" : "Tall"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedModalField({
                          id: "persistentContext",
                          title: "📌 Persistent Scene Context",
                          description: "High-priority factual state (e.g., active injuries, weather conditions, current locations, active combat penalties) forcefully injected into EVERY turn so Nyx never forgets.",
                          badge: "Stays in Every Prompt"
                        })}
                        className="text-[10px] text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors font-mono font-semibold cursor-pointer"
                        title="Expand to Full-Screen Editor"
                      >
                        <Maximize2 size={10} /> Expand
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="setting-field-persistentContext"
                    value={localPersistentContext}
                    onFocus={() => setFocusedField("persistentContext")}
                    onBlur={() => handleFieldBlur("persistentContext", localPersistentContext)}
                    onChange={(e) => setLocalPersistentContext(e.target.value)}
                    placeholder="E.g., Trauma coatless, Bill leg wound, active sandstorm..."
                    rows={expandedInlineRows.persistentContext ? 12 : 5}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-purple-500 resize-y leading-relaxed font-sans transition-all"
                  />
                </div>

                {/* Creators Mix */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>Creators Mix (Authors/DMs)</span>
                      <button
                        type="button"
                        onClick={() => onShowToast?.("🎨 Creators Mix", "Blends the storytelling styles, vocabulary, prose rhythms, and structural habits of specified authors or Dungeon Masters (e.g., George Lucas, Neil Gaiman, Matt Mercer) into Nyx's narration.", "info")}
                        className="text-slate-500 hover:text-purple-300 font-bold px-1"
                        title="How AI treats Creators Mix"
                      >
                        ?
                      </button>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleInlineRows("creatorNames")}
                        className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors font-mono cursor-pointer"
                        title={expandedInlineRows.creatorNames ? "Collapse inline rows" : "Expand inline rows"}
                      >
                        {expandedInlineRows.creatorNames ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        <span className="text-[9px]">{expandedInlineRows.creatorNames ? "Compact" : "Tall"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedModalField({
                          id: "creatorNames",
                          title: "🎨 Creators Mix & Stylistic Influences",
                          description: "Blends the prose rhythms, vocabulary, scene structures, and DM habits of target creators (e.g., George Lucas, Neil Gaiman, Brandon Sanderson, Matt Mercer).",
                          badge: "Style Blender"
                        })}
                        className="text-[10px] text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors font-mono font-semibold cursor-pointer"
                        title="Expand to Full-Screen Editor"
                      >
                        <Maximize2 size={10} /> Expand
                      </button>
                    </div>
                  </div>

                  {/* Free-Form Stylistic Influence & Writing Room Launcher */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                    <span className="text-slate-400 font-mono text-[10px]">
                      Free-form: Any authors, show writing rooms, DMs, or blends
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAuthorStyleModal(true)}
                      className="text-[10px] px-2 py-0.5 rounded font-mono border border-purple-800/50 bg-purple-950/70 text-purple-300 hover:bg-purple-900/80 hover:text-purple-200 transition-all cursor-pointer font-semibold flex items-center gap-1 shadow-sm"
                      title="Open the Free-Form Stylistic Influence Studio"
                    >
                      <Palette size={11} className="text-purple-400" />
                      <span>Influence Studio &amp; Anti-Drift</span>
                    </button>
                  </div>

                  <textarea
                    id="setting-field-creatorNames"
                    value={localCreatorNames}
                    onFocus={() => setFocusedField("creatorNames")}
                    onBlur={() => handleFieldBlur("creatorNames", localCreatorNames)}
                    onChange={(e) => setLocalCreatorNames(e.target.value)}
                    placeholder='e.g. "Avatar the Last Airbender show writers", "Matt Mercer + RA Salvatore", "Andor writing room", "Denis Villeneuve & Frank Herbert"...'
                    rows={expandedInlineRows.creatorNames ? 8 : 4}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-purple-500 resize-y leading-relaxed font-sans transition-all"
                  />
                </div>

                {/* Customized Instructions */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>Customized Instructions</span>
                      <button
                        type="button"
                        onClick={() => onShowToast?.("📜 Customized Instructions", "Primary behavioral directive for Nyx. Sets narration style, emotional tone, NPC attitude rules, DM authority level, and dialogue pacing guides.", "info")}
                        className="text-slate-500 hover:text-purple-300 font-bold px-1"
                        title="How AI treats Customized Instructions"
                      >
                        ?
                      </button>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleInlineRows("customInstructions")}
                        className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors font-mono cursor-pointer"
                        title={expandedInlineRows.customInstructions ? "Collapse inline rows" : "Expand inline rows"}
                      >
                        {expandedInlineRows.customInstructions ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        <span className="text-[9px]">{expandedInlineRows.customInstructions ? "Compact" : "Tall"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedModalField({
                          id: "customInstructions",
                          title: "📜 Customized Instructions & Behavioral Directives",
                          description: "Primary behavioral directive for Nyx. Defines narration style, emotional intensity, NPC decision-making rules, pacing, and response guidelines.",
                          badge: "System Core Directive"
                        })}
                        className="text-[10px] text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors font-mono font-semibold cursor-pointer"
                        title="Expand to Full-Screen Editor"
                      >
                        <Maximize2 size={10} /> Expand
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="setting-field-customInstructions"
                    value={localCustomInstructions}
                    onFocus={() => setFocusedField("customInstructions")}
                    onBlur={() => handleFieldBlur("customInstructions", localCustomInstructions)}
                    onChange={(e) => setLocalCustomInstructions(e.target.value)}
                    placeholder="Narration style, emotional tone, pacing guides..."
                    rows={expandedInlineRows.customInstructions ? 14 : 6}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-purple-500 resize-y leading-relaxed font-sans transition-all"
                  />
                </div>

                {/* Canon Source & Style Guide */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>Canon Style Guide</span>
                      <button
                        type="button"
                        onClick={() => onShowToast?.("📖 Canon Style Guide", "Enforces strict canonical lore boundaries, forbidden tropes, world physics rules, aesthetic guidelines, and formatting consistency across all turns.", "info")}
                        className="text-slate-500 hover:text-purple-300 font-bold px-1"
                        title="How AI treats Canon Style Guide"
                      >
                        ?
                      </button>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleInlineRows("styleGuide")}
                        className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors font-mono cursor-pointer"
                        title={expandedInlineRows.styleGuide ? "Collapse inline rows" : "Expand inline rows"}
                      >
                        {expandedInlineRows.styleGuide ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        <span className="text-[9px]">{expandedInlineRows.styleGuide ? "Compact" : "Tall"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedModalField({
                          id: "styleGuide",
                          title: "📖 Canon Style Guide & Lore Boundaries",
                          description: "Enforces strict canonical lore boundaries, forbidden tropes, world physics rules, aesthetic guidelines, and tone consistency.",
                          badge: "Canon Enforcement"
                        })}
                        className="text-[10px] text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors font-mono font-semibold cursor-pointer"
                        title="Expand to Full-Screen Editor"
                      >
                        <Maximize2 size={10} /> Expand
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="setting-field-styleGuide"
                    value={localStyleGuide}
                    onFocus={() => setFocusedField("styleGuide")}
                    onBlur={() => handleFieldBlur("styleGuide", localStyleGuide)}
                    onChange={(e) => setLocalStyleGuide(e.target.value)}
                    placeholder="Tone consistency guides, formatting restrictions..."
                    rows={expandedInlineRows.styleGuide ? 14 : 6}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-purple-500 resize-y leading-relaxed font-sans transition-all"
                  />
                </div>

                {/* Grounded Campaign Sources */}
                {project.sources && project.sources.length > 0 && (() => {
                  const sourcesList: LoreSource[] = project.sources;
                  const counts = sourcesList.reduce(
                    (acc, src) => {
                      const st = getSourceProcessingState(src);
                      acc[st] = (acc[st] || 0) + 1;
                      return acc;
                    },
                    { untouched: 0, working: 0, done_attached: 0 }
                  );

                  return (
                    <div className="border-t border-slate-800 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                          Campaign Sources ({sourcesList.length})
                        </span>
                        <div className="flex items-center gap-1 text-[8.5px] font-mono">
                          <span className="text-emerald-400 font-bold" title="Done & Attached">🟢 {counts.done_attached}</span>
                          <span className="text-amber-300 font-bold" title="Working / Processing">🟡 {counts.working}</span>
                          <span className="text-red-400 font-bold" title="Untouched / Unattached">🔴 {counts.untouched}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                        {sourcesList.map((src: LoreSource) => (
                          <div 
                            key={src.id} 
                            className="p-2 rounded-lg text-[11px] font-mono flex justify-between items-center transition-all bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-200"
                          >
                            <span className="truncate pr-2 flex items-center gap-1.5 text-[11px] font-mono" title={src.name}>
                              {src.type === "gdoc" ? "📄" : src.type === "url" ? "🌐" : "📓"} {src.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <LoreSourceStatusBadge
                                source={src}
                                size="sm"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  const updated = sourcesList.filter((s) => s.id !== src.id);
                                  await onSetProjectValue("sources", updated);
                                }}
                                className="text-slate-500 hover:text-red-400 transition-colors font-sans ml-1 text-xs leading-none font-bold p-1 hover:bg-slate-850 rounded cursor-pointer"
                                title="Remove source from campaign"
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}

            {/* Cast of Characters & campaign lore database */}
            {leftTab === "cast" && (() => {
              const loreTypes = [
                { id: "pc" as const, label: "PC", icon: User, color: "text-blue-400" },
                { id: "companion" as const, label: "Companion", icon: Heart, color: "text-pink-400" },
                { id: "npc" as const, label: "NPC", icon: Ghost, color: "text-red-400" },
                { id: "chronicle" as const, label: "Chronicle", icon: Scroll, color: "text-amber-400" },
                { id: "location" as const, label: "Locations", icon: MapPin, color: "text-emerald-400" },
                { id: "vehicle" as const, label: "Vehicles", icon: Rocket, color: "text-purple-400" },
                { id: "equipment" as const, label: "Equipment", icon: Shield, color: "text-teal-400" },
                { id: "faction" as const, label: "Factions", icon: Flag, color: "text-pink-400" }
              ];

              const filteredEntities = characters.filter(c => {
                const type = c.type || (c.isPlayerCharacter ? "pc" : "npc");
                return type === loreTab;
              });

              const meta = {
                pc: {
                  title: "Player Character (PC)",
                  btnLabel: "Add Player Character",
                  nameLabel: "Character Name",
                  namePlace: "e.g., Captain Han Solo",
                  roleLabel: "Role / Specialization",
                  rolePlace: "e.g., Smuggler / Scoundrel",
                  descLabel: "Biography & Core Traits",
                  descPlace: "Quick biography, appearance description, core motives...",
                  relLabel: "Relationships & Allies",
                  relPlace: "Key relationships, companion logs, allies or rivals...",
                  statusLabel: "Current Situation & Narrative State",
                  statusPlace: "e.g., Fatigue setting in, Carbonite sickness recovery, coordinates unknown...",
                  factionLabel: "Affiliation / Faction",
                  factionPlace: "e.g., Alliance to Restore the Republic"
                },
                companion: {
                  title: "Companion (Expanded NPC with Romance/Relationships)",
                  btnLabel: "Add Companion Profile",
                  nameLabel: "Companion Name",
                  namePlace: "e.g., Raven / Bastila Shan",
                  roleLabel: "Companion Role",
                  rolePlace: "e.g., Jedi Guardian, Rogue Pilot, Tech Support",
                  descLabel: "Traits, Personality & Quests",
                  descPlace: "Personality quirks, personal questline details, liked/disliked behavior...",
                  relLabel: "Direct Relationship Status & Standing",
                  relPlace: "Openness cues, general affection level, special bond notes...",
                  statusLabel: "Current Disposition / Active State",
                  statusPlace: "e.g., Flirtatious but cautious, deeply loyal, upset about last decision...",
                  factionLabel: "Affiliation / Origin",
                  factionPlace: "e.g., Jedi Order, Rebel Alliance"
                },
                npc: {
                  title: "Non-Player Character (NPC)",
                  btnLabel: "Add NPC Profile",
                  nameLabel: "NPC Name",
                  namePlace: "e.g., Jabba the Hutt",
                  roleLabel: "Role / Narrative Function",
                  rolePlace: "e.g., Crime Lord, Merchant, Assassin",
                  descLabel: "Traits & Secrets",
                  descPlace: "Visual traits, background notes, personality, secret motives...",
                  relLabel: "Factions & Relationships",
                  relPlace: "Alliances, rivalries, gang hierarchy standing...",
                  statusLabel: "Current Situation & Narrative State",
                  statusPlace: "e.g., Looking for a quick escape, suspicious of the group, hiding in the crowd...",
                  factionLabel: "Affiliation / Syndicate",
                  factionPlace: "e.g., Hutt Cartel"
                },
                chronicle: {
                  title: "Chronicle / Quest Log",
                  btnLabel: "Add Chronicle Entry",
                  nameLabel: "Chronicle Title",
                  namePlace: "e.g., The Battle of Hoth",
                  roleLabel: "Focus / Quest Type",
                  rolePlace: "e.g., Main Campaign Arc, Legendary Tale",
                  descLabel: "Chronicle Log & Events",
                  descPlace: "Summary of events, timeline of occurrences, and campaign outcomes...",
                  relLabel: "Involved Figures & Cast",
                  relPlace: "Key heroes, factions, or villains involved in this chronicle...",
                  statusLabel: "Chronicle Phase / Era",
                  statusPlace: "e.g., Completed, Ongoing, Mythic History...",
                  factionLabel: "Focus System / Region",
                  factionPlace: "e.g., Hoth System, Outer Rim"
                },
                location: {
                  title: "Location Profile",
                  btnLabel: "Add Location",
                  nameLabel: "Location Name",
                  namePlace: "e.g., Mos Eisley Cantina",
                  roleLabel: "Location Type",
                  rolePlace: "e.g., Starport Tavern, Outer Rim Planet",
                  descLabel: "Environment & Atmosphere",
                  descPlace: "Physical features, ambient temperature, layout description, and sensory details...",
                  relLabel: "Key Inhabitants & Establishments",
                  relPlace: "Local rulers, businesses, resident NPCs, or faction headquarters...",
                  statusLabel: "Active Situation & Conditions",
                  statusPlace: "e.g., Safe and stable, active storm raging, under space blockade...",
                  factionLabel: "Controlling Faction / Guild",
                  factionPlace: "e.g., Hutt Cartel, Imperial Guard"
                },
                vehicle: {
                  title: "Vehicle / Spacecraft / Mount",
                  btnLabel: "Add Vehicle",
                  nameLabel: "Vehicle Name",
                  namePlace: "e.g., Millennium Falcon",
                  roleLabel: "Class / Chassis Model",
                  rolePlace: "e.g., YT-1300 Light Freighter, Speeder Bike",
                  descLabel: "Description & Layout",
                  descPlace: "Structural layout, custom retrofits, unique quirks, storage, sensory details...",
                  relLabel: "Crew & Ownership",
                  relPlace: "Owner name, active pilot, and registered crew...",
                  statusLabel: "Current Condition & Narrative State",
                  statusPlace: "e.g., Hyperdrive leaking plasma, engine has a sputtering ignition sound, pristine cabin...",
                  factionLabel: "Registry / Affiliation",
                  factionPlace: "e.g., Independent, Smuggler Alliance"
                },
                equipment: {
                  title: "Equipment & Artifacts",
                  btnLabel: "Add Equipment",
                  nameLabel: "Item Name",
                  namePlace: "e.g., Skywalker Lightsaber",
                  roleLabel: "Category / Classification",
                  rolePlace: "e.g., Plasma Blade, Heavy Blaster Pistol, Datapad",
                  descLabel: "Item Specs & Capabilities",
                  descPlace: "Visual description, unique history, specialized function, and sensory signs...",
                  relLabel: "Current Possessor",
                  relPlace: "Current owner, carrier, or historical origin...",
                  statusLabel: "Current Status / Narrative Integrity",
                  statusPlace: "e.g., Slightly tarnished, humming with energy, missing safety lock...",
                  factionLabel: "Manufacturer",
                  factionPlace: "e.g., Corellian Engineering, Ancient Jedi"
                },
                faction: {
                  title: "Faction & Institution",
                  btnLabel: "Add Faction Profile",
                  nameLabel: "Faction Name",
                  namePlace: "e.g., Galactic Empire",
                  roleLabel: "Structure / Ideology",
                  rolePlace: "e.g., Authoritarian Regime, Bounty Hunter Guild",
                  descLabel: "Goals, Resources & Influence",
                  descPlace: "Primary objectives, military scale, assets, territory description...",
                  relLabel: "Key Leaders & Headquarters",
                  relPlace: "Faction leaders, notable members, and primary planet/base...",
                  statusLabel: "Territory Control & Standing",
                  statusPlace: "e.g., Sovereign control, Core systems, Shadowy presence...",
                  factionLabel: "Allied/Rival Syndicates",
                  factionPlace: "e.g., Rebel Alliance (Rival)"
                }
              }[loreTab];

              return (
                <div className="space-y-4">

                  {/* Category Tabs */}
                  <div className="flex gap-1.5 pb-2 overflow-x-auto no-scrollbar scroll-smooth border-b border-slate-900/80 -mx-1 px-1">
                    {loreTypes.map(tab => {
                      const TabIcon = tab.icon;
                      const tabCount = characters.filter(c => {
                        const type = c.type || (c.isPlayerCharacter ? "pc" : "npc");
                        return type === tab.id;
                      }).length;
                      const isSelected = loreTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setLoreTab(tab.id);
                            setShowRegisterActor(false);
                            resetCreationForm();
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-[10.5px] font-medium flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap border ${
                            isSelected 
                              ? "bg-slate-900 border-purple-500/50 text-purple-300 shadow-sm shadow-purple-950/40" 
                              : "bg-slate-950/40 border-slate-850/60 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                          }`}
                        >
                          <TabIcon size={12} className={tab.color} />
                          <span>{tab.label}</span>
                          <span className={`px-1 py-0.2 rounded text-[8.5px] font-mono font-semibold ${
                            isSelected ? "bg-purple-950/80 text-purple-300" : "bg-slate-900 text-slate-500"
                          }`}>
                            {tabCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Canon & Narrative Delta Studio Quick Launcher */}
                  <div className="p-3 bg-gradient-to-br from-teal-950/40 via-slate-900/60 to-slate-950 border border-teal-800/40 rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="p-1.5 rounded-lg bg-teal-950/80 border border-teal-800/60 text-teal-400 shrink-0">
                          <Globe size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-100 block truncate">Canon Delta Studio</span>
                          <span className="text-[9px] text-teal-400 font-mono block truncate">Wiki & Logs Engine</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCanonStudioTargetChar(null);
                          setShowCanonDeltaStudio(true);
                        }}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-all shadow cursor-pointer flex items-center gap-1.5 shrink-0"
                        title="Open Canon & Narrative Delta Studio"
                      >
                        <Globe size={12} />
                        <span>Open Studio</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Search online canon wiki, harvest campaign logs, and reconcile prequel & adaptation deltas.
                    </p>
                  </div>

                  {/* Filtered Entities List */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Active {loreTab.toUpperCase()} Records
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {filteredEntities.length} entry/entries
                      </span>
                    </div>

                    {filteredEntities.length === 0 ? (
                      <p className="text-xs text-slate-500 italic bg-slate-950/30 p-3 rounded-lg border border-slate-900/60 text-center">
                        No {loreTab.toUpperCase()} entities registered yet. Click below to add!
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredEntities.map(char => {
                          const hasPortrait = char.portraitUrl && char.portraitUrl !== "";
                          const isExpanded = expandedEntityId === char.id;
                          const isEditing = editingEntityId === char.id;

                          return (
                            <div id={`entity-card-${char.id}`} key={char.id} className="bg-slate-950/80 rounded-lg border border-slate-850/60 overflow-hidden hover:border-slate-800/80 transition-all">
                              {/* Summary / Top bar row */}
                              <div
                                onClick={() => {
                                  if (isEditing) return; // disable closing while in edit mode
                                  setExpandedEntityId(isExpanded ? null : char.id);
                                }}
                                className="p-2.5 flex items-center justify-between gap-2 cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {hasPortrait ? (
                                    renderPortrait(char.portraitUrl, char.name, "w-8 h-8 shrink-0", char)
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-slate-900 border border-slate-850 flex items-center justify-center shrink-0">
                                      {(() => {
                                        const tabMeta = loreTypes.find(t => t.id === loreTab);
                                        if (tabMeta) {
                                          const TabIcon = tabMeta.icon;
                                          return <TabIcon size={12} className={tabMeta.color} />;
                                        }
                                        return <User size={12} className="text-slate-400" />;
                                      })()}
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1 pr-1">
                                    <p className="text-xs font-semibold text-slate-100 truncate flex items-center gap-1.5" title={char.name}>
                                      <span className="truncate">{char.name}</span>
                                      {char.isMook && <span className="bg-red-950/40 text-red-400 border border-red-900/30 text-[7px] px-1 py-0.2 rounded font-mono shrink-0">MOOK</span>}
                                    </p>
                                    <p className="text-[9px] text-purple-400 truncate font-mono">{char.role || "Standard"}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {loreTab === "pc" && (
                                    <button
                                      type="button"
                                      onClick={() => onSetProjectValue("activeCharacterId", char.id)}
                                      className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all border ${
                                        project.activeCharacterId === char.id
                                          ? "bg-purple-900/60 text-purple-300 border-purple-500/50 shadow-sm"
                                          : "bg-slate-900 text-slate-500 border-slate-850 hover:text-slate-300"
                                      }`}
                                      title={project.activeCharacterId === char.id ? "Active PC for prompts" : "Set as active PC for prompts"}
                                    >
                                      {project.activeCharacterId === char.id ? "★ PC" : "Set PC"}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const newStatus = !char.isInScene;
                                      const updated = characters.map(c => c.id === char.id ? { ...c, isInScene: newStatus } : c);
                                      await onSetProjectValue("characters", updated);
                                    }}
                                    className={`px-2 py-0.5 rounded-full text-[8.5px] font-mono font-medium transition-all cursor-pointer border flex items-center gap-1 ${
                                      char.isInScene
                                        ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-sm"
                                        : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                                    }`}
                                    title={char.isInScene ? "In-Scene: Actively present in current narrative scene" : "In-World: Stored in lorebook"}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${char.isInScene ? "bg-emerald-400" : "bg-slate-500"}`} />
                                    <span>{char.isInScene ? "In Scene" : "In World"}</span>
                                  </button>
                                  <button
                                    onClick={() => onDeleteCharacter(char.id)}
                                    className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-colors"
                                    title={`Delete this ${loreTab}`}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                  <span className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors">
                                    <ChevronDown size={13} className={`transform transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`} />
                                  </span>
                                </div>
                              </div>

                              {/* Details Summary & Inline Editor Drawer */}
                              {isExpanded && (
                                <div className="border-t border-slate-900 p-2.5 bg-slate-950/50 space-y-3 text-xs">
                                  {isEditing ? (
                                    /* Inline edit mode form fields */
                                    <div className="space-y-2.5">
                                      <div>
                                        <div className="flex justify-between items-center mb-0.5">
                                          <label className="block text-[8px] uppercase tracking-wider text-slate-500 font-mono">Name</label>
                                          <button
                                            type="button"
                                            onClick={() => setEditingLockedFields({ ...editingLockedFields, name: !editingLockedFields.name })}
                                            className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                                            title={editingLockedFields.name ? "Unlock field" : "Lock field"}
                                          >
                                            {editingLockedFields.name ? <Lock size={9} className="text-purple-400" /> : <Unlock size={9} />}
                                          </button>
                                        </div>
                                        <input
                                          type="text"
                                          value={editName}
                                          onChange={(e) => setEditName(e.target.value)}
                                          readOnly={editingLockedFields.name}
                                          className={`w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-purple-500 ${editingLockedFields.name ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[8px] uppercase tracking-wider text-purple-400 font-mono mb-0.5">Record Lore Category</label>
                                        <select
                                          value={editType}
                                          onChange={(e) => setEditType(e.target.value as any)}
                                          className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-purple-500 font-mono mb-2"
                                        >
                                          <option value="pc">Player Character (PC)</option>
                                          <option value="companion">Companion</option>
                                          <option value="npc">NPC</option>
                                          <option value="chronicle">Chronicle / Quest Log</option>
                                          <option value="location">Location</option>
                                          <option value="vehicle">Vehicle / Spacecraft</option>
                                          <option value="equipment">Equipment & Artifacts</option>
                                          <option value="faction">Faction & Institution</option>
                                        </select>
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-0.5">
                                          <label className="block text-[8px] uppercase tracking-wider text-slate-500 font-mono">Category / Subtype</label>
                                          <button
                                            type="button"
                                            onClick={() => setEditingLockedFields({ ...editingLockedFields, role: !editingLockedFields.role })}
                                            className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                                            title={editingLockedFields.role ? "Unlock field" : "Lock field"}
                                          >
                                            {editingLockedFields.role ? <Lock size={9} className="text-purple-400" /> : <Unlock size={9} />}
                                          </button>
                                        </div>
                                        <input
                                          type="text"
                                          value={editRole}
                                          onChange={(e) => setEditRole(e.target.value)}
                                          readOnly={editingLockedFields.role}
                                          className={`w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-purple-500 ${editingLockedFields.role ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                                        />
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-0.5">
                                          <label className="block text-[8px] uppercase tracking-wider text-slate-500 font-mono">Description / Bio / Specs</label>
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => setExpandedModalField({
                                                id: `char-desc-${char.id}`,
                                                title: `👤 ${editName || 'Entity'} — Bio & Description`,
                                                description: "Physical appearance, key traits, speech quirks, and visual profile.",
                                                badge: "Entity Bio"
                                              })}
                                              className="text-[9px] text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors font-mono cursor-pointer"
                                              title="Expand Bio Editor"
                                            >
                                              <Maximize2 size={9} /> Expand
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingLockedFields({ ...editingLockedFields, description: !editingLockedFields.description })}
                                              className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                                              title={editingLockedFields.description ? "Unlock field" : "Lock field"}
                                            >
                                              {editingLockedFields.description ? <Lock size={9} className="text-purple-400" /> : <Unlock size={9} />}
                                            </button>
                                          </div>
                                        </div>
                                        <textarea
                                          value={editDesc}
                                          onChange={(e) => setEditDesc(e.target.value)}
                                          readOnly={editingLockedFields.description}
                                          rows={3}
                                          className={`w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 resize-y font-sans ${editingLockedFields.description ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                                        />
                                      </div>

                                      <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-850 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <span className="block text-[8.5px] uppercase tracking-wider text-emerald-400 font-mono font-bold">Active Scene Presence (In-Scene)</span>
                                            <p className="text-[9px] text-slate-400">When enabled, this entity receives top-tier persistent injection in the scene.</p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setEditIsInScene(!editIsInScene)}
                                            className={`px-2 py-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer border ${
                                              editIsInScene
                                                ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm"
                                                : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                                            }`}
                                          >
                                            {editIsInScene ? "🟢 In Scene (Active)" : "⚪ In World (Lorebook)"}
                                          </button>
                                        </div>

                                        <div>
                                          <label className="block text-[8px] uppercase tracking-wider text-purple-400 font-mono mb-0.5">
                                            Keyword Activation Triggers (Comma separated)
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="e.g. Captain, smuggler, Millennium Falcon, Tatooine..."
                                            value={editActivationKeys}
                                            onChange={(e) => setEditActivationKeys(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-purple-500 font-mono"
                                          />
                                          <p className="text-[8px] text-slate-500 mt-0.5">When these words appear in recent turns, this entity is dynamically injected into memory.</p>
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-0.5">
                                          <label className="block text-[8px] uppercase tracking-wider text-slate-500 font-mono">Faction Name</label>
                                          <button
                                            type="button"
                                            onClick={() => setEditingLockedFields({ ...editingLockedFields, factionName: !editingLockedFields.factionName })}
                                            className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                                            title={editingLockedFields.factionName ? "Unlock field" : "Lock field"}
                                          >
                                            {editingLockedFields.factionName ? <Lock size={9} className="text-purple-400" /> : <Unlock size={9} />}
                                          </button>
                                        </div>
                                        <input
                                          type="text"
                                          value={editFactionName}
                                          onChange={(e) => setEditFactionName(e.target.value)}
                                          readOnly={editingLockedFields.factionName}
                                          className={`w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-purple-500 ${editingLockedFields.factionName ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                                        />
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-0.5">
                                          <label className="block text-[8px] uppercase tracking-wider text-slate-500 font-mono">Relationships & Allies</label>
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => setExpandedModalField({
                                                id: `char-rel-${char.id}`,
                                                title: `👤 ${editName || 'Entity'} — Relationships & Allies`,
                                                description: "Alliances, rivalries, family connections, and faction standing.",
                                                badge: "Relationships"
                                              })}
                                              className="text-[9px] text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors font-mono cursor-pointer"
                                              title="Expand Relationships Editor"
                                            >
                                              <Maximize2 size={9} /> Expand
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingLockedFields({ ...editingLockedFields, relationships: !editingLockedFields.relationships })}
                                              className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                                              title={editingLockedFields.relationships ? "Unlock field" : "Lock field"}
                                            >
                                              {editingLockedFields.relationships ? <Lock size={9} className="text-purple-400" /> : <Unlock size={9} />}
                                            </button>
                                          </div>
                                        </div>
                                        <textarea
                                          value={editRelationships}
                                          onChange={(e) => setEditRelationships(e.target.value)}
                                          readOnly={editingLockedFields.relationships}
                                          rows={2}
                                          className={`w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 resize-y font-sans ${editingLockedFields.relationships ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                                        />
                                      </div>

                                      {(char.type === "pc" || char.type === "npc" || !char.type) && (
                                        <div>
                                          <div className="flex justify-between items-center mb-0.5">
                                            <label className="block text-[8px] uppercase tracking-wider text-amber-500 font-mono">Signature Items & Gear (Part of Identity)</label>
                                            <div className="flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => setExpandedModalField({
                                                  id: `char-sig-${char.id}`,
                                                  title: `🗡️ ${editName || 'Entity'} — Signature Items & Gear`,
                                                  description: "Identifiable gear, weapons, relics, or key belongings.",
                                                  badge: "Signature Equipment"
                                                })}
                                                className="text-[9px] text-amber-400 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors font-mono cursor-pointer"
                                                title="Expand Items Editor"
                                              >
                                                <Maximize2 size={9} /> Expand
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingLockedFields({ ...editingLockedFields, signatureItems: !editingLockedFields.signatureItems })}
                                                className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                                                title={editingLockedFields.signatureItems ? "Unlock field" : "Lock field"}
                                              >
                                                {editingLockedFields.signatureItems ? <Lock size={9} className="text-purple-400" /> : <Unlock size={9} />}
                                              </button>
                                            </div>
                                          </div>
                                          <textarea
                                            placeholder="e.g. Custom blaster, heirloom pocket watch, signature cowboy hat, arcane focus..."
                                            value={editSignatureItems}
                                            onChange={(e) => setEditSignatureItems(e.target.value)}
                                            readOnly={editingLockedFields.signatureItems}
                                            rows={2}
                                            className={`w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 resize-y font-sans ${editingLockedFields.signatureItems ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                                          />
                                        </div>
                                      )}

                                      {(char.type === "pc" || char.type === "npc" || !char.type) && (
                                        <div>
                                          <div className="flex justify-between items-center mb-0.5">
                                            <label className="block text-[8px] uppercase tracking-wider text-teal-400 font-mono">Character Backstory (Detailed Block)</label>
                                            <div className="flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => setExpandedModalField({
                                                  id: `char-backstory-${char.id}`,
                                                  title: `📜 ${editName || 'Entity'} — Backstory Block`,
                                                  description: "Detailed long-form backstory block for this character.",
                                                  badge: "Character Lore"
                                                })}
                                                className="text-[9px] text-teal-400 hover:text-teal-200 bg-teal-950/40 hover:bg-teal-900/60 border border-teal-800/40 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors font-mono cursor-pointer"
                                                title="Expand Backstory Editor"
                                              >
                                                <Maximize2 size={9} /> Expand
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingLockedFields({ ...editingLockedFields, backstory: !editingLockedFields.backstory })}
                                                className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                                                title={editingLockedFields.backstory ? "Unlock field" : "Lock field"}
                                              >
                                                {editingLockedFields.backstory ? <Lock size={9} className="text-purple-400" /> : <Unlock size={9} />}
                                              </button>
                                            </div>
                                          </div>
                                          <textarea
                                            placeholder="Write long-form backstory block here... (Note: Keeps narrative history cleanly segregated, preventing companion omniscience)"
                                            value={editBackstory}
                                            onChange={(e) => setEditBackstory(e.target.value)}
                                            readOnly={editingLockedFields.backstory}
                                            rows={4}
                                            className={`w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 font-sans resize-y ${editingLockedFields.backstory ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                                          />
                                        </div>
                                      )}

                                      {(char.type === "pc" || char.isPlayerCharacter) && (
                                        <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60 space-y-2.5">
                                          <div className="flex justify-between items-center">
                                            <span className="block text-[8px] uppercase tracking-wider text-pink-400 font-mono font-bold">
                                              Romance & NPC Relationships Tracker
                                            </span>
                                          </div>
                                          {(!editRomanceTracks || editRomanceTracks.length === 0) ? (
                                            <p className="text-[9px] text-slate-500 italic">No companion relationships tracked yet.</p>
                                          ) : (
                                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                              {editRomanceTracks.map((track, idx) => (
                                                <div key={track.id || idx} className="bg-slate-950/85 p-2 rounded border border-slate-900 space-y-1 relative">
                                                  <button
                                                    type="button"
                                                    onClick={() => setEditRomanceTracks(editRomanceTracks.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 text-slate-500 hover:text-red-400 p-0.5 transition-colors"
                                                    title="Remove NPC Relation"
                                                  >
                                                    <Trash2 size={9} />
                                                  </button>
                                                  <div className="text-[10px] font-bold text-slate-200">{track.npcName}</div>
                                                  <div className="text-[9px] text-pink-400/90 leading-normal">
                                                    <span className="text-slate-500 text-[8px] uppercase font-mono mr-1">Status:</span> {track.relationshipStatus}
                                                  </div>
                                                  <div className="text-[9px] text-slate-300 leading-normal">
                                                    <span className="text-slate-500 text-[8px] uppercase font-mono mr-1">Milestones:</span> {track.milestones}
                                                  </div>
                                                  <div className="text-[9px] text-slate-400 leading-normal">
                                                    <span className="text-slate-500 text-[8px] uppercase font-mono mr-1">Openness:</span> {track.openness}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {/* Add NPC relation inline block */}
                                          <div className="border-t border-slate-900/60 pt-2 space-y-1.5">
                                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">+ Record Relation with NPC</span>
                                            <div className="grid grid-cols-2 gap-1.5">
                                              <input
                                                type="text"
                                                placeholder="NPC Name (e.g. Raven)"
                                                value={editRelName}
                                                onChange={(e) => setEditRelName(e.target.value)}
                                                className="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-[10px] text-slate-200 outline-none focus:border-purple-500"
                                              />
                                              <input
                                                type="text"
                                                placeholder="Relation (e.g. Trusting)"
                                                value={editRelStatus}
                                                onChange={(e) => setEditRelStatus(e.target.value)}
                                                className="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-[10px] text-slate-200 outline-none focus:border-purple-500"
                                              />
                                            </div>
                                            <textarea
                                              placeholder="Milestones (e.g. First kiss - Ep 2, Saved by PC - Ep 4)"
                                              value={editRelMilestones}
                                              onChange={(e) => setEditRelMilestones(e.target.value)}
                                              rows={1}
                                              className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-[10px] text-slate-200 outline-none focus:border-purple-500 font-sans resize-none"
                                            />
                                            <input
                                              type="text"
                                              placeholder="Openness/Affection cues (e.g. hugs, flirting)"
                                              value={editRelOpenness}
                                              onChange={(e) => setEditRelOpenness(e.target.value)}
                                              className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-[10px] text-slate-200 outline-none focus:border-purple-500"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (!editRelName.trim()) return;
                                                const newTrack: RelationshipTrack = {
                                                  id: `track-${Date.now()}`,
                                                  npcName: editRelName.trim(),
                                                  relationshipStatus: editRelStatus.trim() || "Neutral",
                                                  milestones: editRelMilestones.trim() || "None",
                                                  openness: editRelOpenness.trim() || "Standard"
                                                };
                                                setEditRomanceTracks([...(editRomanceTracks || []), newTrack]);
                                                setEditRelName("");
                                                setEditRelStatus("");
                                                setEditRelMilestones("");
                                                setEditRelOpenness("");
                                              }}
                                              className="w-full py-1 text-[9px] bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded text-amber-400 font-semibold transition-colors"
                                            >
                                              Add Relation Track
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Inline Custom Fields Editing */}
                                      {(() => {
                                        const defaultFields = getSettingSpecificDefaultFields(char.type || "pc", project?.setting);
                                        const customFieldKeys = Object.keys(editCustomFields).filter(k => !defaultFields.includes(k));
                                        const allFields = [...defaultFields, ...customFieldKeys];

                                        return (
                                          <div className="space-y-2 border-t border-slate-900 pt-2">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-mono">Custom Category Specifications</span>
                                              <button
                                                type="button"
                                                onClick={() => handleAiAutoFillEditEntity(true)}
                                                disabled={isAiGeneratingEditEntity}
                                                className="flex items-center gap-1 text-[8px] font-mono px-2 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-800/60 text-purple-300 transition-colors shadow-sm disabled:opacity-50"
                                                title="Auto-fill empty specification fields using AI"
                                              >
                                                {isAiGeneratingEditEntity ? <Sparkles size={8} className="animate-spin text-purple-400" /> : <Sparkles size={8} className="text-purple-400" />}
                                                {isAiGeneratingEditEntity ? "Populating..." : "✨ Auto-Fill Specs"}
                                              </button>
                                            </div>
                                            <div className="space-y-2">
                                              {allFields.map(fieldName => {
                                                const isCustom = !defaultFields.includes(fieldName);
                                                const isLocked = !!editingLockedFields[fieldName];
                                                return (
                                                  <div key={fieldName}>
                                                    <div className="flex justify-between items-center mb-0.5">
                                                      <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-mono">
                                                        {fieldName} {isCustom && <span className="text-purple-500 font-mono text-[7px] lowercase">(custom)</span>}
                                                      </label>
                                                      <div className="flex items-center gap-1.5">
                                                        <button
                                                          type="button"
                                                          onClick={() => setEditingLockedFields({ ...editingLockedFields, [fieldName]: !isLocked })}
                                                          className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                                                          title={isLocked ? "Unlock field" : "Lock field"}
                                                        >
                                                          {isLocked ? <Lock size={9} className="text-purple-400" /> : <Unlock size={9} />}
                                                        </button>
                                                        {isCustom && (
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              const updated = { ...editCustomFields };
                                                              delete updated[fieldName];
                                                              setEditCustomFields(updated);
                                                            }}
                                                            className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                                                            title="Remove custom field"
                                                          >
                                                            <Trash2 size={9} />
                                                          </button>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <textarea
                                                      value={editCustomFields[fieldName] || ""}
                                                      onChange={(e) => setEditCustomFields({ ...editCustomFields, [fieldName]: e.target.value })}
                                                      readOnly={isLocked}
                                                      rows={2}
                                                      className={`w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 font-sans resize-none ${isLocked ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                                                    />
                                                  </div>
                                                );
                                              })}
                                            </div>

                                            {/* Create dynamic field while editing */}
                                            <div className="pt-2 border-t border-slate-900/60">
                                              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                + Create Custom Field
                                              </span>
                                              <div className="flex gap-1.5">
                                                <input
                                                  type="text"
                                                  placeholder="e.g. Backstory Secrets, Specs..."
                                                  value={newFieldNameEditing}
                                                  onChange={(e) => setNewFieldNameEditing(e.target.value)}
                                                  className="flex-1 bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-300 outline-none focus:border-purple-500"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (!newFieldNameEditing.trim()) return;
                                                    setEditCustomFields({ ...editCustomFields, [newFieldNameEditing.trim()]: "" });
                                                    setNewFieldNameEditing("");
                                                  }}
                                                  className="px-2 py-0.5 text-[9px] bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 font-semibold transition-colors"
                                                >
                                                  Add Field
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}

                                      {/* Attached Photo/File in Edit Mode */}
                                      <div className="space-y-2 border-t border-slate-900 pt-2">
                                        <span className="block text-[8px] uppercase tracking-wider text-purple-400 font-mono font-bold flex items-center gap-1">
                                          <Camera size={10} /> Attached Photo / Visual File
                                        </span>
                                        <p className="text-[9px] text-slate-500">Attach or edit the image of this campaign record (e.g. your ship, weapon, or character):</p>
                                        <div className="space-y-2">
                                          <select
                                            value={editPortraitType}
                                            onChange={(e) => setEditPortraitType(e.target.value as any)}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-purple-500"
                                          >
                                            <option value="upload">Upload Photo from device...</option>
                                            <option value="url">Custom Image URL...</option>
                                          </select>

                                          {editPortraitType === "upload" && (
                                            <div className="flex flex-col gap-1.5">
                                              <label className="flex items-center gap-2 justify-center w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 border-dashed rounded-lg p-2 cursor-pointer transition-all">
                                                <Upload size={14} className="text-slate-400" />
                                                <span className="text-[11px] text-slate-400 font-medium">Choose image file</span>
                                                <input 
                                                  type="file" 
                                                  accept="image/*" 
                                                  onChange={handleEditDeviceFileUpload} 
                                                  className="hidden" 
                                                />
                                              </label>
                                              <GooglePickerButton
                                                googleToken={googleToken}
                                                onGoogleSignIn={onGoogleSignIn}
                                                onFilePicked={(file) => setEditPortraitUrl(file.data)}
                                                onShowToast={onShowToast}
                                                mode="image"
                                                buttonSize="sm"
                                                className="w-full justify-center"
                                                label="Select from Drive / Photos"
                                              />
                                            </div>
                                          )}

                                          {editPortraitType === "url" && (
                                            <input
                                              type="text"
                                              placeholder="https://image-link.com/photo.png"
                                              value={editPortraitUrl}
                                              onChange={(e) => setEditPortraitUrl(e.target.value)}
                                              className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-[11px] text-slate-300 outline-none focus:border-purple-500 font-mono"
                                            />
                                          )}

                                          {editPortraitUrl && (
                                            <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded border border-slate-850 justify-between">
                                              <div className="flex items-center gap-2">
                                                <img src={editPortraitUrl} className="w-10 h-10 rounded object-cover" />
                                                <div>
                                                  <span className="text-[10px] text-slate-300 font-medium block">Current Attachment</span>
                                                  <span className="text-[8px] text-slate-500 font-mono block max-w-[120px] truncate">{editPortraitUrl.startsWith("data:") ? "Uploaded Base64 File" : editPortraitUrl}</span>
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setEditPortraitUrl("")}
                                                className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                                                title="Remove image attachment"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Connection Selector in Edit Mode */}
                                      <div className="space-y-2 border-t border-slate-900 pt-2">
                                        <span className="block text-[8px] uppercase tracking-wider text-purple-400 font-mono font-bold flex items-center gap-1">
                                          <ArrowLeftRight size={10} /> Linked Lore & Connections
                                        </span>
                                        <p className="text-[9px] text-slate-500">Select other lore entries to connect to this record:</p>
                                        {characters.filter(c => c.id !== char.id).length === 0 ? (
                                          <p className="text-[9px] text-slate-500 italic">No other lore entries exist to link with.</p>
                                        ) : (
                                          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 bg-slate-950/60 rounded border border-slate-900">
                                            {characters
                                              .filter(c => c.id !== char.id)
                                              .map(otherChar => {
                                                const isLinked = (editLinkedLoreIds || []).includes(otherChar.id);
                                                return (
                                                  <button
                                                    key={otherChar.id}
                                                    type="button"
                                                    onClick={() => {
                                                      if (isLinked) {
                                                        setEditLinkedLoreIds((editLinkedLoreIds || []).filter(id => id !== otherChar.id));
                                                      } else {
                                                        setEditLinkedLoreIds([...(editLinkedLoreIds || []), otherChar.id]);
                                                      }
                                                    }}
                                                    className={`px-2 py-1 rounded text-[9px] font-medium flex items-center gap-1 border transition-all ${
                                                      isLinked
                                                        ? "bg-purple-950/40 border-purple-500/50 text-purple-300"
                                                        : "bg-slate-900/50 border-slate-850 text-slate-400 hover:border-slate-800"
                                                    }`}
                                                  >
                                                    <span>{otherChar.name}</span>
                                                    <span className="text-[7px] bg-slate-950/80 px-1 py-0.2 rounded text-slate-500 uppercase font-normal font-mono">
                                                      {otherChar.type || "NPC"}
                                                    </span>
                                                  </button>
                                                );
                                              })}
                                          </div>
                                        )}
                                      </div>

                                      {/* Granular Character Accuracy Breakdown & Canon Delta (Edit Mode) */}
                                      <div className="border-t border-slate-900 pt-2 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <button
                                            type="button"
                                            onClick={() => setShowGranularSectionInEdit(!showGranularSectionInEdit)}
                                            className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-teal-400 hover:text-teal-300 transition-colors"
                                          >
                                            <Globe size={11} />
                                            <span>Character Accuracy & Canon Delta Breakdown</span>
                                            <span className="text-slate-500 font-normal">{showGranularSectionInEdit ? "[- Collapse]" : "[+ Expand]"}</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCanonStudioTargetChar(char);
                                              setShowCanonDeltaStudio(true);
                                            }}
                                            className="px-2 py-0.5 rounded text-[9px] font-semibold bg-teal-950/60 hover:bg-teal-900/50 border border-teal-800/40 text-teal-300 flex items-center gap-1 cursor-pointer transition-all"
                                            title="Launch Canon Delta Studio for this character"
                                          >
                                            <Sparkles size={10} />
                                            <span>Reconcile with Studio</span>
                                          </button>
                                        </div>

                                        {showGranularSectionInEdit && (
                                          <div className="p-2.5 bg-slate-950/70 rounded-lg border border-teal-900/30 space-y-2.5 text-[10px]">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              <div>
                                                <label className="block text-[8px] font-mono uppercase text-teal-400 mb-0.5">Canon Source / Origin</label>
                                                <input
                                                  type="text"
                                                  placeholder="e.g., Forgotten Realms Wiki, Star Wars Canon..."
                                                  value={editCanonSource}
                                                  onChange={(e) => setEditCanonSource(e.target.value)}
                                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none focus:border-teal-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[8px] font-mono uppercase text-teal-400 mb-0.5">Timeline Stage / Era</label>
                                                <input
                                                  type="text"
                                                  placeholder="e.g., Prequel, Pre-Spellplague, Post-Endor..."
                                                  value={editTimelineStage}
                                                  onChange={(e) => setEditTimelineStage(e.target.value)}
                                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none focus:border-teal-500"
                                                />
                                              </div>
                                            </div>

                                            <div>
                                              <label className="block text-[8px] font-mono uppercase text-teal-400 mb-0.5">
                                                Strict Campaign Delta (Deviations from online canon, past injuries, secret prequel state)
                                              </label>
                                              <textarea
                                                rows={2}
                                                placeholder="Describe how this campaign's reality diverges from general internet canon..."
                                                value={editCanonDelta}
                                                onChange={(e) => setEditCanonDelta(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none focus:border-teal-500 font-sans resize-none"
                                              />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                                              <div>
                                                <label className="block text-[8px] font-mono uppercase text-slate-400 mb-0.5">Build & Silhouette</label>
                                                <input
                                                  type="text"
                                                  placeholder="Height, stance, posture, build..."
                                                  value={editAppearanceBuild}
                                                  onChange={(e) => setEditAppearanceBuild(e.target.value)}
                                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none focus:border-purple-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[8px] font-mono uppercase text-slate-400 mb-0.5">Distinguishing Marks, Eyes & Hair</label>
                                                <input
                                                  type="text"
                                                  placeholder="Eye color, scars, tattoos, hair styling..."
                                                  value={editDistinguishingMarks}
                                                  onChange={(e) => setEditDistinguishingMarks(e.target.value)}
                                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none focus:border-purple-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[8px] font-mono uppercase text-slate-400 mb-0.5">Attire & Wardrobe</label>
                                                <input
                                                  type="text"
                                                  placeholder="Typical fabrics, insignia, cloaks, armor..."
                                                  value={editAttireWardrobe}
                                                  onChange={(e) => setEditAttireWardrobe(e.target.value)}
                                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none focus:border-purple-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[8px] font-mono uppercase text-slate-400 mb-0.5">Voice Pitch & Cadence</label>
                                                <input
                                                  type="text"
                                                  placeholder="Tone, rhythm, accent, speech quirks..."
                                                  value={editVoiceCadence}
                                                  onChange={(e) => setEditVoiceCadence(e.target.value)}
                                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none focus:border-purple-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[8px] font-mono uppercase text-slate-400 mb-0.5">Mannerisms & Behavioral Tells</label>
                                                <input
                                                  type="text"
                                                  placeholder="Gestures, nervous tics, physical presence..."
                                                  value={editMannerisms}
                                                  onChange={(e) => setEditMannerisms(e.target.value)}
                                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none focus:border-purple-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[8px] font-mono uppercase text-slate-400 mb-0.5">Temperament & Morals</label>
                                                <input
                                                  type="text"
                                                  placeholder="Discipline, lines they will never cross..."
                                                  value={editTemperament}
                                                  onChange={(e) => setEditTemperament(e.target.value)}
                                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none focus:border-purple-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[8px] font-mono uppercase text-slate-400 mb-0.5">Motivations & Secrets</label>
                                                <input
                                                  type="text"
                                                  placeholder="Hidden agendas, vulnerabilities, driving desires..."
                                                  value={editMotivationsSecrets}
                                                  onChange={(e) => setEditMotivationsSecrets(e.target.value)}
                                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none focus:border-purple-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[8px] font-mono uppercase text-slate-400 mb-0.5">Combat & Tactical Style</label>
                                                <input
                                                  type="text"
                                                  placeholder="Preferred engagements, spells, defensive tactics..."
                                                  value={editTacticalStyle}
                                                  onChange={(e) => setEditTacticalStyle(e.target.value)}
                                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none focus:border-purple-500"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Action buttons */}
                                      <div className="flex gap-2 justify-end pt-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingEntityId(null);
                                            setEditingLockedFields({});
                                          }}
                                          className="px-2.5 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={saveEditedEntity}
                                          className="px-3 py-1 text-[10px] bg-purple-600 hover:bg-purple-700 font-semibold text-white rounded shadow"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Normal detail display mode */
                                    <div className="space-y-2.5 text-slate-300">
                                      {char.description && (
                                        <div>
                                          <span className="text-[8px] uppercase tracking-wider text-slate-500 font-mono block">Description & Bio</span>
                                          <p className="text-[11px] leading-relaxed text-slate-200 mt-0.5 whitespace-pre-wrap">{char.description}</p>
                                        </div>
                                      )}

                                      {char.factionName && (
                                        <div>
                                          <span className="text-[8px] uppercase tracking-wider text-slate-500 font-mono block">Faction Affiliation</span>
                                          <span className="text-blue-400 font-medium text-[10px]">{char.factionName}</span>
                                        </div>
                                      )}

                                      {char.relationships && (
                                        <div>
                                          <span className="text-[8px] uppercase tracking-wider text-slate-500 font-mono block">Relationships & Allies</span>
                                          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{char.relationships}</p>
                                        </div>
                                      )}

                                      {char.signatureItems && (
                                        <div>
                                          <span className="text-[8px] uppercase tracking-wider text-slate-500 font-mono block">Signature Items & Gear</span>
                                          <p className="text-[10px] text-amber-400/90 leading-relaxed mt-0.5 font-sans">
                                            {char.signatureItems}
                                          </p>
                                        </div>
                                      )}

                                      {char.backstory && (
                                        <div>
                                          <span className="text-[8px] uppercase tracking-wider text-teal-400 font-mono block">Backstory</span>
                                          <p className="text-[10px] text-slate-300 leading-relaxed mt-0.5 whitespace-pre-wrap font-sans bg-slate-900/25 p-2 rounded border border-slate-900/40">{char.backstory}</p>
                                        </div>
                                      )}

                                      {char.romanceTracks && char.romanceTracks.length > 0 && (
                                        <div className="space-y-1.5 pt-1.5 border-t border-slate-900/80">
                                          <span className="text-[8px] uppercase tracking-wider text-pink-400 font-mono font-bold block">Romance & NPC Relationships</span>
                                          <div className="grid grid-cols-1 gap-2">
                                            {char.romanceTracks.map((track, idx) => (
                                              <div key={track.id || idx} className="bg-slate-950/45 p-2 rounded border border-slate-900/50 space-y-1">
                                                <div className="text-[10px] font-bold text-slate-200 flex justify-between items-center">
                                                  <span>{track.npcName}</span>
                                                  <span className="text-[8px] bg-pink-950/30 text-pink-400 border border-pink-900/50 px-1.5 py-0.5 rounded font-mono uppercase font-semibold">{track.relationshipStatus}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-300 leading-normal"><strong className="text-[8px] uppercase font-mono text-slate-500 mr-1">Milestones:</strong> {track.milestones}</div>
                                                <div className="text-[10px] text-slate-400 leading-normal"><strong className="text-[8px] uppercase font-mono text-slate-500 mr-1">Openness:</strong> {track.openness}</div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Category Custom Fields Display */}
                                      {char.customFields && Object.keys(char.customFields).length > 0 && (
                                        <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60 grid grid-cols-1 gap-2.5">
                                          {Object.entries(char.customFields).map(([k, v]) => {
                                            if (!v) return null;
                                            return (
                                              <div key={k} className="border-b border-slate-900/30 last:border-0 pb-2 last:pb-0">
                                                <span className="text-[8px] uppercase tracking-wider text-purple-400 font-mono font-bold block">{k}</span>
                                                <p className="text-[10px] text-slate-300 whitespace-pre-wrap mt-0.5 leading-relaxed">{v}</p>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Canon & Narrative Delta Display */}
                                      {(char.timelineStage || char.canonSource || char.canonDelta) && (
                                        <div className="bg-teal-950/20 border border-teal-800/40 rounded-lg p-2.5 space-y-1.5 mt-1">
                                          <div className="flex items-center justify-between flex-wrap gap-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <Globe size={11} className="text-teal-400" />
                                              <span className="text-[8px] uppercase tracking-wider text-teal-300 font-mono font-bold">
                                                Canon & Narrative Delta
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1 font-mono text-[8px]">
                                              {char.timelineStage && (
                                                <span className="px-1.5 py-0.2 rounded bg-teal-900/40 text-teal-200 border border-teal-700/50">
                                                  {char.timelineStage}
                                                </span>
                                              )}
                                              {char.canonSource && (
                                                <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                                  Source: {char.canonSource}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {char.canonDelta && (
                                            <div className="text-[10px] text-slate-300 bg-slate-950/60 p-2 rounded border border-teal-900/30 leading-relaxed font-sans">
                                              <strong className="text-teal-400 font-mono text-[8px] uppercase block mb-0.5">Campaign Delta & Divergence:</strong>
                                              <p className="whitespace-pre-wrap">{char.canonDelta}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Granular Character Breakdown Display */}
                                      {(char.appearanceBuild || char.distinguishingMarks || char.attireWardrobe || char.voiceCadence || char.mannerisms || char.temperament || char.motivationsSecrets || char.tacticalStyle) && (
                                        <div className="bg-slate-900/35 p-2.5 rounded-lg border border-slate-850/80 space-y-1.5 mt-1">
                                          <span className="text-[8px] uppercase tracking-wider text-indigo-400 font-mono font-bold block">
                                            Granular Character Breakdown
                                          </span>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                                            {char.appearanceBuild && (
                                              <div className="bg-slate-950/50 p-1.5 rounded border border-slate-900">
                                                <span className="text-[8px] uppercase font-mono text-slate-500 block">Build & Silhouette</span>
                                                <p className="text-slate-300 leading-normal mt-0.5">{char.appearanceBuild}</p>
                                              </div>
                                            )}
                                            {char.distinguishingMarks && (
                                              <div className="bg-slate-950/50 p-1.5 rounded border border-slate-900">
                                                <span className="text-[8px] uppercase font-mono text-slate-500 block">Distinguishing Marks / Eyes / Hair</span>
                                                <p className="text-slate-300 leading-normal mt-0.5">{char.distinguishingMarks}</p>
                                              </div>
                                            )}
                                            {char.attireWardrobe && (
                                              <div className="bg-slate-950/50 p-1.5 rounded border border-slate-900">
                                                <span className="text-[8px] uppercase font-mono text-slate-500 block">Attire & Wardrobe</span>
                                                <p className="text-slate-300 leading-normal mt-0.5">{char.attireWardrobe}</p>
                                              </div>
                                            )}
                                            {char.voiceCadence && (
                                              <div className="bg-slate-950/50 p-1.5 rounded border border-slate-900">
                                                <span className="text-[8px] uppercase font-mono text-slate-500 block">Voice & Speech Cadence</span>
                                                <p className="text-slate-300 leading-normal mt-0.5">{char.voiceCadence}</p>
                                              </div>
                                            )}
                                            {char.mannerisms && (
                                              <div className="bg-slate-950/50 p-1.5 rounded border border-slate-900">
                                                <span className="text-[8px] uppercase font-mono text-slate-500 block">Mannerisms & Behavioral Tells</span>
                                                <p className="text-slate-300 leading-normal mt-0.5">{char.mannerisms}</p>
                                              </div>
                                            )}
                                            {char.temperament && (
                                              <div className="bg-slate-950/50 p-1.5 rounded border border-slate-900">
                                                <span className="text-[8px] uppercase font-mono text-slate-500 block">Temperament & Morals</span>
                                                <p className="text-slate-300 leading-normal mt-0.5">{char.temperament}</p>
                                              </div>
                                            )}
                                            {char.motivationsSecrets && (
                                              <div className="bg-slate-950/50 p-1.5 rounded border border-slate-900">
                                                <span className="text-[8px] uppercase font-mono text-slate-500 block">Motivations & Secrets</span>
                                                <p className="text-slate-300 leading-normal mt-0.5">{char.motivationsSecrets}</p>
                                              </div>
                                            )}
                                            {char.tacticalStyle && (
                                              <div className="bg-slate-950/50 p-1.5 rounded border border-slate-900">
                                                <span className="text-[8px] uppercase font-mono text-slate-500 block">Tactical Style & Protocols</span>
                                                <p className="text-slate-300 leading-normal mt-0.5">{char.tacticalStyle}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Linked connections display */}
                                      {char.linkedLoreIds && char.linkedLoreIds.length > 0 && (
                                        <div className="space-y-1.5 pt-1.5 border-t border-slate-900/80">
                                          <span className="text-[8px] uppercase tracking-wider text-purple-400 font-mono font-bold block">Linked Connections</span>
                                          <div className="flex flex-wrap gap-1">
                                            {char.linkedLoreIds.map(linkedId => {
                                              const linkedChar = characters.find(c => c.id === linkedId);
                                              if (!linkedChar) return null;
                                              const linkedType = linkedChar.type || (linkedChar.isPlayerCharacter ? "pc" : "npc");
                                              return (
                                                <button
                                                  key={linkedId}
                                                  type="button"
                                                  onClick={() => {
                                                    setLoreTab(linkedType);
                                                    setExpandedEntityId(linkedId);
                                                  }}
                                                  className="px-2 py-0.5 rounded text-[9px] font-semibold bg-purple-950/40 hover:bg-purple-900/40 border border-purple-800/40 text-purple-300 flex items-center gap-1 transition-all"
                                                >
                                                  <span>{linkedChar.name}</span>
                                                  <span className="text-[7px] bg-slate-950/80 px-1 rounded text-slate-500 uppercase font-normal font-mono">{linkedType}</span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Move Category Quick Actions Bar */}
                                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-850/80 my-2 text-[10px]">
                                        <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                                          <ArrowLeftRight size={12} className="text-purple-400" />
                                          <span>Lore Category: <strong className="text-slate-200 uppercase">{char.type || (char.isPlayerCharacter ? "pc" : "npc")}</strong></span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {(char.type === "companion" || (char.romanceTracks && char.romanceTracks.length > 0)) && (
                                            <button
                                              type="button"
                                              onClick={() => handleMoveLoreCategory(char, "npc")}
                                              className="px-2 py-0.5 bg-red-950/40 hover:bg-red-900/40 border border-red-800/40 text-red-300 rounded font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                              title="No longer a romance option? Move to NPC category"
                                            >
                                              <span>🚫 Move to NPC</span>
                                            </button>
                                          )}
                                          {char.type === "npc" && (
                                            <button
                                              type="button"
                                              onClick={() => handleMoveLoreCategory(char, "companion")}
                                              className="px-2 py-0.5 bg-pink-950/40 hover:bg-pink-900/40 border border-pink-800/40 text-pink-300 rounded font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                              title="Promote character to Companion / Romance option"
                                            >
                                              <span>💖 Move to Companion</span>
                                            </button>
                                          )}
                                          <select
                                            value={char.type || (char.isPlayerCharacter ? "pc" : "npc")}
                                            onChange={(e) => handleMoveLoreCategory(char, e.target.value as any)}
                                            className="bg-slate-950 border border-slate-800 hover:border-purple-500 rounded px-2 py-0.5 text-[9px] font-mono text-slate-300 outline-none cursor-pointer transition-all"
                                          >
                                            <option value="pc">Move Category: PC</option>
                                            <option value="companion">Move Category: Companion</option>
                                            <option value="npc">Move Category: NPC</option>
                                            <option value="chronicle">Move Category: Chronicle</option>
                                            <option value="location">Move Category: Location</option>
                                            <option value="vehicle">Move Category: Vehicle</option>
                                            <option value="equipment">Move Category: Equipment</option>
                                            <option value="faction">Move Category: Faction</option>
                                          </select>
                                        </div>
                                      </div>

                                      {/* Edit Details Action */}
                                      <div className="flex gap-2 justify-end pt-1">

                                       <button
                                         type="button"
                                         onClick={() => {
                                           setCanonStudioTargetChar(char);
                                           setShowCanonDeltaStudio(true);
                                         }}
                                         className="px-2.5 py-1 bg-teal-950/40 hover:bg-teal-900/30 text-teal-300 hover:text-teal-200 rounded border border-teal-800/40 font-semibold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                                         title="Research online canon and reconcile campaign delta for this character"
                                       >
                                         <Globe size={11} className="text-teal-400" />
                                         <span>Canon Delta</span>
                                       </button>

                                       <button
                                         type="button"
                                         disabled={aiUpdatingCharId === char.id}
                                         onClick={() => handleAiUpdateLore(char)}
                                          className={`px-2.5 py-1 ${aiUpdatingCharId === char.id ? 'bg-indigo-950/50 text-indigo-300' : 'bg-indigo-950/30 hover:bg-indigo-900/20 text-indigo-400 hover:text-indigo-300'} rounded border border-indigo-800/35 font-semibold text-[10px] transition-all flex items-center gap-1 cursor-pointer`}
                                          title="Automatically update this lore profile using recent roleplay chat developments"
                                        >
                                          {aiUpdatingCharId === char.id ? (
                                            <>
                                              <span className="w-2 h-2 rounded-full border-b border-indigo-400 animate-spin mr-0.5"></span>
                                              Updating...
                                            </>
                                          ) : (
                                            <>
                                              <span>🪄 AI Update</span>
                                            </>
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => startEditingEntity(char)}
                                          className="px-2.5 py-1 bg-purple-950/40 hover:bg-purple-900/30 text-purple-400 hover:text-purple-300 rounded border border-purple-800/30 font-semibold text-[10px] transition-all cursor-pointer"
                                        >
                                          Edit Record
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Create New Entity form (Collapsible) */}
                  <div className="border-t border-slate-850 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!showRegisterActor) {
                          resetCreationForm();
                        }
                        setShowRegisterActor(!showRegisterActor);
                      }}
                      className="w-full flex items-center justify-between text-[10px] font-bold text-purple-400 uppercase tracking-wider hover:text-purple-300 transition-colors py-1.5 bg-purple-950/10 px-2 rounded-lg border border-purple-900/20"
                    >
                      <span>Add New {meta.title}</span>
                      <span className="text-[9px] text-purple-500">{showRegisterActor ? "[- Close Form]" : "[+ Expand Form]"}</span>
                    </button>

                    {showRegisterActor && (
                      <div className="space-y-3 mt-3 bg-slate-950/30 p-2.5 rounded-lg border border-slate-900">
                        {/* Instant AI Auto-Generator Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-purple-950/30 border border-purple-800/40 p-2 rounded-md">
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={13} className="text-purple-400 animate-pulse" />
                            <span className="text-[11px] font-semibold text-purple-200">AI Profile Co-Pilot</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCanonStudioTargetChar(null);
                                setShowCanonDeltaStudio(true);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-600/90 hover:bg-teal-500 text-white rounded text-[10px] font-semibold shadow transition-all cursor-pointer"
                              title="Research internet canon and extract campaign logs to generate a reconciled profile"
                            >
                              <Globe size={11} />
                              <span>Grab Online Canon</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAiAutoFillEntity(false)}
                              disabled={isAiGeneratingEntity}
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white rounded text-[10px] font-bold shadow transition-all cursor-pointer"
                              title="Auto-completes and enriches all unlocked fields with rich setting-appropriate lore"
                            >
                              {isAiGeneratingEntity ? (
                                <>
                                  <Loader2 size={11} className="animate-spin" />
                                  <span>Generating...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={11} />
                                  <span>Auto-Fill All Fields</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Name Input */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              {meta.nameLabel}
                            </label>
                            <button
                              type="button"
                              onClick={() => setCreationLockedFields({ ...creationLockedFields, name: !creationLockedFields.name })}
                              className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                              title={creationLockedFields.name ? "Unlock field" : "Lock field"}
                            >
                              {creationLockedFields.name ? <Lock size={10} className="text-purple-400" /> : <Unlock size={10} />}
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder={meta.namePlace}
                            value={charName}
                            onChange={(e) => setCharName(e.target.value)}
                            readOnly={creationLockedFields.name}
                            className={`w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 ${creationLockedFields.name ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                          />
                        </div>

                        {/* Category / Subtype */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              {meta.roleLabel}
                            </label>
                            <button
                              type="button"
                              onClick={() => setCreationLockedFields({ ...creationLockedFields, role: !creationLockedFields.role })}
                              className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                              title={creationLockedFields.role ? "Unlock field" : "Lock field"}
                            >
                              {creationLockedFields.role ? <Lock size={10} className="text-purple-400" /> : <Unlock size={10} />}
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder={meta.rolePlace}
                            value={charRole}
                            onChange={(e) => setCharRole(e.target.value)}
                            readOnly={creationLockedFields.role}
                            className={`w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 ${creationLockedFields.role ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                          />
                        </div>

                        {/* Description / Bio / Specs */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              {meta.descLabel}
                            </label>
                            <button
                              type="button"
                              onClick={() => setCreationLockedFields({ ...creationLockedFields, description: !creationLockedFields.description })}
                              className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                              title={creationLockedFields.description ? "Unlock field" : "Lock field"}
                            >
                              {creationLockedFields.description ? <Lock size={10} className="text-purple-400" /> : <Unlock size={10} />}
                            </button>
                          </div>
                          <textarea
                            placeholder={meta.descPlace}
                            value={charDesc}
                            onChange={(e) => setCharDesc(e.target.value)}
                            readOnly={creationLockedFields.description}
                            rows={2}
                            className={`w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 resize-none font-sans ${creationLockedFields.description ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                          />
                        </div>

                        {/* Keyword Triggers for Creation */}
                        <div>
                          <label className="block text-[9px] font-semibold text-purple-400 uppercase tracking-wider mb-1">
                            Keyword Activation Triggers (Comma separated)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Captain, smuggler, Millennium Falcon, Tatooine..."
                            value={charActivationKeys}
                            onChange={(e) => setCharActivationKeys(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 font-mono"
                          />
                          <p className="text-[8px] text-slate-500 mt-0.5">When these words appear in recent turns, this entity is dynamically injected into memory.</p>
                        </div>

                        {/* Owner / Relationships */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              {meta.relLabel}
                            </label>
                            <button
                              type="button"
                              onClick={() => setCreationLockedFields({ ...creationLockedFields, relationships: !creationLockedFields.relationships })}
                              className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                              title={creationLockedFields.relationships ? "Unlock field" : "Lock field"}
                            >
                              {creationLockedFields.relationships ? <Lock size={10} className="text-purple-400" /> : <Unlock size={10} />}
                            </button>
                          </div>
                          <textarea
                            placeholder={meta.relPlace}
                            value={charRelationships}
                            onChange={(e) => setCharRelationships(e.target.value)}
                            readOnly={creationLockedFields.relationships}
                            rows={1}
                            className={`w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 resize-none font-sans ${creationLockedFields.relationships ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                          />
                        </div>

                        {/* Affiliation / Faction */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              {meta.factionLabel}
                            </label>
                            <button
                              type="button"
                              onClick={() => setCreationLockedFields({ ...creationLockedFields, factionName: !creationLockedFields.factionName })}
                              className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                              title={creationLockedFields.factionName ? "Unlock field" : "Lock field"}
                            >
                              {creationLockedFields.factionName ? <Lock size={10} className="text-purple-400" /> : <Unlock size={10} />}
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder={meta.factionPlace}
                            value={charFactionName}
                            onChange={(e) => setCharFactionName(e.target.value)}
                            readOnly={creationLockedFields.factionName}
                            className={`w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 ${creationLockedFields.factionName ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                          />
                        </div>

                        {(loreTab === "pc" || loreTab === "npc") && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[9px] font-semibold text-amber-500 uppercase tracking-wider">
                                Signature Items & Gear (Part of Identity)
                              </label>
                              <button
                                type="button"
                                onClick={() => setCreationLockedFields({ ...creationLockedFields, signatureItems: !creationLockedFields.signatureItems })}
                                className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                                title={creationLockedFields.signatureItems ? "Unlock field" : "Lock field"}
                              >
                                {creationLockedFields.signatureItems ? <Lock size={10} className="text-purple-400" /> : <Unlock size={10} />}
                              </button>
                            </div>
                            <textarea
                              placeholder="e.g. Custom blaster pistol, lucky cowboy hat, spellbook, ancient ancestral staff..."
                              value={charSignatureItems}
                              onChange={(e) => setCharSignatureItems(e.target.value)}
                              readOnly={creationLockedFields.signatureItems}
                              rows={1}
                              className={`w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 resize-none font-sans ${creationLockedFields.signatureItems ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                            />
                          </div>
                        )}

                        {(loreTab === "pc" || loreTab === "npc") && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[9px] font-semibold text-teal-400 uppercase tracking-wider">
                                Character Backstory (Detailed/Secret History)
                              </label>
                              <button
                                type="button"
                                onClick={() => setCreationLockedFields({ ...creationLockedFields, backstory: !creationLockedFields.backstory })}
                                className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                                title={creationLockedFields.backstory ? "Unlock field" : "Lock field"}
                              >
                                {creationLockedFields.backstory ? <Lock size={10} className="text-purple-400" /> : <Unlock size={10} />}
                              </button>
                            </div>
                            <textarea
                              placeholder="Write long-form backstory block here... (Note: Keeps narrative history cleanly segregated, preventing companion omniscience)"
                              value={charBackstory}
                              onChange={(e) => setCharBackstory(e.target.value)}
                              readOnly={creationLockedFields.backstory}
                              rows={3}
                              className={`w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 resize-y font-sans ${creationLockedFields.backstory ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                            />
                          </div>
                        )}

                        {loreTab === "pc" && (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60 space-y-2.5">
                            <span className="block text-[9px] uppercase tracking-wider text-pink-400 font-mono font-bold">
                              Romance & NPC Relationships Tracker
                            </span>
                            {charRomanceTracks.length === 0 ? (
                              <p className="text-[9px] text-slate-500 italic">No companion relationships tracked yet.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {charRomanceTracks.map((track, idx) => (
                                  <div key={track.id || idx} className="bg-slate-950/85 p-2 rounded border border-slate-900 space-y-1 relative">
                                    <button
                                      type="button"
                                      onClick={() => setCharRomanceTracks(charRomanceTracks.filter((_, i) => i !== idx))}
                                      className="absolute top-1 right-1 text-slate-500 hover:text-red-400 p-0.5 transition-colors"
                                      title="Remove NPC Relation"
                                    >
                                      <Trash2 size={9} />
                                    </button>
                                    <div className="text-[10px] font-bold text-slate-200">{track.npcName}</div>
                                    <div className="text-[9px] text-pink-400/90 leading-normal">
                                      <span className="text-slate-500 text-[8px] uppercase font-mono mr-1">Status:</span> {track.relationshipStatus}
                                    </div>
                                    <div className="text-[9px] text-slate-300 leading-normal">
                                      <span className="text-slate-500 text-[8px] uppercase font-mono mr-1">Milestones:</span> {track.milestones}
                                    </div>
                                    <div className="text-[9px] text-slate-400 leading-normal">
                                      <span className="text-slate-500 text-[8px] uppercase font-mono mr-1">Openness:</span> {track.openness}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Add NPC relation inline block */}
                            <div className="border-t border-slate-900/60 pt-2 space-y-1.5">
                              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">+ Record Relation with NPC</span>
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="text"
                                  placeholder="NPC Name (e.g. Raven)"
                                  value={newRelName}
                                  onChange={(e) => setNewRelName(e.target.value)}
                                  className="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-[10px] text-slate-200 outline-none focus:border-purple-500"
                                />
                                <input
                                  type="text"
                                  placeholder="Relation (e.g. Trusting)"
                                  value={newRelStatus}
                                  onChange={(e) => setNewRelStatus(e.target.value)}
                                  className="bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-[10px] text-slate-200 outline-none focus:border-purple-500"
                                />
                              </div>
                              <textarea
                                placeholder="Milestones (e.g. First kiss - Ep 2, Saved by PC - Ep 4)"
                                value={newRelMilestones}
                                onChange={(e) => setNewRelMilestones(e.target.value)}
                                rows={1}
                                className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-[10px] text-slate-200 outline-none focus:border-purple-500 font-sans resize-none"
                              />
                              <input
                                type="text"
                                placeholder="Openness/Affection cues (e.g. hugs, flirting)"
                                value={newRelOpenness}
                                onChange={(e) => setNewRelOpenness(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-[10px] text-slate-200 outline-none focus:border-purple-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!newRelName.trim()) return;
                                  const newTrack: RelationshipTrack = {
                                    id: `track-${Date.now()}`,
                                    npcName: newRelName.trim(),
                                    relationshipStatus: newRelStatus.trim() || "Neutral",
                                    milestones: newRelMilestones.trim() || "None",
                                    openness: newRelOpenness.trim() || "Standard"
                                  };
                                  setCharRomanceTracks([...charRomanceTracks, newTrack]);
                                  setNewRelName("");
                                  setNewRelStatus("");
                                  setNewRelMilestones("");
                                  setNewRelOpenness("");
                                }}
                                className="w-full py-1 text-[9px] bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded text-amber-400 font-semibold transition-colors"
                              >
                                Add Relation Track
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Mook Checkbox only for NPCs */}
                        {loreTab === "npc" && (
                          <div className="flex items-center justify-between text-[11px] text-slate-300 py-1.5 bg-slate-950/40 px-2 rounded border border-slate-850">
                            <span>Is Mook (Grunt / Minor NPC)</span>
                            <input 
                              type="checkbox" 
                              checked={charIsMook} 
                              onChange={(e) => setCharIsMook(e.target.checked)} 
                              className="w-3.5 h-3.5 accent-purple-500 rounded cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Linked Lore Connections selector */}
                        <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60 space-y-2">
                          <span className="block text-[8px] uppercase tracking-wider text-purple-400 font-mono font-bold flex items-center gap-1">
                            <ArrowLeftRight size={10} /> Linked Lore & Semantic Connections
                          </span>
                          <p className="text-[9px] text-slate-500">
                            Select other campaign entities to link to this record (e.g. companion's custom ship, or a PC's allied faction).
                          </p>
                          {characters.length === 0 ? (
                            <p className="text-[9px] text-slate-500 italic">No other lore entities exist yet to link with.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 bg-slate-950/60 rounded border border-slate-900">
                              {characters
                                .filter(c => c.id !== (editingEntityId || ""))
                                .map(otherChar => {
                                  const isLinked = charLinkedLoreIds.includes(otherChar.id);
                                  return (
                                    <button
                                      key={otherChar.id}
                                      type="button"
                                      onClick={() => {
                                        if (isLinked) {
                                          setCharLinkedLoreIds(charLinkedLoreIds.filter(id => id !== otherChar.id));
                                        } else {
                                          setCharLinkedLoreIds([...charLinkedLoreIds, otherChar.id]);
                                        }
                                      }}
                                      className={`px-2 py-1 rounded text-[9px] font-medium flex items-center gap-1 border transition-all ${
                                        isLinked
                                          ? "bg-purple-950/40 border-purple-500/50 text-purple-300"
                                          : "bg-slate-900/50 border-slate-850 text-slate-400 hover:border-slate-800"
                                      }`}
                                    >
                                      <span>{otherChar.name}</span>
                                      <span className="text-[7px] bg-slate-950/80 px-1 py-0.2 rounded text-slate-500 uppercase font-normal font-mono">
                                        {otherChar.type || "NPC"}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>

                        {/* Dynamic Custom Fields Inputs */}
                        {(() => {
                          const defaultFields = getSettingSpecificDefaultFields(loreTab, project?.setting);
                          const customFieldKeys = Object.keys(manualCustomFields).filter(k => !defaultFields.includes(k));
                          const allFields = [...defaultFields, ...customFieldKeys];
                          
                          return (
                            <div className="space-y-3 pt-2 border-t border-slate-900">
                              <div className="flex items-center justify-between">
                                <span className="block text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                                  Custom Category Specifications ({loreTab.toUpperCase()})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAiAutoFillEntity(true)}
                                  disabled={isAiGeneratingEntity}
                                  className="flex items-center gap-1 text-[8px] font-mono px-2 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-800/60 text-purple-300 transition-colors shadow-sm disabled:opacity-50"
                                  title="Auto-fill empty specification fields using AI"
                                >
                                  {isAiGeneratingEntity ? <Sparkles size={8} className="animate-spin text-purple-400" /> : <Sparkles size={8} className="text-purple-400" />}
                                  {isAiGeneratingEntity ? "Populating..." : "✨ Auto-Fill Specs"}
                                </button>
                              </div>
                              <div className="space-y-2.5">
                                {allFields.map(fieldName => {
                                  const isCustom = !defaultFields.includes(fieldName);
                                  const isLocked = !!creationLockedFields[fieldName];
                                  return (
                                    <div key={fieldName} className="space-y-1">
                                      <div className="flex justify-between items-center">
                                        <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                                          {fieldName} {isCustom && <span className="text-purple-500 font-mono text-[8px] lowercase">(custom)</span>}
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => setCreationLockedFields({ ...creationLockedFields, [fieldName]: !isLocked })}
                                            className="text-slate-500 hover:text-purple-400 transition-colors p-0.5"
                                            title={isLocked ? "Unlock field" : "Lock field"}
                                          >
                                            {isLocked ? <Lock size={10} className="text-purple-400" /> : <Unlock size={10} />}
                                          </button>
                                          {isCustom && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated = { ...manualCustomFields };
                                                delete updated[fieldName];
                                                setManualCustomFields(updated);
                                              }}
                                              className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                                              title="Remove custom field"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <textarea
                                        placeholder={`Enter details for ${fieldName}...`}
                                        value={manualCustomFields[fieldName] || ""}
                                        onChange={(e) => setManualCustomFields({ ...manualCustomFields, [fieldName]: e.target.value })}
                                        readOnly={isLocked}
                                        rows={2}
                                        className={`w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 font-sans resize-none ${isLocked ? "opacity-60 cursor-not-allowed bg-slate-900" : ""}`}
                                      />
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Create a new Custom Field UI */}
                              <div className="pt-2 border-t border-slate-900/60">
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                  + Create Custom Field
                                </span>
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="e.g. Weaknesses, Magic Spells..."
                                    value={newFieldNameCreation}
                                    onChange={(e) => setNewFieldNameCreation(e.target.value)}
                                    className="flex-1 bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-purple-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!newFieldNameCreation.trim()) return;
                                      setManualCustomFields({ ...manualCustomFields, [newFieldNameCreation.trim()]: "" });
                                      setNewFieldNameCreation("");
                                    }}
                                    className="px-2 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 font-semibold transition-colors"
                                  >
                                    Add Field
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Portrait selection option */}
                        <div>
                          <label className="block text-[9px] text-slate-500 font-mono mb-1">Visual Portrait / Emblem Source</label>
                          <div className="space-y-2">
                            <select
                              value={portraitType}
                              onChange={(e) => setPortraitType(e.target.value as any)}
                              className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-purple-500"
                            >
                              <option value="upload">Upload Photo from device...</option>
                              <option value="url">Custom Image URL...</option>
                            </select>

                            {portraitType === "upload" && (
                              <div className="flex flex-col gap-1.5">
                                <label className="flex items-center gap-2 justify-center w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 border-dashed rounded-lg p-2 cursor-pointer transition-all">
                                  <Upload size={14} className="text-slate-400" />
                                  <span className="text-[11px] text-slate-400 font-medium">Choose image file</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleDeviceFileUpload} 
                                    className="hidden" 
                                  />
                                </label>
                                <GooglePickerButton
                                  googleToken={googleToken}
                                  onGoogleSignIn={onGoogleSignIn}
                                  onFilePicked={(file) => setCharUrl(file.data)}
                                  onShowToast={onShowToast}
                                  mode="image"
                                  buttonSize="sm"
                                  className="w-full justify-center"
                                  label="Select from Drive / Photos"
                                />
                                {charUrl && (
                                  <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded border border-slate-850">
                                    <img src={charUrl} className="w-8 h-8 rounded object-cover" />
                                    <span className="text-[10px] text-slate-500 truncate">Selected Image</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {portraitType === "url" && (
                              <input
                                type="text"
                                placeholder="https://image-link.com/photo.png"
                                value={charUrl}
                                onChange={(e) => setCharUrl(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-[11px] text-slate-300 outline-none focus:border-purple-500 font-mono"
                              />
                            )}
                          </div>
                        </div>

                        {/* Google Docs Auto-fill / Pull Apart option */}
                        <div className="bg-purple-950/25 p-2.5 rounded-lg border border-purple-900/35 space-y-2.5 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1">
                              <FileText size={11} /> Auto-Fill Profile from Google Doc
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-[9px] text-slate-400">
                              Select a character sheet or lore document to automatically pull apart and auto-fill details:
                            </p>
                            
                            <GooglePickerButton
                              googleToken={googleToken}
                              onGoogleSignIn={onGoogleSignIn}
                              onFilePicked={(file) => {
                                if (file.text) {
                                  handleAutoFillFromGDoc(file.text, undefined, true);
                                } else {
                                  if (onShowToast) {
                                    onShowToast("⚠️ Empty File", "The selected file contains no text content to parse.", "error");
                                  }
                                }
                              }}
                              onShowToast={onShowToast}
                              mode="document"
                              buttonSize="sm"
                              className="w-full justify-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1.5"
                              label={isPullingApart ? "Analyzing Document..." : "Pick Doc from Google Drive"}
                            />
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="button"
                          onClick={handleCharacterAdd}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-lg shadow-purple-900/35"
                        >
                          {meta.btnLabel}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* Resize handle left (Only active and visible when Pinned) */}
      {showLeftPanel && isLeftPanelPinned && (
        <div 
          onMouseDown={startResizeLeft}
          className="w-1 hover:w-1.5 bg-slate-850 hover:bg-purple-600/60 cursor-col-resize shrink-0 transition-all z-30"
          title="Drag to resize pinned settings panel"
        />
      )}

      {/* Button to restore Left panel (Floating tab handle when closed, mirrors Assistant) */}
      {!showLeftPanel && !isMobileLite && (
        <button
          type="button"
          onClick={() => setShowLeftPanel(true)}
          className="absolute left-0 top-20 z-40 bg-slate-900/90 hover:bg-purple-900/90 text-purple-300 hover:text-white px-2 py-3 rounded-r-xl border-y border-r border-purple-600/40 shadow-xl flex flex-col items-center gap-1 transition-all cursor-pointer group"
          title="Open Project Settings & Lore Database"
        >
          <SlidersHorizontal size={15} className="text-purple-400 group-hover:rotate-12 transition-transform" />
          <span className="text-[10px] font-mono font-bold writing-mode-vertical tracking-wider uppercase text-purple-300">
            Settings
          </span>
          <ChevronRight size={14} className="text-slate-400 group-hover:text-white" />
        </button>
      )}

      {/* 2. CENTER PANEL: The Live Interactive Chat (Main) */}
      <div 
        className="flex-1 h-full flex flex-col overflow-hidden bg-slate-950 relative"
        onDragOver={(e) => {
          e.preventDefault();
          setIsChatDragging(true);
        }}
        onDragLeave={() => setIsChatDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsChatDragging(false);
          const files = e.dataTransfer.files;
          if (files && files[0]) {
            handleAssistantFileUpload(files[0]);
          }
        }}
        style={{
          backgroundImage: project.chatBgPreset === "custom" && project.chatBgUrl 
            ? `linear-gradient(rgba(10, 10, 15, 0.85), rgba(10, 10, 15, 0.85)), url(${project.chatBgUrl})` 
            : dynamicBgStyle || undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {isChatDragging && (
          <div className="absolute inset-0 bg-purple-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-2 border-dashed border-purple-500 rounded-2xl m-4 animate-pulse">
            <div className="bg-slate-950 p-6 rounded-2xl border border-purple-500/30 flex flex-col items-center gap-4 text-center shadow-2xl max-w-sm">
              <Upload size={36} className="text-purple-400 animate-bounce" />
              <div>
                <h3 className="text-sm font-bold text-slate-200">Drop your file to attach to Nyx Assistant</h3>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Nyx will automatically process the file, attach/link it to lore entities (characters, ships, weapons, factions, or locations), and update them in real-time.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Chat Header */}
        <div className={`px-3.5 py-2 border-b ${activeTheme.borderColor} bg-slate-900/60 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 z-10 shrink-0`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {!showLeftPanel && (
              <button
                type="button"
                onClick={() => setShowLeftPanel(true)}
                className="px-2 py-1 rounded-lg bg-slate-950/80 hover:bg-purple-950/90 text-slate-300 hover:text-purple-200 border border-slate-800 hover:border-purple-600/50 transition-all flex items-center gap-1.5 cursor-pointer text-xs shrink-0 shadow-xs"
                title="Open Project Settings & Lore Database"
              >
                <SlidersHorizontal size={13} className="text-purple-400" />
                <span className="text-[10px] font-mono font-bold tracking-wide">Settings</span>
              </button>
            )}
            <Sparkles size={14} className={`${activeTheme.accentIcon} shrink-0`} />
            
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5 max-w-md w-full">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setCustomTitle(project.adventureLogTitle || project.name || "ADVENTURE LOG");
                      setIsEditingTitle(false);
                    }
                  }}
                  autoFocus
                  placeholder="Enter Adventure Log Title..."
                  className="bg-slate-950 text-slate-100 px-2 py-0.5 rounded border border-purple-500/60 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-400 w-full"
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className="p-1 rounded bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer shrink-0"
                  title="Save title (Enter)"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomTitle(project.adventureLogTitle || project.name || "ADVENTURE LOG");
                    setIsEditingTitle(false);
                  }}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                  title="Cancel (Esc)"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div 
                className="group flex items-center gap-1.5 cursor-pointer max-w-full truncate"
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename Adventure Log"
              >
                <h3 className={`text-xs sm:text-sm font-semibold ${activeTheme.headingFontClass} truncate text-slate-100 group-hover:text-purple-300 transition-colors`}>
                  {project.adventureLogTitle || `${activeTheme.name.toUpperCase()} ADVENTURE LOG`}
                </h3>
                <Edit3 size={11} className="text-slate-500 group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0 max-w-full overflow-x-auto scrollbar-none py-0.5">
            {/* Thinking / Model tier selector */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/80 shrink-0">
              {[
                { id: "Low", label: "Low", full: "Flash-Latest (Low Thinking / Fast & Token-Efficient)" },
                { id: "Medium", label: "Medium", full: "Flash-Latest (Medium Thinking / Balanced Detail)" },
                { id: "High", label: "High", full: "Flash-Latest (High Thinking / Multi-Narrative Synthesis)" }
              ].map(tier => (
                <button
                  key={tier.id}
                  onClick={() => setThinkingLevel(tier.id)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9.5px] font-semibold font-mono transition-all cursor-pointer ${
                    thinkingLevel === tier.id 
                      ? "bg-purple-600 text-white shadow shadow-purple-900" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title={tier.full}
                >
                  {tier.label}
                </button>
              ))}
            </div>

            {/* Quick Turn Token Inspector Button */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const lastAssistant = [...messages].reverse().find(m => m.role === "nyx" || m.role === "assistant") || messages[messages.length - 1];
                  const lastIdx = messages.findIndex(m => m.id === lastAssistant.id);
                  setTokenBreakdownTarget({ msg: lastAssistant, index: lastIdx >= 0 ? lastIdx : messages.length - 1 });
                }}
                className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-purple-500/60 text-[10px] font-mono text-slate-300 hover:text-purple-200 transition-all cursor-pointer group shadow-xs"
                title="View Turn Token Breakdown (Input, Retrieval, Thinking, Output)"
              >
                <Coins size={11} className="text-amber-400 group-hover:text-purple-400 transition-colors shrink-0" />
                <span className="font-semibold text-slate-200 group-hover:text-purple-100 tabular-nums">
                  Turn {messages.length} Tokens
                </span>
              </button>
            )}

            {/* Font Size Adjuster Stepper */}
            <div 
              className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/80" 
              title={`Story & Assistant Font Size: ${currentFontSizeObj.label} (${currentFontSizeObj.px})`}
            >
              <button
                type="button"
                onClick={() => handleStepFontSize(-1)}
                disabled={currentFontSizeKey === FONT_SIZE_KEYS[0]}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-slate-400 hover:text-purple-300 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Decrease font size"
              >
                A-
              </button>
              <span className="text-[9.5px] font-mono font-semibold text-purple-300 px-1 min-w-[28px] text-center select-none">
                {currentFontSizeObj.px}
              </span>
              <button
                type="button"
                onClick={() => handleStepFontSize(1)}
                disabled={currentFontSizeKey === FONT_SIZE_KEYS[FONT_SIZE_KEYS.length - 1]}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-slate-400 hover:text-purple-300 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Increase font size"
              >
                A+
              </button>
            </div>

            {/* Cinema mode toggle */}
            <button
              onClick={handleToggleCinemaMode}
              className={`p-1.5 rounded-lg text-xs font-mono font-semibold transition-all border flex items-center gap-1 ${
                cinemaMode 
                  ? "bg-purple-950/80 text-purple-200 border-purple-500/50 shadow-lg shadow-purple-950/40" 
                  : "bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900"
              }`}
              title={cinemaMode ? "Exit Fullscreen / Cinema Mode (F11 or Esc)" : "Fullscreen / Cinema Mode (F11)"}
            >
              {cinemaMode ? (
                <>
                  <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                  </svg>
                  <span className="text-[10px] hidden sm:inline">Exit Cinema</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                  <span className="text-[10px] hidden sm:inline">Cinema Mode</span>
                </>
              )}
            </button>

            {/* Import Narrative Log Button */}
            <label
              className="text-[10px] text-purple-300 hover:text-purple-100 font-mono bg-purple-950/40 hover:bg-purple-900/60 px-2 py-1 rounded-lg border border-purple-800/50 transition-all cursor-pointer flex items-center gap-1"
              title="Import a saved narrative file (.json / .txt)"
            >
              <Download size={11} className="rotate-180 shrink-0" />
              <span className="hidden sm:inline">Import</span>
              <input
                type="file"
                accept=".json,.txt"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    let importedMsgs: any[] = [];
                    if (file.name.endsWith(".json")) {
                      const parsed = JSON.parse(text);
                      importedMsgs = Array.isArray(parsed) ? parsed : (parsed.messages || []);
                    } else {
                      importedMsgs = text.split("\n\n").map((chunk, idx) => ({
                        id: `imported-${Date.now()}-${idx}`,
                        role: idx % 2 === 0 ? "user" : "nyx",
                        content: chunk.trim(),
                        timestamp: Date.now()
                      }));
                    }
                    if (importedMsgs.length > 0) {
                      onSetProjectValue("messages", [...messages, ...importedMsgs]);
                      onShowToast?.("📥 Narrative Imported!", `Loaded ${importedMsgs.length} message(s).`, "success");
                    }
                  } catch (err: any) {
                    onShowToast?.("Import Error", "Failed to parse imported narrative file.", "error");
                  }
                  e.target.value = "";
                }}
              />
            </label>

            {/* Export to Google Doc */}
            <button
              onClick={() => setShowSaveDrivePickerModal(true)}
              className="text-[10px] text-emerald-300 hover:text-emerald-100 font-mono bg-emerald-950/40 hover:bg-emerald-900/60 px-2 py-1 rounded-lg border border-emerald-800/50 transition-all cursor-pointer flex items-center gap-1"
              title="Save / Export active narrative transcript directly to Google Drive"
            >
              <FileText size={11} className="shrink-0" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Dump to Spark Archive */}
            <button
              onClick={() => {
                setSparkThreadTitle(`${project.name} - Thread Log ${new Date().toLocaleDateString()}`);
                setShowSparkExportModal(true);
              }}
              className="text-[10px] text-amber-300 hover:text-amber-100 font-mono bg-amber-950/40 hover:bg-amber-900/60 px-2 py-1 rounded-lg border border-amber-800/50 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              title="Dump transcript to 01_Raw_Threads in Google Drive for background Spark processing"
            >
              <Sparkles size={11} className="text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Dump to Spark Archive</span>
            </button>

            {/* Save to Google Drive Picker Modal */}
            {showSaveDrivePickerModal && (
              <SaveToDrivePickerModal
                isOpen={true}
                onClose={() => setShowSaveDrivePickerModal(false)}
                googleToken={googleToken}
                onGoogleSignIn={onGoogleSignIn}
                exportTitle={`${project.name} - Official Narrative Log`}
                exportContent={messages.map(m => `[${m.role.toUpperCase()} - ${formatMsgTimestamp(m.timestamp)}]:\n${m.content}`).join("\n\n---\n\n")}
                onExportSuccess={(docId) => {
                  onSetProjectValue("persistentContextDocId", docId);
                }}
                onShowToast={onShowToast}
              />
            )}

            {/* Author Style & Literary Anti-Drift Modal */}
            {showAuthorStyleModal && (
              <AuthorStyleModal
                isOpen={true}
                onClose={() => setShowAuthorStyleModal(false)}
                currentAuthors={localCreatorNames || project.creatorNames || ""}
                onSelectAuthor={(authorName) => {
                  setLocalCreatorNames(authorName);
                  onSetProjectValue("creatorNames", authorName);
                }}
                onAnchorStyle={(authorName) => {
                  setLocalCreatorNames(authorName);
                  onSetProjectValue("creatorNames", authorName);
                }}
                onPurgeDrift={(authorName) => {
                  setInputText((prev) => {
                    const reminder = `[Narrator directive: Strict adherence to ${authorName}'s literary style requested. Avoid generic assistant prose, eliminate repetitious dialogue, and ground narration in concrete sensory textures.]\n\n`;
                    return reminder + prev;
                  });
                }}
                onShowToast={onShowToast}
              />
            )}

            {onOpenStoryArchives && (
              <button
                type="button"
                onClick={onOpenStoryArchives}
                className="text-[10px] text-purple-300 hover:text-purple-100 font-mono bg-purple-950/60 hover:bg-purple-900/80 p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-purple-800/50 hover:border-purple-600/60 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                title="Browse and restore saved story transcripts and campaign logs"
              >
                <BookOpen size={11} className="text-purple-400 shrink-0" />
                <span className="hidden sm:inline">Story Archives</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsLoreCodexOpen(true)}
              className="text-[10px] text-amber-300 hover:text-amber-100 font-mono bg-amber-950/40 hover:bg-amber-900/60 p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-amber-800/50 hover:border-amber-600/60 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              title="Open Did You Know? Lore Codex archives to explore deep universe trivia"
            >
              <Sparkles size={11} className="text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Lore Codex</span>
            </button>

            <button
              onClick={() => setShowClearLogModal(true)}
              className="text-[10px] text-slate-400 hover:text-red-300 font-mono bg-slate-950 hover:bg-red-950/40 p-1.5 sm:px-2 sm:py-1 rounded-lg border border-slate-800 hover:border-red-800/50 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              title="Clear active story narrative log"
            >
              <Trash2 size={11} className="text-slate-500 group-hover:text-red-400 shrink-0" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6 z-10 flex flex-col justify-start">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/40 border border-purple-800/30 flex items-center justify-center text-purple-400 shadow-inner">
                <BookOpen size={22} />
              </div>
              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider font-semibold">
                Narrative Log Empty for {project.name || "this Campaign"}
              </span>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                Begin your adventure in the prompt box below, or open your story archives to restore previous dialogues and transcripts across your campaigns.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {onOpenStoryArchives && (
                  <button
                    type="button"
                    onClick={onOpenStoryArchives}
                    className="text-xs text-white font-semibold bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl shadow-lg shadow-purple-950/50 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen size={13} />
                    Explore & Restore Saved Logs
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const recovered = loadProjectMessagesSafely(project.id, project.name);
                    if (recovered && recovered.length > 0) {
                      onSetProjectValue("messages", recovered);
                      onShowToast?.("🛡️ Adventure Log Restored", `Recovered ${recovered.length} message(s) from campaign backup archives.`, "success");
                    } else {
                      onShowToast?.("Backup Scan Complete", "No direct cached logs found for this project ID. Click 'Explore & Restore Saved Logs' to view all campaign transcripts.", "info");
                    }
                  }}
                  className="text-xs text-slate-300 hover:text-white font-mono bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
                  title="Scan browser storage and backup archives for this campaign log"
                >
                  <RefreshCw size={12} className="text-purple-400" />
                  Auto-Scan Current Project
                </button>
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <MessageErrorBoundary
                key={msg.id || `msg-${idx}`}
                messageId={msg.id}
                onDeleteMessage={onDeleteMessage}
              >
                <MessageItem
                  msg={msg}
                  idx={idx}
                  isUser={msg.role === "user"}
                  isEditing={editingMessageId === msg.id}
                  editText={editText}
                  onEditTextChange={handleEditTextChange}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onStartEdit={handleStartEdit}
                  onDeleteMessage={onDeleteMessage}
                  onMessageClick={handleMessageClick}
                  onStoreFact={handleStoreFact}
                  onRegenerateResponse={onRegenerateResponse}
                  onSelectMessageVersion={onSelectMessageVersion}
                  onOpenTokenBreakdown={(targetMsg, targetIdx) => {
                    setTokenBreakdownTarget({ msg: targetMsg, index: targetIdx });
                  }}
                  themeId={project?.themeId}
                  activeBubbleStyleClass={activeBubbleStyle?.class || ""}
                  activeThemeUserBubbleClass={activeTheme?.userBubbleClass || ""}
                  activeThemeNyxBubbleClass={activeTheme?.nyxBubbleClass || ""}
                  activeThemeBorderColor={activeTheme?.borderColor || ""}
                  activeThemeAccentText={activeTheme?.accentText || ""}
                  currentFontSizeClass={currentFontSizeObj?.class || "text-xs"}
                  userNickname={project?.userNickname}
                  characters={characters || []}
                  allMessages={messages || []}
                  portraitPosition={project?.portraitPosition}
                  thinkingLevel={thinkingLevel}
                  renderPortrait={renderPortrait}
                  turnHeader={project?.turnHeader}
                />
              </MessageErrorBoundary>
            ))}

            {isGenerating && (
              <motion.div
                key="adventure-generating-indicator"
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.985 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="flex w-full justify-center"
              >
                <div className={`w-full border border-dashed border-purple-500/30 bg-slate-900/60 p-5 rounded-2xl flex flex-col relative shadow-xl shadow-purple-950/20 backdrop-blur-sm ${activeBubbleStyle.class}`}>
                  {/* Status header with thinking level, model indicator, and live elapsed timer */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-purple-500/20 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                      </span>
                      <span className="font-semibold text-purple-200">
                        {thinkingLevel === "High" 
                          ? "Deep Reasoning & Context Synthesis Active" 
                          : thinkingLevel === "Low" 
                            ? "Fast Narrative Generation Active" 
                            : "Narrative Generation Active"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                        thinkingLevel === "High" 
                          ? "bg-purple-900/60 text-purple-300 border border-purple-500/40" 
                          : thinkingLevel === "Low" 
                            ? "bg-blue-900/50 text-blue-300 border border-blue-500/30" 
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}>
                        {thinkingLevel} Thinking
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                      <span className="text-purple-300 font-bold tabular-nums">
                        {generatingElapsedSeconds}s elapsed
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="h-4 bg-slate-800/60 rounded w-1/3 mb-4 animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-800/50 rounded w-full animate-pulse" />
                        <div className="h-3 bg-slate-800/50 rounded w-5/6 animate-pulse" />
                        <div className="h-3 bg-slate-800/50 rounded w-2/3 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-purple-500/15 text-[11px] text-purple-300 font-mono">
                      {generatingElapsedSeconds > 10 && thinkingLevel === "High" && (
                        <div className="flex items-center gap-2 text-amber-400/90 text-[10px]">
                          <Sparkles size={12} className="animate-spin" />
                          <span>Auditing narrative continuity, relationship matrix & lore canon ({generatingElapsedSeconds}s)...</span>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-[200px]">
                          <Sparkles size={13} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                          <span className="italic text-slate-200 select-text leading-relaxed">
                            {funnyLoadingText}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => triggerNextLoreFact()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-500/30 text-purple-200 text-[10px] font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95"
                            title="Skip to next Did You Know? lore fact"
                          >
                            <RefreshCw size={11} />
                            <span>Next Fact</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsLoreCodexOpen(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-600/40 text-slate-200 text-[10px] font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95"
                            title="Open the Lore Codex archives"
                          >
                            <BookOpen size={11} />
                            <span>Lore Codex</span>
                          </button>

                          {onStopGeneration && (
                            <button
                              type="button"
                              onClick={onStopGeneration}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/60 transition-all cursor-pointer hover:scale-105 active:scale-95"
                              title="Halt storyteller generation immediately"
                            >
                              <Square size={11} className="fill-white" />
                              <span>Stop</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className={`p-2.5 sm:p-3 border-t ${activeTheme.borderColor} bg-slate-900/40 flex flex-col gap-2 z-10 shrink-0 relative`}>
          
          {/* Nyx Engine v2.0 - Granular In-Context Readout */}
          {allActiveContextLore.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-slate-400 font-mono select-none overflow-x-auto no-scrollbar">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-slate-500 font-bold shrink-0">Nyx 2.0 Context:</span>
              <div className="flex items-center gap-1.5 truncate">
                {allActiveContextLore.map((ent, idx) => {
                  const isPc = ent.isPlayerCharacter || ent.type === "pc";
                  const granularInfo = granularEntities.find(g => g.entity.id === ent.id);
                  const weightPct = isPc ? 100 : (granularInfo ? granularInfo.weightPercent : 100);
                  
                  let badgeStyle = "bg-slate-800 text-slate-400";
                  if (isPc) {
                    badgeStyle = "bg-purple-950/80 text-purple-300 border border-purple-800/60 font-semibold";
                  } else if (weightPct >= 80) {
                    badgeStyle = "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium";
                  } else if (weightPct >= 50) {
                    badgeStyle = "bg-teal-950/80 text-teal-300 border border-teal-800/60";
                  } else if (weightPct >= 25) {
                    badgeStyle = "bg-amber-950/80 text-amber-300 border border-amber-800/60";
                  } else {
                    badgeStyle = "bg-slate-900 text-slate-500 border border-slate-800";
                  }

                  const label = isPc ? "PC" : `${weightPct}%`;

                  return (
                    <span key={ent.id || idx} className="inline-flex items-center gap-1 text-slate-300">
                      <span>{ent.name}</span>
                      <span className={`text-[8px] px-1 py-0.2 rounded font-mono ${badgeStyle}`}>
                        {label}
                      </span>
                      {idx < allActiveContextLore.length - 1 && <span className="text-slate-600">·</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Collapsible Token range controls & RAG Anchor status bar */}
          {showPacingControls && (
            <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-400 font-mono px-1 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800/80 gap-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
              {/* Token Range Control Inputs */}
              <div className="flex items-center gap-2.5 px-2">
                <div className="flex items-center gap-1.5" title="Out-Of-Character (OOC) meta commentary token/word range">
                  <span className="text-purple-400 font-bold">OOC:</span>
                  <input
                    type="number"
                    value={project.oocMinTokens ?? 300}
                    onChange={(e) => onSetProjectValue("oocMinTokens", parseInt(e.target.value) || 100)}
                    className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-slate-200 outline-none focus:border-purple-500"
                    step={50}
                    min={50}
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    value={project.oocMaxTokens ?? 500}
                    onChange={(e) => onSetProjectValue("oocMaxTokens", parseInt(e.target.value) || 500)}
                    className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-slate-200 outline-none focus:border-purple-500"
                    step={50}
                    min={100}
                  />
                </div>

                <div className="w-[1px] h-3 bg-slate-800" />

                <div className="flex items-center gap-1.5" title="In-Character (IC) story narration & dialogue token/word range">
                  <span className="text-emerald-400 font-bold">IC:</span>
                  <input
                    type="number"
                    value={project.icMinTokens ?? 200}
                    onChange={(e) => onSetProjectValue("icMinTokens", parseInt(e.target.value) || 100)}
                    className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-slate-200 outline-none focus:border-emerald-500"
                    step={50}
                    min={50}
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    value={project.icMaxTokens ?? 400}
                    onChange={(e) => onSetProjectValue("icMaxTokens", parseInt(e.target.value) || 400)}
                    className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-slate-200 outline-none focus:border-emerald-500"
                    step={50}
                    min={100}
                  />
                </div>
              </div>

              {/* Font Size Selector Bar */}
              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800" title="Adjust Story Narrative & Assistant Text Size">
                <Type size={11} className="text-purple-400 shrink-0" />
                <span className="text-purple-400 font-bold text-[10px]">Text Size:</span>
                <div className="flex items-center gap-0.5">
                  {FONT_SIZE_KEYS.map((sKey) => {
                    const item = NARRATIVE_FONT_SIZES[sKey];
                    const isActive = currentFontSizeKey === sKey;
                    return (
                      <button
                        key={sKey}
                        type="button"
                        onClick={() => {
                          onSetProjectValue("narrativeFontSize", sKey);
                          onShowToast?.("Text Size Updated", `Font size set to ${item.label} (${item.px})`, "info");
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${
                          isActive
                            ? "bg-purple-600 text-white font-bold shadow-sm shadow-purple-900"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                        title={`${item.label} (${item.px})`}
                      >
                        {item.px}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Perspective (POV) Quick Toggle */}
              <button
                type="button"
                onClick={() => {
                  const nextPerspective = project.narrativePerspective === "second_person" ? "third_person" : "second_person";
                  onSetProjectValue("narrativePerspective", nextPerspective);
                  onShowToast?.(
                    "Perspective Updated",
                    `Switched perspective to ${nextPerspective === "second_person" ? "Second Person ('You do...')" : "Third Person ('Sena does...')"}`,
                    "info"
                  );
                }}
                className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
                  project.narrativePerspective === "second_person"
                    ? "bg-purple-950/80 border-purple-500/50 text-purple-200 shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:text-slate-100"
                }`}
                title="Click to toggle between Third Person (Sena does...) and Second Person (You do...)"
              >
                <span className="text-purple-400 font-bold">POV:</span>
                <span>{project.narrativePerspective === "second_person" ? "🎯 2nd (You)" : "👤 3rd (Sena)"}</span>
              </button>

              {/* Strict Story Facilitator Quick Toggle */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = project.strictPlayerAgency === false ? true : false;
                  onSetProjectValue("strictPlayerAgency", nextVal);
                  onShowToast?.(
                    nextVal ? "Story Facilitator Locked" : "Facilitator Guard Relaxed",
                    nextVal 
                      ? "Strict Facilitator Mode active: AI will strictly narrate the world & NPCs. Spoken quotes and actions for your PC are forbidden."
                      : "Strict Facilitator Mode relaxed.",
                    nextVal ? "success" : "info"
                  );
                }}
                className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
                  project.strictPlayerAgency !== false
                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200 shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Click to toggle Story Facilitator Mode (Locks AI from speaking or acting for your PC)"
              >
                <Shield size={11} className={project.strictPlayerAgency !== false ? "text-emerald-400 shrink-0" : "text-slate-400 shrink-0"} />
                <span className={project.strictPlayerAgency !== false ? "text-emerald-400 font-bold" : "text-slate-400 font-bold"}>Facilitator:</span>
                <span>{project.strictPlayerAgency !== false ? "🛡️ Strict" : "Off"}</span>
              </button>

              {/* Author Style & Zero-Drift Quick Anchor */}
              <button
                type="button"
                onClick={() => setShowAuthorStyleModal(true)}
                className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  project.creatorNames
                    ? "bg-purple-950/80 border-purple-500/60 text-purple-200 hover:bg-purple-900/80 shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Click to view literary blueprint, switch author, or lock anti-drift enforcement"
              >
                <Palette size={11} className="text-purple-400 shrink-0" />
                <span className="text-purple-400 font-bold">Style:</span>
                <span className="max-w-[120px] truncate">{project.creatorNames || "Master Literary"}</span>
                <Lock size={10} className={project.creatorNames ? "text-emerald-400" : "text-slate-500"} />
              </button>

              {/* RAG Grounding Active Anchor Badge */}
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                <Brain size={11} className="text-purple-400 shrink-0" />
                <span>RAG Grounding: Active</span>
              </div>
            </div>
          )}

          {assistantAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-900/60 rounded-xl border border-slate-800">
              {assistantAttachments.map((att) => (
                <div key={att.id} className="relative group flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-850 shadow-sm">
                  {att.type === "image" ? (
                    <img src={att.url} alt={att.name} className="w-4 h-4 object-cover rounded" referrerPolicy="no-referrer" />
                  ) : (
                    <FileText size={11} className="text-purple-400" />
                  )}
                  <span className="text-[10px] text-slate-300 max-w-[100px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => setAssistantAttachments(prev => prev.filter(a => a.id !== att.id))}
                    className="text-slate-500 hover:text-red-400 transition-colors ml-0.5"
                    title="Remove attachment"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 relative">
            {/* Action Toggles & Attachment Buttons */}
            <div className="relative shrink-0 flex items-center gap-1">
              {/* Pacing & Config Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPacingControls(prev => !prev)}
                className={`flex items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all text-slate-400 hover:text-slate-200 h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 ${
                  showPacingControls
                    ? "bg-purple-950/80 border-purple-500/80 text-purple-200 shadow-sm shadow-purple-950/50"
                    : "bg-slate-950 border-slate-800 hover:bg-slate-900"
                }`}
                title={showPacingControls ? "Hide Narrative Pacing & Token Controls" : "Show Narrative Pacing & Token Controls"}
              >
                <Sliders size={14} className={showPacingControls ? "text-purple-400" : "text-slate-400"} />
              </button>

              {/* Author Style & Literary Anti-Drift Engine Quick Button */}
              <button
                type="button"
                onClick={() => setShowAuthorStyleModal(true)}
                className={`flex items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 cursor-pointer ${
                  project.creatorNames
                    ? "bg-purple-950/80 border-purple-500/60 text-purple-200 hover:bg-purple-900/80 shadow-sm"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
                title={`Author Style & Anti-Drift Engine: ${project.creatorNames || "Master Literary Fiction"}`}
              >
                <Palette size={14} className={project.creatorNames ? "text-purple-300" : "text-slate-400"} />
              </button>

              {/* File Attachment Button */}
              <label className="flex items-center justify-center p-1.5 sm:p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl cursor-pointer transition-all text-slate-400 hover:text-slate-200 h-8.5 w-8.5 sm:h-9.5 sm:w-9.5" title="Attach local files (Up to 10)">
                <Paperclip size={14} className="text-purple-400 hover:text-purple-300" />
                <input 
                  type="file" 
                  multiple
                  onChange={handleAssistantFileChange} 
                  className="hidden" 
                />
              </label>

              {/* Google Drive Picker Button (collapses on very small screens) */}
              <button
                type="button"
                onClick={() => {
                  if (!googleToken) {
                    onShowToast?.("Google Drive Required", "Please click 'Connect Drive' in the top header to select files directly from Google Drive.", "info");
                    return;
                  }
                  setShowWorkspaceBrowser("drive");
                }}
                className="hidden xs:flex items-center justify-center p-1.5 sm:p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-200 h-8.5 w-8.5 sm:h-9.5 sm:w-9.5"
                title="Select documents from Google Drive"
              >
                <FolderOpen size={14} className="text-blue-400 hover:text-blue-300" />
              </button>
            </div>

            {/* Chat Form Input */}
            <form onSubmit={handleSend} className="flex-1 flex gap-2 items-end relative">
              <div className="flex-1 flex flex-col gap-1 relative">
                <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    {inputText.trim().length > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono text-purple-300 bg-purple-950/80 border border-purple-800/50 rounded-md w-fit animate-in fade-in duration-150">
                        <Save size={9} className="text-purple-400 shrink-0" />
                        <span>Draft ({inputText.trim().split(/\s+/).filter(Boolean).length}w | {inputText.length}c)</span>
                      </div>
                    )}

                    {/* Markdown Quick Formatting Toolbar */}
                    <div className="flex items-center gap-0.5 bg-slate-950/90 px-1 py-0.5 rounded-lg border border-slate-800 shadow-xs">
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("bold", chatInputRef)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-400 hover:text-purple-300 hover:bg-purple-950/50 transition-colors cursor-pointer"
                        title="Bold (**text**)"
                      >
                        <Bold size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("italic", chatInputRef)}
                        className="px-1.5 py-0.5 rounded text-[10px] italic text-slate-400 hover:text-purple-300 hover:bg-purple-950/50 transition-colors cursor-pointer"
                        title="Italic (*text*)"
                      >
                        <Italic size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("code", chatInputRef)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-purple-300 hover:bg-purple-950/50 transition-colors cursor-pointer"
                        title="Inline Code (`code`)"
                      >
                        <CodeIcon size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("codeblock", chatInputRef)}
                        className="px-1.5 py-0.5 rounded text-[9.5px] font-mono text-slate-400 hover:text-purple-300 hover:bg-purple-950/50 transition-colors cursor-pointer hidden sm:inline-flex items-center"
                        title="Code Block (```\ncode\n```)"
                      >
                        {`{ }`}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("quote", chatInputRef)}
                        className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-purple-300 hover:bg-purple-950/50 transition-colors cursor-pointer hidden sm:inline-flex items-center"
                        title="Blockquote (> quote)"
                      >
                        <Quote size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("list", chatInputRef)}
                        className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-purple-300 hover:bg-purple-950/50 transition-colors cursor-pointer hidden sm:inline-flex items-center"
                        title="List Item (- item)"
                      >
                        <ListIcon size={11} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsExpandedInput(true)}
                    className="text-[10px] font-mono text-purple-300 hover:text-purple-100 bg-purple-950/60 hover:bg-purple-900/80 px-2 py-0.5 rounded-md border border-purple-800/50 transition-all flex items-center gap-1 cursor-pointer shadow-xs ml-auto"
                    title="Expand into Large High-Capacity Narrative Editor"
                  >
                    <Maximize2 size={10} className="text-purple-400 shrink-0" />
                    <span>Expand Editor</span>
                  </button>
                </div>

                <textarea
                  ref={chatInputRef}
                  value={inputText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInputText(val);
                    const el = e.currentTarget;
                    requestAnimationFrame(() => {
                      if (el) {
                        el.style.height = "auto";
                        el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
                      }
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }
                  }}
                  rows={1}
                  placeholder="Enter actions, dialogue, or commands... (Ctrl+Enter to send, drag bottom edge to expand)"
                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 ${currentFontSizeObj.class} text-slate-100 outline-none focus:ring-1 focus:ring-purple-600 transition-all font-serif resize-y scrollbar-thin min-h-[44px] max-h-[320px]`}
                />
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRegenerateResponse(thinkingLevel)}
                  disabled={isGenerating}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 transition-all flex items-center justify-center gap-1 shrink-0 disabled:opacity-50 h-9.5 cursor-pointer"
                  title="Regenerate last storyteller response"
                >
                  <RefreshCw size={12} className={isGenerating ? "animate-spin" : ""} />
                  <span className="hidden sm:inline">Regen</span>
                </button>
              )}
              {isGenerating && onStopGeneration ? (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 h-9.5 cursor-pointer shadow-lg shadow-red-950/50 hover:scale-105 active:scale-95 animate-pulse"
                  title="Halt storyteller generation"
                >
                  <Square size={12} className="fill-white" /> <span className="hidden sm:inline">Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isGenerating || !inputText.trim()}
                  className={`text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 h-9.5 cursor-pointer ${activeTheme.buttonClass}`}
                  title="Send message (Ctrl+Enter)"
                >
                  <Send size={12} /> <span className="hidden sm:inline">Send</span>
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* 2.0 DYNAMIC CONTEXT & MEMORY INSPECTOR MODAL */}
      {showContextHUDModal && (
        <ContextHUDModal
          isOpen={true}
          onClose={() => setShowContextHUDModal(false)}
          characters={characters}
          messages={messages}
          slidingTurnsLimit={project.slidingContextTurns ?? 12}
          onSetSlidingTurns={(turns) => onSetProjectValue("slidingContextTurns", turns)}
          onUpdateCharacter={onUpdateCharacter}
          onShowToast={onShowToast}
        />
      )}

      {/* Workspace Browser, Modals and other absolute layers go below */}

      {/* MODAL 1: GOOGLE DRIVE & PHOTOS WORKSPACE BROWSER */}
      {showWorkspaceBrowser && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="bg-purple-900/40 p-2 rounded-lg text-purple-300">
                  <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.33 3.5h7.34l5.33 9.25H13.66L8.33 3.5z" fill="#FFCC00" />
                    <path d="M1.66 15h10.66l5.33-9.25H7L1.66 15z" fill="#1A73E8" />
                    <path d="M7 15l5.33 9.25h10.67L17.67 15H7z" fill="#0F9D58" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Google Workspace Browser</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Sync live documents or select assets directly from Google Cloud</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowWorkspaceBrowser(null);
                  setConfidenceReport(null);
                }}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content body split: Left tabs and list, Right preview & confidence scraper report */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left sidebar: File browser tab select and search */}
              <div className="w-2/3 border-r border-slate-800 flex flex-col p-4 space-y-4">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowWorkspaceBrowser("drive");
                        setConfidenceReport(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10.5px] font-bold uppercase transition-all ${
                        showWorkspaceBrowser === "drive"
                          ? "bg-purple-950/60 text-purple-200 border border-purple-500/30"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.33 3.5h7.34l5.33 9.25H13.66L8.33 3.5z" fill="#FFCC00" />
                        <path d="M1.66 15h10.66l5.33-9.25H7L1.66 15z" fill="#1A73E8" />
                        <path d="M7 15l5.33 9.25h10.67L17.67 15H7z" fill="#0F9D58" />
                      </svg>
                      Google Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowWorkspaceBrowser("photos");
                        setConfidenceReport(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10.5px] font-bold uppercase transition-all ${
                        showWorkspaceBrowser === "photos"
                          ? "bg-purple-950/60 text-purple-200 border border-purple-500/30"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.33 3.5h7.34l5.33 9.25H13.66L8.33 3.5z" fill="#FFCC00" />
                        <path d="M1.66 15h10.66l5.33-9.25H7L1.66 15z" fill="#1A73E8" />
                        <path d="M7 15l5.33 9.25h10.67L17.67 15H7z" fill="#0F9D58" />
                      </svg>
                      Photos
                    </button>
                  </div>
                </div>

                {/* Search */}
                <input
                  type="text"
                  value={browserSearch}
                  onChange={(e) => setBrowserSearch(e.target.value)}
                  placeholder={
                    showWorkspaceBrowser === "drive"
                      ? "Search Drive files..."
                      : "Search photo assets..."
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-purple-500 font-mono"
                />

                {showWorkspaceBrowser === "drive" && !googleToken && (
                  <div className="bg-amber-950/10 border border-amber-500/20 rounded-lg p-2.5 text-[10px] text-amber-400 font-mono flex items-start gap-2 leading-relaxed">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <strong>Google Drive not connected:</strong> Connect Google Drive via <strong>Workspace Tab</strong> to sync and analyze real Google Docs.
                    </div>
                  </div>
                )}
                {showWorkspaceBrowser === "drive" && googleToken && (
                  <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-lg p-2.5 text-[10px] text-emerald-400 font-mono flex items-start justify-between gap-2 leading-relaxed">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-500 animate-pulse" />
                      <div>
                        <strong>Google Drive Connected:</strong> Successfully synced real Google Docs! Select a document to preview and ingest.
                      </div>
                    </div>
                    {onClearGoogleToken && (
                      <button
                        type="button"
                        onClick={onClearGoogleToken}
                        className="text-[9px] font-bold uppercase bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-red-400 px-2 py-1 rounded transition-all shrink-0 ml-1"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                )}

                {/* File Cards Listing Grid */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
                  {isLoadingDriveFiles ? (
                    <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-500">
                      <RefreshCw size={20} className="animate-spin text-purple-400" />
                      <span className="text-[10px] font-mono">Syncing documents...</span>
                    </div>
                  ) : showWorkspaceBrowser === "drive" ? (
                    driveFiles.length === 0 ? (
                      <div className="h-40 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800/60 rounded-xl bg-slate-950/20 font-mono text-[10px] p-4">
                        <span>No documents loaded in workspace.</span>
                        <span className="mt-1 text-[9px] text-slate-500 text-center">Drag & drop or upload files to begin analyzing lore!</span>
                      </div>
                    ) : (
                      driveFiles
                        .filter(f => f.name.toLowerCase().includes(browserSearch.toLowerCase()))
                        .map((file) => (
                          <div 
                            key={file.id}
                            onClick={() => handleSelectBrowserFile(file.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center group/card ${
                              selectedBrowserFiles.includes(file.id)
                                ? "bg-purple-950/20 border-purple-500/40 shadow-md"
                                : "bg-slate-950/40 border-slate-850 hover:bg-slate-900/60"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-950 p-2 rounded-lg text-blue-400">
                                <FileText size={16} />
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-200 font-mono">{file.name}</h4>
                                <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                                  {file.folder} • {file.size}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-500 font-mono">{file.lastModified}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDriveFiles(prev => prev.filter(f => f.id !== file.id));
                                  if (selectedBrowserFiles.includes(file.id)) {
                                    setSelectedBrowserFiles([]);
                                  }
                                }}
                                className="p-1 hover:bg-red-950 hover:text-red-400 text-slate-500 transition-all rounded"
                                title="Remove document from browser list"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                    )
                  ) : (
                    photosFiles.length === 0 ? (
                      <div className="col-span-2 h-40 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800/60 rounded-xl bg-slate-950/20 font-mono text-[10px] p-4">
                        <span>No photo assets imported.</span>
                        <span className="mt-1 text-[9px] text-slate-500 text-center">Upload image assets below to build setting concepts!</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {photosFiles
                          .filter(f => f.name.toLowerCase().includes(browserSearch.toLowerCase()))
                          .map((photo) => (
                            <div 
                              key={photo.id}
                              onClick={() => handleSelectBrowserFile(photo.id)}
                              className={`rounded-lg overflow-hidden border cursor-pointer transition-all relative group/photo ${
                                selectedBrowserFiles.includes(photo.id)
                                  ? "border-purple-500 ring-2 ring-purple-950/60"
                                  : "border-slate-800 hover:border-slate-700"
                              }`}
                            >
                              <img src={photo.url} className="w-full h-24 object-cover" referrerPolicy="no-referrer" />
                              <div className="p-2 bg-slate-950 flex justify-between items-center gap-1.5">
                                <span className="text-[9px] text-slate-300 font-mono truncate flex-1">{photo.name}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPhotosFiles(prev => prev.filter(p => p.id !== photo.id));
                                    if (selectedBrowserFiles.includes(photo.id)) {
                                      setSelectedBrowserFiles([]);
                                    }
                                  }}
                                  className="p-1 hover:bg-red-950 hover:text-red-400 text-slate-500 transition-all rounded"
                                  title="Remove photo"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )
                  )}
                </div>

                {/* Local Upload Drag zone with HTML5 event prevention and isDragging styling */}
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => {
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      processUploadedFile(file);
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center gap-1.5 relative group ${
                    isDragging 
                      ? "border-purple-400 bg-purple-950/20 scale-[0.99]" 
                      : "border-slate-800 hover:border-purple-500/40 bg-slate-950/40"
                  }`}
                >
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        processUploadedFile(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload size={20} className={`transition-colors ${isDragging ? "text-purple-400" : "text-slate-500 group-hover:text-purple-400"}`} />
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Drag & drop files or click to upload</span>
                  <span className="text-[9px] text-slate-500 font-mono">Supports PDF, TXT, DOCX, PNG, JPG (Ingested instantly)</span>
                </div>
                <div className="mt-2.5 flex justify-center">
                  <GooglePickerButton
                    googleToken={googleToken}
                    onGoogleSignIn={onGoogleSignIn}
                    onFilePicked={(file) => {
                      const isImage = file.mimeType.startsWith("image/");
                      if (showWorkspaceBrowser === "photos" || isImage) {
                        const newId = "pht-" + Date.now();
                        setPhotosFiles(prev => [
                          {
                            id: newId,
                            name: file.name,
                            url: file.data,
                            date: "Just now"
                          },
                          ...prev
                        ]);
                        setSelectedBrowserFiles([newId]);
                      } else {
                        const newId = "drv-" + Date.now();
                        setDriveFiles(prev => [
                          {
                            id: newId,
                            name: file.name,
                            size: file.size || "GDrive",
                            folder: "Google Drive Picker",
                            lastModified: "Just now",
                            text: file.text || `[Binary File Attached: ${file.name} (${file.mimeType}) - Will be analyzed by Gemini API]`,
                            fileBase64: isImage ? file.data : undefined,
                            fileMimeType: isImage ? file.mimeType : undefined,
                            isRealDoc: false
                          },
                          ...prev
                        ]);
                        setSelectedBrowserFiles([newId]);
                      }
                    }}
                    onShowToast={onShowToast}
                    mode={showWorkspaceBrowser === "photos" ? "image" : "all"}
                    className="w-full justify-center"
                    label={showWorkspaceBrowser === "photos" ? "Import Photo from GDrive / Photos" : "Import File from Google Drive"}
                  />
                </div>
              </div>

              {/* Right Side: Preview Pane & Confidence Auto-Ingest Results */}
              <div className="w-1/3 bg-slate-950/60 p-4 flex flex-col overflow-hidden">
                {selectedBrowserFiles.length > 0 ? (
                  (() => {
                    const fileId = selectedBrowserFiles[0];
                    const driveFile = driveFiles.find(f => f.id === fileId);
                    const photoFile = photosFiles.find(f => f.id === fileId);

                    if (driveFile) {
                      return (
                        <div className="h-full flex flex-col justify-between overflow-hidden">
                          <div className="flex-1 flex flex-col overflow-hidden">
                            <span className="text-[8px] font-mono text-purple-400 uppercase tracking-widest block mb-1">Doc Contents Preview</span>
                            <h4 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-1.5 font-mono">
                              <FileText size={12} className="text-slate-400" />
                              {driveFile.name}
                            </h4>

                            <div className="flex-1 overflow-y-auto mt-3 bg-slate-900/60 p-3 rounded-lg border border-slate-850 text-[10px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">
                              {isFetchingDocText ? (
                                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 py-12">
                                  <RefreshCw size={20} className="animate-spin text-purple-400" />
                                  <span>Fetching content from Google Drive...</span>
                                </div>
                              ) : (
                                driveFile.text || "[Empty Document]"
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="mt-4 pt-3 border-t border-slate-800">
                            {isIngesting ? (
                              <div className="flex gap-2">
                                <button
                                  disabled
                                  className="flex-1 py-2.5 bg-purple-950/50 text-purple-300 border border-purple-500/20 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 animate-pulse"
                                >
                                  <RefreshCw size={14} className="animate-spin" />
                                  Analyzing...
                                </button>
                                <button
                                  onClick={() => {
                                    if (ingestAbortControllerRef.current) {
                                      ingestAbortControllerRef.current.abort();
                                    }
                                  }}
                                  className="px-3 bg-red-950/60 hover:bg-red-900/50 border border-red-500/40 hover:border-red-500 text-red-200 text-xs font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <XCircle size={14} /> Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleIngestFile(driveFile.text, driveFile.name, (driveFile as any).fileBase64, (driveFile as any).fileMimeType)}
                                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-purple-900/40"
                              >
                                <Sparkles size={14} />
                                Ingest & Auto-Fill Settings
                              </button>
                            )}

                            {confidenceReport && (
                              <div className="mt-3 bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-h-48 overflow-y-auto space-y-2">
                                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase">
                                  <CheckCircle2 size={12} />
                                  <span>Confidence Check Report</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-mono leading-relaxed">
                                  Synchronized settings fields based on 95% confidence ceiling check:
                                </p>
                                <div className="space-y-1">
                                  {Array.isArray(confidenceReport.fields) && confidenceReport.fields.map((f: any) => {
                                    const passed = f.confidence >= 95;
                                    return (
                                      <div key={f.key} className="flex justify-between items-center text-[9px] font-mono border-b border-slate-950 pb-1">
                                        <span className="text-slate-400">{f.name}:</span>
                                        <div className="flex items-center gap-1.5">
                                          <span className={passed ? "text-slate-200" : "text-amber-500 italic"}>
                                            {passed ? "Ingested" : "[No Info]"}
                                          </span>
                                          <span className={`font-bold px-1 rounded text-[8px] ${passed ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"}`}>
                                            {f.confidence}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {Array.isArray(confidenceReport.npcs) && confidenceReport.npcs.length > 0 && (
                                  <div className="pt-2 border-t border-slate-950 mt-2">
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                      Auto-Cast NPCS:
                                    </span>
                                    <div className="space-y-1">
                                      {confidenceReport.npcs.map((npc: any, nIdx: number) => (
                                        <div key={nIdx} className="text-[9px] text-purple-300 font-mono flex justify-between">
                                          <span>👤 {npc.name}</span>
                                          <span className="text-slate-500">[{npc.role || "NPC"}]</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (photoFile) {
                      return (
                        <div className="h-full flex flex-col justify-between">
                          <div className="space-y-3">
                            <span className="text-[8px] font-mono text-purple-400 uppercase tracking-widest block mb-1">Photo Preview</span>
                            <h4 className="text-xs font-bold text-slate-200 font-mono truncate">{photoFile.name}</h4>
                            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/40 p-1.5">
                              <img src={photoFile.url} className="w-full h-44 object-cover rounded" referrerPolicy="no-referrer" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <button
                              onClick={() => {
                                // Add to attachments
                                if (showWorkspaceBrowser === "photos") {
                                  setAssistantAttachments(prev => {
                                    if (prev.length >= 10) {
                                      onShowToast?.("Attachment Limit", "Maximum 10 attachments reached.", "info");
                                      return prev;
                                    }
                                    return [...prev, {
                                      id: "att-" + Date.now(),
                                      name: photoFile.name,
                                      type: "image",
                                      url: photoFile.url
                                    }];
                                  });
                                  setShowWorkspaceBrowser(null);
                                }
                              }}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                            >
                              📎 Attach to Chatbot Thread
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })()
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                    <div className="mb-2.5 animate-pulse">
                      <svg className="w-8 h-8 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.33 3.5h7.34l5.33 9.25H13.66L8.33 3.5z" fill="#FFCC00" />
                        <path d="M1.66 15h10.66l5.33-9.25H7L1.66 15z" fill="#1A73E8" />
                        <path d="M7 15l5.33 9.25h10.67L17.67 15H7z" fill="#0F9D58" />
                      </svg>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-300">Select a File</p>
                    <p className="text-[9px] text-slate-500 mt-1 max-w-[150px] leading-relaxed">
                      Click any Drive document or Photo asset to view metadata and sync directly.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM CLEAR NARRATIVE LOG */}
      {showClearLogModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowClearLogModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-950/50">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Clear Story Narrative Log?</h3>
                <p className="text-[11px] text-slate-400 font-mono">Confirm clearing active narrative history</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-850 rounded-xl text-xs text-slate-300 space-y-2.5">
              <p className="leading-relaxed">
                Are you sure you want to clear the narrative log for <strong className="text-purple-300">{project.name || "this session"}</strong>?
              </p>
              {messages.length > 0 && (
                <div className="text-[10.5px] text-amber-300/90 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-lg flex items-start gap-2 font-mono">
                  <span className="shrink-0 font-bold text-amber-400">⚠️</span>
                  <span>You have <strong>{messages.length}</strong> message{messages.length === 1 ? "" : "s"} in this feed. You can click <strong>Save & Sync GDoc</strong> first if you want to export your story before clearing!</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-850/60">
              <button
                type="button"
                onClick={() => setShowClearLogModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearChat();
                  setShowClearLogModal(false);
                  onShowToast?.("Log Cleared", "Narrative story feed has been reset.", "info");
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-950/50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} /> Clear Narrative Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPANDED WORLD SETTING EDITOR MODAL */}
      {expandedModalField && (() => {
        const modalVal = getExpandedFieldValue(expandedModalField.id);
        return (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-slate-950 border border-purple-500/40 rounded-2xl w-full max-w-5xl h-[90vh] max-h-[850px] p-4 sm:p-6 shadow-2xl flex flex-col gap-3 relative overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-300 shrink-0 shadow-lg shadow-purple-950/50">
                    <Scroll size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate">
                        {expandedModalField.title}
                      </h2>
                      {expandedModalField.badge && (
                        <span className="text-[10px] font-mono font-bold bg-purple-900/50 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full shrink-0">
                          {expandedModalField.badge}
                        </span>
                      )}
                    </div>
                    {expandedModalField.description && (
                      <p className="text-xs text-slate-400 truncate">
                        {expandedModalField.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseExpandedModal}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-purple-950/50 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Check size={16} /> Save & Close
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseExpandedModal}
                    className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Close Modal (Esc)"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Quick Action Toolbar & Live Stats */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-slate-850 px-3 py-2 rounded-xl text-xs">
                <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                  <span className="flex items-center gap-1 text-slate-300 font-semibold">
                    📊 {modalVal.length} <span className="text-slate-500 font-normal">chars</span>
                  </span>
                  <span className="text-slate-700">•</span>
                  <span>
                    {modalVal.trim() ? modalVal.trim().split(/\s+/).length : 0} <span className="text-slate-500">words</span>
                  </span>
                  <span className="text-slate-700">•</span>
                  <span>
                    {modalVal ? modalVal.split('\n').length : 0} <span className="text-slate-500">lines</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(modalVal);
                      onShowToast?.("Copied", "Text copied to clipboard", "info");
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium rounded-lg border border-slate-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Copy to clipboard"
                  >
                    <Copy size={12} /> Copy
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setExpandedFieldValue(expandedModalField.id, text);
                          onShowToast?.("Pasted", "Pasted text from clipboard", "info");
                        }
                      } catch {
                        onShowToast?.("Clipboard Access", "Use Ctrl+V / Cmd+V directly in the editor.", "info");
                      }
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium rounded-lg border border-slate-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Paste from clipboard"
                  >
                    <ClipboardList size={12} /> Paste
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Clear all text in this setting box?")) {
                        setExpandedFieldValue(expandedModalField.id, "");
                      }
                    }}
                    className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-medium rounded-lg border border-red-800/40 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Clear text"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                </div>
              </div>

              {/* Main Spacious Textarea */}
              <div className="flex-1 w-full relative flex flex-col">
                <textarea
                  value={modalVal}
                  onChange={(e) => setExpandedFieldValue(expandedModalField.id, e.target.value)}
                  placeholder={`Type or paste details for ${expandedModalField.title}...`}
                  autoFocus
                  className="flex-1 w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-sm sm:text-base text-slate-100 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 leading-relaxed resize-none font-sans shadow-inner"
                />
              </div>

              {/* Modal Footer / Shortcuts */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                <span>💡 Auto-saves in real-time as you type. Click Save & Close or press Esc when done.</span>
                <span className="hidden sm:inline">Press Esc to Exit</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Spark Dump Confirmation Modal */}
      {showSparkExportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <Sparkles size={16} />
                <span>Dump Thread to Spark Archive</span>
              </div>
              <button
                onClick={() => setShowSparkExportModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will save the full active chat transcript to <strong className="text-amber-300">RP Master Archives/01_Raw_Threads</strong> in your Google Drive as a clean Google Doc for background parsing.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Thread Archive Title</label>
              <input
                type="text"
                value={sparkThreadTitle}
                onChange={(e) => setSparkThreadTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none"
                placeholder="Enter thread title..."
              />
            </div>

            {!googleToken && (
              <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-lg text-[11px] text-amber-300/90 flex items-center justify-between">
                <span>No Google account linked. Sandbox mode will simulate upload.</span>
                {onGoogleSignIn && (
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="px-2 py-0.5 bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 rounded text-[10px] font-mono"
                  >
                    Sign In
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSparkExportModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg transition-colors cursor-pointer"
                disabled={isSparkExporting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDumpToSparkArchive}
                disabled={isSparkExporting}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Sparkles size={13} />
                <span>{isSparkExporting ? "Uploading..." : "Confirm Dump to Spark"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPANDED NARRATIVE TURN EDITOR MODAL */}
      {isExpandedInput && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2.5">
                <div className="bg-purple-900/50 p-2 rounded-xl text-purple-300 border border-purple-700/40">
                  <Maximize2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Large Narrative Input Editor
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded-full border border-purple-800/50">
                      High Capacity
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {inputText.length} chars | {inputText.trim() ? inputText.trim().split(/\s+/).length : 0} words | {inputText.split('\n').length} lines
                  </p>
                </div>
              </div>

              {/* Formatting & Quick Inserts */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Markdown Buttons */}
                <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown("bold", expandedInputRef)}
                    className="p-1 rounded text-xs font-bold text-slate-300 hover:text-purple-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Bold (**text**)"
                  >
                    <Bold size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown("italic", expandedInputRef)}
                    className="p-1 rounded text-xs italic text-slate-300 hover:text-purple-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Italic (*text*)"
                  >
                    <Italic size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown("code", expandedInputRef)}
                    className="p-1 rounded text-xs font-mono text-slate-300 hover:text-purple-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Inline Code (`code`)"
                  >
                    <CodeIcon size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown("codeblock", expandedInputRef)}
                    className="px-1.5 py-1 rounded text-xs font-mono text-slate-300 hover:text-purple-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Code Block (```language\ncode\n```)"
                  >
                    {`{ } Code Block`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown("quote", expandedInputRef)}
                    className="p-1 rounded text-xs text-slate-300 hover:text-purple-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Blockquote (> quote)"
                  >
                    <Quote size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown("list", expandedInputRef)}
                    className="p-1 rounded text-xs text-slate-300 hover:text-purple-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="List Item (- item)"
                  >
                    <ListIcon size={13} />
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-800 hidden sm:block" />

                <button
                  type="button"
                  onClick={() => handleInsertMarkdown("ooc", expandedInputRef)}
                  className="text-[10px] font-mono bg-slate-800 hover:bg-slate-750 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Insert Out-Of-Character bracket"
                >
                  + [OOC]
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMarkdown("dialogue", expandedInputRef)}
                  className="text-[10px] font-mono bg-slate-800 hover:bg-slate-750 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Insert quotes for dialogue"
                >
                  + "Dialogue"
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMarkdown("italic", expandedInputRef)}
                  className="text-[10px] font-mono bg-slate-800 hover:bg-slate-750 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Insert italic action emphasis"
                >
                  + *Action*
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpandedInput(false)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main High-Volume Textarea */}
            <div className="flex-1 p-4 bg-slate-950 flex flex-col relative overflow-hidden">
              <textarea
                ref={expandedInputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Write or edit your large roleplay block, multi-paragraph scene turn, character dialogue, or detailed action sequence here (Markdown formatting supported)..."
                className={`flex-1 w-full bg-slate-900/80 border border-slate-800 focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/40 rounded-xl p-4 ${currentFontSizeObj.class} text-slate-100 outline-none resize-none font-serif leading-relaxed scrollbar-thin`}
                autoFocus
              />
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-purple-300">Ctrl + Enter</kbd> to send directly</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpandedInput(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                >
                  Done Editing
                </button>
                {isGenerating && onStopGeneration ? (
                  <button
                    type="button"
                    onClick={() => {
                      onStopGeneration();
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-lg cursor-pointer animate-pulse"
                    title="Halt storyteller generation"
                  >
                    <Square size={13} className="fill-white" />
                    <span>Stop Generation</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      setIsExpandedInput(false);
                      handleSend(e);
                    }}
                    disabled={isGenerating || !inputText.trim()}
                    className={`text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-lg cursor-pointer ${activeTheme.buttonClass}`}
                  >
                    <Send size={13} />
                    <span>Send Turn (Ctrl+Enter)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encyclopedic Lore Archives & Codex Modal */}
      {isLoreCodexOpen && (
        <LoreCodexModal
          isOpen={true}
          onClose={() => setIsLoreCodexOpen(false)}
          activeUniverse={activeSettingResolved}
          currentCampaign={{
            id: project?.id,
            name: project?.name,
            activeFactIndexes: project?.activeFactIndexes
          }}
          onUpdateCampaignIndexes={(indexes) => {
            onSetProjectValue("activeFactIndexes", indexes);
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Turn-Level Token Breakdown Modal */}
      {!!tokenBreakdownTarget && (
        <TokenBreakdownModal
          isOpen={true}
          onClose={() => setTokenBreakdownTarget(null)}
          msg={tokenBreakdownTarget?.msg || null}
          turnIndex={tokenBreakdownTarget?.index ?? 0}
          characters={characters}
          turnHeader={project.turnHeader}
          allMessages={messages}
          onSelectTurn={(newIdx) => {
            if (newIdx >= 0 && newIdx < messages.length) {
              setTokenBreakdownTarget({ msg: messages[newIdx], index: newIdx });
            }
          }}
        />
      )}

      {/* Canon & Narrative Delta Studio Modal */}
      {showCanonDeltaStudio && (
        <CanonDeltaStudioModal
          isOpen={true}
          onClose={() => setShowCanonDeltaStudio(false)}
          initialCharacter={canonStudioTargetChar}
          existingCharacters={characters}
          chatMessages={messages}
          projectSetting={project.setting || project.name || ""}
          onApplyProfile={handleApplyCanonProfile}
        />
      )}

    </div>
  );
}
