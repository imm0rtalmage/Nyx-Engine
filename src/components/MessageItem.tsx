import React, { memo } from "react";
import { motion } from "motion/react";
import {
  Brain,
  Users,
  Edit3,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import ChatMessageMarkdown from "./ChatMessageMarkdown";
import { Message, CharacterProfile } from "../types";

export interface MessageItemProps {
  msg: Message;
  idx: number;
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
  onUpdateMessageSpeakers: (msgId: string, speakerIds: string[]) => void;
  showSpeakerPicker: boolean;
  onToggleSpeakerPicker: (msgId: string | null) => void;
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
  onUpdateMessageSpeakers,
  showSpeakerPicker,
  onToggleSpeakerPicker,
  themeId,
  activeBubbleStyleClass,
  activeThemeUserBubbleClass,
  activeThemeNyxBubbleClass,
  activeThemeBorderColor,
  activeThemeAccentText,
  currentFontSizeClass,
  userNickname,
  characters,
  thinkingLevel,
  renderPortrait,
}: MessageItemProps) {
  // Fetch speakers for this message
  const msgSpeakers = characters.filter((c) =>
    (msg.speakerIds || []).includes(c.id)
  );

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
              onToggleSpeakerPicker(showSpeakerPicker ? null : msg.id);
            }}
            className="text-slate-400 hover:text-purple-400 p-0.5 transition-colors cursor-pointer"
            title="Assign/Change characters speaking"
          >
            <Users size={12} />
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
            {/* Name Header with game-like layout line */}
            <div className="flex items-center gap-2 mb-2 border-b border-slate-800/40 pb-1.5">
              <span
                className={`text-[11px] font-extrabold tracking-widest uppercase font-mono ${activeHeadingText}`}
              >
                {msgSpeakers.length > 0
                  ? msgSpeakers.map((c) => c.name).join(" | ")
                  : isUser
                  ? userNickname
                  : "STORYTELLER / COMPANION"}
              </span>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-purple-500/10 via-purple-500/30 to-transparent" />
              <span className="text-[9px] text-slate-500 font-mono">
                {formatMsgTimestamp(msg.timestamp)}
              </span>
            </div>

            {/* Content Text body */}
            {isEditing ? (
              <div
                className="flex flex-col gap-2 w-full mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <textarea
                  value={editText}
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
                  rows={Math.max(3, Math.min(30, editText.split("\n").length + 1))}
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
          </div>

          {/* Metadata tokens and Version/Regeneration Controls block at the bottom */}
          {msg.role === "nyx" && (
            <div
              className="mt-3 text-[9px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-900/60 pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Token metadata left aligned */}
              <div className="flex items-center gap-1">
                <Brain size={10} className="text-purple-400 shrink-0" />
                <span>
                  Analysis calibration:{" "}
                  <strong className="text-purple-400/80">
                    {msg.tokensUsed || 2400} tokens
                  </strong>{" "}
                  processed
                </span>
              </div>

              {/* Version Switcher and Regeneration Control right aligned */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800/80 shrink-0">
                {msg.versions && msg.versions.length > 1 && (
                  <div className="flex items-center gap-1.5 border-r border-slate-800/60 pr-1.5">
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
                      className="text-slate-400 hover:text-purple-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Previous version"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <span className="text-[9px] text-slate-300 font-semibold select-none">
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
                      className="text-slate-400 hover:text-purple-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Next version"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                )}

                {/* Inline Regenerate Button */}
                <button
                  type="button"
                  onClick={() => {
                    onRegenerateResponse(thinkingLevel, msg.id);
                  }}
                  className="text-slate-400 hover:text-purple-400 hover:bg-slate-900 px-1.5 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer"
                  title="Regenerate another alternative at this point"
                >
                  <RefreshCw size={9} className="animate-none" />
                  <span>Regen</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Speaker Picker Dropdown Popover */}
        {showSpeakerPicker && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute z-50 mt-2 right-4 top-10 bg-slate-900 border border-slate-850 rounded-xl p-3 w-52 shadow-2xl space-y-2 text-xs text-slate-100"
          >
            <div className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex justify-between items-center">
              <span>Dialogue Cast</span>
              <button
                onClick={() => onToggleSpeakerPicker(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={10} />
              </button>
            </div>
            {characters.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">
                No registered characters. Register them in Sidebar!
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 font-sans">
                {characters.map((char) => {
                  const isSelected = (msg.speakerIds || []).includes(char.id);
                  return (
                    <button
                      key={char.id}
                      onClick={() => {
                        const current = msg.speakerIds || [];
                        const updated = isSelected
                          ? current.filter((id) => id !== char.id)
                          : [...current, char.id];
                        onUpdateMessageSpeakers(msg.id, updated);
                      }}
                      className="w-full flex items-center justify-between text-left p-1.5 rounded hover:bg-slate-850 transition-all text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="scale-75 origin-left shrink-0">
                          {renderPortrait(char.portraitUrl, char.name, "w-8 h-8")}
                        </span>
                        <span className="truncate text-slate-200">
                          {char.name}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? "bg-purple-600 border-purple-500 text-white"
                            : "border-slate-700"
                        }`}
                      >
                        {isSelected && <Check size={10} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default MessageItem;
