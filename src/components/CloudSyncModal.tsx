import React, { useState } from "react";
import { 
  Cloud, RefreshCw, LogIn, LogOut, CheckCircle, AlertTriangle, 
  Smartphone, Laptop, Download, Upload, X, ShieldCheck, ArrowRight, Zap
} from "lucide-react";
import { Project } from "../types";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isSyncing: boolean;
  onSyncNow: () => Promise<void>;
  onGoogleSignIn: () => Promise<any>;
  onGoogleSignOut: () => Promise<void>;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onExportAll: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoSyncOnLaunch?: boolean;
  onToggleAutoSyncOnLaunch?: (enabled: boolean) => void;
  onShowToast?: (title: string, message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  isSyncing,
  onSyncNow,
  onGoogleSignIn,
  onGoogleSignOut,
  projects,
  activeProjectId,
  onSelectProject,
  onExportAll,
  onImportFile,
  autoSyncOnLaunch = true,
  onToggleAutoSyncOnLaunch,
  onShowToast
}) => {
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSyncClick = async () => {
    try {
      setSyncStatusMsg("Connecting to Cloud & synchronizing all campaign timelines...");
      await onSyncNow();
      setSyncStatusMsg("Synchronization complete! All devices signed in will now reflect latest episodes.");
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      setSyncStatusMsg("Sync notice: " + (err?.message || "Sync finished."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${user ? "bg-emerald-950/50 border-emerald-800 text-emerald-400" : "bg-amber-950/50 border-amber-800 text-amber-400"}`}>
              <Cloud size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Cross-Device Cloud Sync
                {user ? (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800/80 text-emerald-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ⚡ Real-Time Active
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800/80 text-amber-300">
                    Local Only
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Continuous real-time synchronization across all your Chrome devices</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Status Box */}
          {user ? (
            <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-emerald-300">Signed in to Google Account</p>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-900/60 border border-emerald-700/50 text-emerald-300">
                      ⚡ Live Sync Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono break-all mt-0.5">{user.email}</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    <strong>Zero-delay real-time streaming:</strong> Every message, narrative edit, character sheet, and attached source is saved instantly to Google Cloud Firestore and streamed directly across all your open browsers and devices.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Force refresh and verify all local & cloud data"
                >
                  <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  type="button"
                  onClick={onGoogleSignOut}
                  className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-800 hover:border-red-900/50 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-300">This Device is in Offline / Local Mode</p>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Data created on this browser is currently saved in local storage. To access episodes you wrote on your other Chrome browser or device, click <strong>Sign In with Google</strong> below.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <LogIn size={15} />
                Sign In with Google (Sync Across Devices)
              </button>
            </div>
          )}

          {syncStatusMsg && (
            <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-800/50 text-purple-200 text-xs flex items-center gap-2 animate-fadeIn">
              <RefreshCw size={13} className="animate-spin text-purple-400 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {/* User Preferences: Auto-Sync on Launch */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg border shrink-0 transition-colors ${
                autoSyncOnLaunch 
                  ? "bg-purple-950/60 border-purple-800/80 text-purple-400" 
                  : "bg-slate-900 border-slate-800 text-slate-500"
              }`}>
                <Zap size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">Auto-Sync on Launch</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                    autoSyncOnLaunch
                      ? "bg-purple-950/80 border-purple-700/60 text-purple-300"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}>
                    {autoSyncOnLaunch ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  Automatically sync local campaigns and transcripts with the cloud when Nyx loads.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSyncOnLaunch}
              onClick={() => onToggleAutoSyncOnLaunch?.(!autoSyncOnLaunch)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoSyncOnLaunch ? "bg-purple-600" : "bg-slate-700"
              }`}
              title={autoSyncOnLaunch ? "Disable Auto-Sync on Launch" : "Enable Auto-Sync on Launch"}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  autoSyncOnLaunch ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Cross Device Advice */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Laptop size={14} className="text-purple-400" />
              <span>Real-Time Sync Details & Device Tips:</span>
            </div>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Live Streaming:</strong> While you are signed into <span className="text-purple-300 font-mono">{user?.email || "your Google Account"}</span>, your chat, characters, notes, and narrative attachments stream live to all other browsers and devices without having to press any buttons.
              </li>
              <li>
                <strong>First-Time Link from Another Device:</strong> If you created content on your other device while signed out or offline, open that device once and sign in. It will immediately upload and merge all historical episodes to the cloud!
              </li>
              <li>
                <strong>Campaign Selection:</strong> Ensure both devices are viewing the same active campaign in the list below.
              </li>
            </ul>
          </div>

          {/* Campaign List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Available Campaigns ({projects.length})</span>
              <span className="text-[11px] text-slate-500">Click to switch</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {projects.map((proj) => {
                const isActive = proj.id === activeProjectId;
                const displayName = proj.name?.trim() || proj.setting?.trim() || "Nyx Campaign";
                return (
                  <div
                    key={proj.id}
                    onClick={() => onSelectProject(proj.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                      isActive
                        ? "bg-purple-950/40 border-purple-500/80 text-purple-100 shadow-xs"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-purple-400" : "bg-slate-600"}`} />
                      <span className="font-semibold truncate">{displayName}</span>
                      {proj.turnHeader && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-[140px]">
                          {proj.turnHeader}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isActive && (
                        <span className="text-[10px] font-semibold text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-700/60">
                          Active Now
                        </span>
                      )}
                      <ArrowRight size={13} className={isActive ? "text-purple-400" : "text-slate-600"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Offline File Transfer Alternative */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <ShieldCheck size={13} className="text-slate-500" />
              <span>Direct File Transfer (Instant Backup):</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportAll}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Export all campaigns into a JSON file"
              >
                <Download size={13} />
                Export .json
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Import campaigns from a JSON backup file"
              >
                <Upload size={13} />
                Import .json
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onImportFile}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
