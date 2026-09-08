import { useState, useEffect, useRef } from "react";
import { MASTER_LORE_DATABASE } from "../data/loreDatabase";
import { 
  getAllLoreFacts, 
  getLoreFactsByCategory, 
  getLoreFactsByMultipleCategories 
} from "../data/loreStore";

export interface LoadingContext {
  project?: any;
  characters?: any[];
  notes?: any[];
  setting?: string;
  activeSetting?: string;
}

// Global session state to track shown trivia across turns and guarantee ZERO annoying repetition
const seenTriviaBySetting: Record<string, Set<string>> = {};
const sessionQueueBySetting: Record<string, string[]> = {};

/**
 * Modern Fisher-Yates unbiased shuffle algorithm
 */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const FUNNY_SYSTEM_PHRASES = [
  "Reticulating narrative splines...",
  "Calibrating dramatic tension...",
  "Consulting the Storyteller lore archives...",
  "Polishing character sheets & faction dossiers...",
  "Bribing the digital dice roller...",
  "Untangling branching plotlines...",
  "Sharpening plot armor & world rules...",
  "Buffering dramatic scene pauses...",
  "Weaving fate threads in real time...",
  "Charging campaign mana registers...",
  "Calculating scene atmospheric lighting...",
  "Synthesizing NPC dialogue nuances...",
  "Cross-referencing canon archives...",
  "Harmonizing character relationship matrix..."
];

/**
 * Extracts dynamic lore cards directly from custom text written in the "Active Setting" field.
 */
export function extractDynamicSettingFacts(settingText: string, context?: LoadingContext): string[] {
  if (!settingText || !settingText.trim()) return [];

  const rawClean = settingText.trim();
  const facts: string[] = [];

  // 1. Headline summary card
  facts.push(`Active Setting Anchor: Grounding world physics and campaign parameters for "${rawClean.length > 50 ? rawClean.slice(0, 47) + "..." : rawClean}"`);

  // 2. Break down multiple sentences or semicolon-separated clauses
  const clauses = rawClean
    .split(/[\n.;•\-]+/)
    .map(s => s.trim())
    .filter(s => s.length > 8);

  clauses.slice(0, 5).forEach((clause) => {
    facts.push(`Active Setting Rule: Extracted from campaign parameters — "${clause}"`);
  });

  // 3. Dynamic character or faction ties if available
  const chars = context?.characters || [];
  if (chars.length > 0) {
    chars.slice(0, 3).forEach((c: any) => {
      if (c.name && c.name.trim()) {
        facts.push(`Active Setting Dossier: Linking ${c.name} (${c.role || "Protagonist"}) into the active world setting...`);
      }
    });
  }

  return facts;
}

/**
 * Detect the campaign setting dynamically, prioritizing the "Active Setting" field.
 */
