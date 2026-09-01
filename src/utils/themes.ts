export interface ThemePreset {
  id: string;
  name: string;
  bgClass: string;
  chatBgClass: string;
  cardBgClass: string;
  borderColor: string;
  borderHoverColor: string;
  accentText: string;
  accentIcon: string;
  buttonClass: string;
  fontFamilyClass: string;
  headingFontClass: string;
  secondaryText: string;
  userBubbleClass: string;
  nyxBubbleClass: string;
  glowClass: string;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  slate: {
    id: "slate",
    name: "Cosmic Slate",
    bgClass: "bg-slate-950",
    chatBgClass: "bg-slate-950/40",
    cardBgClass: "bg-slate-900",
    borderColor: "border-slate-800",
    borderHoverColor: "hover:border-slate-700",
    accentText: "text-purple-400",
    accentIcon: "text-purple-400",
    buttonClass: "bg-purple-600 hover:bg-purple-700 active:bg-purple-800 shadow-purple-950/30 focus:ring-purple-600",
    fontFamilyClass: "font-sans",
    headingFontClass: "font-serif",
    secondaryText: "text-slate-400",
    userBubbleClass: "bg-slate-900/90 border-slate-800 text-slate-200 hover:border-slate-750",
    nyxBubbleClass: "bg-slate-900/40 border-purple-900/20 text-slate-100 hover:border-purple-800/40",
    glowClass: "shadow-purple-900/10",
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    bgClass: "bg-zinc-950",
    chatBgClass: "bg-zinc-950/20",
    cardBgClass: "bg-zinc-900",
    borderColor: "border-zinc-800",
    borderHoverColor: "hover:border-cyan-500/50",
    accentText: "text-cyan-400",
    accentIcon: "text-fuchsia-400",
    buttonClass: "bg-fuchsia-600 hover:bg-fuchsia-700 active:bg-fuchsia-800 shadow-fuchsia-950/30 focus:ring-cyan-500",
    fontFamilyClass: "font-mono",
    headingFontClass: "font-mono",
    secondaryText: "text-zinc-400",
    userBubbleClass: "bg-zinc-900/90 border-cyan-950/40 text-cyan-200 hover:border-cyan-500/30",
    nyxBubbleClass: "bg-black/60 border-fuchsia-950/40 text-zinc-100 hover:border-fuchsia-500/30",
    glowClass: "shadow-cyan-500/10",
  },
  emerald: {
    id: "emerald",
    name: "Emerald Fantasy",
    bgClass: "bg-stone-950",
    chatBgClass: "bg-stone-950/40",
    cardBgClass: "bg-stone-900",
    borderColor: "border-stone-800",
    borderHoverColor: "hover:border-emerald-600/50",
    accentText: "text-emerald-400",
    accentIcon: "text-amber-400",
    buttonClass: "bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 shadow-emerald-950/30 focus:ring-emerald-600",
    fontFamilyClass: "font-serif",
    headingFontClass: "font-serif",
    secondaryText: "text-stone-400",
    userBubbleClass: "bg-stone-900/90 border-stone-850 text-stone-200 hover:border-emerald-900/40",
    nyxBubbleClass: "bg-emerald-950/10 border-amber-900/20 text-stone-100 hover:border-emerald-800/30",
    glowClass: "shadow-emerald-900/10",
  },
  noir: {
    id: "noir",
    name: "Obsidian Noir",
    bgClass: "bg-neutral-950",
    chatBgClass: "bg-neutral-950/60",
    cardBgClass: "bg-neutral-900",
    borderColor: "border-neutral-800",
    borderHoverColor: "hover:border-neutral-500",
    accentText: "text-neutral-200",
    accentIcon: "text-neutral-100",
    buttonClass: "bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 shadow-neutral-950/40 focus:ring-neutral-400",
    fontFamilyClass: "font-mono",
    headingFontClass: "font-mono",
    secondaryText: "text-neutral-500",
    userBubbleClass: "bg-neutral-900 border-neutral-700 text-neutral-100 hover:border-neutral-500",
    nyxBubbleClass: "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600",
    glowClass: "shadow-neutral-500/5",
  },
  crimson: {
    id: "crimson",
    name: "Blood Pact",
    bgClass: "bg-zinc-950",
    chatBgClass: "bg-zinc-950/40",
    cardBgClass: "bg-zinc-900",
    borderColor: "border-zinc-800",
    borderHoverColor: "hover:border-red-600/50",
    accentText: "text-red-500",
    accentIcon: "text-red-500",
    buttonClass: "bg-red-700 hover:bg-red-600 active:bg-red-800 shadow-red-950/30 focus:ring-red-600",
    fontFamilyClass: "font-sans",
    headingFontClass: "font-serif",
    secondaryText: "text-zinc-400",
    userBubbleClass: "bg-zinc-900 border-red-950 text-zinc-200 hover:border-red-800/30",
    nyxBubbleClass: "bg-red-950/10 border-red-900/20 text-zinc-100 hover:border-red-700/30",
    glowClass: "shadow-red-900/15",
  },
  twilight: {
    id: "twilight",
    name: "Warm Twilight",
    bgClass: "bg-slate-950",
    chatBgClass: "bg-slate-950/30",
    cardBgClass: "bg-slate-900",
    borderColor: "border-slate-800",
    borderHoverColor: "hover:border-amber-600/50",
    accentText: "text-amber-500",
    accentIcon: "text-amber-500",
    buttonClass: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-950/30 focus:ring-amber-500",
    fontFamilyClass: "font-sans",
    headingFontClass: "font-serif",
    secondaryText: "text-slate-400",
    userBubbleClass: "bg-slate-900/90 border-slate-800 text-slate-200 hover:border-amber-900/30",
    nyxBubbleClass: "bg-amber-950/5 border-amber-900/10 text-slate-100 hover:border-amber-800/20",
    glowClass: "shadow-amber-900/10",
  },
};

