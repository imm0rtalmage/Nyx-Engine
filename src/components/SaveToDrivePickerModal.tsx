import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  FolderOpen, Loader2, Search, X, Grid, List, AlertCircle, 
  RefreshCw, Check, FileText, ExternalLink, Plus, Save
} from "lucide-react";
import firebaseConfig from "../../firebase-applet-config.json";
import { listGoogleDocs, createGoogleDoc, updateGoogleDoc } from "../utils/googleWorkspace";

const GoogleDriveIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg 
    style={{ width: size, height: size }} 
    className={`shrink-0 ${className}`} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M8.33 3.5h7.34l5.33 9.25H13.66L8.33 3.5z" fill="#FFCC00" />
    <path d="M1.66 15h10.66l5.33-9.25H7L1.66 15z" fill="#1A73E8" />
    <path d="M7 15l5.33 9.25h10.67L17.67 15H7z" fill="#0F9D58" />
  </svg>
);

export interface SaveToDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleToken: string | null | undefined;
  onGoogleSignIn?: () => Promise<string | undefined> | void;
  exportTitle: string;
  exportContent: string;
  onExportSuccess: (docId: string, docUrl: string) => void;
  onShowToast?: (title: string, description: string, type?: "success" | "error" | "info") => void;
}

export const SaveToDrivePickerModal: React.FC<SaveToDrivePickerModalProps> = ({
  isOpen,
  onClose,
  googleToken,
  onGoogleSignIn,
  exportTitle,
  exportContent,
  onExportSuccess,
  onShowToast,
}) => {
  const [docTitle, setDocTitle] = useState(exportTitle || "Nyx Narrative Export");
  const [activeTab, setActiveTab] = useState<"new" | "existing">("new");
  const [isLoading, setIsLoading] = useState(false);
  
  // Drive file browser state for existing docs
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [driveTab, setDriveTab] = useState<"recent" | "my_drive" | "shared">("recent");

  useEffect(() => {
    if (exportTitle) {
      setDocTitle(exportTitle);
    }
  }, [exportTitle]);

  useEffect(() => {
    if (isOpen && activeTab === "existing" && googleToken) {
      loadDriveFiles();
    }
  }, [isOpen, activeTab, googleToken, driveTab]);

  if (!isOpen) return null;

  const loadDriveFiles = async () => {
    if (!googleToken) return;
    setIsLoadingDriveFiles(true);
    try {
      const files = await listGoogleDocs(googleToken, {
        search: searchQuery,
      });
      setDriveFiles(files || []);
    } catch (err: any) {
      console.error("Error loading Drive files for picker:", err);
      onShowToast?.("Drive Fetch Error", err.message || "Failed to load Google Drive documents.", "error");
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleCreateNewDoc = async () => {
    let activeToken = googleToken;
    if (!activeToken) {
      if (onGoogleSignIn) {
        onShowToast?.("Google Auth", "Connecting Google Drive...", "info");
        activeToken = (await onGoogleSignIn()) || null;
      }
      if (!activeToken) {
        onShowToast?.("Auth Required", "Please connect your Google Drive account first to save.", "info");
        return;
      }
    }

    setIsLoading(true);
    onShowToast?.("📄 Saving to Google Drive", `Creating "${docTitle}" in Google Drive...`, "info");

    try {
      let newDocId = "";
      try {
        newDocId = await createGoogleDoc(activeToken, docTitle, exportContent);
      } catch (firstErr: any) {
        const isAuthErr = firstErr?.message && (firstErr.message.includes("401") || firstErr.message.includes("403") || firstErr.message.includes("authentication credentials") || firstErr.message.includes("unauthorized"));
        if (isAuthErr && onGoogleSignIn) {
          onShowToast?.("Re-authenticating...", "Google Drive token expired. Please sign in to reconnect.", "info");
          const freshToken = await onGoogleSignIn();
          if (freshToken) {
            newDocId = await createGoogleDoc(freshToken, docTitle, exportContent);
          } else {
            throw firstErr;
          }
        } else {
          throw firstErr;
        }
      }

      if (newDocId) {
        const url = `https://docs.google.com/document/d/${newDocId}/edit`;
        onExportSuccess(newDocId, url);
        onShowToast?.("📄 Saved to Google Drive!", `Successfully created "${docTitle}" in Google Drive.`, "success");
        onClose();
      } else {
        throw new Error("Google returned an empty document ID.");
      }
    } catch (err: any) {
      console.error("Save to Drive Error:", err);
      onShowToast?.("Save Failed", err.message || "Failed to save document to Google Drive.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateExistingDoc = async () => {
    let activeToken = googleToken;
    if (!activeToken) {
      if (onGoogleSignIn) {
        onShowToast?.("Google Auth", "Connecting Google Drive...", "info");
        activeToken = (await onGoogleSignIn()) || null;
      }
      if (!activeToken) {
        onShowToast?.("Auth Required", "Please connect your Google Drive account first to sync.", "info");
        return;
      }
    }
    if (!selectedDocId) {
      onShowToast?.("Selection Required", "Please select a document from the list to update.", "info");
      return;
    }

    setIsLoading(true);
    const selectedFile = driveFiles.find((f) => f.id === selectedDocId);
    const fileName = selectedFile?.name || "Google Doc";

    onShowToast?.("💾 Syncing Google Doc", `Updating "${fileName}" in Google Drive...`, "info");

    try {
      try {
        await updateGoogleDoc(activeToken, selectedDocId, exportContent);
      } catch (firstErr: any) {
        const isAuthErr = firstErr?.message && (firstErr.message.includes("401") || firstErr.message.includes("403") || firstErr.message.includes("authentication credentials") || firstErr.message.includes("unauthorized"));
        if (isAuthErr && onGoogleSignIn) {
          onShowToast?.("Re-authenticating...", "Google Drive token expired. Please sign in to reconnect.", "info");
          const freshToken = await onGoogleSignIn();
          if (freshToken) {
            await updateGoogleDoc(freshToken, selectedDocId, exportContent);
          } else {
            throw firstErr;
          }
        } else {
          throw firstErr;
        }
      }

      const url = `https://docs.google.com/document/d/${selectedDocId}/edit`;
      onExportSuccess(selectedDocId, url);
      onShowToast?.("💾 Document Updated!", `Successfully updated "${fileName}" in Google Drive.`, "success");
      onClose();
    } catch (err: any) {
      console.error("Update Doc Error:", err);
      onShowToast?.("Sync Failed", err.message || "Failed to update Google Doc.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchNativePicker = async () => {
    if (!googleToken) {
      if (onGoogleSignIn) await onGoogleSignIn();
      return;
    }

    setIsLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).google?.picker) {
          resolve();
          return;
        }

        const loadPickerLib = () => {
          (window as any).gapi.load("picker", {
            callback: () => resolve(),
            onerror: () => reject(new Error("Failed to load Google Picker Library")),
          });
        };

        if (!(window as any).gapi) {
          const script = document.createElement("script");
          script.src = "https://apis.google.com/js/api.js";
          script.onload = () => loadPickerLib();
          script.onerror = () => reject(new Error("Failed to load gapi script"));
          document.body.appendChild(script);
        } else {
          loadPickerLib();
        }
      });

      const pickerOrigin = window.location.origin;
      const builder = new (window as any).google.picker.PickerBuilder()
        .setDeveloperKey(firebaseConfig.apiKey)
        .setAppId(firebaseConfig.messagingSenderId)
        .setOAuthToken(googleToken)
        .setOrigin(pickerOrigin);

      const docsView = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.DOCS)
        .setMimeTypes("application/vnd.google-apps.document")
        .setIncludeFolders(true);
      builder.addView(docsView);

      builder.setCallback(async (data: any) => {
        if (data.action === (window as any).google.picker.Action.PICKED) {
          const doc = data.docs?.[0];
          if (doc && doc.id) {
            setSelectedDocId(doc.id);
            setActiveTab("existing");
            onShowToast?.("Selected Document", `Selected "${doc.name}" from Google Picker.`, "info");
          }
        }
      });

      const pickerInstance = builder.build();
      pickerInstance.setVisible(true);
    } catch (err: any) {
      console.warn("Native Picker failed, falling back to built-in browser:", err);
      setActiveTab("existing");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFiles = driveFiles.filter((f) => 
    !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return createPortal(
    <div id="save-to-drive-picker-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
      <div 
        id="save-to-drive-picker-modal"
        className="w-full max-w-2xl bg-white text-slate-800 border border-slate-200 rounded-[24px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden font-sans animate-fade-in relative z-[100000]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <GoogleDriveIcon size={22} />
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Save to Google Drive</h3>
              <p className="text-xs text-slate-500 font-mono">Google Drive Document Picker</p>
            </div>
          </div>

          <button
            id="close-save-drive-picker"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Auth Check Banner */}
        {!googleToken && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-3 text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span>Google Drive connection required to save directly to your account.</span>
            </div>
            {onGoogleSignIn && (
              <button
                type="button"
                onClick={async () => {
                  await onGoogleSignIn();
                }}
                className="px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1b66ca] text-white font-semibold rounded-full text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                Connect Google Drive
              </button>
            )}
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("new")}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-1.5 border-t border-x ${
                activeTab === "new"
                  ? "bg-white text-[#1a73e8] border-slate-200 border-b-transparent shadow-xs"
                  : "bg-transparent text-slate-600 hover:text-slate-900 border-transparent"
              }`}
            >
              <Plus size={14} />
              Create New Google Doc
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("existing")}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-1.5 border-t border-x ${
                activeTab === "existing"
                  ? "bg-white text-[#1a73e8] border-slate-200 border-b-transparent shadow-xs"
                  : "bg-transparent text-slate-600 hover:text-slate-900 border-transparent"
              }`}
            >
              <Save size={14} />
              Overwrite / Link Existing Doc
            </button>
          </div>

          <button
            type="button"
            onClick={handleLaunchNativePicker}
            className="text-[11px] text-[#1a73e8] hover:underline font-semibold flex items-center gap-1 pb-2"
            title="Launch Google-hosted native popup dialog"
          >
            Launch Native Picker <ExternalLink size={12} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          {activeTab === "new" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document Title in Google Drive:
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Enter Google Doc Title..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#1a73e8] focus:bg-white text-slate-900 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-2 text-xs text-blue-900">
                <div className="flex items-center gap-2 font-bold text-[#1a73e8]">
                  <FileText size={15} />
                  <span>Ready to Export</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  This action will compile your story transcript and create a brand-new Google Doc in your Google Drive root folder.
                </p>
                <div className="pt-2 text-[11px] font-mono text-slate-500">
                  Total Content Length: {exportContent.length.toLocaleString()} characters
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search existing Google Docs in Drive..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-100 focus:bg-white text-xs text-slate-800 placeholder-slate-500 rounded-full pl-9 pr-4 py-2 outline-none border border-transparent focus:border-[#1a73e8] transition-all"
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                </div>
                <button
                  type="button"
                  onClick={loadDriveFiles}
                  disabled={isLoadingDriveFiles}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Refresh Drive files"
                >
                  <RefreshCw size={14} className={isLoadingDriveFiles ? "animate-spin text-[#1a73e8]" : ""} />
                </button>
              </div>

              {/* Drive File List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
                {isLoadingDriveFiles ? (
                  <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <Loader2 size={20} className="animate-spin text-[#1a73e8]" />
                    <span>Loading your Google Drive documents...</span>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 font-mono">
                    No Google Docs found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredFiles.map((file) => {
                    const isSelected = selectedDocId === file.id;
                    return (
                      <div
                        key={file.id}
                        onClick={() => setSelectedDocId(file.id)}
                        className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50 border-l-4 border-l-[#1a73e8]" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText size={16} className={isSelected ? "text-[#1a73e8]" : "text-blue-600"} />
                          <div className="min-w-0">
                            <div className={`font-semibold truncate ${isSelected ? "text-[#1a73e8]" : "text-slate-800"}`}>
                              {file.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Doc ID: {file.id.slice(0, 12)}...
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-[#1a73e8] text-white rounded-full flex items-center justify-center shrink-0">
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-full cursor-pointer transition-colors"
          >
            Cancel
          </button>

          {activeTab === "new" ? (
            <button
              type="button"
              onClick={handleCreateNewDoc}
              disabled={isLoading || !docTitle.trim()}
              className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1b66ca] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving to Drive...
                </>
              ) : (
                <>
                  <GoogleDriveIcon size={15} />
                  Save as New Google Doc
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUpdateExistingDoc}
              disabled={isLoading || !selectedDocId}
              className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1b66ca] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Updating Google Doc...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save & Link Selected Doc
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
