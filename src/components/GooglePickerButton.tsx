import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  FolderOpen, Loader2, Search, X, Grid, List, AlertCircle, 
  RefreshCw, Star, Check, SlidersHorizontal, Info, ExternalLink,
  ChevronDown, HelpCircle, FileText
} from "lucide-react";
import firebaseConfig from "../../firebase-applet-config.json";
import { fetchGoogleFile, listGoogleDocs, extractDocId } from "../utils/googleWorkspace";
import { safeLocalStorage } from "../App";

// Precise Google Drive SVG Logo
const GoogleDriveIcon = ({ size = 13, className = "" }: { size?: number; className?: string }) => (
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

export interface PickedGoogleFile {
  name: string;
  mimeType: string;
  data: string;
  size?: string;
  text?: string;
}

interface GooglePickerButtonProps {
  googleToken: string | null | undefined;
  onGoogleSignIn?: () => Promise<string | undefined> | void;
  onFilePicked?: (file: PickedGoogleFile) => void;
  onFilesPicked?: (files: PickedGoogleFile[]) => void;
  maxFiles?: number;
  multiSelect?: boolean;
  onShowToast?: (title: string, description: string, type?: "success" | "error" | "info") => void;
  mode?: "image" | "document" | "all";
  className?: string;
  label?: string;
  buttonSize?: "sm" | "md" | "icon";
}

export const GooglePickerButton: React.FC<GooglePickerButtonProps> = ({
  googleToken,
  onGoogleSignIn,
  onFilePicked,
  onFilesPicked,
  maxFiles = 10,
  multiSelect = true,
  onShowToast,
  mode = "all",
  className = "",
  label,
  buttonSize = "md"
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const effectiveMaxFiles = maxFiles || 10;
  
  // Custom GDrive File Browser Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [driveFileSearch, setDriveFileSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [driveError, setDriveError] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isGridView, setIsGridView] = useState<boolean>(false);
  const [driveActiveTab, setDriveActiveTab] = useState<"recent" | "my_drive" | "shared" | "starred">("recent");
  const [driveTypeFilter, setDriveTypeFilter] = useState<"all" | "document" | "pdf" | "image">(
    mode === "all" ? "all" : mode
  );
  
  const [starredFileIds, setStarredFileIds] = useState<Set<string>>(() => {
    try {
      const saved = safeLocalStorage.getItem("nyx_starred_file_ids");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [showConfigHelp, setShowConfigHelp] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(driveFileSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [driveFileSearch]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClose = () => setShowMenu(false);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [showMenu]);

  // Load files when modal opens or filter changes
  useEffect(() => {
    if (isModalOpen && googleToken) {
      loadDriveFiles();
    }
  }, [isModalOpen, googleToken, debouncedSearch, driveActiveTab, driveTypeFilter]);

  const loadDriveFiles = async () => {
    setIsLoadingDriveFiles(true);
    setDriveError(null);
    try {
      const files = await listGoogleDocs(googleToken!, {
        search: debouncedSearch,
        tab: driveActiveTab,
        mimeTypeFilter: driveTypeFilter === "all" ? undefined : driveTypeFilter
      });
      setDriveFiles(files || []);
    } catch (err: any) {
      setDriveError(err?.message || "Failed to load files from Google Drive.");
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const toggleStarFile = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = new Set(starredFileIds);
    if (updated.has(fileId)) {
      updated.delete(fileId);
    } else {
      updated.add(fileId);
    }
    setStarredFileIds(updated);
    try {
      safeLocalStorage.setItem("nyx_starred_file_ids", JSON.stringify(Array.from(updated)));
    } catch (err) {
      console.warn("Could not save starred files to localStorage:", err);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        if (next.size >= effectiveMaxFiles) {
          onShowToast?.("Selection Limit Reached", `You can attach up to ${effectiveMaxFiles} files at once.`, "info");
          return prev;
        }
        next.add(fileId);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    let list = driveFiles;
    if (driveActiveTab === "starred") {
      list = list.filter(f => f.starred || starredFileIds.has(f.id));
    }
    const idsToSelect = list.slice(0, effectiveMaxFiles).map(f => f.id);
    setSelectedFileIds(new Set(idsToSelect));
    onShowToast?.("Files Selected", `Selected ${idsToSelect.length} file(s) (max ${effectiveMaxFiles})`, "info");
  };

  const clearSelection = () => {
    setSelectedFileIds(new Set());
  };

  // 1. ORIGINAL NATIVE GOOGLE PICKER API LAUNCHER (prone to 403 when domain is dynamic)
  const handleOpenNativePicker = async () => {
    if (!googleToken) {
      if (onGoogleSignIn) {
        onGoogleSignIn();
      } else {
        onShowToast?.("Authentication Required", "Please click the Google Sign In button to link Google Drive.", "info");
      }
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
          script.onload = () => {
            loadPickerLib();
          };
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

      if (mode === "image") {
        const imagesView = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.DOCS_IMAGES)
          .setMimeTypes("image/png,image/jpeg,image/gif,image/webp")
          .setIncludeFolders(true);
        builder.addView(imagesView);

        try {
          const photosView = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.PHOTOS);
          builder.addView(photosView);
        } catch (e) {
          console.warn("Photos view load failed:", e);
        }
      } else if (mode === "document") {
        const docsView = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.DOCS)
          .setMimeTypes("application/vnd.google-apps.document,application/pdf,text/plain,text/markdown,text/html,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document")
          .setIncludeFolders(true);
        builder.addView(docsView);
      } else {
        const docsView = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.DOCS)
          .setIncludeFolders(true);
        builder.addView(docsView);

        const imagesView = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.DOCS_IMAGES);
        builder.addView(imagesView);
      }

      builder.enableFeature((window as any).google.picker.Feature.MULTISELECT_ENABLED);

      builder.setCallback(async (data: any) => {
        if (data.action === (window as any).google.picker.Action.PICKED) {
          const docs = data.docs;
          if (docs && docs.length > 0) {
            const filesToImport = docs.slice(0, effectiveMaxFiles);
            onShowToast?.("⚡ Importing", `Retrieving ${filesToImport.length} file(s) from Google Drive...`, "info");
            
            try {
              setIsLoading(true);
              const importedFiles: PickedGoogleFile[] = [];
              for (const pickedFile of filesToImport) {
                const response = await fetchGoogleFile(googleToken, pickedFile.id, pickedFile.mimeType);
                
                let finalDataUrl = "";
                if (response.fileBase64) {
                  finalDataUrl = response.fileBase64;
                } else if (response.text && response.text.length < 50000) {
                  try {
                    const base64Text = btoa(unescape(encodeURIComponent(response.text)));
                    finalDataUrl = `data:${pickedFile.mimeType || "text/plain"};base64,${base64Text}`;
                  } catch (e) {
                    finalDataUrl = "";
                  }
                }

                const fileObj: PickedGoogleFile = {
                  name: pickedFile.name,
                  mimeType: pickedFile.mimeType || "application/octet-stream",
                  data: finalDataUrl,
                  size: pickedFile.sizeBytes ? `${(pickedFile.sizeBytes / 1024).toFixed(1)} KB` : "GDrive",
                  text: response.text
                };
                importedFiles.push(fileObj);
              }

              if (onFilesPicked) {
                onFilesPicked(importedFiles);
              }
              if (onFilePicked) {
                importedFiles.forEach(f => onFilePicked(f));
              }

              onShowToast?.("🪄 Import Complete", `Successfully imported ${importedFiles.length} file(s)!`, "success");
              setIsModalOpen(false);
            } catch (err: any) {
              console.error("Error downloading files via Native Picker:", err);
              onShowToast?.("❌ Import Failed", err.message || "Failed to download the selected files.", "error");
            } finally {
              setIsLoading(false);
            }
          }
        }
      });

      const pickerInstance = builder.build();
      pickerInstance.setVisible(true);

    } catch (err: any) {
      console.error("Failed to initialize Native Google Picker:", err);
      onShowToast?.("❌ Native Picker Blocked", "Your browser or dynamic origin blocked the Google popup. Opening secure built-in GDrive fallback!", "info");
      // Seamlessly fallback to the built-in custom GDrive modal
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. CUSTOM SECURE BACKEND-PROXY PICKER (100% immune to 403 errors and CORS)
  const handleSelectFilesFromCustomBrowser = async (files: any[]) => {
    if (!files || files.length === 0) return;
    const filesToImport = files.slice(0, effectiveMaxFiles);
    onShowToast?.("⚡ Importing", `Retrieving ${filesToImport.length} file(s) from Google Drive...`, "info");
    setIsLoading(true);
    setIsModalOpen(false);

    try {
      const importedFiles: PickedGoogleFile[] = [];
      for (const file of filesToImport) {
        try {
          const response = await fetchGoogleFile(googleToken!, file.id, file.mimeType);
          
          let finalDataUrl = "";
          if (response.fileBase64) {
            finalDataUrl = response.fileBase64;
          } else if (response.text && response.text.length < 50000) {
            try {
              const base64Text = btoa(unescape(encodeURIComponent(response.text)));
              finalDataUrl = `data:${file.mimeType || "text/plain"};base64,${base64Text}`;
            } catch (e) {
              finalDataUrl = "";
            }
          }

          const fileObj: PickedGoogleFile = {
            name: file.name,
            mimeType: file.mimeType || "application/octet-stream",
            data: finalDataUrl,
            size: file.size ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` : "GDrive",
            text: response.text
          };
          importedFiles.push(fileObj);
        } catch (fileErr: any) {
          console.error(`Failed to fetch file ${file.name}:`, fileErr);
        }
      }

      if (importedFiles.length > 0) {
        if (onFilesPicked) {
          onFilesPicked(importedFiles);
        }
        if (onFilePicked) {
          importedFiles.forEach(f => onFilePicked(f));
        }
        onShowToast?.("🪄 Import Complete", `Successfully imported ${importedFiles.length} file(s)!`, "success");
      } else {
        onShowToast?.("❌ Import Failed", "Could not retrieve the selected files.", "error");
      }
    } catch (err: any) {
      console.error("Error downloading files via Custom Browser:", err);
      onShowToast?.("❌ Import Failed", err.message || "Failed to retrieve the file content dynamically.", "error");
    } finally {
      setIsLoading(false);
      setSelectedFileIds(new Set());
    }
  };

  const handleSelectFileFromCustomBrowser = async (file: any) => {
    await handleSelectFilesFromCustomBrowser([file]);
  };

  const handleOpenBrowserClick = async () => {
    if (!googleToken) {
      if (onGoogleSignIn) {
        await onGoogleSignIn();
      }
      setIsModalOpen(true);
      return;
    }
    setIsModalOpen(true);
  };

  const groupFilesByDate = (filesList: any[]) => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const thisWeek: any[] = [];
    const older: any[] = [];

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 24 * 60 * 60 * 1000;
    const weekAgo = todayMidnight - 7 * 24 * 60 * 60 * 1000;

    filesList.forEach(f => {
      if (!f.modifiedTime) {
        older.push(f);
        return;
      }
      const t = new Date(f.modifiedTime).getTime();
      if (t >= todayMidnight) today.push(f);
      else if (t >= yesterdayMidnight) yesterday.push(f);
      else if (t >= weekAgo) thisWeek.push(f);
      else older.push(f);
    });

    return { today, yesterday, thisWeek, older };
  };

  const handleAttachSelected = () => {
    if (selectedFileIds.size === 0) return;
    const files = driveFiles.filter(f => selectedFileIds.has(f.id));
    if (files.length > 0) {
      handleSelectFilesFromCustomBrowser(files);
    }
  };

  const defaultButtonStyles = "flex items-center justify-center gap-1.5 transition-all font-semibold font-mono rounded cursor-pointer border";
  let sizeStyles = "";
  if (buttonSize === "sm") {
    sizeStyles = "px-2.5 py-1 text-[10px] bg-indigo-950/40 hover:bg-indigo-900/30 text-indigo-400 hover:text-indigo-300 border-indigo-800/30";
  } else if (buttonSize === "icon") {
    sizeStyles = "p-2 bg-indigo-950/40 hover:bg-indigo-900/30 text-indigo-400 hover:text-indigo-300 border-indigo-800/30 rounded-xl h-9 w-9";
  } else {
    sizeStyles = "px-3.5 py-1.5 text-xs bg-indigo-950/40 hover:bg-indigo-900/30 text-indigo-400 hover:text-indigo-300 border-indigo-800/30";
  }

  return (
    <>
      <div className="relative inline-flex items-center">
        {/* Main Drive Action Button (launches custom secure explorer by default to prevent 403s) */}
        <button
          type="button"
          onClick={handleOpenBrowserClick}
          disabled={isLoading}
          className={`${defaultButtonStyles} ${sizeStyles} ${className} ${isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
          title={mode === "image" ? "Browse Google Drive / Google Photos" : "Browse Google Drive"}
        >
          {isLoading ? (
            <>
              <Loader2 size={13} className="animate-spin text-indigo-400" />
              {buttonSize !== "icon" && <span>Loading...</span>}
            </>
          ) : (
            <>
              <GoogleDriveIcon size={buttonSize === "icon" ? 14 : 13} />
              {buttonSize !== "icon" && (label || (mode === "image" ? "Drive / Photos" : "Google Drive"))}
            </>
          )}
        </button>

        {/* Dropdown toggle for launching the alternative native dialog */}
        {buttonSize !== "icon" && googleToken && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="px-1.5 py-1.5 bg-indigo-950/30 border-y border-r border-indigo-800/30 hover:bg-indigo-900/20 text-indigo-400 rounded-r border-l border-l-indigo-850/40 h-full self-stretch flex items-center transition-all cursor-pointer"
            title="Alternative options"
          >
            <ChevronDown size={11} />
          </button>
        )}

        {/* Option Menu overlay */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-1.5 w-60 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 p-1.5 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                setIsModalOpen(true);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-900 text-slate-200 rounded-lg flex items-center gap-2 transition-all"
            >
              <GoogleDriveIcon size={12} />
              <span>Built-in Browser (CORS-immune)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                handleOpenNativePicker();
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-900 text-slate-200 rounded-lg flex items-center gap-2 transition-all border-t border-slate-900"
            >
              <ExternalLink size={12} className="text-blue-400" />
              <span>Google-hosted Picker (Native)</span>
            </button>
          </div>
        )}
      </div>

      {/* CUSTOM GOOGLE DRIVE PICKER MODAL */}
      {isModalOpen && createPortal(
        <div id="custom-picker-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div 
            id="custom-picker-modal" 
            className="w-full max-w-3xl bg-white text-slate-800 border border-slate-200 rounded-[24px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden font-sans relative z-[100000]"
          >
            {/* Header Section */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5 select-none">
                <GoogleDriveIcon size={20} />
                <span className="text-base font-semibold text-slate-800 tracking-tight">Select Files from Drive</span>
              </div>

              {/* Dynamic search bar inside header */}
              {googleToken && (
                <div className="flex-1 max-w-md mx-6 relative">
                  <div className="relative flex items-center w-full">
                    <input
                      id="custom-drive-search-input"
                      type="text"
                      placeholder="Search files in Drive..."
                      value={driveFileSearch}
                      onChange={(e) => setDriveFileSearch(e.target.value)}
                      className="w-full bg-[#f1f3f4] focus:bg-white text-sm text-slate-800 placeholder-slate-500 rounded-full pl-10 pr-10 py-1.5 outline-none border border-transparent focus:border-[#1a73e8] focus:shadow-sm transition-all"
                    />
                    <div className="absolute left-3.5 top-2 text-slate-500">
                      <Search size={15} />
                    </div>
                    {/* Filter cycle */}
                    <div className="absolute right-3.5 top-2 flex items-center gap-1">
                      {driveTypeFilter !== "all" && (
                        <span className="text-[9px] bg-blue-100 text-[#1a73e8] font-bold px-1.5 py-0.5 rounded-full capitalize">
                          {driveTypeFilter}
                        </span>
                      )}
                      <button
                        id="custom-drive-filter-cycle"
                        type="button"
                        onClick={() => {
                          setDriveTypeFilter((prev) => {
                            if (prev === "all") return "document";
                            if (prev === "document") return "pdf";
                            if (prev === "pdf") return "image";
                            return "all";
                          });
                        }}
                        className="p-1 hover:bg-slate-200/60 rounded-full text-slate-500 hover:text-[#1a73e8] transition-colors"
                        title="Cycle Filter (All -> Docs -> PDFs -> Images)"
                      >
                        <SlidersHorizontal size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                id="close-custom-picker-modal"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:bg-slate-100 p-1.5 rounded-full hover:text-slate-800 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Information Notice about 403 / Referrer limits */}
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-2.5 flex items-center justify-between text-xs text-blue-800 gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Info size={14} className="shrink-0 text-[#1a73e8]" />
                <span>
                  <strong>CORS & Referrer-safe:</strong> This built-in browser is fully secure and bypassed origin blocks.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="toggle-help-config"
                  onClick={() => setShowConfigHelp(!showConfigHelp)}
                  className="hover:underline font-semibold flex items-center gap-1 text-[#1a73e8]"
                >
                  <HelpCircle size={13} />
                  {showConfigHelp ? "Hide Help" : "Native 403 Info?"}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  id="trigger-native-picker-alternative"
                  onClick={() => {
                    setIsModalOpen(false);
                    handleOpenNativePicker();
                  }}
                  className="font-bold text-[#1a73e8] hover:underline flex items-center gap-1"
                >
                  Launch Native Picker <ExternalLink size={12} />
                </button>
              </div>
            </div>

            {showConfigHelp && (
              <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 text-xs text-amber-900 leading-relaxed font-sans max-h-40 overflow-y-auto shrink-0 transition-all">
                <h5 className="font-bold flex items-center gap-1 text-amber-800 mb-1">
                  <AlertCircle size={14} /> Resolving Google 403 errors in Native Picker
                </h5>
                <p className="mb-2">
                  Google’s native popups enforce strict client-side checks. To enable the **Native Google-hosted Picker** on dynamic AI Studio domains, open your **Google Cloud Console** and verify:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>
                    <strong>Authorized JavaScript Origins:</strong> Add the active browser address (e.g., <code className="bg-amber-100/80 px-1 rounded font-mono">{window.location.origin}</code>) to your OAuth Client ID settings under authorized web origins.
                  </li>
                  <li>
                    <strong>API Key restrictions:</strong> Ensure your credentials do not restrict the current origin, or ensure the key explicitly permits the **Google Picker API**.
                  </li>
                </ul>
              </div>
            )}

            {/* Main Browser Window */}
            {googleToken ? (
              <div className="flex flex-col flex-1 overflow-hidden bg-white">
                {/* Navigation Tabs Bar */}
                <div className="px-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 select-none">
                  <div className="flex gap-1">
                    {(["recent", "my_drive", "shared", "starred"] as const).map((tab) => (
                      <button
                        key={tab}
                        id={`custom-picker-tab-${tab}`}
                        onClick={() => setDriveActiveTab(tab)}
                        className={`px-4 py-3 text-xs font-semibold tracking-wide transition-all relative ${
                          driveActiveTab === tab 
                            ? "text-[#1a73e8] border-b-[3px] border-[#1a73e8]" 
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {tab === "recent" && "Recent"}
                        {tab === "my_drive" && "My Drive"}
                        {tab === "shared" && "Shared with me"}
                        {tab === "starred" && "Starred"}
                      </button>
                    ))}
                  </div>

                  {/* View Mode & Selection controls */}
                  <div className="flex items-center gap-2 py-1">
                    {selectedFileIds.size > 0 ? (
                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-[11px] font-mono bg-blue-50 text-[#1a73e8] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                          {selectedFileIds.size}/{effectiveMaxFiles} selected
                        </span>
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="text-[11px] text-slate-500 hover:text-red-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={selectAllVisible}
                        className="text-[11px] text-[#1a73e8] hover:underline font-semibold mr-2"
                        title={`Select up to ${effectiveMaxFiles} files`}
                      >
                        Select All (max {effectiveMaxFiles})
                      </button>
                    )}

                    <button
                      id="custom-drive-refresh"
                      onClick={loadDriveFiles}
                      disabled={isLoadingDriveFiles}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw size={14} className={isLoadingDriveFiles ? "animate-spin text-[#1a73e8]" : ""} />
                    </button>

                    <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>

                    <button
                      id="custom-drive-view-list"
                      onClick={() => setIsGridView(false)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        !isGridView ? "bg-[#e8f0fe] text-[#1a73e8]" : "text-slate-500 hover:bg-slate-100"
                      }`}
                      title="List view"
                    >
                      <List size={14} />
                    </button>
                    <button
                      id="custom-drive-view-grid"
                      onClick={() => setIsGridView(true)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isGridView ? "bg-[#e8f0fe] text-[#1a73e8]" : "text-slate-500 hover:bg-slate-100"
                      }`}
                      title="Grid view"
                    >
                      <Grid size={14} />
                    </button>
                  </div>
                </div>

                {/* Files listing zone */}
                <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[55vh]">
                  {isLoadingDriveFiles ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center">
                      <RefreshCw size={32} className="text-[#1a73e8] animate-spin mb-3" />
                      <span className="text-xs font-semibold text-slate-600">Syncing with Google Drive...</span>
                      <span className="text-[10px] text-slate-400 mt-1">Downloading folder index dynamically</span>
                    </div>
                  ) : driveError ? (
                    <div className="m-6 p-6 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                      <AlertCircle size={28} className="text-red-500" />
                      <div>
                        <span className="text-xs font-bold text-red-800 block">Google Drive Connection Error</span>
                        <span className="text-[10px] text-slate-500 leading-relaxed block max-w-md mx-auto mt-1">
                          {driveError}
                        </span>
                      </div>
                      <button
                        id="custom-drive-retry"
                        onClick={loadDriveFiles}
                        className="px-4 py-1.5 bg-[#1a73e8] text-white text-xs font-bold rounded-full hover:bg-[#1b66ca] transition-all"
                      >
                        Retry Ingestion
                      </button>
                    </div>
                  ) : (() => {
                    // Gather filtered files
                    let list = driveFiles;
                    if (driveActiveTab === "starred") {
                      list = list.filter(f => f.starred || starredFileIds.has(f.id));
                    }

                    if (list.length === 0) {
                      return (
                        <div className="py-20 px-4 flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-16 bg-[#f1f3f4] rounded-full flex items-center justify-center mb-3">
                            <GoogleDriveIcon size={24} />
                          </div>
                          <span className="text-sm font-semibold text-slate-700">No matching files found</span>
                          <span className="text-xs text-slate-400 max-w-xs mt-1">
                            Ensure files are available in your linked Google Account.
                          </span>
                        </div>
                      );
                    }

                    if (isGridView) {
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-6 select-none">
                          {list.map((file) => {
                            const isSelected = selectedFileIds.has(file.id);
                            const isStarred = starredFileIds.has(file.id);
                            return (
                              <div
                                key={file.id}
                                onClick={() => toggleFileSelection(file.id)}
                                onDoubleClick={() => handleSelectFileFromCustomBrowser(file)}
                                className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all relative group h-36 ${
                                  isSelected 
                                    ? "bg-[#e8f0fe] border-[#1a73e8] shadow-sm ring-2 ring-[#1a73e8]/20" 
                                    : "bg-white border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <div className="bg-slate-50 rounded-lg flex-1 flex items-center justify-center relative mb-2.5 overflow-hidden border border-slate-100">
                                  {file.mimeType && file.mimeType.startsWith("image/") && file.thumbnailLink ? (
                                    <img 
                                      src={file.thumbnailLink} 
                                      alt={file.name} 
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover rounded-lg" 
                                    />
                                  ) : (
                                    <div className="transform scale-125">
                                      <GoogleDriveIcon size={20} />
                                    </div>
                                  )}

                                  <button
                                    id={`custom-star-btn-${file.id}`}
                                    type="button"
                                    onClick={(e) => toggleStarFile(file.id, e)}
                                    className={`absolute top-1.5 right-1.5 p-1 rounded-full bg-white shadow-sm transition-all ${
                                      isStarred 
                                        ? "opacity-100 text-[#f4b400]" 
                                        : "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#f4b400]"
                                    }`}
                                  >
                                    <Star size={11} fill={isStarred ? "#f4b400" : "none"} />
                                  </button>
                                  
                                  {isSelected ? (
                                    <div className="absolute top-1.5 left-1.5 bg-[#1a73e8] text-white p-0.5 rounded-full shadow-sm">
                                      <Check size={10} strokeWidth={3} />
                                    </div>
                                  ) : (
                                    <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded-full border border-slate-300 bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </div>

                                <div className="flex items-center gap-2 min-w-0">
                                  <GoogleDriveIcon size={12} />
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-[11px] font-medium truncate leading-snug ${isSelected ? "text-[#1a73e8] font-bold" : "text-slate-800 group-hover:text-[#1a73e8]"}`} title={file.name}>
                                      {file.name}
                                    </p>
                                    <p className="text-[9px] text-slate-400 truncate mt-0.5">
                                      {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : "Edited recently"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    const groups = groupFilesByDate(list);
                    const renderRow = (file: any) => {
                      const isSelected = selectedFileIds.has(file.id);
                      const isStarred = starredFileIds.has(file.id);
                      return (
                        <div
                          key={file.id}
                          onClick={() => toggleFileSelection(file.id)}
                          onDoubleClick={() => handleSelectFileFromCustomBrowser(file)}
                          className={`px-6 py-2.5 flex items-center justify-between border-b border-slate-100 cursor-pointer select-none transition-all group ${
                            isSelected ? "bg-[#e8f0fe] border-l-4 border-l-[#1a73e8]" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="shrink-0 flex items-center">
                              {isSelected ? (
                                <div className="w-4 h-4 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shadow-xs">
                                  <Check size={10} strokeWidth={3.5} />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-300 group-hover:border-slate-400" />
                              )}
                            </div>

                            <GoogleDriveIcon size={14} />

                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-semibold truncate ${isSelected ? "text-[#1a73e8]" : "text-slate-800 group-hover:text-[#1a73e8]"}`}>
                                {file.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Size: {file.size ? `${Math.round(parseInt(file.size) / 1024)} KB` : "Drive File"} • Modified: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : "Recently"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <button
                              id={`custom-star-row-btn-${file.id}`}
                              type="button"
                              onClick={(e) => toggleStarFile(file.id, e)}
                              className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${
                                isStarred ? "text-[#f4b400]" : "text-slate-300 hover:text-slate-500 opacity-50 group-hover:opacity-100"
                              }`}
                            >
                              <Star size={13} fill={isStarred ? "#f4b400" : "none"} />
                            </button>
                            
                            <button
                              id={`custom-attach-action-${file.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectFileFromCustomBrowser(file);
                              }}
                              className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-[#1a73e8]/10 hover:bg-[#1a73e8] text-[#1a73e8] hover:text-white text-[10px] font-semibold rounded-full transition-all"
                            >
                              Attach
                            </button>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="flex flex-col">
                        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 tracking-wider uppercase select-none flex justify-between">
                          <span>Name</span>
                          <span className="mr-32">Actions</span>
                        </div>

                        {groups.today.length > 0 && (
                          <div>
                            <div className="px-6 py-2 bg-[#f8f9fa] border-b border-slate-100/80 text-[10px] font-bold text-[#5f6368] tracking-wider uppercase select-none">
                              Today
                            </div>
                            {groups.today.map(renderRow)}
                          </div>
                        )}

                        {groups.yesterday.length > 0 && (
                          <div>
                            <div className="px-6 py-2 bg-[#f8f9fa] border-b border-slate-100/80 text-[10px] font-bold text-[#5f6368] tracking-wider uppercase select-none">
                              Yesterday
                            </div>
                            {groups.yesterday.map(renderRow)}
                          </div>
                        )}

                        {groups.thisWeek.length > 0 && (
                          <div>
                            <div className="px-6 py-2 bg-[#f8f9fa] border-b border-slate-100/80 text-[10px] font-bold text-[#5f6368] tracking-wider uppercase select-none">
                              Earlier this week
                            </div>
                            {groups.thisWeek.map(renderRow)}
                          </div>
                        )}

                        {groups.older.length > 0 && (
                          <div>
                            <div className="px-6 py-2 bg-[#f8f9fa] border-b border-slate-100/80 text-[10px] font-bold text-[#5f6368] tracking-wider uppercase select-none">
                              Older
                            </div>
                            {groups.older.map(renderRow)}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Footer Section */}
                <div className="px-6 py-4 bg-[#f8f9fa] border-t border-slate-200 flex items-center justify-between gap-2.5 shrink-0">
                  <div className="text-xs text-slate-500 font-medium">
                    {selectedFileIds.size > 0 ? (
                      <span className="text-[#1a73e8] font-bold">
                        {selectedFileIds.size} of {effectiveMaxFiles} file(s) selected
                      </span>
                    ) : (
                      <span>Click to select up to {effectiveMaxFiles} files to attach</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="custom-picker-cancel"
                      type="button"
                      onClick={() => {
                        setSelectedFileIds(new Set());
                        setIsModalOpen(false);
                      }}
                      className="px-4.5 py-2 text-[#1a73e8] hover:bg-slate-100 font-semibold rounded-full text-xs cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      id="custom-picker-submit"
                      type="button"
                      onClick={handleAttachSelected}
                      disabled={selectedFileIds.size === 0 || isLoading}
                      className="px-5.5 py-2 bg-[#1a73e8] hover:bg-[#1b66ca] disabled:bg-[#f1f3f4] disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-full text-xs shadow-sm transition-colors cursor-pointer"
                    >
                      {selectedFileIds.size > 1
                        ? `Attach ${selectedFileIds.size} Files`
                        : selectedFileIds.size === 1
                        ? "Attach 1 File"
                        : "Select Files"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white flex flex-col items-center justify-center space-y-4">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-xs">
                  <GoogleDriveIcon size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 font-sans">Google Drive Connection Required</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-sans">
                    Authorize Google Drive access to browse and select files directly from your workspace.
                  </p>
                </div>
                {onGoogleSignIn && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onGoogleSignIn();
                    }}
                    className="mt-2 px-5 py-2.5 bg-[#1a73e8] hover:bg-[#1b66ca] text-white font-semibold rounded-full text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <GoogleDriveIcon size={16} />
                    Connect & Authorize Google Drive Access
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
