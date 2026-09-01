import React from "react";
import { LoreSource } from "../types";

export type SourceProcessingState = "untouched" | "working" | "done_attached";

export function getSourceProcessingState(source: LoreSource): SourceProcessingState {
  if (source.isIngesting) {
    return "working";
  }
  // If active and has content/summary or is a dynamic GDoc
  if (source.isActive !== false && (source.content?.trim() || source.summary?.trim() || source.type === "gdoc")) {
    return "done_attached";
  }
  return "untouched";
}

interface LoreSourceStatusBadgeProps {
  source: LoreSource;
  size?: "sm" | "md";
  onToggleActive?: () => void;
  showText?: boolean;
  className?: string;
}

export const LoreSourceStatusBadge: React.FC<LoreSourceStatusBadgeProps> = ({
  source,
  size = "md",
  onToggleActive,
  showText = true,
  className = "",
}) => {
  const state = getSourceProcessingState(source);

  let lightDot = "";
  let badgeStyle = "";
  let label = "";

  if (state === "working") {
    lightDot = "bg-amber-400";
    badgeStyle = "bg-amber-950/80 border-amber-500/50 text-amber-300";
    label = "Working";
  } else if (state === "done_attached") {
    lightDot = "bg-emerald-400";
    badgeStyle = "bg-emerald-950/80 border-emerald-500/50 text-emerald-300";
    label = "Done & Attached";
  } else {
    lightDot = "bg-red-500";
    badgeStyle = "bg-red-950/80 border-red-500/50 text-red-300 hover:bg-red-900/60";
    label = "Untouched";
  }

  const isInteractive = Boolean(onToggleActive && state !== "working");

  return (
    <button
      type="button"
      onClick={isInteractive ? (e) => { e.stopPropagation(); onToggleActive?.(); } : undefined}
      disabled={!isInteractive}
      className={`inline-flex items-center gap-1.5 font-mono font-bold uppercase rounded-md border transition-all ${badgeStyle} ${
        size === "sm" ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-0.5 text-[9px]"
      } ${isInteractive ? "cursor-pointer hover:scale-105 select-none" : "cursor-default"} ${className}`}
      title={
        state === "working"
          ? "Document is actively processing / ingesting..."
          : state === "done_attached"
          ? "Document is processed & attached to active grounding. Click to unattach."
          : "Document is untouched / unattached. Click to attach to active grounding."
      }
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {state === "working" && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${lightDot} ${state === "done_attached" ? "animate-pulse" : ""}`}></span>
      </span>
      {showText && <span>{label}</span>}
    </button>
  );
};