export function detectCampaignSetting(context?: LoadingContext): { key: string; settingTitle: string; isCustom: boolean } {
  const project = context?.project;
  const chars = context?.characters || [];
  const notes = context?.notes || [];

  // Primary Anchor: Active Setting string from context or project
  const activeSettingRaw = (
    context?.activeSetting ||
    context?.setting ||
    project?.setting ||
    project?.customSetting ||
    ""
  ).trim();

  // Secondary text to scan for fallback context
  const fullTextToScan = [
    activeSettingRaw,
    project?.name || "",
    project?.styleGuide || "",
    project?.plotOverview || "",
    project?.description || "",
    project?.system || "",
    ...(chars.map((c: any) => `${c.name || ""} ${c.role || ""} ${c.factionName || ""} ${c.description || ""}`)),
    ...(notes.map((n: any) => `${n.title || ""} ${n.content || ""}`))
  ].join(" ").toLowerCase();

  const activeLower = activeSettingRaw.toLowerCase();

  // 1. Cyberpunk 2077 / Night City / Trauma Team
  if (
    activeLower.includes("cyberpunk") ||
    activeLower.includes("2077") ||
    activeLower.includes("night city") ||
    activeLower.includes("trauma") ||
    activeLower.includes("edgerunner") ||
    activeLower.includes("arasaka") ||
    activeLower.includes("militech") ||
    fullTextToScan.includes("cyberpunk 2077") ||
    fullTextToScan.includes("trauma team") ||
    (fullTextToScan.includes("trauma") && fullTextToScan.includes("night city"))
  ) {
    return { key: "cyberpunk", settingTitle: activeSettingRaw || "Cyberpunk & Night City", isCustom: false };
  }

  // 2. Forgotten Realms / Faerûn / Shima / D&D
  if (
    activeLower.includes("forgotten realms") ||
    activeLower.includes("faerun") ||
    activeLower.includes("faerûn") ||
    activeLower.includes("toril") ||
    activeLower.includes("waterdeep") ||
    activeLower.includes("baldur") ||
    activeLower.includes("sword coast") ||
    activeLower.includes("underdark") ||
    activeLower.includes("shima") ||
    activeLower.includes("d&d") ||
    activeLower.includes("dnd") ||
    fullTextToScan.includes("forgotten realms") ||
    (fullTextToScan.includes("shima") && (fullTextToScan.includes("realms") || fullTextToScan.includes("faerun") || fullTextToScan.includes("d&d")))
  ) {
    return { key: "forgottenrealms", settingTitle: activeSettingRaw || "Forgotten Realms & Faerûn", isCustom: false };
  }

  // 3. Teen Titans / DC Comics / Specter / Jump City
  if (
    activeLower.includes("teen titans") ||
    activeLower.includes("titans tower") ||
    activeLower.includes("jump city") ||
    activeLower.includes("specter") ||
    activeLower.includes("dc comics") ||
    activeLower.includes("deathstroke") ||
    activeLower.includes("slade") ||
    activeLower.includes("starfire") ||
    activeLower.includes("azarath") ||
    fullTextToScan.includes("teen titans") ||
    (fullTextToScan.includes("specter") && (fullTextToScan.includes("titans") || fullTextToScan.includes("jump city")))
  ) {
    return { key: "teentitans", settingTitle: activeSettingRaw || "Teen Titans & DC Universe", isCustom: false };
  }

  // 4. Star Wars / Galactic Lore / Jedi / Sith
  if (
    activeLower.includes("star wars") ||
    activeLower.includes("jedi") ||
    activeLower.includes("sith") ||
    activeLower.includes("lightsaber") ||
    activeLower.includes("mandalorian") ||
    activeLower.includes("korriban") ||
    activeLower.includes("tatooine") ||
    activeLower.includes("coruscant") ||
    fullTextToScan.includes("star wars")
  ) {
    return { key: "starwars", settingTitle: activeSettingRaw || "Star Wars & Galactic Lore", isCustom: false };
  }

  // 5. Warhammer 40,000
  if (
    activeLower.includes("warhammer") ||
    activeLower.includes("40k") ||
    activeLower.includes("40,000") ||
    activeLower.includes("astartes") ||
    activeLower.includes("space marine") ||
    fullTextToScan.includes("warhammer 40k") ||
    fullTextToScan.includes("warhammer 40,000")
  ) {
    return { key: "warhammer", settingTitle: activeSettingRaw || "Warhammer 40,000", isCustom: false };
  }

  // 6. Lord of the Rings / Middle-Earth
  if (
    activeLower.includes("lord of the rings") ||
    activeLower.includes("middle-earth") ||
    activeLower.includes("middle earth") ||
    activeLower.includes("tolkien") ||
    activeLower.includes("mordor") ||
    activeLower.includes("gondor") ||
    activeLower.includes("rivendell") ||
    fullTextToScan.includes("lord of the rings") ||
    fullTextToScan.includes("middle-earth")
  ) {
    return { key: "lotr", settingTitle: activeSettingRaw || "Lord of the Rings & Middle-Earth", isCustom: false };
  }

  // 7. Elden Ring & Soulsborne
  if (
    activeLower.includes("elden ring") ||
    activeLower.includes("dark souls") ||
    activeLower.includes("bloodborne") ||
    activeLower.includes("soulsborne") ||
    activeLower.includes("lands between") ||
    activeLower.includes("erdtree") ||
    fullTextToScan.includes("elden ring") ||
    fullTextToScan.includes("dark souls")
  ) {
    return { key: "soulsborne", settingTitle: activeSettingRaw || "Elden Ring & Soulsborne", isCustom: false };
  }

  // 8. The Elder Scrolls
  if (
    activeLower.includes("elder scrolls") ||
    activeLower.includes("skyrim") ||
    activeLower.includes("morrowind") ||
    activeLower.includes("oblivion") ||
    activeLower.includes("tamriel") ||
    fullTextToScan.includes("elder scrolls") ||
    fullTextToScan.includes("skyrim")
  ) {
    return { key: "elderscrolls", settingTitle: activeSettingRaw || "The Elder Scrolls", isCustom: false };
  }

  // 9. The Witcher
  if (
    activeLower.includes("witcher") ||
    activeLower.includes("geralt") ||
    activeLower.includes("kaer morhen") ||
    activeLower.includes("nilfgaard") ||
    fullTextToScan.includes("witcher")
  ) {
    return { key: "witcher", settingTitle: activeSettingRaw || "The Witcher & Continent", isCustom: false };
  }

  // 10. Mass Effect
  if (
    activeLower.includes("mass effect") ||
    activeLower.includes("citadel") ||
    activeLower.includes("reapers") ||
    activeLower.includes("normandy") ||
    fullTextToScan.includes("mass effect")
  ) {
    return { key: "masseffect", settingTitle: activeSettingRaw || "Mass Effect & Citadel", isCustom: false };
  }

  // 11. Dune & Arrakis
  if (
    activeLower.includes("dune") ||
    activeLower.includes("arrakis") ||
    activeLower.includes("fremen") ||
    activeLower.includes("shai-hulud") ||
    activeLower.includes("melange") ||
    fullTextToScan.includes("arrakis") ||
    fullTextToScan.includes("dune")
  ) {
    return { key: "dune", settingTitle: activeSettingRaw || "Dune & Arrakis", isCustom: false };
  }

  // 12. Fallout & Wasteland
  if (
    activeLower.includes("fallout") ||
    activeLower.includes("wasteland") ||
    activeLower.includes("vault-tec") ||
    activeLower.includes("pip-boy") ||
    fullTextToScan.includes("fallout")
  ) {
    return { key: "fallout", settingTitle: activeSettingRaw || "Fallout & Wasteland", isCustom: false };
  }

  // 13. Vampire: The Masquerade
  if (
    activeLower.includes("vampire: the masquerade") ||
    activeLower.includes("world of darkness") ||
    activeLower.includes("camarilla") ||
    activeLower.includes("kindred") ||
    activeLower.includes("vtm") ||
    fullTextToScan.includes("vampire: the masquerade") ||
    fullTextToScan.includes("world of darkness")
  ) {
    return { key: "vampire", settingTitle: activeSettingRaw || "Vampire: The Masquerade", isCustom: false };
  }

  // 14. Call of Cthulhu / Cosmic Horror
  if (
    activeLower.includes("cthulhu") ||
    activeLower.includes("lovecraft") ||
    activeLower.includes("arkham") ||
    activeLower.includes("miskatonic") ||
    activeLower.includes("necronomicon") ||
    fullTextToScan.includes("call of cthulhu") ||
    fullTextToScan.includes("lovecraftian")
  ) {
    return { key: "cthulhu", settingTitle: activeSettingRaw || "Call of Cthulhu & Mythos", isCustom: false };
  }

  // 15. Marvel / MCU
  if (
    activeLower.includes("marvel") ||
    activeLower.includes("mcu") ||
    activeLower.includes("avengers") ||
    activeLower.includes("x-men") ||
    activeLower.includes("wakanda") ||
    activeLower.includes("stark industries") ||
    fullTextToScan.includes("marvel") ||
    fullTextToScan.includes("mcu")
  ) {
    return { key: "marvel", settingTitle: activeSettingRaw || "Marvel Universe & MCU", isCustom: false };
  }

  // 16. Star Trek
  if (
    activeLower.includes("star trek") ||
    activeLower.includes("starfleet") ||
    activeLower.includes("klingon") ||
    activeLower.includes("uss enterprise") ||
    fullTextToScan.includes("star trek")
  ) {
    return { key: "startrek", settingTitle: activeSettingRaw || "Star Trek & Federation", isCustom: false };
  }

  // If user provided a specific custom setting text in "Active Setting"
  if (activeSettingRaw.length > 0) {
    return { key: "custom", settingTitle: activeSettingRaw, isCustom: true };
  }

  return { key: "ttrpg", settingTitle: project?.name || "Storyteller Archives", isCustom: false };
}

