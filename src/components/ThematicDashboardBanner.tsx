import React from "react";
import { Compass, Shield, Rocket, Activity, Zap } from "lucide-react";

interface ThematicBannerProps {
  name: string;
  setting: string;
}

export function getDynamicArchetype(setting: string, name: string) {
  const text = `${setting} ${name}`.toLowerCase();
  
  if (
    text.includes("battlestar") || 
    text.includes("star wars") || 
    text.includes("space") || 
    text.includes("galaxy") || 
    text.includes("orbit") || 
    text.includes("sci-fi") || 
    text.includes("scifi") || 
    text.includes("vessel") || 
    text.includes("ship") || 
    text.includes("expanse") || 
    text.includes("cosmos")
  ) {
    return "space";
  }
  
  if (
    text.includes("faerun") || 
    text.includes("dungeon") || 
    text.includes("dragon") || 
    text.includes("fantasy") || 
    text.includes("sword") || 
    text.includes("shield") || 
    text.includes("magic") || 
    text.includes("ring") || 
    text.includes("elder") || 
    text.includes("realm") || 
    text.includes("medieval") || 
    text.includes("scroll")
  ) {
    return "fantasy";
  }

  if (
    text.includes("cyberpunk") || 
    text.includes("neon") || 
    text.includes("grid") || 
    text.includes("synthwave") || 
    text.includes("hacker") || 
    text.includes("corporate") || 
    text.includes("night city")
  ) {
    return "cyberpunk";
  }

  if (
    text.includes("military") || 
    text.includes("ww2") || 
    text.includes("fighter") || 
    text.includes("squad") || 
    text.includes("war") || 
    text.includes("tactical") || 
    text.includes("army") || 
    text.includes("navy") || 
    text.includes("airforce") || 
    text.includes("squadron")
  ) {
    return "military";
  }

  return "default";
}

