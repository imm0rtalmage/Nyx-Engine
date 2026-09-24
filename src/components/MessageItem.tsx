import React, { memo, useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Brain,
  Edit3,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Coins,
  Sparkles,
} from "lucide-react";
import ChatMessageMarkdown from "./ChatMessageMarkdown";
import { Message, CharacterProfile } from "../types";
import { parseContextEntityEntry, getTurnContextSnapshot } from "../lib/nyxLoreEngine";
import { resolveTokenBreakdown, formatTokens } from "../utils/tokenCounter";

export interface MessageItemProps {
  msg: Message;
  idx: number;
  allMessages?: Message[];
  isUser: boolean;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onSaveEdit: (msgId: string) => void;
  onCancelEdit: () => void;
  onStartEdit: (msgId: string, content: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onMessageClick: (msg: Message) => void;
  onStoreFact: (msgContent: string) => void;
  onRegenerateResponse: (thinkingLevel: string, msgId?: string) => void;
  onSelectMessageVersion?: (msgId: string, versionIndex: number) => void;
  onOpenTokenBreakdown?: (msg: Message, turnIndex: number) => void;
  themeId?: string;
  activeBubbleStyleClass: string;
  activeThemeUserBubbleClass: string;
  activeThemeNyxBubbleClass: string;
  activeThemeBorderColor: string;
  activeThemeAccentText: string;
  currentFontSizeClass: string;
  userNickname: string;
  characters: CharacterProfile[];
  portraitPosition?: string;
  thinkingLevel: string;
  renderPortrait: (url?: string, name?: string, sizeClass?: string, char?: CharacterProfile) => React.ReactNode;
  turnHeader?: string;
}

const formatMsgTimestamp = (ts?: string) => {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) {
      return ts;
    }
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts || "";
  }
};

const resolveTurnHeader = (
  template: string | undefined,
  idx: number,
  isUser: boolean,
  userNickname: string,
  speakers: CharacterProfile[],
  timestamp?: string
): string => {
  if (!template || !template.trim()) {
    return "";
  }

  let formatted = template.trim();
  const speakerNames = speakers.length > 0
    ? speakers.map((s) => s.name).join(", ")
    : (isUser ? (userNickname || "Sir") : "Nyx");

  const turnNum = String(idx + 1);
  const padTurnNum = String(idx + 1).padStart(2, "0");

  formatted = formatted
    .replace(/\{turn\}/gi, turnNum)
    .replace(/\{turn2\}/gi, padTurnNum)
    .replace(/\{index\}/gi, turnNum)
    .replace(/\{speaker\}/gi, speakerNames)
    .replace(/\{speakers\}/gi, speakerNames)
    .replace(/\{cast\}/gi, speakerNames)
    .replace(/\{user\}/gi, userNickname || "Sir")
    .replace(/\{author\}/gi, userNickname || "Sir")
    .replace(/\{time\}/gi, formatMsgTimestamp(timestamp));

  return formatted;
};