/**
 * Get setting-specific trivia facts array dynamically based on active fact indexes or the "Active Setting" field.
 */
export function getSettingTriviaPool(context?: LoadingContext): { settingName: string; trivia: string[]; key: string } {
  const activeSettingRaw = (context?.activeSetting || context?.setting || context?.project?.setting || "").trim();
  const dynamicCustomFacts = extractDynamicSettingFacts(activeSettingRaw, context);
  const generalFacts = getLoreFactsByCategory("ttrpg");

  // 1. First priority: Explicitly selected campaign fact index(es)
  const activeIndexes: string[] = context?.project?.activeFactIndexes || [];
  if (Array.isArray(activeIndexes) && activeIndexes.length > 0) {
    const multiFacts = getLoreFactsByMultipleCategories(activeIndexes);
    const key = `active-indexes-${[...activeIndexes].sort().join("-")}`;
    const settingName = activeSettingRaw || (context?.project?.name ? `${context.project.name} Codex` : "Active Lore Indexes");

    let combined = [
      ...multiFacts.map(f => f.fact),
      ...dynamicCustomFacts
    ];

    if (combined.length < 15) {
      combined = [
        ...combined,
        ...generalFacts.map(f => f.fact),
        ...FUNNY_SYSTEM_PHRASES
      ];
    }

    return {
      key,
      settingName,
      trivia: combined
    };
  }

  // 2. Fallback: Auto-detect setting from campaign text
  const { key, settingTitle } = detectCampaignSetting(context);

  // Retrieve categorized facts from unified lore store
  const matchedFacts = getLoreFactsByCategory(key);

  let combined: string[] = [];

  if (matchedFacts && matchedFacts.length > 0) {
    combined = [
      ...matchedFacts.map(f => f.fact),
      ...dynamicCustomFacts
    ];
  } else {
    combined = [
      ...dynamicCustomFacts,
      ...generalFacts.map(f => f.fact),
      ...FUNNY_SYSTEM_PHRASES
    ];
  }

  // If pool is very small (e.g. custom setting), mix in general TTRPG lore facts and system phrases
  if (combined.length < 15) {
    combined = [
      ...combined,
      ...generalFacts.map(f => f.fact),
      ...FUNNY_SYSTEM_PHRASES
    ];
  }

  return {
    key,
    settingName: settingTitle,
    trivia: combined
  };
}

