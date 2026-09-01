export interface MessageVersion {
  id: string;
  content: string;
  timestamp: string;
  chainOfThought?: string;
  tokensUsed?: number;
  speakerIds?: string[];
}

export interface Message {
  id: string;
  role: "user" | "nyx" | "assistant";
  content: string;
  timestamp: string;
  chainOfThought?: string;
  tokensUsed?: number;
  speakerIds?: string[]; // IDs of CharacterProfiles speaking/mentioned in this dialogue box
  projectId?: string;
  versions?: MessageVersion[];
  activeVersionIndex?: number;
  attachments?: any[];
}

export interface PromptVaultItem {
  id: string;
  characterName: string; // Deprecated or primary tag
  characterTags?: string[]; // Multiple characters in this asset
  folder: string; // e.g., "Main Cast", "NPCs", "Setting Prompts", "Factions"
  title: string;
  promptText: string;
  imageUrl?: string; // Optional image URL
}

export interface RelationshipTrack {
  id: string;
  npcName: string;
  relationshipStatus: string; // e.g. "Comfortable in his presence, slowly beginning to trust..."
  milestones: string; // e.g. "First love making - Episode 2, Life saved by PC - Episode 4"
  openness: string; // e.g. "Lingering looks and smiles, light flirting, Kisses on the cheek"
}

export interface CharacterProfile {
  id: string;
  name: string;
  role: string; // Subclass/category, e.g. "Companion", "Protagonist", "Heavy Cruiser", "lightsaber", "Red Claws", etc.
  portraitUrl: string; // image source, generated illustration, or preset name
  description?: string; // main description, specs, logs, biography
  backstory?: string; // dedicated long-form backstory block
  projectId: string;
  type?: "pc" | "npc" | "companion" | "chronicle" | "location" | "vehicle" | "equipment" | "faction"; // Unified lore database categories
  isPlayerCharacter?: boolean; // PC vs NPC fallback flag
  isInScene?: boolean; // 2.0 Lorebook: Explicitly present in the active scene / party
  activationKeys?: string[]; // 2.0 Lorebook: Trigger keywords for selective context injection
  relationships?: string; // Relationships, key figures, or item owner
  factionName?: string; // Faction/Affiliation name
  isMook?: boolean; // Mook identifier for NPC grunts
  portraitHistory?: string[]; // history of past portraits
  customFields?: Record<string, string>; // Category-specific key-value pairs
  signatureItems?: string; // Signature items or equipment (e.g. custom blaster, lucky coin, spellbook)
  romanceTracks?: RelationshipTrack[]; // Romance and relationship tracker
  linkedLoreIds?: string[]; // Links to other lore entries (e.g. ship, companion, faction, etc.)
}

export interface GeneratedImage {
  id: string;
  url: string; // base64 or source
  prompt: string;
  seed: number;
  tokensUsed: number;
  timestamp: string;
  fileName: string;
  projectId: string;
  references?: string[]; // list of referenced image URLs
  characterTags?: string[]; // tags to organize by character
}

export interface KeepNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface KeepTask {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
}

export interface SyncActivityLog {
  id: string;
  timestamp: string;
  sourceName: string;
  type: "success" | "info" | "warning";
  message: string;
}

export interface LoreSource {
  id: string;
  name: string;
  type: "gdoc" | "local_file" | "url" | "text_snippet" | "photo";
  category?: "narrative" | "character" | "world_lore" | "rules" | "module" | "other"; // Lore organization category
  categories?: string[]; // Supporting multi-category classification
  content: string; // The parsed text/lore content
  summary?: string; // AI generated study guide summary
  url?: string;     // URL or base64 or link
  topics?: string[];   // Grounded topics and tags from document
  mimeType?: string;
  fileBase64?: string;
  fileMimeType?: string;
  size?: string;
  addedAt: string;
  isActive: boolean; // toggle whether this source is actively used in grounding
  gdocId?: string;  // Google Drive fileId for auto-syncing
  isIngesting?: boolean; // Indicates background ingestion is running
  extra?: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  setting: string; // Star Wars, Cyberpunk, Original, etc.
  creatorNames: string; // comma-separated authors/DMs to mix
  customInstructions: string;
  attachedDocId?: string;
  narrationStyle: string; // e.g., Immersive, Fast-paced, Gritty
  narrativePerspective?: "third_person" | "second_person"; // Third Person (Sena does...) vs Second Person (You do...)
  pacing: string;
  emotionalTone: string;
  canonSource: string;
  styleGuide: string;
  storyModules: string;
  userNickname: string; // what Nyx calls the user
  activeChatId: string;
  ragSummary: string; // rolling updated summary
  themeId?: string; // e.g., 'slate', 'cyberpunk', 'emerald', 'noir', 'crimson', 'twilight'
  chatBgPreset?: string; // e.g. 'none', 'stars', 'grid', 'stone', 'mist', 'custom'
  chatBgUrl?: string; // custom image url or local preset path
  chatBubbleStyle?: string; // e.g. 'glass', 'classic', 'parchment', 'terminal'
  activeCharacterId?: string; // Default character portrait for the prompt box
  portraitPosition?: "left" | "right" | "alternating"; // Where portraits show up inside chat bubbles
  persistentContext?: string; // Editable context box that remains in context during every response
  persistentContextDocId?: string; // GDoc ID attached to persistent context
  plotOverview?: string; // Place for storyteller plot overview
  linkedGDocs?: string[]; // Attached GDocs list
  stAuthorsMix?: string; // Mix of authors (e.g. Matt Mercer + Stephen King)
  stAdventureModule?: string; // Markdown structured Adventure Module (Chronicles, Chapters, Episodes)
  sources?: LoreSource[]; // Dynamic active/inactive lore sources for campaign grounding
  syncedToCloud?: boolean; // Indicates the local guest project has been synced to the cloud
  icMinTokens?: number; // Minimum length for IC (In-Character) response
  icMaxTokens?: number; // Maximum length for IC (In-Character) response
  oocMinTokens?: number; // Minimum length for OOC (Out-Of-Character) response
  oocMaxTokens?: number; // Maximum length for OOC (Out-Of-Character) response
  narrativeFontSize?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | string; // Font size of narrative and assistant text
  slidingContextTurns?: number; // 2.0 Dynamic sliding memory window (4-30 turns)
  sparkRawThreadsFolderId?: string;
  sparkCodexFolderId?: string;
  lastSparkSyncTimestamp?: string;
}
