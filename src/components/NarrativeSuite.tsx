import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, ArrowRightLeft, Sparkles, RefreshCw, 
  HelpCircle, Check, FileCheck, CheckCircle2,
  UploadCloud, FileUp, Trash2, ClipboardList, Plus, ChevronDown, ChevronUp, Copy,
  Maximize2, X, BookmarkPlus, Layers, BookOpen, Clock, Cpu, CheckCircle, Wand2, ArrowRight
} from "lucide-react";
import { createGoogleDoc } from "../utils/googleWorkspace";
import { parseExternalChatFile, ParsedMessage } from "../utils/domParser";
import { GooglePickerButton } from "./GooglePickerButton";
import { SaveToDrivePickerModal } from "./SaveToDrivePickerModal";
import { safeFetchJson } from "../utils/apiClient";

interface NarrativeSuiteProps {
  chatTranscript: string;
  onEditNarrative: (text: string, mode: string, instructions: string, signal?: AbortSignal) => Promise<{ editedText: string; ragSummary?: string }>;
  ragSummary?: string;
  onUpdateRagSummary?: (newSummary: string) => void;
  googleToken: string | null;
  onClearGoogleToken?: () => void;
  onUpdateWorldSetting: (setting: string) => void;
  onUpdateStyleGuide: (guide: string) => void;
  onImportMessages?: (importedList: ParsedMessage[], append: boolean) => Promise<void>;
  projectId?: string;
  projectName?: string;
  onGoogleSignIn?: () => Promise<string | undefined> | void;
  onShowToast?: (title: string, description: string, type?: "success" | "error" | "info") => void;
  onAttachToSources?: (title: string, content: string, category?: string) => Promise<void> | void;
}

interface TransformationStage {
  id: number;
  label: string;
  shortLabel: string;
  detail: string;
  minPercent: number;
  maxPercent: number;
}

const TRANSFORMATION_STAGES: TransformationStage[] = [
  { id: 1, label: "Scanning Narrative Structure", shortLabel: "Parse & Tokenize", detail: "Scanning dialogue lines, scene context, and narrative prose...", minPercent: 0, maxPercent: 25 },
  { id: 2, label: "Analyzing Natural Language Intent", shortLabel: "Intent Analysis", detail: "Deconstructing perspective shifts, tone adjustments, and scene directions...", minPercent: 25, maxPercent: 50 },
  { id: 3, label: "Executing Stylistic Prose Transformation", shortLabel: "Prose Rewrite", detail: "Restructuring narrative syntax, pacing, and immersive prose flow...", minPercent: 50, maxPercent: 75 },
  { id: 4, label: "Polishing Dialogue & Character Voice", shortLabel: "Dialogue Polish", detail: "Fine-tuning character voice consistency, sensory detail, and flow...", minPercent: 75, maxPercent: 90 },
  { id: 5, label: "Synthesizing RAG Memory Anchor", shortLabel: "RAG Anchoring", detail: "Compiling key plot developments and finalizing chapter export...", minPercent: 90, maxPercent: 100 },
];

