// Nyx Engine v2.0 - Universal Isomorphic Mathematical Lore & Epistemic Engine
// Continuous Exponential Recency Metric: W(d, f) = min(1.0, e^(-λ * d) + α * ln(1 + f))

import { CharacterProfile, Message } from "../types";

export interface GranularLoreEntity {
  entity: CharacterProfile;
  weight: number;
  weightPercent: number;
  turnDistance: number;
  mentionCount: number;
  isProtagonist: boolean;
}

export interface LoreContextResult {
  pcEntities: CharacterProfile[];
  granularEntities: GranularLoreEntity[];
  activeLoreEntities: CharacterProfile[];
  allActiveContextLore: CharacterProfile[];
  inSceneEntities: CharacterProfile[];
  remainingBackgroundLore: CharacterProfile[];
  estimatedTokens: {
    tier1Protagonist: number;
    tier2DynamicContext: number;
    tier4BackgroundIndex: number;
    slidingHistory: number;
    total: number;
  };
}

/**
 * Computes exact granular recency weights and memory allocation partitions.
 * Used by server prompt builder, client HUD, and real-time footer badges.
 */
export function computeGranularLoreContext(
  characters: CharacterProfile[] = [],
  messages: Message[] = [],
  slidingTurnsLimit: number = 12
): LoreContextResult {
  const safeChars = Array.isArray(characters) ? characters.filter(Boolean) : [];
  const safeMessages = Array.isArray(messages) ? messages.filter(Boolean) : [];

  const pcEntities = safeChars.filter((c) => c && (c.isPlayerCharacter || c.type === "pc"));
  const nonPcEntities = safeChars.filter((c) => c && (!c.isPlayerCharacter && c.type !== "pc"));

  // Analyze up to 6 turns of recent sliding history for recency distance calculation
  const historyWindow = safeMessages.slice(-6);
  const turnTexts = historyWindow.slice().reverse().map((m) => ((m && typeof m.content === "string") ? m.content : "").toLowerCase());

  const granularEntities: GranularLoreEntity[] = [];

  nonPcEntities.forEach((ent) => {
    if (!ent || !ent.name || typeof ent.name !== "string") return;
    const nameLower = ent.name.toLowerCase().trim();
    const factionLower = (typeof ent.factionName === "string" ? ent.factionName : "").toLowerCase().trim();
    const customKeys = Array.isArray(ent.activationKeys)
      ? ent.activationKeys
      : (Array.isArray(ent.keywords) ? ent.keywords : []);

    let minDistance = -1;
    let mentionCount = 0;

    for (let d = 0; d < turnTexts.length; d++) {
      const text = turnTexts[d];
      if (!text) continue;

      const isNameMatch =
        nameLower.length > 2 &&
        (text.includes(nameLower) ||
          nameLower.split(/\s+/).some((part) => part.length >= 4 && text.includes(part)));
      const isFactionMatch = factionLower.length > 3 && text.includes(factionLower);
      const isKeyMatch = customKeys.some(
        (k) => k && typeof k === "string" && k.trim().length > 2 && text.includes(k.trim().toLowerCase())
      );

      if (isNameMatch || isFactionMatch || isKeyMatch) {
        if (minDistance === -1) {
          minDistance = d;
        }
        mentionCount++;
      }
    }

    if (minDistance !== -1) {
      // Continuous Exponential Recency Function: W(d, f) = min(1.0, e^(-0.28 * d) + 0.05 * ln(1 + f))
      const LAMBDA = 0.28;
      const ALPHA = 0.05;
      const decayBase = Math.exp(-LAMBDA * minDistance);
      const frequencyReinforcement = ALPHA * Math.log(1 + mentionCount);
      const finalWeight = Math.min(1.0, Math.max(0.05, decayBase + frequencyReinforcement));
      const weightPercent = Math.round(finalWeight * 100);

      granularEntities.push({
        entity: ent,
        weight: finalWeight,
        weightPercent,
        turnDistance: minDistance,
        mentionCount,
        isProtagonist: false,
      });
    }
  });

  // Sort strictly by descending mathematical weight
  granularEntities.sort((a, b) => b.weight - a.weight);

  const activeLoreEntities = granularEntities.map((g) => g.entity).filter(Boolean);
  const allActiveContextLore = [...pcEntities, ...activeLoreEntities];
  const inSceneEntities = [
    ...pcEntities,
    ...granularEntities.filter((g) => g && g.weight >= 0.55 && g.entity).map((g) => g.entity),
  ];
  const remainingBackgroundLore = nonPcEntities.filter(
    (c) => c && !activeLoreEntities.some((t) => t && t.id === c.id)
  );

  // Token Footprint Calculation
  const estTier1 = pcEntities.length * 350;
  const estTier2 = granularEntities.reduce((acc, g) => {
    if (!g) return acc;
    if (g.weight >= 0.75) return acc + 300;
    if (g.weight >= 0.50) return acc + 180;
    if (g.weight >= 0.25) return acc + 90;
    return acc + 40;
  }, 0);
  const estTier4 = remainingBackgroundLore.length * 25;
  const estHistory = safeMessages
    .slice(-slidingTurnsLimit)
    .reduce((acc, m) => acc + Math.round(((m && typeof m.content === "string") ? m.content.length : 0) / 4), 0);

  return {
    pcEntities,
    granularEntities,
    activeLoreEntities,
    allActiveContextLore,
    inSceneEntities,
    remainingBackgroundLore,
    estimatedTokens: {
      tier1Protagonist: estTier1,
      tier2DynamicContext: estTier2,
      tier4BackgroundIndex: estTier4,
      slidingHistory: estHistory,
      total: estTier1 + estTier2 + estTier4 + estHistory,
    },
  };
}

