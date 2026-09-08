/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Project, Message, GeneratedImage, KeepNote, KeepTask, CharacterProfile, SyncActivityLog, RelationshipTrack, LoreSource 
} from "./types";
import { 
  auth, db, googleProvider, googleDriveProvider, signInWithPopup, signOut, onAuthStateChanged,
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, addDoc,
  OperationType, handleFirestoreError
} from "./lib/firebase";
import { GoogleAuthProvider } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import AdventureChat from "./components/AdventureChat";
import NarrativeSuite from "./components/NarrativeSuite";
import ImageVideoSuite from "./components/ImageVideoSuite";
import WorkspaceSync from "./components/WorkspaceSync";
import { StoryArchiveModal } from "./components/StoryArchiveModal";
import { StudioAssistantSidebar } from "./components/StudioAssistantSidebar";
import { MobileWorldSettings } from "./components/MobileWorldSettings";
import { createGoogleDoc } from "./utils/googleWorkspace";
import { ParsedMessage } from "./utils/domParser";
import { safeFetchJson } from "./utils/apiClient";
import { 
  Sparkles, Layers, BookOpen, FileText, Image as ImageIcon, 
  LogIn, LogOut, Plus, Globe, Trash2, FolderOpen,
  Check, X, Edit3, Copy, Smartphone, Monitor,
  Cloud, RefreshCw
} from "lucide-react";

import { cleanForFirestore } from "./lib/firebase";
export { cleanForFirestore };

const DEFAULT_INITIAL_PROJECT: Project = {
  id: "proj-default-nyx",
  name: "Nyx Roleplay Campaign",
  description: "Primary creative storytelling & roleplay campaign",
  setting: "Custom World",
  creatorNames: "Custom Authors",
  customInstructions: "",
  narrationStyle: "Vivid novel-grade detail",
  narrativePerspective: "third_person",
  pacing: "Default to Author(s)",
  emotionalTone: "Default to Author(s)",
  canonSource: "Custom Core",
  styleGuide: "",
  storyModules: "",
  userNickname: "Adventurer",
  activeChatId: "chat-default",
  ragSummary: "",
  themeId: "slate",
  chatBgPreset: "none",
  chatBubbleStyle: "glass",
  sources: [],
  persistentContext: "",
  plotOverview: "",
  turnHeader: ""
};

function sanitizeProjects(rawList: any[]): Project[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return [DEFAULT_INITIAL_PROJECT];
  }
  const sanitized = rawList.map((p, idx) => {
    const rawName = typeof p?.name === "string" ? p.name.trim() : "";
    const rawSetting = typeof p?.setting === "string" ? p.setting.trim() : "";
    const fallbackName = rawName || rawSetting || (idx === 0 ? "Nyx Roleplay Campaign" : `Campaign ${idx + 1}`);
    return {
      ...DEFAULT_INITIAL_PROJECT,
      ...p,
      id: p?.id || `proj-${Date.now()}-${idx}`,
      name: fallbackName,
      description: p?.description || `Custom world roleplay campaign: ${fallbackName}`,
      setting: rawSetting || "Custom World",
      creatorNames: p?.creatorNames || "Custom Authors",
      customInstructions: p?.customInstructions || "",
      narrationStyle: p?.narrationStyle || "Vivid novel-grade detail",
      pacing: p?.pacing || "Default to Author(s)",
      emotionalTone: p?.emotionalTone || "Default to Author(s)",
      canonSource: p?.canonSource || "Custom Core",
      styleGuide: p?.styleGuide || "",
      storyModules: p?.storyModules || "",
      userNickname: p?.userNickname || "Adventurer",
      activeChatId: p?.activeChatId || `chat-${Date.now()}`,
      ragSummary: p?.ragSummary || "",
      themeId: p?.themeId || "slate",
      chatBgPreset: p?.chatBgPreset || "none",
      chatBubbleStyle: p?.chatBubbleStyle || "glass",
      turnHeader: typeof p?.turnHeader === "string" ? p.turnHeader : ""
    } as Project;
  });
  return sanitized.length > 0 ? sanitized : [DEFAULT_INITIAL_PROJECT];
}

const inMemoryStorage: Record<string, string> = {};
let isStorageWorking = true;

try {
  if (typeof window !== "undefined" && window.localStorage) {
    const testKey = "__nyx_storage_test__";
    window.localStorage.setItem(testKey, "1");
    if (window.localStorage.getItem(testKey) !== "1") {
      isStorageWorking = false;
    } else {
      window.localStorage.removeItem(testKey);
    }
  } else {
    isStorageWorking = false;
  }
} catch (e) {
  isStorageWorking = false;
}

export const safeLocalStorage = {
  isAvailable: (): boolean => isStorageWorking,
  getItem: (key: string): string | null => {
    if (!isStorageWorking) {
      return inMemoryStorage[key] || null;
    }
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`localStorage.getItem failed for key "${key}":`, e);
      return inMemoryStorage[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!isStorageWorking) {
      inMemoryStorage[key] = value;
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`localStorage.setItem failed for key "${key}":`, e);
      inMemoryStorage[key] = value;
    }
  },
  removeItem: (key: string): void => {
    if (!isStorageWorking) {
      delete inMemoryStorage[key];
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`localStorage.removeItem failed for key "${key}":`, e);
      delete inMemoryStorage[key];
    }
  }
};

