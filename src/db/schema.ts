import { pgTable, serial, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table (UID is the Firebase Auth UID)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  userUid: text("user_uid").references(() => users.uid).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  setting: text("setting"),
  creatorNames: text("creator_names"),
  customInstructions: text("custom_instructions"),
  narrationStyle: text("narration_style"),
  narrativePerspective: text("narrative_perspective"),
  pacing: text("pacing"),
  emotionalTone: text("emotional_tone"),
  canonSource: text("canon_source"),
  styleGuide: text("style_guide"),
  storyModules: text("story_modules"),
  userNickname: text("user_nickname"),
  ragSummary: text("rag_summary"),
  themeId: text("theme_id"),
  settingsData: jsonb("settings_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Characters table
export const characters = pgTable("characters", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userUid: text("user_uid").references(() => users.uid).notNull(),
  name: text("name").notNull(),
  role: text("role"),
  portraitUrl: text("portrait_url"),
  description: text("description"),
  backstory: text("backstory"),
  type: text("type"),
  isPlayerCharacter: boolean("is_player_character").default(false),
  relationships: text("relationships"),
  factionName: text("faction_name"),
  customFields: jsonb("custom_fields"),
  romanceTracks: jsonb("romance_tracks"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userUid: text("user_uid").references(() => users.uid).notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  chainOfThought: text("chain_of_thought"),
  tokensUsed: integer("tokens_used"),
  timestamp: text("timestamp"),
  versions: jsonb("versions"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lore Sources table
export const loreSources = pgTable("lore_sources", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userUid: text("user_uid").references(() => users.uid).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category: text("category"),
  content: text("content"),
  summary: text("summary"),
  url: text("url"),
  gdocId: text("gdoc_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Prompt Vault table
export const promptVault = pgTable("prompt_vault", {
  id: text("id").primaryKey(),
  userUid: text("user_uid").references(() => users.uid).notNull(),
  projectId: text("project_id"),
  characterName: text("character_name"),
  characterTags: jsonb("character_tags"),
  folder: text("folder"),
  title: text("title").notNull(),
  promptText: text("prompt_text").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  characters: many(characters),
  messages: many(messages),
  loreSources: many(loreSources),
  promptVault: many(promptVault),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  author: one(users, {
    fields: [projects.userUid],
    references: [users.uid],
  }),
  characters: many(characters),
  messages: many(messages),
  loreSources: many(loreSources),
}));