export interface ParsedContextBadge {
  name: string;
  badge: string;
  isPc: boolean;
  weightPct: number;
}

/**
 * Parses context entity string (e.g. "Shima Aliph (PC)", "The Guild (100%)") into a structured badge.
 */
export function parseContextEntityEntry(
  entry: any,
  characters: CharacterProfile[] = []
): ParsedContextBadge {
  if (!entry) {
    return { name: "Entity", badge: "100%", isPc: false, weightPct: 100 };
  }
  const str = typeof entry === "string" 
    ? entry 
    : (entry && typeof entry.name === "string" ? entry.name : String(entry?.name || entry || "Entity"));
  const clean = str.trim();
  const matchPc = clean.match(/^(.*?)\s*\((PC|pc)\)$/);
  if (matchPc) {
    return { name: matchPc[1].trim(), badge: "PC", isPc: true, weightPct: 100 };
  }
  const matchWeight = clean.match(/^(.*?)\s*\((\d+)%\)$/);
  if (matchWeight) {
    const weightPct = parseInt(matchWeight[2], 10);
    return { name: matchWeight[1].trim(), badge: `${weightPct}%`, isPc: false, weightPct: isNaN(weightPct) ? 100 : weightPct };
  }
  // Check if matches known PC in characters
  const char = (characters || []).find(
    (c) => c && typeof c.name === "string" && c.name.toLowerCase() === clean.toLowerCase()
  );
  const isPc = !!(char?.isPlayerCharacter || char?.type === "pc");
  return { name: clean || "Entity", badge: isPc ? "PC" : "100%", isPc, weightPct: 100 };
}

/**
 * Returns the exact context entities snapshot for a given message turn,
 * falling back to calculating it if the message is from legacy history.
 */
export function getTurnContextSnapshot(
  msg: Message,
  allMessages: Message[] = [],
  characters: CharacterProfile[] = [],
  msgIdx: number = -1
): string[] {
  if (!msg) return [];
  if (msg.contextEntities && Array.isArray(msg.contextEntities) && msg.contextEntities.length > 0) {
    return (msg.contextEntities as any[])
      .map((e: any) => (typeof e === "string" ? e : (e && typeof e.name === "string" ? e.name : String(e || ""))))
      .filter(Boolean);
  }
  // If not saved on the message, compute what was in context at this turn
  const safeAll = Array.isArray(allMessages) ? allMessages.filter(Boolean) : [];
  const effectiveIndex = msgIdx >= 0 ? msgIdx : safeAll.findIndex((m) => m && m.id === msg.id);
  const messagesSlice = effectiveIndex >= 0 ? safeAll.slice(0, effectiveIndex + 1) : safeAll;
  const result = computeGranularLoreContext(characters || [], messagesSlice);
  
  return [
    ...(result.pcEntities || []).filter((c) => c && typeof c.name === "string").map((c) => `${c.name} (PC)`),
    ...(result.granularEntities || []).filter((w) => w && w.entity && typeof w.entity.name === "string").map((w) => `${w.entity.name} (${w.weightPercent || 100}%)`),
  ];
}

