import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertTriangle, Database, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearCacheAndRestore = () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        // Clear transient UI session keys that may cause JSON parse crashes,
        // while preserving campaign content
        const transientKeys = [
          "nyx_mobile_lite_mode",
          "local_sync_logs",
          "nyx_google_token",
          "nyx_google_token_timestamp",
          "local_activeProjectId"
        ];
        transientKeys.forEach((k) => window.localStorage.removeItem(k));
      }
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleCopyError = () => {
    if (this.state.error?.message) {
      navigator.clipboard?.writeText(this.state.error.message);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Display Recovery</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              An unexpected render anomaly occurred. Your campaign data is preserved in local storage and cloud sync.
            </p>
            {this.state.error?.message && (
              <div className="w-full bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-red-300 text-left overflow-x-auto max-h-32 select-text">
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full pt-1">
              <button
                onClick={this.handleReset}
                className="w-full sm:flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/20"
              >
                <RefreshCw size={14} />
                Reload Application
              </button>
              <button
                onClick={this.handleClearCacheAndRestore}
                className="w-full sm:flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Clears temporary UI cache while keeping campaigns safe"
              >
                <Database size={13} className="text-amber-400" />
                Restore Session
              </button>
            </div>
            {this.state.error?.message && (
              <button
                onClick={this.handleCopyError}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {this.state.copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {this.state.copied ? "Error Copied!" : "Copy Diagnostics"}
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

