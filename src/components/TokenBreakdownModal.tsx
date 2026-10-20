import React, { useState, useMemo } from "react";
import {
  X,
  Coins,
  Brain,
  Database,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
} from "lucide-react";
import { Message, CharacterProfile } from "../types";
import {
  resolveTokenBreakdown,
  formatTokens,
  calculateTokenPercentages,
} from "../utils/tokenCounter";
import { parseContextEntityEntry } from "../lib/nyxLoreEngine";

export interface TokenBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  msg: Message | null;
  turnIndex: number;
  characters?: CharacterProfile[];
  turnHeader?: string;
  allMessages?: Message[];
  onSelectTurn?: (index: number) => void;
}

export const TokenBreakdownModal: React.FC<TokenBreakdownModalProps> = ({
  isOpen,
  onClose,
  msg,
  turnIndex,
  characters = [],
  turnHeader,
  allMessages = [],
  onSelectTurn,
}) => {
  const [showChainOfThought, setShowChainOfThought] = useState(false);
  const [copied, setCopied] = useState(false);

  // Derive breakdown
  const breakdown = useMemo(() => {
    if (!msg) {
      return {
        inputTokens: 0,
        retrievalTokens: 0,
        thinkingTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      };
    }
    return resolveTokenBreakdown(msg, characters);
  }, [msg, characters]);

  const { inputPct, retrievalPct, thinkingPct, outputPct } = useMemo(() => {
    return calculateTokenPercentages(breakdown);
  }, [breakdown]);

  // Derive in-context lore badges
  const contextBadges = useMemo(() => {
    if (!msg || !Array.isArray(msg.contextEntities)) return [];
    return msg.contextEntities.map((entry) => parseContextEntityEntry(entry, characters));
  }, [msg, characters]);

  // Output word / char metrics
  const outputMetrics = useMemo(() => {
    if (!msg?.content) return { words: 0, chars: 0 };
    const chars = msg.content.length;
    const words = msg.content.trim().split(/\s+/).filter(Boolean).length;
    return { words, chars };
  }, [msg?.content]);

  // Chain of thought stats
  const cotMetrics = useMemo(() => {
    if (!msg?.chainOfThought) return { words: 0, chars: 0 };
    const chars = msg.chainOfThought.length;
    const words = msg.chainOfThought.trim().split(/\s+/).filter(Boolean).length;
    return { words, chars };
  }, [msg?.chainOfThought]);

  if (!isOpen || !msg) return null;

  const isUserTurn = msg.role === "user";
  const hasPrevTurn = onSelectTurn && turnIndex > 0;
  const hasNextTurn = onSelectTurn && turnIndex < allMessages.length - 1;

  const handleCopyBreakdown = () => {
    const lines = [
      `=== Token Breakdown: Turn #${turnIndex + 1} (${isUserTurn ? "Player" : "Nyx Narrator"}) ===`,
      `Total Tokens: ${formatTokens(breakdown.totalTokens)}`,
      `- Input Tokens: ${formatTokens(breakdown.inputTokens)} (${inputPct}%)`,
      `- Retrieval Tokens: ${formatTokens(breakdown.retrievalTokens)} (${retrievalPct}%)`,
      `- Thinking Tokens: ${formatTokens(breakdown.thinkingTokens)} (${thinkingPct}%)`,
      `- Output Tokens: ${formatTokens(breakdown.outputTokens)} (${outputPct}%)`,
      msg.contextEntities && msg.contextEntities.length > 0
        ? `Injected Entities: ${msg.contextEntities.join(", ")}`
        : "",
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-950/40 flex flex-col max-h-[92dvh] overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-amber-400 shrink-0">
              <Coins size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-100 font-sans tracking-tight">
                  Turn {turnIndex + 1} Token Audit
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    isUserTurn
                      ? "bg-blue-950/70 text-blue-300 border-blue-800/50"
                      : "bg-purple-950/70 text-purple-300 border-purple-800/50"
                  }`}
                >
                  {isUserTurn ? "Player Dialogue Turn" : "AI Storyteller Turn"}
                </span>
                {msg.versions && msg.versions.length > 1 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Version {(msg.activeVersionIndex || 0) + 1} of {msg.versions.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {msg.turnHeader || turnHeader ? (
                  <span className="font-serif italic text-purple-300/80">
                    "{msg.turnHeader || turnHeader}"
                  </span>
                ) : (
                  "Exact computational token distribution for this narrative turn"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Previous Turn */}
            {hasPrevTurn && (
              <button
                type="button"
                onClick={() => onSelectTurn?.(turnIndex - 1)}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="View previous turn token breakdown"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {/* Next Turn */}
            {hasNextTurn && (
              <button
                type="button"
                onClick={() => onSelectTurn?.(turnIndex + 1)}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="View next turn token breakdown"
              >
                <ChevronRight size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Total Tokens Hero Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                Total Turn Computation
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                  {formatTokens(breakdown.totalTokens)}
                </span>
                <span className="text-sm font-semibold text-purple-400 font-mono">
                  tokens
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isUserTurn
                  ? "User input prompt and parameter context"
                  : `Full model pass: prompt context, retrieved lore, reasoning, and narration`}
              </p>
            </div>

            {/* Quick Copy summary button */}
            <button
              type="button"
              onClick={handleCopyBreakdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-mono font-medium border border-slate-700 transition-all cursor-pointer shrink-0"
              title="Copy token breakdown to clipboard"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} className="text-slate-400" />
                  <span>Copy Stats</span>
                </>
              )}
            </button>
          </div>

          {/* Color-coded distribution progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Token Distribution</span>
              <span className="text-purple-300 font-medium">100% Turn Allocation</span>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-slate-800">
              {breakdown.inputTokens > 0 && (
                <div
                  style={{ width: `${inputPct}%` }}
                  className="bg-violet-500 rounded-sm transition-all duration-300"
                  title={`Input Tokens: ${formatTokens(breakdown.inputTokens)} (${inputPct}%)`}
                />
              )}
              {breakdown.retrievalTokens > 0 && (
                <div
                  style={{ width: `${retrievalPct}%` }}
                  className="bg-emerald-500 rounded-sm transition-all duration-300"
                  title={`Retrieval Tokens: ${formatTokens(breakdown.retrievalTokens)} (${retrievalPct}%)`}
                />
              )}
              {breakdown.thinkingTokens > 0 && (
                <div
                  style={{ width: `${thinkingPct}%` }}
                  className="bg-amber-500 rounded-sm transition-all duration-300"
                  title={`Thinking Tokens: ${formatTokens(breakdown.thinkingTokens)} (${thinkingPct}%)`}
                />
              )}
              {breakdown.outputTokens > 0 && (
                <div
                  style={{ width: `${outputPct}%` }}
                  className="bg-sky-500 rounded-sm transition-all duration-300"
                  title={`Output Tokens: ${formatTokens(breakdown.outputTokens)} (${outputPct}%)`}
                />
              )}
            </div>

            {/* Legend pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
                <span className="text-slate-300">Input ({inputPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-slate-300">Retrieval ({retrievalPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-slate-300">Thinking ({thinkingPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                <span className="text-slate-300">Output ({outputPct}%)</span>
              </div>
            </div>
          </div>

          {/* 4 Category Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Input Tokens */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/30 hover:border-violet-500/50 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-950/70 border border-violet-800/60 text-violet-400">
                      <FileText size={15} />
                    </div>
                    <span className="font-semibold text-sm text-violet-200">Input Tokens</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-violet-300 bg-violet-950/80 px-2 py-0.5 rounded border border-violet-800/50">
                    {inputPct}%
                  </span>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    {formatTokens(breakdown.inputTokens)}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1.5">tokens</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5">
                  System instructions, authorial style guide directives, player constraints, and prior conversation turns fed into the model.
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Base Context & History</span>
                <span className="text-violet-400">Fixed Prompt Memory</span>
              </div>
            </div>

            {/* 2. Retrieval Tokens */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/30 hover:border-emerald-500/50 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-400">
                      <Database size={15} />
                    </div>
                    <span className="font-semibold text-sm text-emerald-200">Retrieval Tokens</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                    {retrievalPct}%
                  </span>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    {formatTokens(breakdown.retrievalTokens)}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1.5">tokens</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5">
                  Active in-context lorebook entities, connected characters, semantic RAG source excerpts, and persistent context summaries.
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/70">
                {contextBadges.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-emerald-400 font-medium">Injected:</span>
                    {contextBadges.slice(0, 4).map((badge, bIdx) => (
                      <span
                        key={bIdx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50"
                      >
                        {badge.name}
                      </span>
                    ))}
                    {contextBadges.length > 4 && (
                      <span className="text-[9px] font-mono text-slate-400">
                        +{contextBadges.length - 4} more
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Dynamic Knowledge Base</span>
                    <span className="text-emerald-400">
                      {breakdown.retrievalTokens > 0 ? "Semantic Lore RAG" : "None injected"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Thinking Tokens */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/30 hover:border-amber-500/50 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-950/70 border border-amber-800/60 text-amber-400">
                      <Brain size={15} />
                    </div>
                    <span className="font-semibold text-sm text-amber-200">Thinking Tokens</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                    {thinkingPct}%
                  </span>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    {formatTokens(breakdown.thinkingTokens)}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1.5">tokens</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5">
                  Internal Chain-of-Thought (CoT) reasoning budget, epistemic provenance audit (NPC cognitive horizons), and scene beat planning.
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/70">
                {msg.chainOfThought ? (
                  <button
                    type="button"
                    onClick={() => setShowChainOfThought((prev) => !prev)}
                    className="w-full flex items-center justify-between text-[10px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer transition-colors"
                  >
                    <span>
                      {showChainOfThought ? "Hide Thought Process" : "Inspect Chain of Thought"} ({cotMetrics.words} words)
                    </span>
                    {showChainOfThought ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                ) : (
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Reasoning Engine</span>
                    <span className="text-amber-400/80">
                      {isUserTurn ? "Not applicable" : "Direct response"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Output Tokens */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-sky-500/30 hover:border-sky-500/50 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-950/70 border border-sky-800/60 text-sky-400">
                      <Sparkles size={15} />
                    </div>
                    <span className="font-semibold text-sm text-sky-200">Output Tokens</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/50">
                    {outputPct}%
                  </span>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    {formatTokens(breakdown.outputTokens)}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1.5">tokens</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5">
                  Generated narrative prose, environmental reactions, NPC dialogue, sensory physics, and out-of-character storyteller notes.
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Story Output Metrics</span>
                <span className="text-sky-400">
                  {outputMetrics.words} words • {outputMetrics.chars} chars
                </span>
              </div>
            </div>
          </div>

          {/* Expandable Chain of Thought Panel */}
          {showChainOfThought && msg.chainOfThought && (
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-mono text-amber-300">
                <div className="flex items-center gap-1.5">
                  <Brain size={13} className="text-amber-400" />
                  <span className="font-bold">Raw Chain-of-Thought (Reasoning Log)</span>
                </div>
                <span className="text-slate-500">
                  {formatTokens(breakdown.thinkingTokens)} tokens ({cotMetrics.words} words)
                </span>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs text-amber-200/90 font-mono whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed select-text">
                {msg.chainOfThought}
              </div>
            </div>
          )}

          {/* Informational Guidance Note */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
            <Info size={15} className="text-purple-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="text-slate-200 font-medium font-mono">Token Optimization Tip:</span>{" "}
              {breakdown.retrievalTokens > breakdown.inputTokens
                ? "Your active campaign lore and document sources make up a large share of this turn. You can fine-tune sliding memory turns or active fact indexes in campaign settings to conserve context."
                : "Your narrative token distribution is well balanced across input prompt memory, lore grounding, and output generation."}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-t border-slate-800 bg-slate-950/80">
          <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
            Gemini Flash Storyteller Engine • 1M Context Window
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-purple-950/50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenBreakdownModal;