export default function NarrativeSuite({
  chatTranscript,
  onEditNarrative,
  ragSummary,
  onUpdateRagSummary,
  googleToken,
  onClearGoogleToken,
  onUpdateWorldSetting,
  onUpdateStyleGuide,
  onImportMessages,
  projectId = "",
  projectName = "Active Project",
  onGoogleSignIn,
  onShowToast,
  onAttachToSources,
}: NarrativeSuiteProps) {
  const [editorText, setEditorText] = useState(chatTranscript || "");
  const [editedResult, setEditedResult] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStageIndex, setProgressStageIndex] = useState(0);
  const [progressDetail, setProgressDetail] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [docExportUrl, setDocExportUrl] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "success" | "error">("idle");
  const [showSaveDrivePickerModal, setShowSaveDrivePickerModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSendingToSpark, setIsSendingToSpark] = useState(false);
  const [isAttachingToSources, setIsAttachingToSources] = useState(false);
  const [attachedToSourcesSuccess, setAttachedToSourcesSuccess] = useState(false);
  const [isExpandedSuiteEditor, setIsExpandedSuiteEditor] = useState(false);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCancelTransformation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setIsProcessing(false);
    setProgressPercent(0);
    setProgressStageIndex(0);
    setProgressDetail("");
    if (onShowToast) {
      onShowToast("Transformation Cancelled", "Narrative transformation was stopped. Your original text is intact.", "info");
    }
  };

  const handleAttachToSources = async () => {
    const textToAttach = editedResult || editorText;
    if (!textToAttach || !textToAttach.trim()) {
      onShowToast?.("⚠️ No Content", "Please provide or polish some narrative text before attaching to grounding sources!", "info");
      return;
    }
    setIsAttachingToSources(true);
    try {
      const title = `${projectName || "Campaign"} - Polished Chapter (${new Date().toLocaleDateString()})`;
      if (onAttachToSources) {
        await onAttachToSources(title, textToAttach, "narrative");
      }
      setAttachedToSourcesSuccess(true);
      setTimeout(() => setAttachedToSourcesSuccess(false), 4000);
      onShowToast?.("✨ Attached to Grounding Sources!", `Polished chapter was added as an active narrative source in the RAG retrieval engine.`, "success");
    } catch (err: any) {
      console.error("Error attaching narrative to grounding sources:", err);
      onShowToast?.("Attachment Error", err.message || "Failed to attach narrative to grounding sources.", "error");
    } finally {
      setIsAttachingToSources(false);
    }
  };

  const handleSendPolishToSpark = async () => {
    const textToSend = editedResult || editorText;
    if (!textToSend || !textToSend.trim()) {
      onShowToast?.("Empty Text", "No text content available to export to Spark Archive.", "error");
      return;
    }
    setIsSendingToSpark(true);
    try {
      let currentToken = googleToken;
      if (!currentToken && onGoogleSignIn) {
        currentToken = (await onGoogleSignIn()) || null;
      }
      const title = `${projectName || "Campaign"} - Polished Chapter (${new Date().toLocaleDateString()})`;
      let data: any;
      try {
        data = await safeFetchJson<any>("/api/spark/export-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: currentToken || "",
            projectId,
            threadTitle: title,
            transcriptText: textToSend
          }),
          timeout: 45000
        });
      } catch (postErr: any) {
        if (postErr.message?.includes("401") || postErr.message?.includes("auth") || postErr.message?.includes("expired")) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("nyx_google_auth_expired"));
          }
          if (onGoogleSignIn) {
            onShowToast?.("Re-authenticating...", "Google Drive token expired. Opening Google Sign In...", "info");
            const refreshedToken = await onGoogleSignIn();
            if (refreshedToken) {
              data = await safeFetchJson<any>("/api/spark/export-thread", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token: refreshedToken,
                  projectId,
                  threadTitle: title,
                  transcriptText: textToSend
                }),
                timeout: 45000
              });
            } else {
              throw postErr;
            }
          } else {
            throw postErr;
          }
        } else {
          throw postErr;
        }
      }

      if (!data || !data.success) {
        throw new Error(data?.error || "Failed to send polish to Spark Archive");
      }
      onShowToast?.("✨ Polish Sent to Spark Archive!", "Polished chapter dumped into 01_Raw_Threads for background Spark parsing.", "success");
    } catch (err: any) {
      console.error("Error sending polish to Spark:", err);
      onShowToast?.("Spark Export Error", err.message || "Failed to send polish to Spark Archive.", "error");
    } finally {
      setIsSendingToSpark(false);
    }
  };

  // Sync editor text with active chat transcript if editor is empty
  useEffect(() => {
    if (chatTranscript && !editorText) {
      setEditorText(chatTranscript);
    }
  }, [chatTranscript]);

  // External file import states
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importedMessages, setImportedMessages] = useState<ParsedMessage[]>([]);
  const [importedFileName, setImportedFileName] = useState("");
  const [importStatusMessage, setImportStatusMessage] = useState("");
  const [showImportPreview, setShowImportPreview] = useState(false);

  const handleEditSubmit = async (customPrompt?: string) => {
    const promptToUse = customPrompt !== undefined ? customPrompt : instructions;
    const payloadText = editorText.trim() || chatTranscript;
    if (!payloadText.trim()) {
      if (onShowToast) {
        onShowToast("⚠️ Missing Text", "Please provide or load some narrative text in the raw transcript area first!", "info");
      } else {
        console.warn("Please provide some narrative text to edit first!");
      }
      return;
    }
    if (!promptToUse.trim()) {
      if (onShowToast) {
        onShowToast("⚠️ Missing Instructions", "Type what you'd like to change or polish in natural language!", "info");
      } else {
        console.warn("Please enter editing instructions!");
      }
      return;
    }

    // Initialize AbortController
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsProcessing(true);
    setProgressPercent(10);
    setProgressStageIndex(0);
    setProgressDetail(TRANSFORMATION_STAGES[0].detail);
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    // Dynamic, non-stalling smooth progress timer
    progressTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(Math.floor(elapsed * 10) / 10);

      setProgressPercent((prev) => {
        let calculated = 10;
        if (elapsed < 2) {
          calculated = 10 + (elapsed / 2) * 20; // 10% -> 30%
        } else if (elapsed < 6) {
          calculated = 30 + ((elapsed - 2) / 4) * 30; // 30% -> 60%
        } else if (elapsed < 12) {
          calculated = 60 + ((elapsed - 6) / 6) * 22; // 60% -> 82%
        } else if (elapsed < 20) {
          calculated = 82 + ((elapsed - 12) / 8) * 11; // 82% -> 93%
        } else {
          // Asymptotic smooth increments beyond 20s (93% -> 99%)
          calculated = 93 + Math.min(6, ((elapsed - 20) / 25) * 5.8);
        }

        const nextPercent = Math.min(99, Math.max(prev + 0.15, Math.round(calculated * 10) / 10));
        const roundedInt = Math.floor(nextPercent);

        // Update stage index
        const stageIdx = TRANSFORMATION_STAGES.findIndex(s => roundedInt >= s.minPercent && roundedInt < s.maxPercent);
        if (stageIdx !== -1) {
          setProgressStageIndex(stageIdx);
        } else if (roundedInt >= 90) {
          setProgressStageIndex(4);
        }

        // Dynamic detail message based on elapsed duration to reassure user
        if (elapsed > 35) {
          setProgressDetail("Finalizing large payload assembly from Gemini engine...");
        } else if (elapsed > 20) {
          setProgressDetail("Receiving high-fidelity prose response from AI model...");
        } else if (elapsed > 12) {
          setProgressDetail("Polishing dialogue cadence and finalizing narrative anchor...");
        } else if (stageIdx !== -1) {
          setProgressDetail(TRANSFORMATION_STAGES[stageIdx].detail);
        }

        return nextPercent;
      });
    }, 120);

    try {
      const { editedText, ragSummary: newSummary } = await onEditNarrative(
        payloadText, 
        "natural_language", 
        promptToUse, 
        signal
      );
      
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProgressPercent(100);
      setProgressStageIndex(TRANSFORMATION_STAGES.length - 1);
      setProgressDetail("Transformation complete! Polished narrative is ready.");
      
      // Brief pause to display 100% completion before revealing output
      await new Promise(resolve => setTimeout(resolve, 400));

      setEditedResult(editedText || payloadText);
      if (newSummary) {
        onUpdateRagSummary?.(newSummary);
      }
      if (onShowToast) {
        onShowToast("✨ Narrative Processed!", "Transformation complete! Review the polished narrative in the output panel.", "success");
      }
    } catch (err: any) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      
      // If user deliberately aborted, suppress error toast
      if (err?.name === "AbortError" || signal.aborted) {
        return;
      }

      console.error("Narrative transformation error:", err);
      const errMsg = err?.message || String(err);
      if (onShowToast) {
        onShowToast("❌ Edit Failed", errMsg || "Failed to process narrative edit. Please try again.", "error");
      } else {
        console.warn("Failed to process narrative edit: " + errMsg);
      }
    } finally {
      setIsProcessing(false);
      setProgressPercent(0);
    }
  };

  const handleGoogleDocsExport = () => {
    const textToExport = editedResult || editorText;
    if (!textToExport) {
      if (onShowToast) {
        onShowToast("⚠️ No Content", "Please provide or load some narrative text to export!", "info");
      } else {
        console.warn("No narrative text to export!");
      }
      return;
    }
    setShowSaveDrivePickerModal(true);
  };

  const processUploadedFile = (file: File) => {
    setImportedFileName(file.name);
    setImportStatusMessage("Reading and parsing file...");
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawText = e.target?.result as string;
      if (!rawText) {
        setImportStatusMessage("Error: Could not read file content.");
        return;
      }
      
      const { messages: parsed } = parseExternalChatFile(file.name, rawText);
      if (parsed && parsed.length > 0) {
        setImportedMessages(parsed);
        const formatted = parsed
          .map(m => m.speaker ? `[${m.speaker}] ${m.content}` : m.content)
          .join("\n\n");
        setEditorText(formatted);
        setImportStatusMessage(`Successfully parsed ${parsed.length} messages from "${file.name}" and populated raw transcript & scene text!`);
        setShowImportPreview(true);
      } else if (rawText && rawText.trim()) {
        setEditorText(rawText);
        setImportStatusMessage(`Loaded raw text from "${file.name}" into raw transcript & scene text!`);
      } else {
        setImportStatusMessage("Could not parse messages. Please make sure the file contains dialogue or chat elements.");
      }
    };
    reader.onerror = () => {
      setImportStatusMessage("Error: Failed to load file.");
    };
    reader.readAsText(file);
  };

  const processPickedGoogleFile = (name: string, text: string) => {
    setImportedFileName(name);
    setImportStatusMessage("Reading and parsing Google Doc...");
    const { messages: parsed } = parseExternalChatFile(name, text);
    if (parsed && parsed.length > 0) {
      setImportedMessages(parsed);
      const formatted = parsed
        .map(m => m.speaker ? `[${m.speaker}] ${m.content}` : m.content)
        .join("\n\n");
      setEditorText(formatted);
      setImportStatusMessage(`Successfully parsed ${parsed.length} messages from "${name}" and populated raw transcript & scene text!`);
      setShowImportPreview(true);
    } else if (text && text.trim()) {
      setEditorText(text);
      setImportStatusMessage(`Loaded raw text from "${name}" into raw transcript & scene text!`);
    } else {
      setImportStatusMessage("Could not parse messages. Please make sure the file contains dialogue or chat elements.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleApplyToEditor = () => {
    if (importedMessages.length === 0) return;
    const formatted = importedMessages
      .map(m => `[${m.speaker}] ${m.content}`)
      .join("\n\n");
    setEditorText(formatted);
    setImportStatusMessage("Applied imported text to active editor view!");
  };

  const handleApplyToActiveChat = async (append: boolean) => {
    if (importedMessages.length === 0 || !onImportMessages) return;
    try {
      await onImportMessages(importedMessages, append);
      const formatted = importedMessages
        .map(m => m.speaker ? `[${m.speaker}] ${m.content}` : m.content)
        .join("\n\n");
      if (append && editorText.trim()) {
        setEditorText(prev => `${prev}\n\n${formatted}`);
      } else {
        setEditorText(formatted);
      }
      setImportStatusMessage(
        append 
          ? `Appended ${importedMessages.length} messages to live chat & transcript!` 
          : `Overwrote live chat & transcript with ${importedMessages.length} imported messages!`
      );
    } catch (err) {
      console.error(err);
      setImportStatusMessage("Failed to update active chat.");
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-900 text-slate-100 p-3 sm:p-5 lg:p-6 rounded-2xl border border-slate-800 overflow-y-auto overflow-x-hidden relative scrollbar-thin">
      <div className="mb-4 sm:mb-6 shrink-0 flex flex-wrap justify-between items-start gap-3">
        <div>
          <h2 className="text-xl font-sans font-semibold tracking-tight text-emerald-400">Narrative Editing Suite</h2>
          <p className="text-xs text-slate-400">Convert roleplays to novels, fix inconsistencies, trigger scene retcons, and recalibrate system settings.</p>
        </div>
        <div className="flex items-center gap-1.5 lg:hidden">
          <button
            type="button"
            onClick={() => document.getElementById('narrative-source-panel')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-[10px] font-mono bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-emerald-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            ↓ Raw Source
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('narrative-output-panel')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-[10px] font-mono bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-800/50 transition-colors cursor-pointer"
          >
            ↓ Polished Output
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 flex-1 min-h-0">
        {/* Left Panel: Raw text input and commands */}
        <div id="narrative-source-panel" className="flex flex-col bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800/80 overflow-y-auto min-h-[500px] lg:min-h-0 lg:h-full scrollbar-thin">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3 shrink-0">
            <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Raw Transcript & Scene Text</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => document.getElementById('narrative-output-panel')?.scrollIntoView({ behavior: 'smooth' })}
                className="lg:hidden text-[10px] text-emerald-400 hover:text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-800/50 bg-emerald-950/40 cursor-pointer"
              >
                To Output ↓
              </button>
              <button
                onClick={() => setShowImportPanel(!showImportPanel)}
                className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition-all font-sans font-medium ${
                  showImportPanel 
                    ? "bg-purple-950/40 border-purple-500/40 text-purple-300" 
                    : "bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-800"
                }`}
              >
                <FileUp size={11} /> {showImportPanel ? "Hide Importer" : "Import External Chat"}
              </button>
              <button
                onClick={() => setEditorText(chatTranscript)}
                className="text-[10px] bg-slate-850 hover:bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-mono"
              >
                Load Active Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editorText.trim()) return;
                  const cleaned = editorText.replace(/\[[^\]]*\]/g, "").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
                  setEditorText(cleaned);
                  if (onShowToast) {
                    onShowToast("✂️ Brackets Stripped", "Removed all bracketed text [like this] from the transcript.", "success");
                  }
                }}
                className="text-[10px] bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono transition-colors cursor-pointer"
                title="Instantly remove all text enclosed in brackets [like this] from transcript text"
              >
                Strip [Brackets]
              </button>
            </div>
          </div>

          {/* ELEGANT DRAG AND DROP ZONE */}
          {showImportPanel && (
            <div className="mb-4 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 animate-fade-in relative">
              <h4 className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                📥 External Chat & Log Importer
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                Drop your exported JSON, TXT, MD, or HTML chat files here to parse them into structured narrative turns.
              </p>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative ${
                  isDragging 
                    ? "border-purple-500 bg-purple-950/20 text-purple-300 scale-[0.99]" 
                    : "border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400"
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".html,.htm,.json,.txt,.md"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud size={28} className="mx-auto text-purple-400 mb-2" />
                <p className="text-[11px] font-semibold text-slate-200">
                  {importedFileName ? `Selected: ${importedFileName}` : "Drag & Drop file or click to browse"}
                </p>
                <p className="text-[9px] text-slate-500 mt-1">Supports .html, .json, .txt, .md</p>
              </div>

              <div className="mt-2.5 flex justify-center">
                <GooglePickerButton
                  googleToken={googleToken}
                  onGoogleSignIn={onGoogleSignIn}
                  onFilePicked={(file) => {
                    processPickedGoogleFile(file.name, file.text || "");
                  }}
                  onShowToast={onShowToast}
                  mode="document"
                  className="w-full justify-center"
                  label="Import from Google Drive"
                />
              </div>

              {importStatusMessage && (
                <div className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg text-[10px] font-mono text-purple-300 flex items-start gap-1.5 leading-snug">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1 animate-pulse" />
                  <span className="flex-1">{importStatusMessage}</span>
                </div>
              )}

              {importedMessages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold border-b border-slate-800/40 pb-1">
                    <span>Parsed Thread Preview ({importedMessages.length} elements)</span>
                    <button
                      onClick={() => setShowImportPreview(!showImportPreview)}
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-0.5 font-sans"
                    >
                      {showImportPreview ? (
                        <>Hide <ChevronUp size={11} /></>
                      ) : (
                        <>Show Preview <ChevronDown size={11} /></>
                      )}
                    </button>
                  </div>

                  {showImportPreview && (
                    <div className="max-h-36 overflow-y-auto bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-2 font-mono text-[9px] text-slate-300 leading-normal">
                      {importedMessages.slice(0, 15).map((msg, i) => (
                        <div key={i} className="border-b border-slate-900/40 pb-1.5 last:border-0 last:pb-0">
                          <span className="text-purple-400 font-bold">{msg.speaker || "Narrator"}:</span>{" "}
                          <span className="text-slate-200">{msg.content}</span>
                        </div>
                      ))}
                      {importedMessages.length > 15 && (
                        <div className="text-[9px] text-slate-500 italic pt-1">
                          ... and {importedMessages.length - 15} more messages.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={handleApplyToEditor}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-200 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-slate-700/60"
                      title="Insert parsed text into editing textarea below"
                    >
                      <ClipboardList size={11} /> Load in Editor
                    </button>
                    <button
                      onClick={() => handleApplyToActiveChat(true)}
                      className="bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-purple-500/20"
                      title="Append all imported messages directly to live adventure feed"
                    >
                      <Plus size={11} /> Append to Playback
                    </button>
                    <button
                      onClick={() => handleApplyToActiveChat(false)}
                      className="bg-emerald-950/45 hover:bg-emerald-900/50 text-emerald-300 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-500/20"
                      title="Overwrite live adventure message feed completely with imported thread"
                    >
                      <Check size={11} /> Overwrite Playback
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 my-1 shrink-0">
            <span className="text-[10px] font-mono text-slate-400">
              Raw Source Content ({editorText.length} chars | {editorText.trim() ? editorText.trim().split(/\s+/).length : 0} words)
            </span>
            <button
              type="button"
              onClick={() => setIsExpandedSuiteEditor(true)}
              className="text-[10px] font-mono text-emerald-300 hover:text-emerald-100 bg-emerald-950/60 hover:bg-emerald-900/80 px-2 py-0.5 rounded-md border border-emerald-800/50 transition-all flex items-center gap-1 cursor-pointer"
              title="Expand into High-Capacity Fullscreen Editor"
            >
              <Maximize2 size={10} className="text-emerald-400" />
              <span>Expand Suite Editor</span>
            </button>
          </div>

          <textarea
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            placeholder="Paste raw conversation transcript, long chapter drafts, or scene blocks here... (Drag bottom edge to stretch)"
            className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-mono resize-y min-h-[160px] max-h-[500px] text-slate-200 scrollbar-thin"
          />

          <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-3 shrink-0">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-emerald-400" /> Natural Language Editing Command
                </label>
                <span className="text-[10px] font-mono text-slate-500">Ctrl+Enter to send</span>
              </div>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleEditSubmit();
                  }
                }}
                placeholder="Type anything in natural language e.g. 'Convert 1st person to immersive 3rd person past tense, make the tone more suspenseful, and remove out-of-character comments'..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 rounded-xl p-3 text-xs text-slate-100 outline-none resize-y min-h-[90px] max-h-[300px] transition-all font-sans leading-relaxed scrollbar-thin"
              />
            </div>

            {/* Quick Inspiration Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-mono mr-0.5">Presets:</span>
              {[
                "Rewrite in 3rd-person novel prose",
                "Remove all text in brackets [like this]",
                "Fix scene retcons & polish dialogue",
                "Summarize chapter into RAG memory anchor",
                "Enhance sensory descriptions & tone"
              ].map((presetText) => (
                <button
                  key={presetText}
                  type="button"
                  onClick={() => setInstructions(presetText)}
                  className="text-[10px] bg-slate-900 hover:bg-slate-850 hover:text-emerald-300 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800 transition-colors cursor-pointer"
                >
                  {presetText}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleEditSubmit()}
              disabled={isProcessing || (!instructions.trim() && !editorText.trim() && !chatTranscript.trim())}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-800 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/30 cursor-pointer disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-emerald-200" />
                  <span>Transforming Narrative ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-emerald-200" />
                  <span>Execute Natural Language Edit</span>
                </>
              )}
            </button>

            {/* Transforming Narrative Progress Bar Card in Left Pane */}
            {isProcessing && (
              <div className="bg-slate-900/95 border border-emerald-500/40 rounded-xl p-3.5 shadow-lg shadow-emerald-950/20 space-y-2.5 animate-fade-in">
                {/* Stage header & percentage */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-bold text-emerald-300 truncate">
                      {TRANSFORMATION_STAGES[progressStageIndex]?.label || "Transforming Narrative..."}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} className="text-emerald-400" />
                      {elapsedSeconds.toFixed(1)}s
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold text-[11px]">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                </div>

                {/* Animated Progress Bar Track */}
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5 relative shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-200 ease-out relative shadow-sm"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/25 animate-pulse rounded-full" />
                  </div>
                </div>

                {/* Stage detail text & Cancel Button */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="truncate text-slate-300">
                    {progressDetail || "Processing narrative prose..."}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelTransformation}
                    className="text-[10px] text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 px-1.5 py-0.5 rounded border border-red-800/40 transition-colors ml-2 cursor-pointer font-sans"
                    title="Stop narrative transformation"
                  >
                    Cancel
                  </button>
                </div>

                {/* Step Badges Row */}
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {TRANSFORMATION_STAGES.map((stg, sIdx) => {
                    const isDone = progressPercent > stg.maxPercent || progressStageIndex > sIdx;
                    const isCurrent = progressStageIndex === sIdx;
                    return (
                      <div
                        key={stg.id}
                        className={`text-center py-1 px-0.5 rounded border text-[9px] font-mono truncate transition-all ${
                          isDone
                            ? "bg-emerald-950/60 border-emerald-600/50 text-emerald-300 font-semibold"
                            : isCurrent
                            ? "bg-emerald-900/40 border-emerald-400 text-emerald-200 font-bold ring-1 ring-emerald-500/50 animate-pulse"
                            : "bg-slate-950 border-slate-800/80 text-slate-600"
                        }`}
                        title={`${stg.label}: ${stg.detail}`}
                      >
                        {stg.shortLabel}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Polished/edited result and Google Doc export */}
        <div id="narrative-output-panel" className="flex flex-col bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800/80 overflow-y-auto min-h-[500px] lg:min-h-0 lg:h-full scrollbar-thin">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3 shrink-0">
            <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Polished Narrative Output</h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('narrative-source-panel')?.scrollIntoView({ behavior: 'smooth' })}
                className="lg:hidden text-[10px] text-slate-400 hover:text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-800 bg-slate-900 cursor-pointer"
              >
                ↑ To Source
              </button>
              {editedResult && !isProcessing && (
                <>
                  <button
                    onClick={handleAttachToSources}
                    disabled={isAttachingToSources}
                    className="text-[10px] bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 px-2 py-0.5 rounded border border-purple-700/50 flex items-center gap-1 font-mono transition-colors cursor-pointer disabled:opacity-50"
                    title="Attach this polished text directly to your campaign's RAG grounding sources"
                  >
                    <BookmarkPlus size={11} className="text-purple-400" />
                    <span>Attach to Sources</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(editedResult);
                      setIsCopied(true);
                      onShowToast?.("Copied!", "Polished narrative copied to clipboard.", "success");
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className="text-[10px] bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1 font-mono transition-colors"
                    title="Copy polished output text"
                  >
                    {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    {isCopied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => {
                      setEditorText(editedResult);
                      onShowToast?.("Updated Editor!", "Replaced raw text in editor with polished output.", "info");
                    }}
                    className="text-[10px] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1 font-mono transition-colors"
                    title="Replace raw text in left editor with this polished output"
                  >
                    <ClipboardList size={11} /> Replace Editor Text
                  </button>
                  <button
                    onClick={() => setEditedResult("")}
                    className="text-[10px] bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-red-400 px-1.5 py-0.5 rounded border border-slate-800 font-mono transition-colors"
                    title="Clear output view"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
              <span className="text-[9px] text-slate-500 font-mono">Novel-Grade Polish</span>
            </div>
          </div>

          {isProcessing ? (
            <div className="flex-1 w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-start sm:justify-center text-center relative overflow-y-auto animate-fade-in shadow-inner min-h-[260px] scrollbar-thin">
              {/* Ambient Glow */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-md w-full space-y-5">
                {/* Icon and Title */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50 relative">
                    <Wand2 size={22} className="animate-pulse text-emerald-300" />
                    <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 animate-ping pointer-events-none opacity-40" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center justify-center gap-1.5">
                      <span>Transforming Narrative</span>
                      <span className="text-emerald-400 text-xs font-mono font-normal">({Math.round(progressPercent)}%)</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {TRANSFORMATION_STAGES[progressStageIndex]?.label || "Refining prose & structure..."}
                    </p>
                  </div>
                </div>

                {/* Prominent Progress Bar in Output Panel */}
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-200 ease-out relative"
                      style={{ width: `${progressPercent}%` }}
                    >
                      <div className="absolute inset-0 bg-white/25 animate-pulse rounded-full" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate pr-2">{progressDetail}</span>
                    <span className="shrink-0 text-emerald-400">{elapsedSeconds.toFixed(1)}s elapsed</span>
                  </div>
                </div>

                {/* Transformation Stage Pipeline Checklist */}
                <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3.5 text-left space-y-2 font-mono text-xs shadow-inner">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center justify-between">
                    <span>Active Pipeline Stages</span>
                    <span className="text-emerald-400 font-normal">Gemini Engine</span>
                  </div>
                  {TRANSFORMATION_STAGES.map((stg, sIdx) => {
                    const isDone = progressPercent > stg.maxPercent || progressStageIndex > sIdx;
                    const isCurrent = progressStageIndex === sIdx;
                    return (
                      <div
                        key={stg.id}
                        className={`flex items-center gap-2 text-[11px] transition-colors ${
                          isDone
                            ? "text-emerald-400 font-medium"
                            : isCurrent
                            ? "text-emerald-200 font-bold"
                            : "text-slate-600"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <RefreshCw size={13} className="animate-spin text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[9px] text-slate-600 shrink-0">
                            {stg.id}
                          </div>
                        )}
                        <span className="truncate">{stg.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Live context snippet and Cancel button */}
                <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono bg-slate-950/70 px-3 py-2 rounded-lg border border-slate-800/60">
                  <span className="truncate">Processing {(editorText || chatTranscript).length} characters</span>
                  <button
                    type="button"
                    onClick={handleCancelTransformation}
                    className="text-[10px] text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 px-2 py-1 rounded border border-red-800/40 transition-colors font-sans font-semibold cursor-pointer shrink-0"
                  >
                    Cancel Transformation
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs overflow-y-auto font-serif whitespace-pre-wrap text-slate-100 leading-relaxed min-h-[200px] scrollbar-thin">
              {editedResult || "Run a narration suite tool on the left to see the finished story output here."}
            </div>
          )}

          {/* Export and Grounding Action Controls */}
          <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-3 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={handleAttachToSources}
                disabled={isAttachingToSources}
                className="bg-purple-950/70 hover:bg-purple-900/90 border border-purple-500/50 hover:border-purple-400 text-purple-200 transition-all py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-950/30 cursor-pointer disabled:opacity-50"
                title="Attach polished narrative chapter to active RAG Lore Sources for story grounding"
              >
                {isAttachingToSources ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-purple-400" /> Attaching...
                  </>
                ) : (
                  <>
                    <Layers size={13} className="text-purple-400" /> Attach to Sources
                  </>
                )}
              </button>

              <button
                onClick={handleGoogleDocsExport}
                disabled={exportStatus === "exporting"}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-blue-900/10 cursor-pointer disabled:opacity-50"
              >
                {exportStatus === "exporting" ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Exporting...
                  </>
                ) : (
                  <>
                    <FileText size={13} /> Export to Google Doc
                  </>
                )}
              </button>

              <button
                onClick={handleSendPolishToSpark}
                disabled={isSendingToSpark}
                className="bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/50 hover:border-amber-400 text-amber-200 transition-all py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/20 cursor-pointer disabled:opacity-50"
                title="Dump polished chapter into 01_Raw_Threads in Google Drive for Spark Archivist processing"
              >
                {isSendingToSpark ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-amber-400" /> Sending to Spark...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="text-amber-400" /> Send to Spark Archive
                  </>
                )}
              </button>
            </div>

            {attachedToSourcesSuccess && (
              <div className="p-2.5 bg-purple-950/50 border border-purple-800/60 rounded-lg text-xs text-purple-300 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                <span>Polished narrative chapter attached to active Campaign Grounding Sources!</span>
              </div>
            )}

            {exportStatus === "success" && docExportUrl && (
              <div className="p-2.5 bg-green-950/40 border border-green-900/60 rounded-lg text-xs text-green-300 flex items-center justify-between gap-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <FileCheck size={14} className="text-green-400 shrink-0" />
                  <span>Narrative exported successfully to Google Docs!</span>
                </div>
                <a
                  href={docExportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 underline font-mono text-[10px]"
                >
                  Open Doc
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save to Google Drive Picker Modal */}
      <SaveToDrivePickerModal
        isOpen={showSaveDrivePickerModal}
        onClose={() => setShowSaveDrivePickerModal(false)}
        googleToken={googleToken}
        onGoogleSignIn={onGoogleSignIn}
        exportTitle={`Nyx Roleplay Transcript - ${projectName || "Campaign"} (${new Date().toLocaleDateString()})`}
        exportContent={editedResult || editorText}
        onExportSuccess={(docId, url) => {
          setDocExportUrl(url);
          setExportStatus("success");
        }}
        onShowToast={onShowToast}
      />

      {/* FULLSCREEN / HIGH-CAPACITY NARRATIVE SUITE EDITOR MODAL */}
      {isExpandedSuiteEditor && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-950 p-2 rounded-xl text-emerald-300 border border-emerald-800/50">
                  <Maximize2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Expanded Narrative Editor
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/50">
                      High Capacity Suite
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {editorText.length} chars | {editorText.trim() ? editorText.trim().split(/\s+/).length : 0} words | {editorText.split('\n').length} lines
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(editorText);
                    onShowToast?.("Copied!", "Editor content copied to clipboard.", "info");
                  }}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Copy size={12} /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpandedSuiteEditor(false)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Split / Big Textarea Content */}
            <div className="flex-1 p-4 bg-slate-950 flex flex-col gap-3 overflow-y-auto min-h-0 scrollbar-thin">
              <div className="flex-1 flex flex-col min-h-[220px]">
                <label className="text-xs font-semibold text-slate-300 mb-1 font-mono flex justify-between">
                  <span>Source Chapter / Raw Transcript Text</span>
                  <span className="text-slate-500">Monospace View</span>
                </label>
                <textarea
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  placeholder="Paste or write large raw transcripts or chapter drafts..."
                  className="flex-1 w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/80 rounded-xl p-4 text-xs text-slate-100 font-mono outline-none resize-none leading-relaxed scrollbar-thin min-h-[180px]"
                  autoFocus
                />
              </div>

              <div className="shrink-0 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-emerald-400" /> Natural Language Command
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">Ctrl+Enter to Execute</span>
                </div>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      setIsExpandedSuiteEditor(false);
                      handleEditSubmit();
                    }
                  }}
                  placeholder="e.g. Rewrite in 3rd-person novel prose, clean up dialogue, and enhance tone..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/60 rounded-xl p-3 text-xs text-slate-100 outline-none resize-none font-sans"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2 shrink-0">
              {isProcessing && (
                <div className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl p-2.5 space-y-1.5 animate-fade-in">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <RefreshCw size={12} className="animate-spin text-emerald-400" />
                      {TRANSFORMATION_STAGES[progressStageIndex]?.label || "Transforming Narrative..."}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-mono font-bold text-xs">{Math.round(progressPercent)}%</span>
                      <button
                        type="button"
                        onClick={handleCancelTransformation}
                        className="text-[10px] text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 px-1.5 py-0.5 rounded border border-red-800/40 font-mono cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-200"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center gap-2">
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  Editing full narrative source before processing
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExpandedSuiteEditor(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                  >
                    Done Editing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpandedSuiteEditor(false);
                      handleEditSubmit();
                    }}
                    disabled={isProcessing}
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Transforming ({progressPercent}%)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Execute Polish Command (Ctrl+Enter)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
