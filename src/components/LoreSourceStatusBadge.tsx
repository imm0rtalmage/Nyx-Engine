import React from "react";
import { LoreSource } from "../types";

export type SourceProcessingState = "syncing" | "active" | "empty";

export function getSourceProcessingState(source: LoreSource): SourceProcessingState {
  if (source.isIngesting) {
    return "syncing";
  }
  if (source.content?.trim() || source.summary?.trim() || source.type === "gdoc") {
    return "active";
  }
  return "empty";
}

interface LoreSourceStatusBadgeProps {
  source: LoreSource;
  size?: "sm" | "md";
  showText?: boolean;
  className?: string;
}

export const LoreSourceStatusBadge: React.FC<LoreSourceStatusBadgeProps> = ({
  source,
  size = "md",
  showText = true,
  className = "",
}) => {
  const state = getSourceProcessingState(source);

  let lightDot = "";
  let badgeStyle = "";
  let label = "";

  if (state === "syncing") {
    lightDot = "bg-amber-400";
    badgeStyle = "bg-amber-950/80 border-amber-500/50 text-amber-300";
    label = "Syncing...";
  } else if (state === "active") {
    lightDot = "bg-emerald-400";
    badgeStyle = "bg-emerald-950/80 border-emerald-500/50 text-emerald-300";
    label = "Grounded & Active";
  } else {
    lightDot = "bg-slate-500";
    badgeStyle = "bg-slate-900/80 border-slate-700/50 text-slate-400";
    label = "Empty";
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-mono font-bold uppercase rounded-md border transition-all select-none ${badgeStyle} ${
        size === "sm" ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-0.5 text-[9px]"
      } ${className}`}
      title={
        state === "syncing"
          ? "Document is actively ingesting and indexing..."
          : state === "active"
          ? "Grounded and fully active in the campaign lore database."
          : "Source document has no text content."
      }
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {state === "syncing" && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${lightDot} ${state === "active" ? "animate-pulse" : ""}`}></span>
      </span>
      {showText && <span>{label}</span>}
    </div>
  );
};