export interface ChatBgPreset {
  id: string;
  name: string;
  cssStyle: string;
  previewColor: string;
}

export const CHAT_BG_PRESETS: Record<string, ChatBgPreset> = {
  none: {
    id: "none",
    name: "Classic Deep",
    cssStyle: "",
    previewColor: "bg-slate-950",
  },
  stars: {
    id: "stars",
    name: "Nebula Cosmos",
    cssStyle: `radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)`,
    previewColor: "bg-indigo-950",
  },
  grid: {
    id: "grid",
    name: "Neon Grid",
    cssStyle: `linear-gradient(rgba(18, 16, 16, 0.95), rgba(18, 16, 16, 0.95)), linear-gradient(0deg, transparent 24%, rgba(0, 243, 255, 0.03) 25%, rgba(0, 243, 255, 0.03) 26%, transparent 27%, transparent 74%, rgba(0, 243, 255, 0.03) 75%, rgba(0, 243, 255, 0.03) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 243, 255, 0.03) 25%, rgba(0, 243, 255, 0.03) 26%, transparent 27%, transparent 74%, rgba(0, 243, 255, 0.03) 75%, rgba(0, 243, 255, 0.03) 76%, transparent 77%, transparent)`,
    previewColor: "bg-cyan-950",
  },
  stone: {
    id: "stone",
    name: "Castle Keep",
    cssStyle: `linear-gradient(rgba(20, 20, 25, 0.92), rgba(20, 20, 25, 0.92)), radial-gradient(circle, rgba(120,120,120,0.1) 1px, transparent 1px)`,
    previewColor: "bg-stone-900",
  },
  mist: {
    id: "mist",
    name: "Spectral Mist",
    cssStyle: `linear-gradient(135deg, rgba(20,40,30,0.85) 0%, rgba(10,15,12,0.98) 100%)`,
    previewColor: "bg-emerald-950",
  },
};

export interface BubbleStylePreset {
  id: string;
  name: string;
  class: string;
}

export const BUBBLE_STYLE_PRESETS: Record<string, BubbleStylePreset> = {
  glass: {
    id: "glass",
    name: "Frosted Glassmorphism",
    class: "backdrop-blur-md bg-opacity-40 border-white/5 shadow-lg shadow-black/40",
  },
  classic: {
    id: "classic",
    name: "Classic Slate Cards",
    class: "bg-slate-900 border-slate-800 shadow-md",
  },
  parchment: {
    id: "parchment",
    name: "Tattered Scroll",
    class: "bg-amber-950/20 border-amber-800/40 font-serif leading-relaxed italic rounded-lg tracking-wide shadow-amber-950/10 border-l-4",
  },
  terminal: {
    id: "terminal",
    name: "Command Line CRT",
    class: "bg-black border-emerald-500/30 text-emerald-400 font-mono text-xs rounded-none border-l-2 p-3 tracking-wider glow-terminal",
  },
};