/**
 * Retrieves the next non-repeating trivia string for a setting.
 * Uses persistent session tracking so facts NEVER repeat until the full pool has been exhausted!
 */
export function getNextNonRepeatingTrivia(context?: LoadingContext): { text: string; settingName: string; key: string } {
  const { key, settingName, trivia } = getSettingTriviaPool(context);

  if (!trivia || trivia.length === 0) {
    return { text: "Consulting the Storyteller lore archives...", settingName, key };
  }

  if (!seenTriviaBySetting[key]) {
    seenTriviaBySetting[key] = new Set();
  }
  const seenSet = seenTriviaBySetting[key];

  // If queue is empty, refill from unseen
  if (!sessionQueueBySetting[key] || sessionQueueBySetting[key].length === 0) {
    let unseen = trivia.filter(item => !seenSet.has(item));
    // If all facts have been seen, reset so user can cycle fresh!
    if (unseen.length === 0) {
      seenSet.clear();
      unseen = [...trivia];
    }
    sessionQueueBySetting[key] = fisherYatesShuffle(unseen);
  }

  const nextFact = sessionQueueBySetting[key].pop() || trivia[0];
  seenSet.add(nextFact);

  return { text: nextFact, settingName, key };
}

/**
 * Global event dispatcher to manually skip to the next lore fact immediately
 */
