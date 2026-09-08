import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, Trash2, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  messageId?: string;
  onDeleteMessage?: (id: string) => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class MessageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || "An unexpected error occurred rendering this message turn.",
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("MessageErrorBoundary caught an error in message item:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full my-2 p-3.5 rounded-xl bg-slate-900/90 border border-red-500/30 text-slate-200 text-xs shadow-md">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-red-400 font-semibold font-mono text-[11px]">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Turn Display Anomaly Handled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono transition-colors flex items-center gap-1 cursor-pointer"
                title="Retry rendering this turn"
              >
                <RefreshCw size={10} />
                Retry
              </button>
              {this.props.messageId && this.props.onDeleteMessage && (
                <button
                  type="button"
                  onClick={() => this.props.onDeleteMessage?.(this.props.messageId!)}
                  className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900/80 border border-red-800/40 text-red-300 hover:text-red-100 text-[10px] font-mono transition-colors flex items-center gap-1 cursor-pointer"
                  title="Remove this corrupted entry"
                >
                  <Trash2 size={10} />
                  Purge
                </button>
              )}
            </div>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed mb-1 font-sans">
            A temporary format discrepancy in this turn was safely isolated to keep your campaign active.
          </p>
          {this.state.errorMessage && (
            <div className="text-[10px] font-mono text-red-300/80 truncate max-w-full bg-slate-950/70 p-1.5 rounded border border-slate-800">
              {this.state.errorMessage}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default MessageErrorBoundary;
