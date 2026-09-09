import { Message, TokenBreakdown, CharacterProfile } from "../types";

/**
 * Robustly resolves the 4-part token breakdown for any chat turn:
 * - Input tokens: base prompt, conversation history, instructions
 * - Retrieval tokens: in-context lorebook entities, semantic RAG sources, persistent memory
 * - Thinking tokens: internal model chain-of-thought and reasoning budget
 * - Output tokens: generated narrative scene prose, NPC dialogue, reactions
 */
export function resolveTokenBreakdown(
  msg: Message,
  characters: CharacterProfile[] = []
): TokenBreakdown {
  // If the message already has a fully formed tokenBreakdown recorded from server
  if (msg.tokenBreakdown && typeof msg.tokenBreakdown.totalTokens === "number" && msg.tokenBreakdown.totalTokens > 0) {
    return msg.tokenBreakdown;
  }

  // Handle User message turns
  if (msg.role === "user") {
    const textLength = (msg.content || "").length;
    const attachmentPenalty = (msg.attachments && msg.attachments.length > 0) ? msg.attachments.length * 260 : 0;
    const estimatedInput = Math.max(1, Math.round(textLength / 3.8) + attachmentPenalty);
    const total = msg.tokensUsed && msg.tokensUsed > 0 ? msg.tokensUsed : estimatedInput;
    return {
      inputTokens: total,
      retrievalTokens: 0,
      thinkingTokens: 0,
      outputTokens: 0,
      totalTokens: total,
    };
  }

  // Handle Assistant / Nyx narrator turns (including legacy or imported messages)
  const total = msg.tokensUsed && msg.tokensUsed > 0 ? msg.tokensUsed : 2200;

  // 1. Thinking tokens from Chain-of-Thought
  let thinking = 0;
  if (msg.chainOfThought && msg.chainOfThought.trim()) {
    thinking = Math.max(1, Math.round(msg.chainOfThought.trim().length / 3.8));
  }

  // 2. Output tokens from narrative text
  const rawOutput = Math.max(1, Math.round((msg.content || "").trim().length / 3.8));
  let output = rawOutput;

  // 3. Retrieval tokens from active in-context lore entities snapshot
  let retrieval = 0;
  const contextCount = Array.isArray(msg.contextEntities) ? msg.contextEntities.length : 0;
  if (contextCount > 0) {
    retrieval = Math.min(Math.round(total * 0.35), Math.max(120, contextCount * 140));
  } else if (characters && characters.length > 0) {
    retrieval = Math.min(Math.round(total * 0.2), Math.max(80, Math.min(characters.length, 3) * 110));
  }

  // Ensure output + thinking do not exceed total
  if (output + thinking >= total) {
    const remainingForInput = Math.max(50, Math.round(total * 0.15));
    const availableForGen = total - remainingForInput;
    const genSum = output + thinking;
    output = Math.max(10, Math.round((output / genSum) * availableForGen));
    thinking = Math.max(0, availableForGen - output);
  }

  // 4. Input tokens is the remainder (base prompt, system directives, history)
  let input = total - output - thinking - retrieval;
  if (input < 50) {
    // Rebalance proportionally
    input = Math.max(50, Math.round(total * 0.25));
    const remaining = total - input - output - thinking;
    retrieval = Math.max(0, remaining);
  }

  return {
    inputTokens: input,
    retrievalTokens: retrieval,
    thinkingTokens: thinking,
    outputTokens: output,
    totalTokens: total,
  };
}

/**
 * Formats a token number with comma separators, e.g. 1,420
 */
export function formatTokens(tokens?: number): string {
  if (tokens === undefined || tokens === null || isNaN(tokens)) {
    return "0";
  }
  return Math.round(tokens).toLocaleString();
}

/**
 * Formats a token number compactly, e.g. 1.4k or 850
 */
export function formatTokensCompact(tokens?: number): string {
  if (!tokens || isNaN(tokens)) return "0";
  if (tokens >= 10000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return formatTokens(tokens);
}

/**
 * Calculates percentage distribution for the 4 token categories
 */
export function calculateTokenPercentages(breakdown: TokenBreakdown) {
  const total = Math.max(1, breakdown.totalTokens);
  const inputPct = Number(((breakdown.inputTokens / total) * 100).toFixed(1));
  const retrievalPct = Number(((breakdown.retrievalTokens / total) * 100).toFixed(1));
  const thinkingPct = Number(((breakdown.thinkingTokens / total) * 100).toFixed(1));
  const outputPct = Number(((breakdown.outputTokens / total) * 100).toFixed(1));

  return {
    inputPct,
    retrievalPct,
    thinkingPct,
    outputPct,
  };
}