export const MessageItem = memo(function MessageItem({
  msg,
  idx,
  isUser,
  isEditing,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDeleteMessage,
  onMessageClick,
  onStoreFact,
  onRegenerateResponse,
  onSelectMessageVersion,
  onOpenTokenBreakdown,
  themeId,
  activeBubbleStyleClass,
  activeThemeUserBubbleClass,
  activeThemeNyxBubbleClass,
  activeThemeBorderColor,
  activeThemeAccentText,
  currentFontSizeClass,
  userNickname,
  characters,
  allMessages,
  thinkingLevel,
  renderPortrait,
  turnHeader,
}: MessageItemProps) {
  // Resolve active message version if multi-version exists
  const currentMsgForTurn = useMemo(() => {
    if (!msg) {
      return { id: `msg-${idx}`, role: isUser ? "user" : "nyx", content: "", timestamp: new Date().toISOString() } as Message;
    }
    if (msg.versions && typeof msg.activeVersionIndex === "number" && msg.versions[msg.activeVersionIndex]) {
      const activeVer = msg.versions[msg.activeVersionIndex];
      return {
        ...msg,
        content: typeof activeVer.content === "string" ? activeVer.content : (msg.content || ""),
        chainOfThought: activeVer.chainOfThought || msg.chainOfThought,
        tokensUsed: activeVer.tokensUsed || msg.tokensUsed,
        tokenBreakdown: activeVer.tokenBreakdown || msg.tokenBreakdown,
        contextEntities: activeVer.contextEntities || msg.contextEntities,
        speakerIds: activeVer.speakerIds || msg.speakerIds,
      };
    }
    return msg;
  }, [msg, idx, isUser]);

  // Compute exact 4-part token breakdown for this turn
  const tokenBreakdown = useMemo(() => {
    return resolveTokenBreakdown(currentMsgForTurn, characters);
  }, [currentMsgForTurn, characters]);

  // Fetch speakers for this message
  const msgSpeakers = (characters || []).filter((c) =>
    c && (currentMsgForTurn.speakerIds || []).includes(c.id)
  );

  const resolvedTurnHeader = useMemo(() => {
    const template = currentMsgForTurn.turnHeader || turnHeader;
    return resolveTurnHeader(template, idx, isUser, userNickname, msgSpeakers, currentMsgForTurn.timestamp);
  }, [currentMsgForTurn.turnHeader, turnHeader, idx, isUser, userNickname, msgSpeakers, currentMsgForTurn.timestamp]);

  // Derive turn-specific in-context lore log snapshot
  const rawContextList = useMemo(() => {
    if (!msg || msg.role !== "nyx") return [];
    return getTurnContextSnapshot(msg, allMessages || [], characters || [], idx);
  }, [msg, allMessages, characters, idx]);

  const parsedContextBadges = useMemo(() => {
    return (rawContextList || []).map((entry) => parseContextEntityEntry(entry, characters || []));
  }, [rawContextList, characters]);

  const isTimelineAnomaly = useMemo(() => {
    const text = typeof msg?.content === "string" ? msg.content : "";
    return (
      !isUser &&
      (Boolean(msg?.isTimelineAnomaly) ||
        text.includes("brief disturbance in the timeline") ||
        text.includes("unexpected anomaly rippled") ||
        text.includes("momentary spike in traffic") ||
        text.includes("per-minute traffic limit"))
    );
  }, [isUser, msg?.content, msg?.isTimelineAnomaly]);

  // Live rate-limit cooldown countdown timer
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(() => {
    if (!isTimelineAnomaly) return 0;
    const initialSecs = msg?.retrySeconds || 20;
    const elapsedSecs = Math.max(0, Math.floor((Date.now() - new Date(msg.timestamp).getTime()) / 1000));
    return Math.max(0, initialSecs - elapsedSecs);
  });

  useEffect(() => {
    if (!isTimelineAnomaly) return;
    const initialSecs = msg?.retrySeconds || 20;
    const elapsedSecs = Math.max(0, Math.floor((Date.now() - new Date(msg.timestamp).getTime()) / 1000));
    const remaining = Math.max(0, initialSecs - elapsedSecs);
    setCooldownRemaining(remaining);

    if (remaining <= 0) return;

    const interval = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimelineAnomaly, msg?.retrySeconds, msg?.timestamp]);

  // High Fidelity border decorations matching selected theme
  let activeBoxBorder = activeThemeBorderColor;
  let activeHeadingText = activeThemeAccentText;

  if (themeId === "cyberpunk") {
    activeBoxBorder = "border-cyan-500/20 shadow-lg shadow-cyan-950/10";
    activeHeadingText = "text-cyan-400";
  } else if (themeId === "emerald") {
    activeBoxBorder = "border-emerald-500/25 shadow-lg shadow-emerald-950/10";
    activeHeadingText = "text-emerald-400";
  } else if (themeId === "crimson") {
    activeBoxBorder = "border-red-500/25 shadow-lg shadow-red-950/10";
    activeHeadingText = "text-red-400";
  } else if (themeId === "twilight") {
    activeBoxBorder = "border-amber-500/25 shadow-lg shadow-amber-950/10";
    activeHeadingText = "text-amber-400";
  }

  return (
    <motion.div
      key={msg.id || `msg-${idx}`}
      layout="position"
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.985 }}
      transition={{
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1],
        layout: { duration: 0.2, ease: "easeOut" },
      }}
      onClick={() => onMessageClick(msg)}
      className="flex w-full group cursor-pointer relative justify-center"
    >
      {/* Visual Game Dialog Box Panel */}
      <div
        className={`w-full border p-5 rounded-2xl flex flex-col gap-5 transition-all duration-300 relative ${
          isUser
            ? `${activeThemeUserBubbleClass} ${activeBubbleStyleClass} ${activeBoxBorder}`
            : `${activeThemeNyxBubbleClass} ${activeBubbleStyleClass} ${activeBoxBorder}`
        }`}
      >
        {/* Floating Action corner menu */}
        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 bg-slate-950/90 px-2 py-1 rounded-lg backdrop-blur border border-slate-800 z-30">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRegenerateResponse(thinkingLevel, msg.id);
            }}
            className="text-slate-400 hover:text-amber-400 p-0.5 transition-colors cursor-pointer"
            title="Regenerate this storyteller turn"
          >
            <RefreshCw size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStoreFact(msg.content);
            }}
            className="text-slate-400 hover:text-emerald-400 p-0.5 transition-colors cursor-pointer"
            title="Distill & store this scene's facts into Persistent Context memory"
          >
            <Brain size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit(msg.id, msg.content);
            }}
            className="text-slate-400 hover:text-white p-0.5 transition-colors cursor-pointer"
            title="Edit text"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteMessage(msg.id);
            }}
            className="text-slate-400 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
            title="Delete log"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Dialogue & Narrative Content Side */}
        <div className="flex-1 flex flex-col text-left justify-between min-w-0">
          <div>
            {/* Ambient Literary Scene Rule & Turn Header */}
            <div className="flex items-center justify-between gap-2 mb-2.5 select-none opacity-90">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={`text-[10px] select-none shrink-0 ${activeHeadingText}`}
                  aria-hidden="true"
                >
                  ◆
                </span>
                <span
                  className={`text-[11px] font-semibold tracking-wide truncate ${resolvedTurnHeader ? "font-serif" : "font-mono"} ${activeHeadingText}`}
                  title={resolvedTurnHeader || `Turn ${idx + 1}`}
                >
                  {resolvedTurnHeader || `Turn ${idx + 1}`}
                </span>
                <div className="flex-1 h-[1px] min-w-[20px] bg-gradient-to-r from-purple-500/25 via-slate-800/60 to-transparent" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Clickable Token Counter on the Turn UI */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTokenBreakdown?.(currentMsgForTurn, idx);
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/90 hover:bg-purple-950/80 border border-slate-750 hover:border-purple-500/60 text-[10px] font-mono text-slate-300 hover:text-purple-200 transition-all cursor-pointer shadow-xs group/tok hover:scale-105 active:scale-95"
                  title="Click token count to open Input, Retrieval, Thinking & Output breakdown"
                >
                  <Coins size={11} className="text-amber-400 group-hover/tok:text-purple-400 transition-colors shrink-0" />
                  <span className="font-bold text-slate-100 group-hover/tok:text-purple-100 tabular-nums">
                    {formatTokens(tokenBreakdown?.totalTokens)}
                  </span>
                  <span className="text-[8.5px] text-slate-400 group-hover/tok:text-purple-300 uppercase tracking-tight">
                    tok
                  </span>
                </button>

                {msgSpeakers.length > 0 && (
                  <span className="text-[9px] text-purple-300/90 font-mono bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                    {msgSpeakers.map(s => s?.name || "Speaker").join(", ")}
                  </span>
                )}
                <span className="text-[9px] text-slate-500 font-mono tracking-wider opacity-70">
                  {formatMsgTimestamp(currentMsgForTurn.timestamp || msg.timestamp)}
                </span>
              </div>
            </div>

            {/* Content Text body */}
            {isEditing ? (
              <div
                className="flex flex-col gap-2 w-full mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <textarea
                  value={editText || ""}
                  onChange={(e) => onEditTextChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      onSaveEdit(msg.id);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      onCancelEdit();
                    }
                  }}
                  className={`w-full bg-slate-950/90 border border-purple-500/50 focus:border-purple-400 focus:ring-1 focus:ring-purple-500/30 rounded-xl p-3 ${currentFontSizeClass} font-serif text-slate-100 outline-none resize-y transition-all`}
                  rows={Math.max(3, Math.min(30, (editText || "").split("\n").length + 1))}
                  autoFocus
                  placeholder="Type or edit message text..."
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono px-1 pt-1">
                  <span className="text-slate-500">
                    Press{" "}
                    <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[9px] text-slate-300">
                      Ctrl+Enter
                    </kbd>{" "}
                    to save •{" "}
                    <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[9px] text-slate-300">
                      Esc
                    </kbd>{" "}
                    to cancel
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-sans transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveEdit(msg.id)}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs font-sans transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <Check size={12} /> Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`${currentFontSizeClass} font-serif text-slate-200 transition-all select-text`}
              >
                <ChatMessageMarkdown
                  content={msg.content}
                  isUser={isUser}
                  themeId={themeId}
                  className={currentFontSizeClass}
                />
              </div>
            )}

            {isTimelineAnomaly && (
              <div
                className="mt-3.5 p-3.5 rounded-xl bg-gradient-to-r from-amber-950/60 to-slate-900/70 border border-amber-500/40 backdrop-blur-xs shadow-lg space-y-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-amber-300 text-xs font-semibold">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      {cooldownRemaining > 0 ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </>
                      ) : (
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                      )}
                    </span>
                    <span>
                      {cooldownRemaining > 0
                        ? `API Rate Limit Cooldown (${cooldownRemaining}s remaining)`
                        : "Timeline Connection Cleared"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRegenerateResponse(thinkingLevel, msg.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                      cooldownRemaining > 0
                        ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 hover:scale-102"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 hover:scale-104 shadow-emerald-950/40"
                    }`}
                  >
                    <RefreshCw size={12} className={cooldownRemaining > 0 ? "" : "animate-spin-once"} />
                    <span>{cooldownRemaining > 0 ? "Retry Anyway" : "Retry Turn Now"}</span>
                  </button>
                </div>

                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  <strong>You have not run out of tokens.</strong> Google&apos;s free-tier Gemini API enforces a brief per-minute request rate limit. Once this momentary cooldown clears, responses will resume normally.
                </p>
              </div>
            )}
          </div>

          {/* Turn-specific In-Context Lore Log, Version Controls & Better Regen Button */}
          {msg.role === "nyx" && (
            <div
              className="mt-3.5 text-xs text-slate-400 font-mono flex items-center justify-between gap-3 border-t border-slate-800/80 pt-2.5 flex-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Logged in-context entities snapshot for this specific turn */}
              {parsedContextBadges.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-slate-500 font-bold shrink-0 text-[10px]">In Context:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {parsedContextBadges.map((ent, eIdx) => {
                      let badgeStyle = "bg-slate-800 text-slate-400";
                      if (ent.isPc) {
                        badgeStyle = "bg-purple-950/80 text-purple-300 border border-purple-800/60 font-semibold";
                      } else if (ent.weightPct >= 80) {
                        badgeStyle = "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium";
                      } else if (ent.weightPct >= 50) {
                        badgeStyle = "bg-teal-950/80 text-teal-300 border border-teal-800/60";
                      } else if (ent.weightPct >= 25) {
                        badgeStyle = "bg-amber-950/80 text-amber-300 border border-amber-800/60";
                      } else {
                        badgeStyle = "bg-slate-900 text-slate-500 border border-slate-800";
                      }

                      return (
                        <span key={eIdx} className="inline-flex items-center gap-1 text-slate-300 text-[10px]">
                          <span className="text-slate-200">{ent.name}</span>
                          <span className={`text-[8px] px-1 py-0.2 rounded font-mono ${badgeStyle}`}>
                            {ent.badge}
                          </span>
                          {eIdx < parsedContextBadges.length - 1 && (
                            <span className="text-slate-600">·</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 shrink-0" />
                  <span>Storyteller Turn</span>
                </div>
              )}

              {/* Version Controls and Dedicated Better Regen Button on Turn Frame */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {msg.versions && msg.versions.length > 1 && (
                  <div className="flex items-center gap-1 bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const vIdx =
                          msg.activeVersionIndex !== undefined
                            ? msg.activeVersionIndex
                            : 0;
                        if (vIdx > 0) {
                          onSelectMessageVersion?.(msg.id, vIdx - 1);
                        }
                      }}
                      disabled={
                        msg.activeVersionIndex === 0 ||
                        msg.activeVersionIndex === undefined
                      }
                      className="text-slate-400 hover:text-purple-300 p-0.5 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Previous version"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="text-[10px] text-amber-300 font-bold select-none px-1">
                      {(msg.activeVersionIndex !== undefined
                        ? msg.activeVersionIndex
                        : 0) + 1}{" "}
                      / {msg.versions.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const vIdx =
                          msg.activeVersionIndex !== undefined
                            ? msg.activeVersionIndex
                            : 0;
                        if (msg.versions && vIdx < msg.versions.length - 1) {
                          onSelectMessageVersion?.(msg.id, vIdx + 1);
                        }
                      }}
                      disabled={
                        msg.versions &&
                        msg.activeVersionIndex === msg.versions.length - 1
                      }
                      className="text-slate-400 hover:text-purple-300 p-0.5 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Next version"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}

                {/* Better Regen Button on the actual Turn Frame */}
                <button
                  type="button"
                  onClick={() => onRegenerateResponse(thinkingLevel, msg.id)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 hover:text-amber-100 border border-amber-500/40 hover:border-amber-400/80 shadow-sm shadow-amber-950/30 transition-all hover:scale-102 active:scale-98 cursor-pointer"
                  title="Regenerate this storyteller turn"
                >
                  <RefreshCw size={13} className="text-amber-400 group-hover:rotate-180 transition-transform duration-500" />
                  <span>{msg.versions && msg.versions.length > 1 ? "New Version" : "Regen Turn"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default MessageItem;