export default function ThematicDashboardBanner({ name, setting }: ThematicBannerProps) {
  const archetype = getDynamicArchetype(setting, name);
  const initials = name ? name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase() : "NYX";

  // Dynamic visual configurations based on archetype
  const configs = {
    space: {
      gradient: "from-blue-950 via-slate-900 to-indigo-950",
      accentBorder: "border-sky-500/30",
      glowColor: "shadow-sky-500/10",
      themeTitle: "STATION COMMAND",
      badgeColor: "bg-sky-500/10 text-sky-300 border-sky-500/20",
      textColor: "text-sky-400",
      svgCrest: (
        <svg viewBox="0 0 100 100" className="w-24 h-24 text-sky-400 filter drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
          {/* Outer Ring */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3,3" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
          {/* Planet */}
          <circle cx="50" cy="50" r="18" fill="#0f172a" stroke="currentColor" strokeWidth="2" />
          {/* Orbit Rings */}
          <ellipse cx="50" cy="50" rx="32" ry="8" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-25 50 50)" />
          {/* Navigation Star */}
          <path d="M50 15 L52 28 L65 30 L52 32 L50 45 L48 32 L35 30 L48 28 Z" fill="currentColor" />
          {/* Initials */}
          <text x="50" y="70" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="bold" fontFamily="monospace" letterSpacing="1">
            {initials}
          </text>
        </svg>
      )
    },
    fantasy: {
      gradient: "from-emerald-950 via-stone-900 to-amber-950/40",
      accentBorder: "border-amber-600/30",
      glowColor: "shadow-amber-600/10",
      themeTitle: "REALM MAP & ARCHIVES",
      badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      textColor: "text-amber-500",
      svgCrest: (
        <svg viewBox="0 0 100 100" className="w-24 h-24 text-amber-500 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
          {/* Shield Shield Outline */}
          <path d="M50 10 C65 10, 80 15, 80 40 C80 65, 50 85, 50 90 C50 85, 20 65, 20 40 C20 15, 35 10, 50 10 Z" fill="#1c1917" stroke="currentColor" strokeWidth="2" />
          {/* Inner Shield Line */}
          <path d="M50 15 C62 15, 75 19, 75 40 C75 60, 50 78, 50 83 C50 78, 25 60, 25 40 C25 19, 38 15, 50 15 Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
          {/* Crossed Swords (Simplified lines) */}
          <line x1="30" y1="30" x2="70" y2="70" stroke="currentColor" strokeWidth="2.5" />
          <line x1="70" y1="30" x2="30" y2="70" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="10" fill="#1c1917" stroke="currentColor" strokeWidth="1.5" />
          {/* Ancient Compass Star */}
          <path d="M50 42 L52 48 L58 50 L52 52 L50 58 L48 52 L42 50 L48 48 Z" fill="currentColor" />
          <text x="50" y="27" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="bold" fontFamily="serif" letterSpacing="1">
            {initials}
          </text>
        </svg>
      )
    },
    cyberpunk: {
      gradient: "from-zinc-950 via-purple-950/20 to-black",
      accentBorder: "border-fuchsia-500/30",
      glowColor: "shadow-fuchsia-500/10",
      themeTitle: "CYBER NET LINK",
      badgeColor: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20",
      textColor: "text-fuchsia-400",
      svgCrest: (
        <svg viewBox="0 0 100 100" className="w-24 h-24 text-fuchsia-400 filter drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]">
          {/* Hexagon Border */}
          <polygon points="50,10 85,30 85,70 50,90 15,70 15,30" fill="#09090b" stroke="currentColor" strokeWidth="2" />
          {/* Inner Hex */}
          <polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3,1" />
          {/* Circuit details */}
          <line x1="30" y1="50" x2="45" y2="50" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="45" cy="50" r="2.5" fill="currentColor" />
          <line x1="70" y1="50" x2="55" y2="50" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="55" cy="50" r="2.5" fill="currentColor" />
          <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {/* Terminal Monospace Code Font */}
          <text x="50" y="54" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="bold" fontFamily="monospace">
            {initials}
          </text>
        </svg>
      )
    },
    military: {
      gradient: "from-slate-900 via-neutral-900 to-zinc-900",
      accentBorder: "border-amber-500/30",
      glowColor: "shadow-amber-500/10",
      themeTitle: "SQUADRON STRATEGIST",
      badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      textColor: "text-amber-500",
      svgCrest: (
        <svg viewBox="0 0 100 100" className="w-24 h-24 text-amber-500 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
          {/* Circle Roundel */}
          <circle cx="50" cy="50" r="42" fill="#171717" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4,2" />
          {/* Chevrons */}
          <path d="M30 65 L50 78 L70 65 M30 58 L50 71 L70 58" fill="none" stroke="currentColor" strokeWidth="2" />
          {/* Flight Wing silhouette */}
          <path d="M18 42 L38 42 L42 32 L50 48 L58 32 L62 42 L82 42 L65 52 L50 52 L35 52 Z" fill="currentColor" />
          {/* Military Star */}
          <polygon points="50,22 53,30 62,30 55,35 58,44 50,39 42,44 45,35 38,30 47,30" fill="currentColor" stroke="#171717" strokeWidth="1" />
          <text x="50" y="60" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="black" fontFamily="sans-serif" letterSpacing="1.5">
            {initials}
          </text>
        </svg>
      )
    },
    default: {
      gradient: "from-slate-950 via-slate-900 to-purple-950/20",
      accentBorder: "border-purple-500/20",
      glowColor: "shadow-purple-500/10",
      themeTitle: "NYX INTERACTIVE ADVENTURE",
      badgeColor: "bg-purple-500/10 text-purple-300 border-purple-500/20",
      textColor: "text-purple-400",
      svgCrest: (
        <svg viewBox="0 0 100 100" className="w-24 h-24 text-purple-400 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
          {/* Concentric Modern Rings */}
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5,3" />
          {/* Compass Lines */}
          <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="0.5" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="0.5" />
          {/* Core Star */}
          <polygon points="50,35 54,46 65,50 54,54 50,65 46,54 35,50 46,46" fill="currentColor" />
          <text x="50" y="77" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="semibold" fontFamily="sans-serif">
            {initials}
          </text>
        </svg>
      )
    }
  };

  const current = configs[archetype] || configs.default;

  return (
    <div className={`relative w-full rounded-2xl bg-gradient-to-r ${current.gradient} border ${current.accentBorder} p-6 flex flex-col md:flex-row items-center gap-6 overflow-hidden shadow-2xl ${current.glowColor} transition-all duration-300 mb-6`}>
      {/* Absolute Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full filter blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-60 h-60 bg-blue-500/5 rounded-full filter blur-3xl -z-10 pointer-events-none" />

      {/* Left Column: Crest/Squad Patch/Map element */}
      <div className="shrink-0 relative group p-1 bg-slate-950/40 rounded-full border border-white/5 shadow-inner">
        {current.svgCrest}
        {/* Subtle hover pulse */}
        <div className="absolute inset-0 bg-transparent rounded-full group-hover:ring-1 group-hover:ring-white/20 transition-all pointer-events-none" />
      </div>

      {/* Right Column: World Context details */}
      <div className="flex-1 text-center md:text-left space-y-2">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${current.badgeColor}`}>
            {current.themeTitle}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            ID: {initials}-{Math.floor(Math.sin(name.length || 1) * 900 + 1000)}
          </span>
        </div>

        <h2 className="text-xl md:text-2xl font-serif font-semibold tracking-tight text-slate-100">
          {name || "Unnamed Project"}
        </h2>

        <p className="text-xs text-slate-300 max-w-xl font-sans leading-relaxed">
          {setting ? (
            <span className="italic text-slate-400">"{setting}"</span>
          ) : (
            "Define your primary setting to dynamically customize active storytelling styles."
          )}
        </p>

        <div className="pt-2 flex justify-center md:justify-start items-center gap-4 text-[10px] text-slate-500 font-mono border-t border-white/5">
          <span>COMPASS: ONLINE</span>
          <span>● COGNITIVE ENGINE ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