export function triggerNextLoreFact() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nyx:next-lore-fact"));
  }
}

/**
 * Custom React hook that rotates through setting-appropriate lore facts and trivia dynamically.
 * Features:
 * 1. Zero annoying repetition via persistent session queue.
 * 2. Massive encyclopedic database across 17 universes.
 * 3. Instant manual skip capability via triggerNextLoreFact().
 */
export function useFunnyLoading(
  isActive: boolean,
  defaultText: string,
  intervalMs = 8500,
  context?: LoadingContext
): string {
  const [currentText, setCurrentText] = useState(defaultText);
  const contextRef = useRef(context);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (!isActive) {
      setCurrentText(defaultText);
      return;
    }

    // Pick first non-repeating fact
    const initial = getNextNonRepeatingTrivia(contextRef.current);
    setCurrentText(initial.text || defaultText);

    // Timed rotation
    const interval = setInterval(() => {
      const next = getNextNonRepeatingTrivia(contextRef.current);
      setCurrentText(next.text || defaultText);
    }, intervalMs);

    // Manual cycle listener
    const handleManualSkip = () => {
      const next = getNextNonRepeatingTrivia(contextRef.current);
      setCurrentText(next.text || defaultText);
    };

    window.addEventListener("nyx:next-lore-fact", handleManualSkip);

    return () => {
      clearInterval(interval);
      window.removeEventListener("nyx:next-lore-fact", handleManualSkip);
    };
  }, [
    isActive,
    defaultText,
    intervalMs,
    context?.setting,
    context?.activeSetting,
    context?.project?.id,
    context?.project?.setting,
    context?.project?.name,
    context?.project?.activeFactIndexes?.join(",")
  ]);

  return currentText;
}

// Backward-compatible individual trivia exports
export const CYBERPUNK_TRIVIA = getLoreFactsByCategory("cyberpunk").map(f => f.fact);
export const FORGOTTEN_REALMS_TRIVIA = getLoreFactsByCategory("forgottenrealms").map(f => f.fact);
export const TEEN_TITANS_TRIVIA = getLoreFactsByCategory("teentitans").map(f => f.fact);
export const STAR_WARS_TRIVIA = getLoreFactsByCategory("starwars").map(f => f.fact);
export const MARVEL_TRIVIA = getLoreFactsByCategory("marvel").map(f => f.fact);
export const CALL_OF_CTHULHU_TRIVIA = getLoreFactsByCategory("cthulhu").map(f => f.fact);
export const LORD_OF_THE_RINGS_TRIVIA = getLoreFactsByCategory("lotr").map(f => f.fact);
export const DUNE_TRIVIA = getLoreFactsByCategory("dune").map(f => f.fact);
export const VAMPIRE_TRIVIA = getLoreFactsByCategory("vampire").map(f => f.fact);
export const WARHAMMER_TRIVIA = getLoreFactsByCategory("warhammer").map(f => f.fact);
export const FALLOUT_TRIVIA = getLoreFactsByCategory("fallout").map(f => f.fact);
export const STAR_TREK_TRIVIA = getLoreFactsByCategory("startrek").map(f => f.fact);
export const GENERAL_TTRPG_TRIVIA = getLoreFactsByCategory("ttrpg").map(f => f.fact);