export function loadAllProjectsSafely(currentUid?: string): Project[] {
  const discovered: Project[] = [];
  const seenIds = new Set<string>();

  const addProjectIfNew = (p: any) => {
    if (!p) return;
    const rawId = p.id || `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (seenIds.has(rawId)) return;
    seenIds.add(rawId);
    
    const rawName = (typeof p.name === "string" ? p.name.trim() : "");
    const rawSetting = (typeof p.setting === "string" ? p.setting.trim() : "");
    const name = rawName || rawSetting || "Untitled Campaign";

    discovered.push({
      ...DEFAULT_INITIAL_PROJECT,
      ...p,
      id: rawId,
      name,
      setting: rawSetting || name,
      activeChatId: p.activeChatId || `chat-${rawId}`,
    } as Project);
  };

  // 1. User-specific projects
  if (currentUid) {
    const userSaved = safeLocalStorage.getItem(`local_projects_${currentUid}`);
    if (userSaved) {
      try {
        const parsed = JSON.parse(userSaved);
        if (Array.isArray(parsed)) parsed.forEach(addProjectIfNew);
      } catch {}
    }
  }

  // 2. Guest local_projects
  const guestSaved = safeLocalStorage.getItem("local_projects");
  if (guestSaved) {
    try {
      const parsed = JSON.parse(guestSaved);
      if (Array.isArray(parsed)) parsed.forEach(addProjectIfNew);
    } catch {}
  }

  // 3. Backup projects
  const backupSaved = safeLocalStorage.getItem("nyx_backup_projects") || safeLocalStorage.getItem("local_projects_backup");
  if (backupSaved) {
    try {
      const parsed = JSON.parse(backupSaved);
      if (Array.isArray(parsed)) parsed.forEach(addProjectIfNew);
    } catch {}
  }

  // 4. Scan all localStorage keys for project arrays or orphaned campaign data
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;

        if (k.startsWith("local_projects") || k.includes("projects")) {
          const raw = safeLocalStorage.getItem(k);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                parsed.forEach(p => {
                  if (p && (p.id || p.name || p.setting)) addProjectIfNew(p);
                });
              }
            } catch {}
          }
        }

        // Reconstruct campaigns from messages/characters keys
        if (k.startsWith("local_messages_") || k.startsWith("local_characters_")) {
          const inferredId = k
            .replace("local_messages_backup_", "")
            .replace("local_messages_", "")
            .replace("local_characters_backup_", "")
            .replace("local_characters_", "");

          if (inferredId && !seenIds.has(inferredId)) {
            const rawVal = safeLocalStorage.getItem(k);
            if (rawVal) {
              try {
                const parsed = JSON.parse(rawVal);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  let derivedName = "";
                  const valLower = rawVal.toLowerCase();
                  const keyLower = k.toLowerCase();

                  if (keyLower.includes("shima") || valLower.includes("shima")) {
                    derivedName = "Shima";
                  } else if (k.startsWith("local_characters_")) {
                    const firstChar = parsed[0];
                    if (firstChar?.name) derivedName = firstChar.name;
                  }

                  if (!derivedName) {
                    derivedName = inferredId.startsWith("proj-") ? `Campaign (${inferredId.slice(0, 12)})` : inferredId;
                  }

                  addProjectIfNew({
                    id: inferredId,
                    name: derivedName,
                    setting: derivedName,
                    description: `Restored campaign (${parsed.length} log turns)`
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch {}
  }

  // 5. Explicit check for "Shima" project
  const hasShima = discovered.some(p => p.name.toLowerCase().includes("shima") || p.id.toLowerCase().includes("shima"));
  if (!hasShima) {
    let shimaId = "proj-shima";
    let foundShimaMention = false;
    if (typeof window !== "undefined" && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const val = safeLocalStorage.getItem(k) || "";
        if (k.toLowerCase().includes("shima") || val.toLowerCase().includes("shima")) {
          foundShimaMention = true;
          if (k.startsWith("local_messages_")) {
            shimaId = k.replace("local_messages_backup_", "").replace("local_messages_", "");
          }
          break;
        }
      }
    }

    // Only add Shima if there is actual Shima campaign data in storage
    if (foundShimaMention) {
      addProjectIfNew({
        id: shimaId,
        name: "Shima",
        setting: "Shima Adventure",
        description: "Recovered Shima campaign",
        themeId: "purple"
      });
    }
  }

  return discovered.length > 0 ? discovered : [DEFAULT_INITIAL_PROJECT];
}

/**
 * Multi-tier safe loaders with intelligent data isolation for campaign adventure logs,
 * prompts, and character profiles across project switching and browser sessions.
 */
export function loadProjectMessagesSafely(projectId: string, projectName?: string): Message[] {
  if (!projectId) return [];
  try {
    // 1. Direct local storage
    const primaryStr = safeLocalStorage.getItem(`local_messages_${projectId}`);
    if (primaryStr !== null) {
      try {
        const parsed = JSON.parse(primaryStr);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.warn("Error parsing primary messages:", e);
      }
    }

    // 2. Direct local backup
    const backupStr = safeLocalStorage.getItem(`local_messages_backup_${projectId}`);
    if (backupStr !== null) {
      try {
        const parsed = JSON.parse(backupStr);
        if (Array.isArray(parsed)) {
          safeLocalStorage.setItem(`local_messages_${projectId}`, backupStr);
          return parsed;
        }
      } catch (e) {
        console.warn("Error parsing backup messages:", e);
      }
    }

    // 3. Explicit check only for legacy Shima recovery key if this is specifically the Shima project ID
    if (projectId === "proj-shima" || projectId.toLowerCase().includes("shima")) {
      const shimaCandidate = safeLocalStorage.getItem("local_messages_proj-shima") || safeLocalStorage.getItem("nyx_backup_messages_shima");
      if (shimaCandidate) {
        try {
          const msgs = JSON.parse(shimaCandidate);
          if (Array.isArray(msgs) && msgs.length > 0) {
            safeLocalStorage.setItem(`local_messages_${projectId}`, shimaCandidate);
            return msgs;
          }
        } catch {}
      }
    }
  } catch (e) {
    console.error("Error in loadProjectMessagesSafely:", e);
  }
  return [];
}

export function loadProjectCharactersSafely(projectId: string): CharacterProfile[] {
  if (!projectId) return [];
  try {
    const primaryStr = safeLocalStorage.getItem(`local_characters_${projectId}`);
    if (primaryStr !== null) {
      try {
        const parsed = JSON.parse(primaryStr);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    const backupStr = safeLocalStorage.getItem(`local_characters_backup_${projectId}`);
    if (backupStr !== null) {
      try {
        const parsed = JSON.parse(backupStr);
        if (Array.isArray(parsed)) {
          safeLocalStorage.setItem(`local_characters_${projectId}`, backupStr);
          return parsed;
        }
      } catch {}
    }
  } catch (e) {
    console.error("Error in loadProjectCharactersSafely:", e);
  }
  return [];
}

export default function App() {
  // Dynamic Toast Notifications
  interface ToastMessage {
    id: string;
    title: string;
    description: string;
    type: "success" | "error" | "info";
  }
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (title: string, description: string, type: "success" | "error" | "info" = "success") => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 7000);
  };

  const [user, setUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    const token = safeLocalStorage.getItem("nyx_google_token");
    const timestampStr = safeLocalStorage.getItem("nyx_google_token_timestamp");
    if (token && timestampStr) {
      const timestamp = parseInt(timestampStr, 10);
      if (Date.now() - timestamp > 50 * 60 * 1000) {
        safeLocalStorage.removeItem("nyx_google_token");
        safeLocalStorage.removeItem("nyx_google_token_timestamp");
        return null;
      }
    }
    return token;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isConnectingEngine, setIsConnectingEngine] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const loadedProjectIdRef = React.useRef<string>("");
  const [activeTab, setActiveTab] = useState<"chat" | "editor" | "image" | "workspace">("chat");

  // Streamlined Mobile Mode state: specifically focuses into Narration, Assistant, and World Settings
  const [isMobileLite, setIsMobileLite] = useState<boolean>(() => {
    try {
      const saved = safeLocalStorage.getItem("nyx_mobile_compact_mode") || safeLocalStorage.getItem("nyx_mobile_lite_mode");
      if (saved !== null) return saved === "true";
      return typeof window !== "undefined" && window.innerWidth < 768;
    } catch {
      return false;
    }
  });

  const [mobileLiteTab, setMobileLiteTab] = useState<"chat" | "assistant" | "settings">("chat");

  const toggleMobileLiteMode = () => {
    setIsMobileLite(prev => {
      const next = !prev;
      try {
        safeLocalStorage.setItem("nyx_mobile_compact_mode", String(next));
      } catch (e) {
        // ignore
      }
      showToast(
        next ? "📱 Streamlined Mobile View Active" : "💻 Full Studio Mode Active",
        next 
          ? "Streamlined interface focused on Narration, Assistant, and World Settings." 
          : "Full desktop suite with Narrative Editing, Image Generator, and Workspace Sync enabled.",
        "info"
      );
      return next;
    });
  };

  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setIsOnline(true);
      showToast("📶 Back Online!", "Your connection has been restored. Real-time features and AI engines are active.", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("⚠️ Connection Offline", "You are now offline. All campaigns, notes, prompts, and characters are running on secure local storage.", "info");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Core Data Lists
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const lastUid = safeLocalStorage.getItem("nyx_last_user_uid") || undefined;
      return loadAllProjectsSafely(lastUid);
    } catch {
      return [DEFAULT_INITIAL_PROJECT];
    }
  });
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const lastUid = safeLocalStorage.getItem("nyx_last_user_uid");
    const key = lastUid ? `local_activeProjectId_${lastUid}` : "local_activeProjectId";
    return safeLocalStorage.getItem(key) || "";
  });
  const activeProjectIdRef = React.useRef<string>(activeProjectId);
  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  // Track the project ID that the in-memory messages, prompts, and characters actually belong to
  const currentDataProjectIdRef = React.useRef<string>(activeProjectId);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const lastUid = safeLocalStorage.getItem("nyx_last_user_uid");
      const activeId = (lastUid ? safeLocalStorage.getItem(`local_activeProjectId_${lastUid}`) : null) || safeLocalStorage.getItem("local_activeProjectId") || "";
      if (activeId) {
        return loadProjectMessagesSafely(activeId);
      }
    } catch {}
    return [];
  });
  const [notes, setNotes] = useState<KeepNote[]>(() => {
    try {
      const saved = safeLocalStorage.getItem("local_notes");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
    return [];
  });
  const [tasks, setTasks] = useState<KeepTask[]>(() => {
    try {
      const saved = safeLocalStorage.getItem("local_tasks");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
    return [];
  });
  const [gallery, setGallery] = useState<GeneratedImage[]>(() => {
    try {
      const saved = safeLocalStorage.getItem("local_gallery");
      return saved ? JSON.parse(saved) : [];
    } catch {}
    return [];
  });
  const [characters, setCharacters] = useState<CharacterProfile[]>(() => {
    try {
      const lastUid = safeLocalStorage.getItem("nyx_last_user_uid");
      const activeId = (lastUid ? safeLocalStorage.getItem(`local_activeProjectId_${lastUid}`) : null) || safeLocalStorage.getItem("local_activeProjectId") || "";
      if (activeId) {
        return loadProjectCharactersSafely(activeId);
      }
    } catch {}
    return [];
  });

  const [syncLogs, setSyncLogs] = useState<SyncActivityLog[]>(() => {
    try {
      const saved = safeLocalStorage.getItem("local_sync_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {}
    return [];
  });

  const handleAddSyncLog = (sourceName: string, type: SyncActivityLog["type"], message: string) => {
    const newLog: SyncActivityLog = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      sourceName,
      type,
      message
    };
    setSyncLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 200); // keep max 200 logs
      try {
        safeLocalStorage.setItem("local_sync_logs", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Local Storage Synchronizers
  useEffect(() => {
    if (!isInitialLoad) {
      if (user) {
        safeLocalStorage.setItem(`local_projects_${user.uid}`, JSON.stringify(projects));
      } else {
        safeLocalStorage.setItem("local_projects", JSON.stringify(projects));
      }
    }
  }, [projects, isInitialLoad, user]);

  useEffect(() => {
    const key = user ? `local_activeProjectId_${user.uid}` : "local_activeProjectId";
    if (activeProjectId) {
      safeLocalStorage.setItem(key, activeProjectId);
      if (user) {
        setDoc(doc(db, `users/${user.uid}`), { activeProjectId }, { merge: true }).catch((err) => {
          console.error("Failed to save active project ID to Firestore user profile:", err);
        });
      }

      // Safe Project Switch:
      const prevProjectId = currentDataProjectIdRef.current;
      // If switching from another project, flush previous project's non-empty items to storage first
      if (prevProjectId && prevProjectId !== activeProjectId) {
        if (messages.length > 0) {
          safeLocalStorage.setItem(`local_messages_${prevProjectId}`, JSON.stringify(messages));
          safeLocalStorage.setItem(`local_messages_backup_${prevProjectId}`, JSON.stringify(messages));
        }
        if (characters.length > 0) {
          safeLocalStorage.setItem(`local_characters_${prevProjectId}`, JSON.stringify(characters));
          safeLocalStorage.setItem(`local_characters_backup_${prevProjectId}`, JSON.stringify(characters));
        }
      }

      // Now load target project's data cleanly
      const targetProj = projects.find(p => p.id === activeProjectId);
      const loadedMsgs = loadProjectMessagesSafely(activeProjectId, targetProj?.name);
      const loadedChars = loadProjectCharactersSafely(activeProjectId);

      setMessages(loadedMsgs);
      setCharacters(loadedChars);

      currentDataProjectIdRef.current = activeProjectId;
      loadedProjectIdRef.current = activeProjectId;
    } else {
      safeLocalStorage.removeItem(key);
      if (user) {
        setDoc(doc(db, `users/${user.uid}`), { activeProjectId: "" }, { merge: true }).catch((err) => {
          console.error("Failed to clear active project ID in Firestore user profile:", err);
        });
      }
    }
  }, [activeProjectId, user]);

  useEffect(() => {
    safeLocalStorage.setItem("local_notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    safeLocalStorage.setItem("local_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    safeLocalStorage.setItem("local_gallery", JSON.stringify(gallery));
  }, [gallery]);

  // Persist active messages safely (guarded against cross-project race conditions)
  useEffect(() => {
    if (activeProjectId && currentDataProjectIdRef.current === activeProjectId) {
      safeLocalStorage.setItem(`local_messages_${activeProjectId}`, JSON.stringify(messages));
      if (messages.length > 0) {
        safeLocalStorage.setItem(`local_messages_backup_${activeProjectId}`, JSON.stringify(messages));
      }
    }
  }, [messages, activeProjectId]);

  // Persist active characters safely
  useEffect(() => {
    if (activeProjectId && currentDataProjectIdRef.current === activeProjectId) {
      safeLocalStorage.setItem(`local_characters_${activeProjectId}`, JSON.stringify(characters));
      if (characters.length > 0) {
        safeLocalStorage.setItem(`local_characters_backup_${activeProjectId}`, JSON.stringify(characters));
      }
    }
  }, [characters, activeProjectId]);

  // Generation / Loading spinners
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const chatAbortControllerRef = useRef<AbortController | null>(null);

  // Stop active narrator generation
  const handleStopChatGeneration = () => {
    if (chatAbortControllerRef.current) {
      try {
        chatAbortControllerRef.current.abort();
      } catch (e) {
        console.warn("Error aborting chat controller:", e);
      }
      chatAbortControllerRef.current = null;
    }
    setIsGeneratingChat(false);
    showToast("Storyteller Paused", "Halted active story narration.", "info");
  };

  // New Project Modal State
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [showStoryArchiveModal, setShowStoryArchiveModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjSetting, setNewProjSetting] = useState("");
  const [newProjNickname, setNewProjNickname] = useState("");
  const [newProjCloneFromCurrent, setNewProjCloneFromCurrent] = useState(false);

  const handleRestoreOrCreateCampaign = (campaignName: string, restoredMsgs?: Message[], specificProjectId?: string) => {
    const name = campaignName?.trim() || "Shima";
    let targetProj = projects.find(p => p.name.toLowerCase() === name.toLowerCase() || (specificProjectId && p.id === specificProjectId));
    let targetId = targetProj?.id || specificProjectId;

    if (!targetProj) {
      targetId = specificProjectId || `proj-${Date.now()}`;
      const newProj: Project = {
        ...DEFAULT_INITIAL_PROJECT,
        id: targetId,
        name: name,
        setting: name.toLowerCase().includes("shima") ? "Shima Adventure" : `${name} Campaign`,
        description: `Recovered ${name} campaign`,
        activeChatId: `chat-${targetId}`,
        themeId: "purple"
      };
      setProjects(prev => [...prev.filter(p => p.id !== targetId), newProj]);
      if (user) {
        setDoc(doc(db, `users/${user.uid}/projects/${targetId}`), newProj).catch(console.warn);
      }
    }

    if (targetId) {
      setActiveProjectId(targetId);
      if (restoredMsgs && restoredMsgs.length > 0) {
        setMessages(restoredMsgs);
        safeLocalStorage.setItem(`local_messages_${targetId}`, JSON.stringify(restoredMsgs));
        safeLocalStorage.setItem(`local_messages_backup_${targetId}`, JSON.stringify(restoredMsgs));
        if (user) {
          for (const m of restoredMsgs) {
            setDoc(doc(db, `users/${user.uid}/projects/${targetId}/messages`, m.id), m).catch(console.warn);
          }
        }
      } else {
        const recovered = loadProjectMessagesSafely(targetId, name);
        if (recovered.length > 0) {
          setMessages(recovered);
        }
      }
      showToast("🌟 Campaign Restored", `Switched to "${name}" with active logs and characters.`, "success");
    }
  };

  const handleDeepScanAndRecover = () => {
    const all = loadAllProjectsSafely(user?.uid);
    setProjects(all);
    showToast("🔍 Campaign Scan Complete", `Found ${all.length} campaigns in storage.`, "success");
  };

  const handleRestoreArchivedMessages = (restoredMsgs: Message[], campaignName?: string) => {
    if (!restoredMsgs || restoredMsgs.length === 0) return;
    setMessages(restoredMsgs);
    if (activeProjectId) {
      safeLocalStorage.setItem(`local_messages_${activeProjectId}`, JSON.stringify(restoredMsgs));
      safeLocalStorage.setItem(`local_messages_backup_${activeProjectId}`, JSON.stringify(restoredMsgs));
      if (user) {
        for (const m of restoredMsgs) {
          setDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, m.id), m).catch(console.warn);
        }
      }
    }
  };

  const [confirmDeleteProjId, setConfirmDeleteProjId] = useState<string | null>(null);

  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleText, setEditingTitleText] = useState("");

  // Background Sync: Auto-sync any unsynced local campaigns, characters, messages & notes to Firestore
  const syncLocalDataToFirestore = async (currentUser: any, forceSyncAll: boolean = false) => {
    if (!currentUser) return;
    try {
      // Gather all known projects across all storage sources
      const allFound = loadAllProjectsSafely(currentUser.uid);
      const combinedProjects = [...allFound];
      projects.forEach(p => {
        if (!combinedProjects.some(cp => cp.id === p.id)) {
          combinedProjects.push(p);
        }
      });

      // Filter projects that need cloud sync
      const targetProjects = forceSyncAll ? combinedProjects : combinedProjects.filter(p => !p.syncedToCloud || forceSyncAll);
      if (targetProjects.length === 0 && !forceSyncAll) return;

      if (targetProjects.length > 0) {
        showToast("☁️ Syncing Campaigns to Cloud...", `Transferring ${targetProjects.length} campaigns to your Google Cloud account.`, "info");
      }

      const syncedIds: string[] = [];

      for (const lp of targetProjects) {
        if (!lp.id) continue;

        // 1. Sync project document
        const projRef = doc(db, `users/${currentUser.uid}/projects`, lp.id);
        
        const cleanedProj = {
          name: lp.name || "Untitled Campaign",
          description: lp.description || "",
          setting: lp.setting || "",
          creatorNames: lp.creatorNames || "",
          customInstructions: lp.customInstructions || "",
          narrationStyle: lp.narrationStyle || "",
          narrativePerspective: lp.narrativePerspective || "third_person",
          pacing: lp.pacing || "",
          emotionalTone: lp.emotionalTone || "",
          canonSource: lp.canonSource || "",
          styleGuide: lp.styleGuide || "",
          storyModules: lp.storyModules || "",
          userNickname: lp.userNickname || "Sir",
          activeChatId: lp.activeChatId || `chat-${Date.now()}`,
          ragSummary: lp.ragSummary || "",
          themeId: lp.themeId || "slate",
          chatBgPreset: lp.chatBgPreset || "none",
          chatBgUrl: lp.chatBgUrl || "",
          chatBubbleStyle: lp.chatBubbleStyle || "glass",
          activeCharacterId: lp.activeCharacterId || "",
          portraitPosition: lp.portraitPosition || "left",
          persistentContext: lp.persistentContext || "",
          persistentContextDocId: lp.persistentContextDocId || "",
          plotOverview: lp.plotOverview || "",
          linkedGDocs: lp.linkedGDocs || [],
          stAuthorsMix: lp.stAuthorsMix || "",
          stAdventureModule: lp.stAdventureModule || "",
          sources: lp.sources || [],
          syncedToCloud: true
        };

        await setDoc(projRef, cleanForFirestore(cleanedProj), { merge: true });

        // 2. Sync active chat messages
        const messagesList = loadProjectMessagesSafely(lp.id, lp.name);
        for (const m of messagesList) {
          if (m && m.id) {
            const mRef = doc(db, `users/${currentUser.uid}/projects/${lp.id}/messages`, m.id);
            await setDoc(mRef, cleanForFirestore(m), { merge: true }).catch(console.warn);
          }
        }

        // 4. Sync character profiles
        const charsList = loadProjectCharactersSafely(lp.id);
        for (const c of charsList) {
          if (c && c.id) {
            const cRef = doc(db, `users/${currentUser.uid}/projects/${lp.id}/characters`, c.id);
            await setDoc(cRef, cleanForFirestore(c), { merge: true }).catch(console.warn);
          }
        }

        syncedIds.push(lp.id);
      }

      // 5. Sync notes, tasks, and gallery
      const savedNotes = safeLocalStorage.getItem("local_notes");
      if (savedNotes) {
        try {
          const notesList: KeepNote[] = JSON.parse(savedNotes);
          for (const n of notesList) {
            if (n && n.id) {
              await setDoc(doc(db, `users/${currentUser.uid}/notes`, n.id), cleanForFirestore(n), { merge: true }).catch(console.warn);
            }
          }
        } catch {}
      }

      const savedTasks = safeLocalStorage.getItem("local_tasks");
      if (savedTasks) {
        try {
          const tasksList: KeepTask[] = JSON.parse(savedTasks);
          for (const t of tasksList) {
            if (t && t.id) {
              await setDoc(doc(db, `users/${currentUser.uid}/tasks`, t.id), cleanForFirestore(t), { merge: true }).catch(console.warn);
            }
          }
        } catch {}
      }

      const savedGallery = safeLocalStorage.getItem("local_gallery");
      if (savedGallery) {
        try {
          const galleryList: GeneratedImage[] = JSON.parse(savedGallery);
          for (const g of galleryList) {
            if (g && g.id) {
              await setDoc(doc(db, `users/${currentUser.uid}/gallery`, g.id), cleanForFirestore(g), { merge: true }).catch(console.warn);
            }
          }
        } catch {}
      }

      // Sync active project id to user profile
      if (activeProjectId) {
        await setDoc(doc(db, `users/${currentUser.uid}`), cleanForFirestore({ activeProjectId }), { merge: true }).catch(console.warn);
      }

      // Update local storage marked as synced
      try {
        const guestProjsStr = safeLocalStorage.getItem("local_projects");
        if (guestProjsStr) {
          const guestProjs: Project[] = JSON.parse(guestProjsStr);
          const updatedGuestProjs = guestProjs.map(p => 
            syncedIds.includes(p.id) ? { ...p, syncedToCloud: true } : p
          );
          safeLocalStorage.setItem("local_projects", JSON.stringify(updatedGuestProjs));
        }
      } catch {}

      // Update local projects state
      setProjects((prev) => 
        prev.map(p => syncedIds.includes(p.id) ? { ...p, syncedToCloud: true } : p)
      );

      if (syncedIds.length > 0) {
        showToast("☁️ Cloud Sync Complete!", `All ${syncedIds.length} campaigns, transcripts, and characters are saved online to Firestore.`, "success");
      }
    } catch (err: any) {
      console.error("Local sync to Firestore failed:", err);
      showToast("Sync Notice", "Some offline projects could not be fully synced online: " + err.message, "error");
    }
  };

  const [isSyncingDesktop, setIsSyncingDesktop] = useState(false);

  // Manual or automatic desktop & cloud synchronization trigger
  const handleSyncWithDesktop = async () => {
    if (!user) {
      handleGoogleSignIn();
      return;
    }
    setIsSyncingDesktop(true);
    try {
      showToast("☁️ Desktop Sync", "Synchronizing all campaigns, stories, and characters with desktop...", "info");
      await syncLocalDataToFirestore(user, true);
      
      // Also check user profile active project from cloud
      try {
        const userSnap = await getDoc(doc(db, `users/${user.uid}`));
        if (userSnap.exists() && userSnap.data()?.activeProjectId) {
          const cloudActiveId = userSnap.data().activeProjectId;
          if (cloudActiveId && cloudActiveId !== activeProjectId) {
            setActiveProjectId(cloudActiveId);
          }
        }
      } catch (errUserSnap) {
        console.warn("Could not query user doc activeProjectId:", errUserSnap);
      }

      showToast("✅ Synced with Desktop", "All campaigns, transcripts, and settings are up to date!", "success");
    } catch (err: any) {
      console.error("Sync with desktop error:", err);
      showToast("Sync Notice", "Sync completed: " + (err?.message || err), "info");
    } finally {
      setIsSyncingDesktop(false);
    }
  };

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsConnectingEngine(true);
        safeLocalStorage.setItem("nyx_last_user_uid", currentUser.uid);
        // Instantly load all discovered local and cached projects
        try {
          const allFound = loadAllProjectsSafely(currentUser.uid);
          setProjects(allFound);

          // Instantly load user-specific active project ID
          const userActiveId = safeLocalStorage.getItem(`local_activeProjectId_${currentUser.uid}`) || safeLocalStorage.getItem("local_activeProjectId");
          if (userActiveId && allFound.some(p => p.id === userActiveId)) {
            setActiveProjectId(userActiveId);
          }
        } catch (eLoad) {
          console.error("Failed to load user cached projects:", eLoad);
        }
        syncLocalDataToFirestore(currentUser);
      } else {
        setGoogleToken(null);
        safeLocalStorage.removeItem("nyx_google_token");
        safeLocalStorage.removeItem("nyx_google_token_timestamp");
        // Load active local projects for guest (scans all local and previous user keys)
        loadMockData();
        setIsInitialLoad(false);
        setIsConnectingEngine(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Active project fallback & validation (Runs safely after render pass, preventing race conditions or infinite loops)
  useEffect(() => {
    if (isConnectingEngine) return;
    if (projects.length === 0) {
      setProjects([DEFAULT_INITIAL_PROJECT]);
      setActiveProjectId(DEFAULT_INITIAL_PROJECT.id);
      return;
    }

    const hasActive = projects.some(p => p.id === activeProjectId);
    if (!activeProjectId || !hasActive) {
      const key = user ? `local_activeProjectId_${user.uid}` : "local_activeProjectId";
      const savedId = safeLocalStorage.getItem(key);
      const hasSaved = projects.some(p => p.id === savedId);
      if (savedId && hasSaved) {
        setActiveProjectId(savedId);
      } else {
        const sorted = [...projects].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setActiveProjectId(sorted[0].id);
      }
    }
  }, [projects, activeProjectId, isConnectingEngine, user]);

  // 2. Firebase Database Sync
  useEffect(() => {
    if (!user) return;

    // A. Sync user profile (active project selection)
    const unsubUser = onSnapshot(doc(db, `users/${user.uid}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.activeProjectId) {
          setActiveProjectId(prev => prev !== data.activeProjectId ? data.activeProjectId : prev);
        }
      }
    }, (err) => {
      console.warn("Firestore unsubUser error (running in local mode):", err?.message);
    });

    // B. Sync projects
    const qProjects = query(collection(db, `users/${user.uid}/projects`));
    const unsubProj = onSnapshot(qProjects, (snap) => {
      const projs: Project[] = [];
      snap.forEach((doc) => {
        projs.push({ id: doc.id, ...doc.data() } as Project);
      });
      
      setProjects(() => {
        // Deep scan all local and backup sources so nothing is ever dropped
        const localAll = loadAllProjectsSafely(user?.uid);

        // Combine Firestore with all discovered local campaigns
        const combined = [...projs];
        for (const lp of localAll) {
          if (!combined.some(p => p.id === lp.id || (p.name && lp.name && p.name.toLowerCase() === lp.name.toLowerCase()))) {
            combined.push(lp);
          }
        }

        return sanitizeProjects(combined);
      });

      // Automatically select desktop synced project if current project is default initial placeholder
      setActiveProjectId((prev) => {
        if (!prev || prev === "proj-initial" || prev === "proj-default-nyx") {
          const desktopProj = projs.find(p => p.id !== "proj-initial" && p.id !== "proj-default-nyx");
          if (desktopProj) {
            return desktopProj.id;
          }
        }
        return prev;
      });

      setIsInitialLoad(false);
      setIsConnectingEngine(false);
    }, (error) => {
      console.warn("Firestore projects snapshot load error (running in local mode):", error?.message);
      setIsInitialLoad(false);
      setIsConnectingEngine(false);
    });

    // C. Sync Notes
    const qNotes = query(collection(db, `users/${user.uid}/notes`), orderBy("updatedAt", "desc"));
    const unsubNotes = onSnapshot(qNotes, (snap) => {
      const list: KeepNote[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as KeepNote);
      });
      setNotes((prev) => {
        const localOnly = prev.filter(n => n.id.startsWith("note-") && !list.some(ol => ol.id === n.id));
        return [...list, ...localOnly];
      });
    }, (err) => {
      console.warn("Firestore notes snapshot error:", err?.message);
    });

    // D. Sync Tasks
    const qTasks = query(collection(db, `users/${user.uid}/tasks`));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const list: KeepTask[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as KeepTask);
      });
      setTasks((prev) => {
        const localOnly = prev.filter(t => t.id.startsWith("task-") && !list.some(ol => ol.id === t.id));
        return [...list, ...localOnly];
      });
    }, (err) => {
      console.warn("Firestore tasks snapshot error:", err?.message);
    });

    // E. Sync Image Gallery
    const qGallery = query(collection(db, `users/${user.uid}/gallery`), orderBy("timestamp", "desc"));
    const unsubGallery = onSnapshot(qGallery, (snap) => {
      const list: GeneratedImage[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as GeneratedImage);
      });
      setGallery((prev) => {
        const localOnly = prev.filter(g => g.id.startsWith("img-") && !list.some(ol => ol.id === g.id));
        return [...list, ...localOnly];
      });
    }, (err) => {
      console.warn("Firestore gallery snapshot error:", err?.message);
    });

    return () => {
      unsubUser();
      unsubProj();
      unsubNotes();
      unsubTasks();
      unsubGallery();
    };
  }, [user]);

  // 3. Sync Messages & Prompt Vault per active project
  useEffect(() => {
    if (!user || !activeProjectId) return;

    // A. Sync active chat messages (sort in-memory for resilience across date formats)
    const qMessages = query(
      collection(db, `users/${user.uid}/projects/${activeProjectId}/messages`)
    );
    const unsubMessages = onSnapshot(qMessages, (snap) => {
      const list: Message[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Message);
      });

      list.sort((a, b) => {
        const tA = typeof a.timestamp === "number" ? a.timestamp : new Date(a.timestamp || 0).getTime();
        const tB = typeof b.timestamp === "number" ? b.timestamp : new Date(b.timestamp || 0).getTime();
        return tA - tB;
      });

      if (list.length > 0) {
        setMessages(list);
        currentDataProjectIdRef.current = activeProjectId;
        loadedProjectIdRef.current = activeProjectId;
        safeLocalStorage.setItem(`local_messages_${activeProjectId}`, JSON.stringify(list));
        safeLocalStorage.setItem(`local_messages_backup_${activeProjectId}`, JSON.stringify(list));
      } else {
        // If Firestore is empty for this project, check if local storage or backups have offline messages
        const targetProj = projects.find(p => p.id === activeProjectId);
        const localMsgs = loadProjectMessagesSafely(activeProjectId, targetProj?.name);
        if (localMsgs.length > 0) {
          setMessages(localMsgs);
          currentDataProjectIdRef.current = activeProjectId;
          loadedProjectIdRef.current = activeProjectId;
          // Sync local messages up to Firestore cloud so they remain backed up in both places
          for (const m of localMsgs) {
            setDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, m.id), cleanForFirestore(m)).catch(console.warn);
          }
        } else {
          setMessages([]);
        }
      }
    }, (err) => {
      console.warn("Firestore messages snapshot error (using local storage fallback):", err?.message);
    });

    // C. Sync active character profiles
    const qCharacters = query(
      collection(db, `users/${user.uid}/projects/${activeProjectId}/characters`)
    );
    const unsubCharacters = onSnapshot(qCharacters, (snap) => {
      const list: CharacterProfile[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as CharacterProfile);
      });
      if (list.length > 0) {
        setCharacters(list);
        safeLocalStorage.setItem(`local_characters_${activeProjectId}`, JSON.stringify(list));
        safeLocalStorage.setItem(`local_characters_backup_${activeProjectId}`, JSON.stringify(list));
      } else {
        const localChars = loadProjectCharactersSafely(activeProjectId);
        if (localChars.length > 0) {
          setCharacters(localChars);
          for (const c of localChars) {
            setDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/characters`, c.id), c).catch(console.warn);
          }
        } else {
          setCharacters([]);
        }
      }
    }, (err) => {
      console.warn("Firestore characters snapshot error:", err?.message);
    });

    return () => {
      unsubMessages();
      unsubCharacters();
    };
  }, [user, activeProjectId]);

  // Load local projects for guest (no mock seeding)
  const loadMockData = () => {
    try {
      const sanitized = loadAllProjectsSafely();
      setProjects(sanitized);

      const savedActiveId = safeLocalStorage.getItem("local_activeProjectId");
      const activeExists = sanitized.some(p => p.id === savedActiveId);
      const targetId = (savedActiveId && activeExists) ? savedActiveId : sanitized[0].id;

      setActiveProjectId(targetId);
      
      const targetProj = sanitized.find(p => p.id === targetId);
      const loadedMsgs = loadProjectMessagesSafely(targetId, targetProj?.name);
      const loadedChars = loadProjectCharactersSafely(targetId);

      setMessages(loadedMsgs);
      setCharacters(loadedChars);

      currentDataProjectIdRef.current = targetId;
      loadedProjectIdRef.current = targetId;

      const savedNotes = safeLocalStorage.getItem("local_notes");
      setNotes(savedNotes ? JSON.parse(savedNotes) : []);

      const savedTasks = safeLocalStorage.getItem("local_tasks");
      setTasks(savedTasks ? JSON.parse(savedTasks) : []);

      const savedGallery = safeLocalStorage.getItem("local_gallery");
      setGallery(savedGallery ? JSON.parse(savedGallery) : []);
    } catch (e) {
      console.error("Failed to load offline data from localStorage:", e);
    }
  };

  // Listen for Google Auth token expiration from Workspace/Drive API calls
  useEffect(() => {
    const handleAuthExpired = () => {
      console.warn("Detected expired or unauthorized Google OAuth token. Resetting local token state.");
      setGoogleToken(null);
      safeLocalStorage.removeItem("nyx_google_token");
      safeLocalStorage.removeItem("nyx_google_token_timestamp");
      showToast("Google Session Expired", "Your Google Drive authorization has expired. Please re-authenticate to continue.", "info");
    };

    window.addEventListener("nyx_google_auth_expired", handleAuthExpired);
    return () => {
      window.removeEventListener("nyx_google_auth_expired", handleAuthExpired);
    };
  }, []);

  // Google Sign-In helper
  const handleGoogleSignIn = async (): Promise<string | undefined> => {
    if (isSigningIn) {
      console.log("Sign-in already in progress, ignoring duplicate call.");
      return undefined;
    }
    setIsSigningIn(true);
    try {
      if (auth.currentUser?.email) {
        googleDriveProvider.setCustomParameters({ login_hint: auth.currentUser.email });
      }
      const result = await signInWithPopup(auth, googleDriveProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setGoogleToken(token);
        safeLocalStorage.setItem("nyx_google_token", token);
        safeLocalStorage.setItem("nyx_google_token_timestamp", Date.now().toString());
        showToast("Signed In with Google", "Google Account & Workspace sync connected successfully.", "success");
        return token;
      }
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.message?.includes("popup-closed-by-user")) {
        console.warn("Sign-in popup was closed by the user.");
        showToast("Sign In Cancelled", "The sign-in popup was closed before completion.", "info");
      } else if (err?.code === "auth/cancelled-popup-request" || err?.message?.includes("cancelled-popup-request")) {
        console.warn("Sign-in popup request cancelled.");
      } else {
        console.error("Auth error:", err);
        showToast("Authentication Error", err?.message || "Failed to sign in.", "error");
      }
    } finally {
      setIsSigningIn(false);
    }
    return undefined;
  };

  // Google Drive/Workspace Connection helper (with granular scopes)
  const handleGoogleDriveSignIn = async (): Promise<string | undefined> => {
    if (isSigningIn) {
      console.log("Sign-in already in progress, ignoring duplicate call.");
      return undefined;
    }
    setIsSigningIn(true);
    try {
      if (auth.currentUser?.email || user?.email) {
        googleDriveProvider.setCustomParameters({ login_hint: auth.currentUser?.email || user?.email });
      }
      // Connect to Google Drive with the explicit drive scopes provider
      const result = await signInWithPopup(auth, googleDriveProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setGoogleToken(token);
        safeLocalStorage.setItem("nyx_google_token", token);
        safeLocalStorage.setItem("nyx_google_token_timestamp", Date.now().toString());
        showToast("Google Workspace Connected", "Drive and Documents sync features have been unlocked successfully.", "success");
        return token;
      }
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.message?.includes("popup-closed-by-user")) {
        console.warn("Drive connection popup was closed by the user.");
        showToast("Connection Cancelled", "The Google Drive authorization popup was closed.", "info");
      } else {
        console.error("Drive Auth error:", err);
        showToast("Drive Connection Error", err?.message || "Failed to link Google Drive.", "error");
      }
    } finally {
      setIsSigningIn(false);
    }
    return undefined;
  };

  const handleClearGoogleToken = () => {
    const hasTokenInStorage = safeLocalStorage.getItem("nyx_google_token") !== null;
    if (!hasTokenInStorage && googleToken === null) {
      return;
    }
    setGoogleToken(null);
    safeLocalStorage.removeItem("nyx_google_token");
    safeLocalStorage.removeItem("nyx_google_token_timestamp");
    if (hasTokenInStorage) {
      showToast("Session Reset", "Your Google authentication session has been reset. Please connect again to grant fresh permissions.", "info");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setGoogleToken(null);
    safeLocalStorage.removeItem("nyx_google_token");
    safeLocalStorage.removeItem("nyx_google_token_timestamp");
    safeLocalStorage.removeItem("nyx_last_user_uid");
  };

  // Firestore creation helpers
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    try {
      const trimmedName = newProjName.trim();
      const trimmedSetting = newProjSetting.trim() || "Custom World";
      const trimmedNickname = newProjNickname.trim() || "Adventurer";

      // Check if user explicitly chose to clone current campaign style/theming
      const baseProject = newProjCloneFromCurrent && activeProject ? activeProject : null;

      const defaultTheme = baseProject?.themeId || "slate";
      const defaultChatBg = baseProject?.chatBgPreset || "none";
      const defaultBubbleStyle = baseProject?.chatBubbleStyle || "glass";
      const creators = baseProject?.creatorNames || "Custom Authors";
      const styleGuide = baseProject?.styleGuide || "";
      const instructions = baseProject?.customInstructions || "";
      const narrationStyle = baseProject?.narrationStyle || "Vivid novel-grade detail";
      const pacing = baseProject?.pacing || "Balanced";
      const tone = baseProject?.emotionalTone || "Dramatic / Atmospheric";

      const newProj: Omit<Project, "id"> = {
        name: trimmedName,
        description: `Custom world roleplay: ${trimmedName}`,
        setting: trimmedSetting,
        creatorNames: creators,
        customInstructions: instructions,
        narrationStyle: narrationStyle,
        narrativePerspective: baseProject?.narrativePerspective || "third_person",
        pacing: pacing,
        emotionalTone: tone,
        canonSource: baseProject?.canonSource || "Custom Core",
        styleGuide: styleGuide,
        storyModules: baseProject?.storyModules || "",
        userNickname: trimmedNickname,
        activeChatId: `chat-${Date.now()}`,
        ragSummary: "",
        themeId: defaultTheme,
        chatBgPreset: defaultChatBg,
        chatBubbleStyle: defaultBubbleStyle,
        sources: [],
        persistentContext: "",
        plotOverview: ""
      };

      let newId = "";
      if (user) {
        const docRef = doc(collection(db, `users/${user.uid}/projects`));
        newId = docRef.id;
        const created: Project = { id: newId, ...newProj };

        // Explicitly initialize local storage to empty arrays so no scanners grab foreign data
        safeLocalStorage.setItem(`local_messages_${newId}`, JSON.stringify([]));
        safeLocalStorage.setItem(`local_messages_backup_${newId}`, JSON.stringify([]));
        safeLocalStorage.setItem(`local_characters_${newId}`, JSON.stringify([]));
        safeLocalStorage.setItem(`local_characters_backup_${newId}`, JSON.stringify([]));

        currentDataProjectIdRef.current = newId;
        loadedProjectIdRef.current = newId;

        // Reset in-memory state cleanly for blank project
        setMessages([]);
        setCharacters([]);

        setProjects(prev => [...prev, created]);
        setActiveProjectId(newId);

        // Save to Firestore asynchronously to prevent UI hang
        setDoc(docRef, newProj).catch((err) => {
          console.error("Firestore sync error:", err);
        });
      } else {
        // Offline mode
        newId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const created: Project = { id: newId, ...newProj };

        // Explicitly initialize local storage to empty arrays
        safeLocalStorage.setItem(`local_messages_${newId}`, JSON.stringify([]));
        safeLocalStorage.setItem(`local_messages_backup_${newId}`, JSON.stringify([]));
        safeLocalStorage.setItem(`local_characters_${newId}`, JSON.stringify([]));
        safeLocalStorage.setItem(`local_characters_backup_${newId}`, JSON.stringify([]));

        currentDataProjectIdRef.current = newId;
        loadedProjectIdRef.current = newId;

        // Reset in-memory state cleanly for blank project
        setMessages([]);
        setCharacters([]);

        setProjects(prev => {
          const updated = [...prev, created];
          safeLocalStorage.setItem("local_projects", JSON.stringify(updated));
          return updated;
        });
        setActiveProjectId(localId => newId);
      }

      showToast("✨ New Campaign Initialized", `Created fresh blank project "${trimmedName}".`, "success");
    } catch (err: any) {
      console.error("Failed to create project:", err);
      showToast("Creation Failed", err.message, "error");
    } finally {
      setNewProjName("");
      setNewProjSetting("");
      setNewProjNickname("");
      setNewProjCloneFromCurrent(false);
      setShowNewProjModal(false);
    }
  };

  const handleSetProjectValue = async (key: string, val: any, explicitProjectId?: string) => {
    const targetId = explicitProjectId || activeProjectId || activeProject?.id;
    if (!targetId) return;

    if (activeProjectId !== targetId) {
      setActiveProjectId(targetId);
    }

    if (key === "messages") {
      setMessages(val);
      safeLocalStorage.setItem(`local_messages_${targetId}`, JSON.stringify(val));
      if (Array.isArray(val) && val.length > 0) {
        safeLocalStorage.setItem(`local_messages_backup_${targetId}`, JSON.stringify(val));
      }
      return;
    }

    const normalizedVal = key === "themeId" && typeof val === "string" ? val.toLowerCase() : val;
    
    setProjects(prev => {
      const exists = prev.some(p => p.id === targetId);
      const updated = exists 
        ? prev.map(p => p.id === targetId ? { ...p, [key]: normalizedVal } : p)
        : [...prev, { id: targetId, name: key === "name" ? normalizedVal : "Nyx Roleplay Campaign", [key]: normalizedVal } as Project];
      
      if (user) {
        safeLocalStorage.setItem(`local_projects_${user.uid}`, JSON.stringify(updated));
      }
      safeLocalStorage.setItem("local_projects", JSON.stringify(updated));
      safeLocalStorage.setItem("nyx_backup_projects", JSON.stringify(updated));
      safeLocalStorage.setItem("local_projects_backup", JSON.stringify(updated));
      return updated;
    });

    if (user && targetId) {
      const docRef = doc(db, `users/${user.uid}/projects`, targetId);
      setDoc(docRef, cleanForFirestore({ [key]: normalizedVal }), { merge: true }).catch((err) => {
        console.warn("Firestore project value sync warning:", err);
      });
    }
  };

  const handleSaveTitle = async (customName?: string) => {
    const targetId = activeProjectId || activeProject?.id || (projects.length > 0 ? projects[0]?.id : null);
    const newName = (typeof customName === "string" ? customName : editingTitleText).trim() || "Nyx Roleplay Campaign";
    setIsEditingTitle(false);
    
    if (targetId) {
      if (activeProjectId !== targetId) {
        setActiveProjectId(targetId);
      }
      await handleSetProjectValue("name", newName, targetId);
    } else {
      const newProjId = `proj_${Date.now()}`;
      const newProj: Project = {
        id: newProjId,
        name: newName,
        description: "",
        setting: "",
        creatorNames: "",
        customInstructions: "",
        narrationStyle: "Immersive",
        pacing: "Balanced",
        emotionalTone: "Adaptive",
        canonSource: "",
        styleGuide: "",
        storyModules: "",
        userNickname: "",
        activeChatId: "default",
        ragSummary: ""
      };
      setProjects(prev => [newProj, ...prev]);
      setActiveProjectId(newProjId);
      if (user) {
        setDoc(doc(db, `users/${user.uid}/projects/${newProjId}`), newProj).catch(console.warn);
      }
    }
    showToast("Campaign Renamed", `Project title set to "${newName}".`, "success");
  };

  const handleDeleteProject = async (id: string) => {
    if (!id) return;

    if (user) {
      // Save to Firestore asynchronously to prevent any UI delay/modal hang
      deleteDoc(doc(db, `users/${user.uid}/projects`, id)).catch((err) => {
        console.error("Failed to delete project from Firestore:", err);
        showToast("❌ Sync Error", "Could not remove project from cloud sync, but it was cleaned locally: " + err.message, "error");
      });
    }
    
    // Clean up local storage items associated with this project
    safeLocalStorage.removeItem(`local_messages_${id}`);
    safeLocalStorage.removeItem(`local_characters_${id}`);

    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    if (updated.length > 0) {
      setActiveProjectId(updated[0].id);
    } else {
      setActiveProjectId("");
    }
    showToast("🗑️ Campaign Deleted", "The campaign has been successfully removed.", "success");
  };

  // Inject a message directly into the main narrative chat from Studio Assistant
  const handleInjectMessageToMainChat = async (text: string, role: "user" | "model", speakerIds?: string[]) => {
    const activeProj = projects.find(p => p.id === activeProjectId);
    if (!activeProj) return;

    const injectedMsg: Message = {
      id: `msg-injected-${Date.now()}`,
      role: role === "model" ? "nyx" : "user",
      content: text,
      timestamp: new Date().toISOString(),
      speakerIds: speakerIds || []
    };

    const updated = [...messages, injectedMsg];
    setMessages(updated);

    if (isMobileLite) {
      setMobileLiteTab("chat");
      showToast("✨ Injected into Narration", "Assistant content added directly to active story chat.", "info");
    }

    if (user && activeProjectId) {
      setDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, injectedMsg.id), injectedMsg).catch((err) => {
        console.warn("Firestore save injected message failed:", err);
      });
    }
  };

  // Chat message submission
  const handleSendMessage = async (text: string, thinkingLevel: string, attachments?: any[]) => {
    const activeProj = projects.find(p => p.id === activeProjectId);
    if (!activeProj) return;

    // Use active character ID if set, fallback to Sammy Chrome or first character
    const defaultSpeakerId = activeProj.activeCharacterId || (characters || []).find(c => 
      (c && typeof c.role === "string" && c.role.toLowerCase().includes("protagonist")) || 
      (c && typeof c.name === "string" && c.name.toLowerCase().includes("sammy"))
    )?.id || characters[0]?.id;

    const userEstimatedTokens = Math.max(1, Math.round(text.length / 3.8) + ((attachments && attachments.length > 0) ? attachments.length * 260 : 0));
    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      tokensUsed: userEstimatedTokens,
      tokenBreakdown: {
        inputTokens: userEstimatedTokens,
        retrievalTokens: 0,
        thinkingTokens: 0,
        outputTokens: 0,
        totalTokens: userEstimatedTokens
      },
      speakerIds: defaultSpeakerId ? [defaultSpeakerId] : [],
      attachments: attachments || []
    };

    // Append user message immediately
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    if (!isOnline) {
      if (user && activeProjectId) {
        setDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, userMsg.id), userMsg).catch((dbErr) => {
          console.warn("Firestore save user message failed (proceeding locally):", dbErr);
        });
      }
      showToast(
        "📝 Saved Offline",
        "Your dialogue was saved locally. The AI Narrator will respond once your connection is restored.",
        "info"
      );
      return;
    }

    setIsGeneratingChat(true);
    const controller = new AbortController();
    chatAbortControllerRef.current = controller;

    try {
      if (user && activeProjectId) {
        setDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, userMsg.id), userMsg).catch((dbErr) => {
          console.warn("Firestore save user message failed (proceeding locally):", dbErr);
        });
      }

      const data = await safeFetchJson<any>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: updatedMessages,
          slidingContextTurns: activeProj.slidingContextTurns ?? 12,
          customInstructions: activeProj.customInstructions,
          thinkingLevel,
          creatorNames: activeProj.creatorNames,
          setting: activeProj.setting,
          ragSummary: activeProj.ragSummary,
          userNickname: activeProj.userNickname,
          narrationStyle: activeProj.narrationStyle,
          narrativePerspective: activeProj.narrativePerspective || "third_person",
          pacing: activeProj.pacing,
          emotionalTone: activeProj.emotionalTone,
          styleGuide: activeProj.styleGuide,
          storyModules: activeProj.storyModules,
          persistentContext: activeProj.persistentContext || "",
          plotOverview: activeProj.plotOverview || "",
          activeSources: (activeProj.sources || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            summary: s.summary,
            extra: s.extra,
            fileMimeType: s.fileMimeType || s.mimeType || s.extra?.fileMimeType || s.extra?.mimeType || (s.type === "image" || s.type === "photo" ? "image/png" : undefined),
            fileBase64: s.fileBase64 || s.url || s.extra?.fileBase64 || s.extra?.url || (s.content?.startsWith("data:") ? s.content : undefined),
            content: s.content ? (s.content.length > 20000 ? s.content.substring(0, 20000) + "..." : s.content) : ""
          })),
          characters: (characters || []).map((c: any) => ({
            ...c,
            portraitUrl: c.portraitUrl && c.portraitUrl.startsWith("data:") ? undefined : c.portraitUrl
          })),
          notes: notes || [],
          googleToken: googleToken || ""
        }),
        timeout: 240000
      });

      // Process database actions triggered by Gemini tools
      if (data.loreActions && Array.isArray(data.loreActions)) {
        for (const action of data.loreActions) {
          const args = action.args || {};
          let parsedCustomFields: Record<string, string> = {};
          if (args.customFields) {
            if (typeof args.customFields === "string") {
              try {
                const parsed = JSON.parse(args.customFields);
                if (typeof parsed === "object" && parsed) parsedCustomFields = { ...parsed };
              } catch {
                parsedCustomFields = { "Specifications": args.customFields };
              }
            } else if (typeof args.customFields === "object") {
              parsedCustomFields = { ...args.customFields };
            }
          }
          const standardArgKeys = new Set(["id", "name", "role", "description", "portraitUrl", "factionName", "relationships", "backstory", "signatureItems", "type", "customFields", "linkedLoreIds"]);
          for (const [k, v] of Object.entries(args)) {
            if (!standardArgKeys.has(k) && v !== undefined && v !== null) {
              parsedCustomFields[k] = typeof v === "string" ? v : JSON.stringify(v);
            }
          }

          if (action.action === "create") {
            const targetName = (args.name || "").trim().toLowerCase();
            const existingByName = characters.find(
              c => c && ((targetName && c.name && typeof c.name === "string" && c.name.trim().toLowerCase() === targetName) ||
                   (args.type === "pc" && (c.isPlayerCharacter || c.type === "pc")))
            );

            if (existingByName) {
              // Redirect to update if character/PC already exists!
              const updates: any = {};
              if (args.name) updates.name = args.name;
              if (args.role) updates.role = args.role;
              if (args.description) updates.description = args.description;
              if (args.portraitUrl) updates.portraitUrl = args.portraitUrl;
              if (args.factionName) updates.factionName = args.factionName;
              if (args.relationships) updates.relationships = args.relationships;
              if (args.backstory) updates.backstory = args.backstory;
              if (args.signatureItems) updates.signatureItems = args.signatureItems;
              if (args.type) updates.type = args.type;
              if (args.type === "pc") updates.isPlayerCharacter = true;
              if (Object.keys(parsedCustomFields).length > 0) {
                updates.customFields = { ...(existingByName.customFields || {}), ...parsedCustomFields };
              }
              if (args.linkedLoreIds) updates.linkedLoreIds = args.linkedLoreIds;

              await handleUpdateCharacter(existingByName.id, updates);
              showToast("🔄 Lore Database Updated", `Successfully updated "${existingByName.name}"!`, "success");
              handleAddSyncLog(existingByName.name, "success", `Updated properties of "${existingByName.name}" via AI agent.`);
            } else {
              await handleAddCharacter(
                args.name || "New Entity",
                args.role || "Role",
                args.portraitUrl || "",
                args.description || "",
                args.type === "pc",
                args.relationships || "",
                args.factionName || "",
                false,
                args.type || "npc",
                parsedCustomFields,
                args.signatureItems || "",
                args.backstory || "",
                [],
                args.linkedLoreIds || []
              );
              showToast("✨ Lore Database Synced", `Successfully created ${args.type || "entity"} card for "${args.name || "New Entity"}"!`, "success");
              handleAddSyncLog(args.name || "New Entity", "success", `Created new ${args.type || 'entity'} entry via AI agent.`);
            }
          } else if (action.action === "update") {
            const targetId = (args.id || "").trim();
            const targetName = (args.name || "").trim().toLowerCase();

            let existing = characters.find(c => c && c.id === targetId);
            if (!existing && targetName) {
              existing = characters.find(c => c && c.name && typeof c.name === "string" && c.name.trim().toLowerCase() === targetName);
            }
            if (!existing && targetId) {
              existing = characters.find(c => c && c.name && typeof c.name === "string" && c.name.trim().toLowerCase() === targetId.toLowerCase());
            }
            if (!existing && (args.type === "pc" || targetId.toLowerCase().includes("pc") || targetName.includes("pc"))) {
              existing = characters.find(c => c && (c.isPlayerCharacter || c.type === "pc"));
            }
            if (!existing && (args.type === "pc" || characters.length === 1)) {
              existing = characters[0];
            }

            if (existing) {
              const updates: any = {};
              if (args.name !== undefined) updates.name = args.name;
              if (args.role !== undefined) updates.role = args.role;
              if (args.description !== undefined) updates.description = args.description;
              if (args.portraitUrl !== undefined) updates.portraitUrl = args.portraitUrl;
              if (args.factionName !== undefined) updates.factionName = args.factionName;
              if (args.relationships !== undefined) updates.relationships = args.relationships;
              if (args.backstory !== undefined) updates.backstory = args.backstory;
              if (args.signatureItems !== undefined) updates.signatureItems = args.signatureItems;
              if (args.type !== undefined) updates.type = args.type;
              if (args.type === "pc") updates.isPlayerCharacter = true;
              if (Object.keys(parsedCustomFields).length > 0) {
                updates.customFields = { ...(existing.customFields || {}), ...parsedCustomFields };
              }
              if (args.linkedLoreIds !== undefined) updates.linkedLoreIds = args.linkedLoreIds;

              await handleUpdateCharacter(existing.id, updates);
              showToast("🔄 Lore Database Updated", `Successfully updated "${existing.name}"!`, "success");
              handleAddSyncLog(existing.name, "success", `Updated properties of "${existing.name}" via AI agent.`);
            } else if (args.name) {
              await handleAddCharacter(
                args.name,
                args.role || "Character",
                args.portraitUrl || "",
                args.description || "",
                args.type === "pc",
                args.relationships || "",
                args.factionName || "",
                false,
                args.type || "npc",
                parsedCustomFields,
                args.signatureItems || "",
                args.backstory || "",
                [],
                args.linkedLoreIds || []
              );
              showToast("✨ Lore Database Synced", `Successfully created ${args.type || "entity"} card for "${args.name}"!`, "success");
              handleAddSyncLog(args.name, "success", `Created new ${args.type || 'entity'} entry via AI agent.`);
            }
          } else if (action.action === "setting") {
            const { key, value } = action.args || {};
            if (key && value !== undefined) {
              handleSetProjectValue(key as any, value);
              showToast("⚙️ World Setting Synced", `Updated ${key} in campaign settings!`, "success");
              handleAddSyncLog(key, "success", `Updated ${key} setting to "${value.substring(0, 40)}..."`);
            }
          } else if (action.action === "delete") {
            const targetId = (args.id || "").trim();
            const targetName = (args.name || "").trim().toLowerCase();
            const existing = characters.find(c => c && (c.id === targetId || (targetName && c.name && typeof c.name === "string" && c.name.toLowerCase() === targetName)));
            if (existing) {
              await handleDeleteCharacter(existing.id);
              showToast("🗑️ Lore Entity Removed", `Deleted "${existing.name}" from lore database.`, "info");
              handleAddSyncLog(existing.name, "success", `Deleted lore entry for "${existing.name}".`);
            }
          } else if (action.action === "note" || action.action === "add_note") {
            const { title, content } = args;
            if (title || content) {
              await handleAddNote(title || "Campaign Note", content || "");
              showToast("📝 Note Logged", `Saved note "${title || "Campaign Note"}".`, "success");
              handleAddSyncLog(title || "Note", "success", `Logged note "${title}".`);
            }
          } else if (action.action === "task" || action.action === "add_task") {
            const text = args.text || args.task;
            if (text) {
              await handleAddTask(text);
              showToast("📋 Task Added", `Added objective: "${text}".`, "success");
              handleAddSyncLog(text, "success", `Added task "${text}".`);
            }
          }
        }
      }

      if (data.queriedDocs && Array.isArray(data.queriedDocs)) {
        data.queriedDocs.forEach((doc: any) => {
          const logMsg = doc.query && doc.query !== "general lookup"
            ? `"${doc.query}" - checked "${doc.name}"`
            : `Checked "${doc.name}" for live background reference.`;
          handleAddSyncLog(
            doc.name,
            "info",
            logMsg
          );
        });
      }

      const replyText = data.text || "";
      const isAnomaly = Boolean(data.isTimelineAnomaly || replyText.includes("brief disturbance in the timeline") || replyText.includes("unexpected anomaly rippled"));
      const nyxMsg: Message = {
        id: `msg-nyx-${Date.now()}`,
        role: "nyx",
        content: replyText,
        timestamp: new Date().toISOString(),
        chainOfThought: data.chainOfThought,
        tokensUsed: data.tokenBreakdown?.totalTokens || data.usage?.totalTokens || 2400,
        tokenBreakdown: data.tokenBreakdown || (data.usage ? {
          inputTokens: data.usage.inputTokens,
          retrievalTokens: data.usage.retrievalTokens || 0,
          thinkingTokens: data.usage.thinkingTokens || 0,
          outputTokens: data.usage.outputTokens,
          totalTokens: data.usage.totalTokens
        } : undefined),
        speakerIds: [],
        contextEntities: data.inContextEntities || [],
        isTimelineAnomaly: isAnomaly,
        retrySeconds: data.retrySeconds || (isAnomaly ? 20 : undefined)
      };

      setMessages(prev => [...prev, nyxMsg]);

      if (user && activeProjectId) {
        setDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, nyxMsg.id), nyxMsg).catch((dbErr) => {
          console.warn("Firestore save nyx message failed (proceeding locally):", dbErr);
        });
      }

    } catch (err: any) {
      if (err?.name === "AbortError" || err?.message?.includes("aborted") || controller.signal.aborted) {
        console.log("Chat generation stopped by user");
        return;
      }
      console.error(err);
      const errMsg: Message = {
        id: `msg-error-${Date.now()}`,
        role: "nyx",
        content: `[System Error: I was unable to reach the narration engine. Please check your network connection or API Key setting and try again.\n\nError: ${err.message || err}]`,
        timestamp: new Date().toISOString(),
        speakerIds: []
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      if (chatAbortControllerRef.current === controller) {
        chatAbortControllerRef.current = null;
      }
      setIsGeneratingChat(false);
    }
  };

  const handleRegenerateResponse = async (thinkingLevel: string, targetMessageId?: string) => {
    const activeProj = projects.find(p => p.id === activeProjectId);
    if (!activeProj) return;

    if (messages.length === 0) return;

    if (!isOnline) {
      showToast(
        "⚡ AI Engine Offline",
        "Regenerating storyteller responses requires an active connection.",
        "error"
      );
      return;
    }

    let historyOfMessages: Message[] = [];
    let targetNyxMsgIndex: number = -1; // -1 means append a new nyx message
    let targetNyxMsgId: string | null = null;

    if (targetMessageId) {
      const idx = messages.findIndex(m => m.id === targetMessageId);
      if (idx !== -1) {
        if (messages[idx].role === "nyx") {
          targetNyxMsgIndex = idx;
          targetNyxMsgId = messages[idx].id;
          historyOfMessages = messages.slice(0, idx);
        } else if (messages[idx].role === "user") {
          // If there's an existing nyx message right after this user message, target it
          if (idx + 1 < messages.length && messages[idx + 1].role === "nyx") {
            targetNyxMsgIndex = idx + 1;
            targetNyxMsgId = messages[idx + 1].id;
            historyOfMessages = messages.slice(0, idx + 1);
          } else {
            // Generate a new response for this user message
            targetNyxMsgIndex = -1;
            historyOfMessages = messages.slice(0, idx + 1);
          }
        }
      }
    } else {
      // No targetMessageId provided (e.g. main bottom "Regen" button clicked)
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === "nyx") {
        targetNyxMsgIndex = messages.length - 1;
        targetNyxMsgId = lastMsg.id;
        historyOfMessages = messages.slice(0, messages.length - 1);
      } else {
        // Last message is user or system - generate a new nyx response for the conversation!
        targetNyxMsgIndex = -1;
        historyOfMessages = [...messages];
      }
    }

    if (historyOfMessages.length === 0) {
      historyOfMessages = [
        {
          id: `msg-seed-${Date.now()}`,
          role: "user",
          content: "Begin the campaign narrative scene.",
          timestamp: new Date().toISOString(),
          speakerIds: []
        }
      ];
    }

    setIsGeneratingChat(true);
    const controller = new AbortController();
    chatAbortControllerRef.current = controller;

    try {
      const data = await safeFetchJson<any>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: historyOfMessages,
          slidingContextTurns: activeProj.slidingContextTurns ?? 12,
          customInstructions: activeProj.customInstructions,
          thinkingLevel,
          creatorNames: activeProj.creatorNames,
          setting: activeProj.setting,
          ragSummary: activeProj.ragSummary,
          userNickname: activeProj.userNickname,
          narrationStyle: activeProj.narrationStyle,
          narrativePerspective: activeProj.narrativePerspective || "third_person",
          pacing: activeProj.pacing,
          emotionalTone: activeProj.emotionalTone,
          styleGuide: activeProj.styleGuide,
          storyModules: activeProj.storyModules,
          persistentContext: activeProj.persistentContext || "",
          plotOverview: activeProj.plotOverview || "",
          activeSources: (activeProj.sources || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            summary: s.summary,
            extra: s.extra,
            fileMimeType: s.fileMimeType || s.mimeType || s.extra?.fileMimeType || s.extra?.mimeType || (s.type === "image" || s.type === "photo" ? "image/png" : undefined),
            fileBase64: s.fileBase64 || s.url || s.extra?.fileBase64 || s.extra?.url || (s.content?.startsWith("data:") ? s.content : undefined),
            content: s.content ? (s.content.length > 20000 ? s.content.substring(0, 20000) + "..." : s.content) : ""
          })),
          characters: (characters || []).map((c: any) => ({
            ...c,
            portraitUrl: c.portraitUrl && c.portraitUrl.startsWith("data:") ? undefined : c.portraitUrl
          })),
          notes: notes || [],
          googleToken: googleToken || ""
        }),
        timeout: 240000
      });

      if (data.queriedDocs && Array.isArray(data.queriedDocs)) {
        data.queriedDocs.forEach((doc: any) => {
          const logMsg = doc.query && doc.query !== "general lookup"
            ? `"${doc.query}" - checked "${doc.name}"`
            : `Checked "${doc.name}" for live background reference.`;
          handleAddSyncLog(
            doc.name,
            "info",
            logMsg
          );
        });
      }

      const replyText = data.text && data.text.trim() ? data.text : "[Nyx: Scene narration updated.]";
      let updatedTargetMsg: Message | null = null;
      const insertIndex = historyOfMessages.length;

      setMessages(prev => {
        let foundTarget = false;
        const nextList = prev.map(msg => {
          if (targetNyxMsgId && msg.id === targetNyxMsgId) {
            foundTarget = true;
            const originalVersion = {
              id: `ver-orig-${msg.id}`,
              content: msg.content,
              timestamp: msg.timestamp,
              chainOfThought: msg.chainOfThought,
              tokensUsed: msg.tokensUsed,
              tokenBreakdown: msg.tokenBreakdown,
              speakerIds: msg.speakerIds || [],
              contextEntities: msg.contextEntities
            };

            const currentVersions = msg.versions && msg.versions.length > 0 
              ? [...msg.versions] 
              : [originalVersion];

            const resolvedBreakdown = data.tokenBreakdown || (data.usage ? {
              inputTokens: data.usage.inputTokens,
              retrievalTokens: data.usage.retrievalTokens || 0,
              thinkingTokens: data.usage.thinkingTokens || 0,
              outputTokens: data.usage.outputTokens,
              totalTokens: data.usage.totalTokens
            } : undefined);
            const resolvedTokens = resolvedBreakdown?.totalTokens || data.usage?.totalTokens || 2400;

            const newVersion = {
              id: `ver-${Date.now()}`,
              content: replyText,
              timestamp: new Date().toISOString(),
              chainOfThought: data.chainOfThought,
              tokensUsed: resolvedTokens,
              tokenBreakdown: resolvedBreakdown,
              speakerIds: [],
              contextEntities: data.inContextEntities || []
            };

            const updatedVersions = [...currentVersions, newVersion];
            const newActiveIndex = updatedVersions.length - 1;
            const isAnomaly = Boolean(data.isTimelineAnomaly || replyText.includes("brief disturbance in the timeline") || replyText.includes("unexpected anomaly rippled"));

            const updatedMsg: Message = {
              ...msg,
              content: replyText,
              chainOfThought: data.chainOfThought,
              tokensUsed: resolvedTokens,
              tokenBreakdown: resolvedBreakdown,
              speakerIds: [],
              contextEntities: data.inContextEntities || [],
              versions: updatedVersions,
              activeVersionIndex: newActiveIndex,
              isTimelineAnomaly: isAnomaly,
              retrySeconds: data.retrySeconds || (isAnomaly ? 20 : undefined)
            };
            updatedTargetMsg = updatedMsg;
            return updatedMsg;
          }
          return msg;
        });

        if (foundTarget) {
          return nextList;
        } else {
          // Target not found or targetNyxMsgId was null: Append/insert brand new nyx message at insertIndex
          const resolvedBreakdown = data.tokenBreakdown || (data.usage ? {
            inputTokens: data.usage.inputTokens,
            retrievalTokens: data.usage.retrievalTokens || 0,
            thinkingTokens: data.usage.thinkingTokens || 0,
            outputTokens: data.usage.outputTokens,
            totalTokens: data.usage.totalTokens
          } : undefined);
          const resolvedTokens = resolvedBreakdown?.totalTokens || data.usage?.totalTokens || 2400;
          const isAnomaly = Boolean(data.isTimelineAnomaly || replyText.includes("brief disturbance in the timeline") || replyText.includes("unexpected anomaly rippled"));

          const newNyxMsg: Message = {
            id: `nyx-${Date.now()}`,
            role: "nyx",
            content: replyText,
            timestamp: new Date().toISOString(),
            chainOfThought: data.chainOfThought,
            tokensUsed: resolvedTokens,
            tokenBreakdown: resolvedBreakdown,
            speakerIds: [],
            contextEntities: data.inContextEntities || [],
            isTimelineAnomaly: isAnomaly,
            retrySeconds: data.retrySeconds || (isAnomaly ? 20 : undefined)
          };
          updatedTargetMsg = newNyxMsg;
          
          const validInsertIndex = Math.min(Math.max(0, insertIndex), prev.length);
          return [...prev.slice(0, validInsertIndex), newNyxMsg, ...prev.slice(validInsertIndex)];
        }
      });

      if (user && activeProjectId && updatedTargetMsg) {
        const msgToSave: Message = updatedTargetMsg;
        setDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, msgToSave.id), msgToSave).catch((dbErr) => {
          console.warn("Firestore save nyx message failed (proceeding locally):", dbErr);
        });
      }

    } catch (err: any) {
      if (err?.name === "AbortError" || err?.message?.includes("aborted") || controller.signal.aborted) {
        console.log("Narrator regeneration stopped by user");
        return;
      }
      console.error(err);
      showToast("Storyteller Error", `Narrator generation failed: ${err.message || err}`, "error");
    } finally {
      if (chatAbortControllerRef.current === controller) {
        chatAbortControllerRef.current = null;
      }
      setIsGeneratingChat(false);
    }
  };

  const handleSelectMessageVersion = (messageId: string, versionIndex: number) => {
    setMessages(prev => {
      const updated = prev.map(m => {
        if (m.id !== messageId || !m.versions || !m.versions[versionIndex]) return m;
        const ver = m.versions[versionIndex];
        const updatedMsg = {
          ...m,
          activeVersionIndex: versionIndex,
          content: ver.content,
          chainOfThought: ver.chainOfThought,
          tokensUsed: ver.tokensUsed,
          speakerIds: ver.speakerIds,
          contextEntities: ver.contextEntities
        };
        // Save to firestore in background
        if (user && activeProjectId) {
          setDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, updatedMsg.id), updatedMsg).catch((dbErr) => {
            console.warn("Firestore save nyx message version update failed:", dbErr);
          });
        }
        return updatedMsg;
      });
      return updated;
    });
  };

  const handleEditMessage = async (id: string, newContent: string) => {
    const updated = messages.map(m => m.id === id ? { ...m, content: newContent } : m);
    setMessages(updated);

    if (user && activeProjectId) {
      const docRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, id);
      await setDoc(docRef, { content: newContent }, { merge: true });
    }
  };

  const handleDeleteMessage = async (id: string) => {
    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);

    if (user && activeProjectId) {
      const docRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, id);
      await deleteDoc(docRef);
    }
  };

  const handleClearChat = async () => {
    setMessages([]);
    if (activeProjectId) {
      safeLocalStorage.setItem(`local_messages_${activeProjectId}`, JSON.stringify([]));
      safeLocalStorage.removeItem(`local_messages_backup_${activeProjectId}`);
    }
    if (user && activeProjectId) {
      const colRef = collection(db, `users/${user.uid}/projects/${activeProjectId}/messages`);
      const snap = await getDocs(colRef);
      snap.forEach(async (d) => {
        await deleteDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, d.id));
      });
    }
  };

  const handleImportMessages = async (importedList: ParsedMessage[], append: boolean) => {
    const formattedList: Message[] = importedList.map((m, idx) => {
      let role: "user" | "nyx" | "assistant" = "nyx";
      if (m.speaker) {
        const spk = m.speaker.toLowerCase();
        if (spk.includes("user") || spk.includes("player") || spk.includes("you")) {
          role = "user";
        }
      }
      return {
        id: `imported-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        role,
        content: m.speaker ? `[${m.speaker}] ${m.content}` : m.content,
        timestamp: new Date(Date.now() + idx).toISOString(),
      };
    });

    let nextMessages: Message[] = [];
    if (append) {
      nextMessages = [...messages, ...formattedList];
    } else {
      nextMessages = formattedList;
      if (user && activeProjectId) {
        try {
          const colRef = collection(db, `users/${user.uid}/projects/${activeProjectId}/messages`);
          const snap = await getDocs(colRef);
          snap.forEach(async (d) => {
            await deleteDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, d.id));
          });
        } catch (err) {
          console.warn("Firestore delete on overwrite failed:", err);
        }
      }
    }

    setMessages(nextMessages);

    if (user && activeProjectId) {
      for (const msg of formattedList) {
        try {
          await setDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/messages`, msg.id), msg);
        } catch (err) {
          console.warn("Firestore save on import failed:", err);
        }
      }
    }
  };

  // Narrative Polishing, 3rd Person & Retcon suite calls
  const handleEditNarrative = async (
    text: string, 
    mode: "3rd_person" | "retcon" | "recalibrate" | "natural_language", 
    instructions: string,
    signal?: AbortSignal
  ) => {
    if (!isOnline) {
      showToast(
        "⚡ Narrative Suite Offline",
        "Polishing, third-person shift, and narrative recalibration require an active internet connection.",
        "error"
      );
      throw new Error("Offline Mode: Narrative polishing engine is unavailable.");
    }
    const data = await safeFetchJson<{ editedText: string; ragSummary?: string }>("/api/narrative-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode, instructions }),
      signal,
      timeout: 90000
    });
    return data;
  };

  const handleAttachNarrativeToSources = async (title: string, content: string, category: string = "narrative") => {
    const targetId = activeProjectId || activeProject?.id;
    if (!targetId || !activeProject) return;

    const sourceId = "src-narrative-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
    const newSource: LoreSource = {
      id: sourceId,
      name: title.trim() || `Polished Chapter (${new Date().toLocaleDateString()})`,
      type: "text_snippet",
      category: category as any,
      content: content.trim(),
      summary: `Polished narrative chapter (${content.trim().length} chars) actively indexed for RAG grounding.`,
      addedAt: new Date().toLocaleDateString(),
      isActive: true,
      isIngesting: false
    };

    const existingSources = Array.isArray(activeProject.sources) ? activeProject.sources : [];
    const updatedSources = [newSource, ...existingSources.filter(s => s.id !== sourceId)];
    
    await handleSetProjectValue("sources", updatedSources);
  };

  // Image & Video Generations
  const handleGenerateImage = async (prompt: string, aspect: string, refs: string[]) => {
    if (!isOnline) {
      showToast(
        "🎨 Image Generation Offline",
        "Generating portraits and campaign art requires an active internet connection.",
        "error"
      );
      return;
    }
    setIsGeneratingImage(true);
    try {
      const data = await safeFetchJson<any>("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio: aspect,
          references: refs,
          projectId: activeProjectId
        }),
        timeout: 60000
      });

      const newImage: GeneratedImage = {
        id: `img-${Date.now()}`,
        url: data.image,
        prompt,
        seed: Math.floor(Math.random() * 1000000),
        tokensUsed: data.tokensUsed,
        timestamp: new Date().toISOString(),
        fileName: data.fileName,
        projectId: activeProjectId,
        references: refs
      };

      setGallery(prev => [newImage, ...prev]);

      if (user) {
        await addDoc(collection(db, `users/${user.uid}/gallery`), newImage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateVideo = async (prompt: string, imageBase64: string, aspect: string) => {
    if (!isOnline) {
      showToast(
        "🎬 Video Generation Offline",
        "Generating animated videos requires an active internet connection.",
        "error"
      );
      return;
    }
    try {
      const data = await safeFetchJson<any>("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, baseImage: imageBase64, aspectRatio: aspect }),
        timeout: 90000
      });
      setVideoResult(data.videoUrl);
    } catch (err) {
      console.error(err);
    }
  };

  // Keep Notes & Tasks
  const handleAddNote = async (title: string, content: string) => {
    const localId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newNote = { id: localId, title, content, updatedAt: new Date().toISOString() };
    setNotes(prev => [newNote, ...prev]);

    if (user) {
      const payload = { title, content, updatedAt: newNote.updatedAt };
      Promise.race([
        addDoc(collection(db, `users/${user.uid}/notes`), payload),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore write timeout")), 2500))
      ]).catch(err => {
        console.warn("Firestore save note timed out or failed (local state preserved):", err);
      });
    }
  };

  const handleDeleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (user) {
      Promise.race([
        deleteDoc(doc(db, `users/${user.uid}/notes`, id)),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore delete timeout")), 2500))
      ]).catch(err => {
        console.warn("Firestore delete note failed:", err);
      });
    }
  };

  const handleAddTask = async (text: string) => {
    const localId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTask = { id: localId, text, completed: false };
    setTasks(prev => [...prev, newTask]);

    if (user) {
      const payload = { text, completed: false };
      Promise.race([
        addDoc(collection(db, `users/${user.uid}/tasks`), payload),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore write timeout")), 2500))
      ]).catch(err => {
        console.warn("Firestore save task timed out or failed (local state preserved):", err);
      });
    }
  };

  const handleToggleTask = async (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);

    if (user) {
      const item = tasks.find(t => t.id === id);
      if (item) {
        Promise.race([
          updateDoc(doc(db, `users/${user.uid}/tasks`, id), { completed: !item.completed }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore update timeout")), 2500))
        ]).catch(err => {
          console.warn("Firestore toggle task failed:", err);
        });
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (user) {
      Promise.race([
        deleteDoc(doc(db, `users/${user.uid}/tasks`, id)),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore delete timeout")), 2500))
      ]).catch(err => {
        console.warn("Firestore delete task failed:", err);
      });
    }
  };

  // Campaign Lore / Character Database Handlers
  const handleAddCharacter = async (
    name: string,
    role: string,
    portraitUrl: string,
    description: string,
    isPlayerCharacter: boolean = false,
    relationships: string = "",
    factionName: string = "",
    isMook: boolean = false,
    type?: "pc" | "npc" | "companion" | "chronicle" | "location" | "vehicle" | "equipment" | "faction",
    customFields?: Record<string, string>,
    signatureItems: string = "",
    backstory: string = "",
    romanceTracks: RelationshipTrack[] = [],
    linkedLoreIds: string[] = [],
    isInScene: boolean = false,
    activationKeys: string[] = []
  ) => {
    const defaultType = type || (isPlayerCharacter ? "pc" : "npc");
    const localId = `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: CharacterProfile = {
      id: localId,
      name,
      role,
      portraitUrl,
      description,
      projectId: activeProjectId,
      isPlayerCharacter,
      relationships,
      factionName,
      isMook,
      type: defaultType,
      customFields: customFields || {},
      signatureItems: signatureItems || "",
      backstory: backstory || "",
      romanceTracks: romanceTracks || [],
      linkedLoreIds: linkedLoreIds || [],
      isInScene,
      activationKeys
    };

    // 1. Optimistically update local React state immediately so UI and tools have instant access
    setCharacters(prev => {
      const cleanName = typeof name === "string" ? name.trim().toLowerCase() : "";
      const exists = prev.some(c => c && (c.id === localId || (cleanName && c.name && typeof c.name === "string" && c.name.trim().toLowerCase() === cleanName && c.type === defaultType)));
      if (exists) {
        return prev.map(c => (c && (c.id === localId || (cleanName && c.name && typeof c.name === "string" && c.name.trim().toLowerCase() === cleanName && c.type === defaultType))) ? { ...c, ...newItem } : c);
      }
      return [...prev, newItem];
    });

    // 2. Persist to Firestore with safety timeout so async callers never freeze
    if (user && activeProjectId) {
      try {
        const firestorePayload: any = { ...newItem };
        delete firestorePayload.id;

        await Promise.race([
          addDoc(collection(db, `users/${user.uid}/projects/${activeProjectId}/characters`), firestorePayload),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore character write timeout")), 2500))
        ]).catch(err => {
          console.warn("Firestore save character timed out or failed (local state preserved):", err);
        });
      } catch (err) {
        console.warn("Firestore save character failed:", err);
      }
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    if (user && activeProjectId) {
      try {
        const docRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/characters`, id);
        await Promise.race([
          deleteDoc(docRef),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore character delete timeout")), 2500))
        ]).catch(err => {
          console.warn("Firestore delete character timed out or failed:", err);
        });
      } catch (err) {
        console.warn("Firestore delete character failed:", err);
      }
    }
  };

  const handleUpdateCharacter = async (id: string, updates: Partial<CharacterProfile>) => {
    // 1. Update React state immediately
    setCharacters(prev => prev.map(c => {
      if (c && (c.id === id || (updates.name && c.name && typeof c.name === "string" && c.name.trim().toLowerCase() === updates.name.trim().toLowerCase()))) {
        const mergedCustomFields = updates.customFields !== undefined 
          ? { ...(c.customFields || {}), ...updates.customFields }
          : c.customFields;
        return {
          ...c,
          ...updates,
          customFields: mergedCustomFields
        };
      }
      return c;
    }));

    // 2. Persist to Firestore with safety timeout
    if (user && activeProjectId) {
      try {
        const docRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/characters`, id);
        await Promise.race([
          setDoc(docRef, updates, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore character update timeout")), 2500))
        ]).catch(err => {
          console.warn("Firestore update character timed out or failed (local state preserved):", err);
        });
      } catch (err) {
        console.warn("Firestore update character failed:", err);
      }
    }
  };

  const [navigationTarget, setNavigationTarget] = useState<any>(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);

  const handleNavigateToItem = (target: any) => {
    if (isMobileLite) {
      if (target?.targetTab === "workspace" || target?.targetTab === "editor" || target?.targetTab === "image") {
        setMobileLiteTab("settings");
      } else {
        setMobileLiteTab("chat");
      }
    } else {
      if (target?.targetTab) {
        setActiveTab(target.targetTab);
      } else {
        setActiveTab("chat");
      }
    }
    setNavigationTarget({ ...target, timestamp: Date.now() });
  };

  const activeProject = (projects && projects.length > 0 ? (projects.find(p => p && p.id === activeProjectId) || projects[0]) : null) || DEFAULT_INITIAL_PROJECT;

  // Dynamically update browser tab title based on open campaign/project
  useEffect(() => {
    const projName = activeProject?.name?.trim() || activeProject?.setting?.trim();
    if (projName && projName !== "Nyx Roleplay Campaign") {
      document.title = `${projName} — Nyx RPG`;
    } else if (projName) {
      document.title = "Nyx RPG — AI Dungeon Master";
    } else {
      document.title = "Nyx RPG — AI Dungeon Master";
    }
  }, [activeProject?.name, activeProject?.setting, activeProjectId]);

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {isInitialLoad ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 animate-spin flex items-center justify-center p-[2px]">
              <div className="w-full h-full bg-slate-950 rounded-full" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-lg">
              NL
            </div>
          </div>
          <h2 className="text-xl font-sans font-medium tracking-tight text-slate-200">Reconnecting to Nyx Engine...</h2>
          <p className="text-xs text-slate-500 mt-2 font-mono max-w-sm leading-relaxed">
            Authenticating your session and synchronizing active campaigns with secure cloud storage...
          </p>
        </div>
      ) : (
        <>
          {/* HIDE HEADERS AND BANNERS IN CINEMA MODE */}
          {!isCinemaMode && (
            <>
              {/* GLOBAL HEADER */}
              <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-3 sm:px-6 py-2.5 sm:py-3.5 flex flex-col gap-2 sm:gap-3">
                {/* Row 1: Brand, Desktop Sync, Mode Switcher, and Auth */}
                <div className="flex items-center justify-between gap-2 w-full">
                  {/* Brand & Connection Status */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="relative">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-white shadow shadow-purple-950 text-xs sm:text-sm">
                        N
                      </div>
                      {/* Dynamic Status dot */}
                      <div
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                          !isOnline
                            ? "bg-red-500 animate-pulse"
                            : isSyncingDesktop
                            ? "bg-cyan-400 animate-ping"
                            : user
                            ? isConnectingEngine
                              ? "bg-amber-500 animate-pulse"
                              : "bg-emerald-500"
                            : "bg-blue-400"
                        }`}
                        title={!isOnline ? "Offline" : user ? "Connected & Cloud Synced" : "Guest Mode"}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h1 className="text-sm sm:text-base font-semibold tracking-tight text-slate-100">NYX</h1>
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-purple-950/70 border border-purple-800/40 text-purple-300 rounded">
                          v2.4
                        </span>
                      </div>
                      <p className="text-[9.5px] sm:text-[10px] text-slate-400 font-mono hidden xs:block truncate max-w-[180px] sm:max-w-none">
                        DM Assistant & Novel Generator
                      </p>
                    </div>
                  </div>

                  {/* System & Sync Controls */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* SYNC WITH DESKTOP BUTTON */}
                    <button
                      type="button"
                      onClick={handleSyncWithDesktop}
                      disabled={isSyncingDesktop || !isOnline}
                      className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer border ${
                        isSyncingDesktop
                          ? "bg-purple-950 text-purple-200 border-purple-500/60 shadow-sm"
                          : user
                          ? "bg-slate-950/90 hover:bg-purple-950/60 text-slate-300 hover:text-purple-200 border-slate-800 hover:border-purple-700/50 shadow-xs"
                          : "bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800"
                      }`}
                      title="Sync with Desktop (Transfers latest stories, campaigns, notes & settings)"
                    >
                      <Cloud size={13} className={isSyncingDesktop ? "animate-pulse text-cyan-400" : "text-purple-400"} />
                      <span className="hidden sm:inline">{isSyncingDesktop ? "Syncing..." : "Sync Desktop"}</span>
                      <span className="sm:hidden">{isSyncingDesktop ? "..." : "Sync"}</span>
                    </button>

                    {/* LITE MOBILE / FULL STUDIO MODE TOGGLE */}
                    <button
                      type="button"
                      onClick={toggleMobileLiteMode}
                      className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border shrink-0 ${
                        isMobileLite
                          ? "bg-purple-900/90 hover:bg-purple-850 border-purple-500 text-purple-100 font-bold shadow-xs shadow-purple-950"
                          : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                      }`}
                      title={isMobileLite ? "Switch to Studio Mode (Multi-panel desktop layout)" : "Switch to Lite Mobile Mode (Narration, Assistant, World Settings)"}
                    >
                      {isMobileLite ? <Smartphone size={13} className="text-purple-300 shrink-0" /> : <Monitor size={13} className="text-slate-400 shrink-0" />}
                      <span className="whitespace-nowrap">{isMobileLite ? "Lite" : "Studio"}</span>
                    </button>

                    {/* USER AUTH */}
                    {user ? (
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="hidden lg:block text-right">
                          <p className="text-xs text-slate-300 font-semibold truncate max-w-[130px]">{user.displayName || user.email}</p>
                          <p className="text-[9px] font-mono text-emerald-400">Desktop Synced</p>
                        </div>

                        {/* Drive Badge */}
                        {googleToken ? (
                          <span
                            className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono bg-blue-950/60 border border-blue-800/60 text-blue-300 shrink-0"
                            title="Google Drive permissions granted and active"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Drive
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleGoogleDriveSignIn}
                            disabled={!isOnline}
                            className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs shrink-0 cursor-pointer"
                            title="Connect Google Drive"
                          >
                            <FolderOpen size={11} /> Drive
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleLogout}
                          disabled={!isOnline}
                          className="p-1.5 sm:p-2 rounded-lg transition-colors border bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-red-400 border-slate-800 shrink-0 cursor-pointer"
                          title="Sign Out"
                          aria-label="Sign Out"
                        >
                          <LogOut size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={!isOnline}
                        className="text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors bg-purple-600 hover:bg-purple-700 text-white shadow-xs shrink-0 cursor-pointer"
                      >
                        <LogIn size={13} /> <span className="hidden xs:inline">Sign In</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Active Campaign Selector and Fast Campaign Tools */}
                <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/80 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-800/80 w-full overflow-hidden">
                  <Globe size={13} className="text-purple-400 shrink-0" />

                  {isEditingTitle ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSaveTitle();
                      }}
                      className="flex-1 flex items-center gap-1.5 min-w-0"
                    >
                      <input
                        type="text"
                        value={editingTitleText}
                        onChange={(e) => setEditingTitleText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveTitle();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setIsEditingTitle(false);
                          }
                        }}
                        autoFocus
                        className="bg-slate-900 border border-purple-500 rounded-lg px-2 py-0.5 text-xs text-slate-100 outline-none flex-1 font-semibold shadow-inner focus:border-purple-400 min-w-0"
                        placeholder="Campaign Name..."
                      />
                      <button
                        type="submit"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSaveTitle();
                        }}
                        className="text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 p-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
                        title="Confirm Name Change (Enter)"
                        aria-label="Confirm Name Change"
                      >
                        <Check size={13} className="stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsEditingTitle(false);
                        }}
                        className="text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 p-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Cancel (Esc)"
                        aria-label="Cancel"
                      >
                        <X size={13} />
                      </button>
                    </form>
                  ) : (
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                      <select
                        value={activeProjectId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "new" || val === "") {
                            setNewProjName("");
                            setNewProjSetting("");
                            setNewProjNickname("");
                            setShowNewProjModal(true);
                          } else if (val === "recover-shima") {
                            handleRestoreOrCreateCampaign("Shima");
                          } else if (val === "rescan-all") {
                            handleDeepScanAndRecover();
                          } else if (val === "sync-cloud") {
                            handleSyncWithDesktop();
                          } else if (val) {
                            setActiveProjectId(val);
                          }
                        }}
                        className="bg-transparent text-xs font-semibold text-slate-300 outline-none cursor-pointer flex-1 min-w-0 truncate"
                      >
                        {projects.length === 0 ? (
                          <option value="" className="bg-slate-950 text-slate-300">
                            Nyx Roleplay Campaign
                          </option>
                        ) : (
                          <>
                            {projects.map(p => {
                              const displayName = p.name?.trim() || p.setting?.trim() || "Nyx Roleplay Campaign";
                              return (
                                <option key={p.id} value={p.id} className="bg-slate-950 text-slate-300">
                                  {displayName}
                                </option>
                              );
                            })}
                            <option value="new" className="bg-slate-950 text-purple-400 font-semibold">
                              + Create New Campaign...
                            </option>
                            <option value="sync-cloud" className="bg-emerald-950 text-emerald-300 font-semibold">
                              ☁️ Sync All Campaigns with Desktop ({projects.length})
                            </option>
                            {!projects.some(p => p.name.toLowerCase().includes("shima")) && (
                              <option value="recover-shima" className="bg-purple-950 text-purple-300 font-semibold">
                                🌟 Restore & Open "Shima"
                              </option>
                            )}
                            <option value="rescan-all" className="bg-slate-950 text-cyan-400 font-mono text-[11px]">
                              🔍 Scan & Recover Missing Campaigns
                            </option>
                          </>
                        )}
                      </select>

                      {activeProject && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTitleText(activeProject.name?.trim() || "Nyx Roleplay Campaign");
                            setIsEditingTitle(true);
                          }}
                          className="text-slate-400 hover:text-purple-300 p-1 rounded transition-colors shrink-0 cursor-pointer"
                          title="Rename Active Campaign"
                        >
                          <Edit3 size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Campaign Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setNewProjName("");
                        setNewProjSetting("");
                        setNewProjNickname("");
                        setShowNewProjModal(true);
                      }}
                      className="p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-950/60 rounded transition-colors cursor-pointer"
                      title="Create New Campaign"
                    >
                      <Plus size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowStoryArchiveModal(true)}
                      className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] font-mono bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/60 text-purple-300 transition-colors shadow-xs cursor-pointer"
                      title="Browse and restore saved story transcripts and campaign logs"
                    >
                      <BookOpen size={11} className="text-purple-400 shrink-0" />
                      <span className="hidden sm:inline">Archives</span>
                    </button>

                    {activeProjectId && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteProjId(activeProjectId)}
                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors cursor-pointer"
                        title="Delete Active Campaign"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </header>

              {/* OFFLINE STATUS BANNER */}
              {!isOnline && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2 text-xs flex items-center justify-between gap-4 text-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span>
                      <strong>Offline Sandbox:</strong> Offline mode is active. Changes to campaigns, characters, and settings are preserved in local browser storage.
                    </span>
                  </div>
                  <div className="text-[10px] bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded font-mono uppercase text-amber-300 shrink-0">
                    Offline
                  </div>
                </div>
              )}

              {/* LOCAL STORAGE BLOCKED WARNING BANNER */}
              {!safeLocalStorage.isAvailable() && (
                <div className="bg-red-500/10 border-b border-red-500/20 px-4 sm:px-6 py-2 text-xs flex flex-col md:flex-row items-center justify-between gap-3 text-red-200">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span>
                      <strong>⚠️ Browser Storage Restricted:</strong> Storage blocked inside preview. Sign in or open in a new tab to preserve your progress across sessions.
                    </span>
                  </div>
                  <a
                    href={typeof window !== "undefined" ? window.location.href : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 px-2.5 py-1 rounded font-sans font-semibold text-red-100 transition-all uppercase tracking-wider shrink-0 flex items-center gap-1"
                  >
                    🚀 Open in New Tab
                  </a>
                </div>
              )}

              {/* SUB HEADER: GLASS NAV TABS */}
              {isMobileLite ? (
                <nav className="px-3 py-2 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between gap-1 select-none">
                  <div className="flex items-center gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => setMobileLiteTab("chat")}
                      className={`relative flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px] ${
                        mobileLiteTab === "chat"
                          ? "text-purple-200 bg-purple-950/70 border border-purple-600/60 shadow-sm shadow-purple-950/50"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                      }`}
                    >
                      <Sparkles size={14} className={mobileLiteTab === "chat" ? "text-purple-400 shrink-0" : "text-slate-500 shrink-0"} />
                      <span className="truncate">Narration</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobileLiteTab("assistant")}
                      className={`relative flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px] ${
                        mobileLiteTab === "assistant"
                          ? "text-purple-200 bg-purple-950/70 border border-purple-600/60 shadow-sm shadow-purple-950/50"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                      }`}
                    >
                      <Sparkles size={14} className={mobileLiteTab === "assistant" ? "text-purple-400 shrink-0" : "text-slate-500 shrink-0"} />
                      <span className="truncate">Assistant</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobileLiteTab("settings")}
                      className={`relative flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px] ${
                        mobileLiteTab === "settings"
                          ? "text-purple-200 bg-purple-950/70 border border-purple-600/60 shadow-sm shadow-purple-950/50"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                      }`}
                    >
                      <Globe size={14} className={mobileLiteTab === "settings" ? "text-purple-400 shrink-0" : "text-slate-500 shrink-0"} />
                      <span className="truncate sm:hidden">World</span>
                      <span className="truncate hidden sm:inline">World Settings</span>
                    </button>
                  </div>
                </nav>
              ) : (
            <nav className="px-6 py-3 border-b border-slate-800/60 bg-slate-950 flex gap-1.5 overflow-x-auto relative">
              <button
                onClick={() => setActiveTab("chat")}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === "chat" 
                    ? "text-purple-300" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {activeTab === "chat" && (
                  <motion.div
                    layoutId="activeMainTabPill"
                    className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-xl shadow shadow-purple-950/20 -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <Sparkles size={13} className={activeTab === "chat" ? "text-purple-400" : ""} /> Active Adventure
              </button>
              <button
                onClick={() => setActiveTab("editor")}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === "editor" 
                    ? "text-emerald-300" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {activeTab === "editor" && (
                  <motion.div
                    layoutId="activeMainTabPill"
                    className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-xl shadow shadow-emerald-950/20 -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <Layers size={13} className={activeTab === "editor" ? "text-emerald-400" : ""} /> Narrative Editing
              </button>
              <button
                onClick={() => setActiveTab("image")}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === "image" 
                    ? "text-pink-300" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {activeTab === "image" && (
                  <motion.div
                    layoutId="activeMainTabPill"
                    className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-xl shadow shadow-pink-950/20 -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <ImageIcon size={13} className={activeTab === "image" ? "text-pink-400" : ""} /> Imaging & Video
              </button>
              <button
                onClick={() => setActiveTab("workspace")}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === "workspace" 
                    ? "text-blue-300" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {activeTab === "workspace" && (
                  <motion.div
                    layoutId="activeMainTabPill"
                    className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-xl shadow shadow-blue-950/20 -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <FileText size={13} className={activeTab === "workspace" ? "text-blue-400" : ""} /> Workspace Sync
              </button>
            </nav>
          )}
            </>
          )}

          {/* MAIN LAYOUT WRAPPER */}
          <div className="flex-1 flex min-h-0 h-full overflow-hidden relative">
            <main className={`flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden transition-all duration-300 ${isCinemaMode ? "p-0" : "p-2 sm:p-3 md:p-4"}`}>
              
              {activeProject ? (
                <div className="h-full w-full min-h-0 flex-1 flex flex-col relative overflow-hidden">
                  {isMobileLite ? (
                    <AnimatePresence mode="wait">
                      {mobileLiteTab === "chat" && (
                        <motion.div
                          key="mobile-lite-chat"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="h-full w-full"
                        >
                          <AdventureChat
                            project={activeProject}
                            messages={messages}
                            characters={characters}
                            onSendMessage={handleSendMessage}
                            onRegenerateResponse={handleRegenerateResponse}
                            onSelectMessageVersion={handleSelectMessageVersion}
                            onEditMessage={handleEditMessage}
                            onDeleteMessage={handleDeleteMessage}
                            onUpdateNickname={(name) => handleSetProjectValue("userNickname", name)}
                            isGenerating={isGeneratingChat}
                            onStopGeneration={handleStopChatGeneration}
                            onClearChat={handleClearChat}
                            onSetProjectValue={handleSetProjectValue}
                            onAddCharacter={handleAddCharacter}
                            onDeleteCharacter={handleDeleteCharacter}
                            onUpdateCharacter={handleUpdateCharacter}
                            gallery={gallery}
                            googleToken={googleToken}
                            onGoogleSignIn={handleGoogleDriveSignIn}
                            onClearGoogleToken={handleClearGoogleToken}
                            onShowToast={showToast}
                            setActiveTab={setActiveTab}
                            navigationTarget={navigationTarget}
                            isCinemaMode={isCinemaMode}
                            onToggleCinemaMode={() => setIsCinemaMode(prev => !prev)}
                            onOpenStoryArchives={() => setShowStoryArchiveModal(true)}
                            isMobileLite={isMobileLite}
                          />
                        </motion.div>
                      )}

                      {mobileLiteTab === "assistant" && (
                        <motion.div
                          key="mobile-lite-assistant"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="h-full w-full rounded-xl border border-slate-850 overflow-hidden bg-slate-950"
                        >
                          <StudioAssistantSidebar
                            projects={projects}
                            activeProject={activeProject}
                            messages={messages}
                            characters={characters}
                            notes={notes}
                            tasks={tasks}
                            onSetProjectValue={handleSetProjectValue}
                            onNavigateToItem={handleNavigateToItem}
                            onAddCharacter={handleAddCharacter}
                            onDeleteCharacter={handleDeleteCharacter}
                            onUpdateCharacter={handleUpdateCharacter}
                            onAddNote={handleAddNote}
                            onDeleteNote={handleDeleteNote}
                            onAddTask={handleAddTask}
                            onToggleTask={handleToggleTask}
                            onDeleteTask={handleDeleteTask}
                            onInjectMessageToMainChat={handleInjectMessageToMainChat}
                            onEditMessage={handleEditMessage}
                            onDeleteMessage={handleDeleteMessage}
                            onShowToast={showToast}
                            googleToken={googleToken}
                            onGoogleSignIn={handleGoogleDriveSignIn}
                            embedded={true}
                          />
                        </motion.div>
                      )}

                      {mobileLiteTab === "settings" && (
                        <motion.div
                          key="mobile-lite-settings"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="h-full w-full"
                        >
                          <MobileWorldSettings
                            project={activeProject}
                            onSetProjectValue={handleSetProjectValue}
                            onUpdateNickname={(name) => handleSetProjectValue("userNickname", name)}
                            onShowToast={showToast}
                            onSwitchToNarration={() => setMobileLiteTab("chat")}
                            onConsultAssistant={() => setMobileLiteTab("assistant")}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  ) : (
                  <AnimatePresence mode="wait">
                    {activeTab === "chat" && (
                      <motion.div
                        key="tab-chat"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="h-full w-full min-h-0 flex-1 flex flex-col overflow-hidden"
                      >
                        <AdventureChat
                          project={activeProject}
                          messages={messages}
                          characters={characters}
                          onSendMessage={handleSendMessage}
                          onRegenerateResponse={handleRegenerateResponse}
                          onSelectMessageVersion={handleSelectMessageVersion}
                          onEditMessage={handleEditMessage}
                          onDeleteMessage={handleDeleteMessage}
                          onUpdateNickname={(name) => handleSetProjectValue("userNickname", name)}
                          isGenerating={isGeneratingChat}
                          onStopGeneration={handleStopChatGeneration}
                          onClearChat={handleClearChat}
                          onSetProjectValue={handleSetProjectValue}
                          onAddCharacter={handleAddCharacter}
                          onDeleteCharacter={handleDeleteCharacter}
                          onUpdateCharacter={handleUpdateCharacter}
                          gallery={gallery}
                          googleToken={googleToken}
                          onGoogleSignIn={handleGoogleDriveSignIn}
                          onClearGoogleToken={handleClearGoogleToken}
                          onShowToast={showToast}
                          setActiveTab={setActiveTab}
                          navigationTarget={navigationTarget}
                          isCinemaMode={isCinemaMode}
                          onToggleCinemaMode={() => setIsCinemaMode(prev => !prev)}
                          onOpenStoryArchives={() => setShowStoryArchiveModal(true)}
                        />
                      </motion.div>
                    )}

                    {activeTab === "editor" && (
                      <motion.div
                        key="tab-editor"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="h-full w-full min-h-0 flex-1 flex flex-col overflow-hidden"
                      >
                        <NarrativeSuite
                          chatTranscript={messages.map(m => `[${m.role}] ${m.content}`).join("\n\n")}
                          onEditNarrative={handleEditNarrative}
                          ragSummary={activeProject.ragSummary}
                          onUpdateRagSummary={(summary) => handleSetProjectValue("ragSummary", summary)}
                          googleToken={googleToken}
                          onClearGoogleToken={handleClearGoogleToken}
                          onUpdateWorldSetting={(setting) => handleSetProjectValue("setting", setting)}
                          onUpdateStyleGuide={(guide) => handleSetProjectValue("styleGuide", guide)}
                          onImportMessages={handleImportMessages}
                          projectId={activeProjectId}
                          projectName={activeProject.name}
                          onGoogleSignIn={handleGoogleDriveSignIn}
                          onShowToast={showToast}
                          onAttachToSources={handleAttachNarrativeToSources}
                        />
                      </motion.div>
                    )}

                    {activeTab === "image" && (
                      <motion.div
                        key="tab-image"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="h-full w-full min-h-0 flex-1 flex flex-col overflow-hidden"
                      >
                        <ImageVideoSuite
                          gallery={gallery}
                          onGenerateImage={handleGenerateImage}
                          onGenerateVideo={handleGenerateVideo}
                          projectId={activeProjectId}
                          isGenerating={isGeneratingImage}
                          videoResult={videoResult}
                          googleToken={googleToken}
                          onGoogleSignIn={handleGoogleDriveSignIn}
                          onShowToast={showToast}
                          project={activeProject}
                          characters={characters}
                        />
                      </motion.div>
                    )}

                    {activeTab === "workspace" && activeProject && (
                      <motion.div
                        key="tab-workspace"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="h-full w-full min-h-0 flex-1 flex flex-col overflow-hidden"
                      >
                        <WorkspaceSync
                          notes={notes}
                          tasks={tasks}
                          onAddNote={handleAddNote}
                          onDeleteNote={handleDeleteNote}
                          onUpdateNotes={setNotes}
                          onAddTask={handleAddTask}
                          onToggleTask={handleToggleTask}
                          onDeleteTask={handleDeleteTask}
                          googleToken={googleToken}
                          onClearGoogleToken={handleClearGoogleToken}
                          onSyncDocInstructions={(docText) => handleSetProjectValue("customInstructions", docText)}
                          project={activeProject}
                          onSetProjectValue={handleSetProjectValue}
                          onGoogleSignIn={handleGoogleDriveSignIn}
                          onAddCharacter={handleAddCharacter}
                          characters={characters}
                          syncLogs={syncLogs}
                          onAddLog={handleAddSyncLog}
                          navigationTarget={navigationTarget}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  )}
                </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center px-4 py-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-900/30 mb-6 text-xl">
                N
              </div>
              <h2 className="text-2xl font-semibold text-slate-100 tracking-tight mb-2">Welcome to Nyx</h2>
              <p className="text-xs text-slate-400 mb-8 leading-relaxed max-w-md">
                Nyx is a world-agnostic, multi-modal sandbox designed for real-time storytelling, narrative expansion, and thematic image creation. 
                Get started by initializing your first world project.
              </p>
              <button
                onClick={() => {
                  setNewProjName("");
                  setNewProjSetting("");
                  setNewProjNickname("");
                  setShowNewProjModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-purple-900/40 flex items-center gap-2 mx-auto"
              >
                <Plus size={14} /> Create New Project
              </button>
            </div>
          )}

        </main>

        {!isCinemaMode && !isMobileLite && activeProject && (
          <StudioAssistantSidebar
            projects={projects}
            activeProject={activeProject}
            messages={messages}
            characters={characters}
            notes={notes}
            tasks={tasks}
            onSetProjectValue={handleSetProjectValue}
            onNavigateToItem={handleNavigateToItem}
            onAddCharacter={handleAddCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onUpdateCharacter={handleUpdateCharacter}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onInjectMessageToMainChat={handleInjectMessageToMainChat}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onShowToast={showToast}
            googleToken={googleToken}
            onGoogleSignIn={handleGoogleDriveSignIn}
          />
        )}
      </div>

      {/* NEW PROJECT MODAL */}
      {showNewProjModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-purple-400">
                <Sparkles size={20} />
                <h3 className="text-base font-semibold text-slate-100">Initialize New Campaign</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProjModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Campaign Name <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Cyberpunk Noir, Shadows of Waterdeep, Void Odyssey..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Setting / Genre <span className="text-slate-500 text-[10px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newProjSetting}
                    onChange={(e) => setNewProjSetting(e.target.value)}
                    placeholder="e.g. Cyberpunk, Fantasy, Grimdark..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Your Nickname <span className="text-slate-500 text-[10px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newProjNickname}
                    onChange={(e) => setNewProjNickname(e.target.value)}
                    placeholder="Default: Adventurer"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              {/* Start Template Options */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Initialization Mode</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewProjCloneFromCurrent(false)}
                    className={`text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-1 ${
                      !newProjCloneFromCurrent
                        ? "bg-purple-950/40 border-purple-500/60 text-purple-200"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <FileText size={13} className={!newProjCloneFromCurrent ? "text-purple-400" : "text-slate-500"} />
                      Fresh Blank Slate
                    </span>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Empty chat log, fresh character vault, and clean default configurations.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewProjCloneFromCurrent(true)}
                    className={`text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-1 ${
                      newProjCloneFromCurrent
                        ? "bg-purple-950/40 border-purple-500/60 text-purple-200"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Copy size={13} className={newProjCloneFromCurrent ? "text-purple-400" : "text-slate-500"} />
                      Copy Style & Theme
                    </span>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Inherit narration style and theme from current project, but start with blank chat.
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewProjModal(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs px-4 py-2.5 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs px-5 py-2.5 rounded-lg font-semibold shadow-lg shadow-purple-900/30 transition-all flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CENTERED PROJECT DELETE CONFIRMATION MODAL */}
      {confirmDeleteProjId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h3 className="text-md font-sans font-semibold tracking-tight">Delete Project?</h3>
            </div>
            
            <p className="text-xs text-slate-300 font-sans leading-relaxed mb-6">
              Are you sure you want to delete <span className="text-red-300 font-semibold font-mono">"{projects.find(p => p.id === confirmDeleteProjId)?.name || "this project"}"</span>? This action is irreversible and will permanently delete all logs, sources, and settings.
            </p>
            
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteProjId(null)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs px-4 py-2 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirmDeleteProjId) {
                    await handleDeleteProject(confirmDeleteProjId);
                    setConfirmDeleteProjId(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs px-4 py-2 rounded-xl font-semibold transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STORY ARCHIVE & TRANSCRIPT EXPLORER MODAL */}
      <StoryArchiveModal
        isOpen={showStoryArchiveModal}
        onClose={() => setShowStoryArchiveModal(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(projId) => {
          setActiveProjectId(projId);
        }}
        onRestoreMessages={handleRestoreArchivedMessages}
        onRestoreOrCreateCampaign={handleRestoreOrCreateCampaign}
        onShowToast={showToast}
      />

        </>
      )}

      {/* GLOBAL FLOATING TOASTS NOTIFICATION PANEL */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 bg-slate-950/95 border border-purple-500/35 shadow-lg shadow-purple-500/10 rounded-xl p-4 text-xs text-slate-200 backdrop-blur-md transition-all duration-300"
            style={{
              boxShadow: "0 10px 25px -5px rgba(139, 92, 246, 0.15), 0 8px 10px -6px rgba(139, 92, 246, 0.1)"
            }}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              toast.type === "success" 
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                : toast.type === "error"
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
            }`}>
              <Sparkles size={11} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-100 tracking-tight">{toast.title}</h4>
              <p className="text-slate-400 mt-0.5 leading-relaxed">{toast.description}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
