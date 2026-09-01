import React, { useState, useRef } from "react";
import { GeneratedImage } from "../types";
import { 
  Sparkles, Image as ImageIcon, Video, Folder, 
  Download, RefreshCw, Upload, FileCheck, Check, Trash, X 
} from "lucide-react";
import { GooglePickerButton } from "./GooglePickerButton";
import { useFunnyLoading } from "../utils/useFunnyLoading";

interface ImageVideoSuiteProps {
  gallery: GeneratedImage[];
  onGenerateImage: (prompt: string, aspectRatio: string, references: string[]) => Promise<void>;
  onGenerateVideo: (prompt: string, imageBase64: string, aspectRatio: string) => Promise<void>;
  projectId: string;
  isGenerating: boolean;
  videoResult: string | null;
  googleToken?: string | null;
  onGoogleSignIn?: () => void;
  onShowToast?: (title: string, description: string, type?: "success" | "error" | "info") => void;
  project?: any;
  characters?: any[];
}

export default function ImageVideoSuite({
  gallery,
  onGenerateImage,
  onGenerateVideo,
  projectId,
  isGenerating,
  videoResult,
  googleToken,
  onGoogleSignIn,
  onShowToast,
  project,
  characters,
}: ImageVideoSuiteProps) {
  const [imagePrompt, setImagePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showPromptPopup, setShowPromptPopup] = useState(false);

  // Video states
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoAspect, setVideoAspect] = useState("16:9");
  const [videoSourceBase64, setVideoSourceBase64] = useState("");
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local uploads history (max 14 references can be picked)
  const [uploadHistory, setUploadHistory] = useState<string[]>([]);

  const funnyImageLoadingText = useFunnyLoading(isGenerating, "Nyx is drawing scene...", 7500, { project, characters });
  const funnyVideoLoadingText = useFunnyLoading(isVideoGenerating, "Animating via Veo...", 7500, { project, characters });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    (Array.from(files) as File[]).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUploadHistory(prev => {
          const updated = [base64, ...prev];
          return updated.slice(0, 14); // keep max 14 uploaded images in history
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const toggleReference = (imgUrl: string) => {
    setSelectedReferences(prev => {
      if (prev.includes(imgUrl)) {
        return prev.filter(r => r !== imgUrl);
      }
      if (prev.length >= 14) {
        alert("Maximum 14 reference images allowed!");
        return prev;
      }
      return [...prev, imgUrl];
    });
  };

  const handleImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt || isGenerating) return;
    await onGenerateImage(imagePrompt, aspectRatio, selectedReferences);
    setImagePrompt("");
    setSelectedReferences([]);
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt && !videoSourceBase64) return;
    setIsVideoGenerating(true);
    try {
      await onGenerateVideo(videoPrompt, videoSourceBase64, videoAspect);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVideoGenerating(false);
    }
  };

  const projectImages = gallery.filter(img => img.projectId === projectId);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800">
      <div className="mb-6">
        <h2 className="text-xl font-sans font-semibold tracking-tight text-pink-500">Nano Banana 2 & Video Suite</h2>
        <p className="text-xs text-slate-400">Generate high fidelity narrative snapshots and cinema clips using Google's latest imaging suite.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Left Column: Generator Form & Reference Manager */}
        <div className="space-y-6 overflow-y-auto pr-1">
          {/* Image creation form */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80">
            <h3 className="text-sm font-semibold mb-3 text-pink-400 flex items-center gap-2">
              <ImageIcon size={15} /> Nano Banana 2 Image Gen
            </h3>
            <form onSubmit={handleImageSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Snapshot Description</label>
                <textarea
                  required
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={3}
                  placeholder="A cinematic snapshot of Nyx looking through star charts on the bridge of the Millenium Falcon, hyper-realistic, volumetric lighting..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pink-500 outline-none resize-none font-mono text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-pink-500 outline-none"
                  >
                    <option value="1:1">Square (1:1)</option>
                    <option value="16:9">Widescreen (16:9)</option>
                    <option value="9:16">Portrait (9:16)</option>
                    <option value="4:3">Standard (4:3)</option>
                    <option value="3:4">Tall (3:4)</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 flex-1"
                    >
                      <Upload size={13} /> Upload Refs
                    </button>
                    <GooglePickerButton
                      googleToken={googleToken}
                      onGoogleSignIn={onGoogleSignIn}
                      onFilePicked={(file) => {
                        setUploadHistory(prev => {
                          const updated = [file.data, ...prev];
                          return updated.slice(0, 14);
                        });
                      }}
                      onShowToast={onShowToast}
                      mode="image"
                      className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 flex-1 font-sans"
                      label="Drive / Photos"
                    />
                  </div>
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>

              {/* Reference selectors (Max 14) */}
              { (uploadHistory.length > 0 || projectImages.length > 0) && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-slate-400">
                      References ({selectedReferences.length}/14 chosen)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Image-2-Image</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto py-1 border border-slate-800/50 rounded-lg p-1.5 bg-slate-900/40">
                    {/* Upload history */}
                    {uploadHistory.map((upImg, idx) => {
                      const isSelected = selectedReferences.includes(upImg);
                      return (
                        <button
                          type="button"
                          key={`up-${idx}`}
                          onClick={() => toggleReference(upImg)}
                          className={`relative shrink-0 w-12 h-12 rounded border ${isSelected ? 'border-pink-500 ring-1 ring-pink-500' : 'border-slate-800'} overflow-hidden`}
                        >
                          <img src={upImg} className="w-full h-full object-cover" alt="Upload Ref" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-pink-600/30 flex items-center justify-center">
                              <Check size={10} className="text-white font-bold" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {/* Gallery items as possible references */}
                    {projectImages.map((galImg) => {
                      const isSelected = selectedReferences.includes(galImg.url);
                      return (
                        <button
                          type="button"
                          key={galImg.id}
                          onClick={() => toggleReference(galImg.url)}
                          className={`relative shrink-0 w-12 h-12 rounded border ${isSelected ? 'border-pink-500 ring-1 ring-pink-500' : 'border-slate-800'} overflow-hidden`}
                        >
                          <img src={`data:image/jpeg;base64,${galImg.url}`} className="w-full h-full object-cover" alt="Gallery Ref" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-pink-600/30 flex items-center justify-center">
                              <Check size={10} className="text-white font-bold" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-pink-600 hover:bg-pink-700 active:bg-pink-800 disabled:bg-slate-800 transition-all py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-pink-900/20"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> {funnyImageLoadingText}
                  </>
                ) : (
                  <>
                    <Sparkles size={13} /> Run Nano Banana 2
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Video creation section */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80">
            <h3 className="text-sm font-semibold mb-3 text-pink-400 flex items-center gap-2">
              <Video size={15} /> Veo Video Animator (16:9 / 9:16)
            </h3>
            <form onSubmit={handleVideoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Cinematic motion prompt</label>
                <input
                  type="text"
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Gentle camera panning, leaves rustling, hair blowing, sci-fi lens flare..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pink-500 outline-none text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Source Image (for Image-to-Video)</label>
                <div className="flex gap-2 items-center">
                  <select
                    value={videoSourceBase64}
                    onChange={(e) => setVideoSourceBase64(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-pink-500 outline-none"
                  >
                    <option value="">-- Choose from Gallery --</option>
                    {projectImages.map((img, idx) => (
                      <option key={img.id} value={img.url}>
                        Snapshot #{idx + 1} - {img.prompt.slice(0, 20)}...
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500">Veo Omni</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300">
                    <input
                      type="radio"
                      name="videoAspect"
                      checked={videoAspect === "16:9"}
                      onChange={() => setVideoAspect("16:9")}
                      className="text-pink-500 focus:ring-0"
                    />
                    Landscape 16:9
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300">
                    <input
                      type="radio"
                      name="videoAspect"
                      checked={videoAspect === "9:16"}
                      onChange={() => setVideoAspect("9:16")}
                      className="text-pink-500 focus:ring-0"
                    />
                    Portrait 9:16
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isVideoGenerating || (!videoPrompt && !videoSourceBase64)}
                className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-slate-800 transition-all py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5"
              >
                {isVideoGenerating ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> {funnyVideoLoadingText}
                  </>
                ) : (
                  <>
                    <Video size={13} /> Generate Veo Cinema
                  </>
                )}
              </button>
            </form>

            {videoResult && (
              <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider block mb-1">Generated Movie Clip</span>
                <video src={videoResult} controls className="w-full rounded border border-slate-700" />
              </div>
            )}
          </div>
        </div>

        {/* Center/Right Columns: Gallery and details */}
        <div className="xl:col-span-2 flex flex-col h-full overflow-hidden">
          <h3 className="text-sm font-semibold mb-3 text-pink-400 flex items-center gap-1.5">
            <Folder size={15} /> World Snapshot Gallery ({projectImages.length})
          </h3>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1">
            {projectImages.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => {
                  setSelectedImage(img);
                  setShowPromptPopup(true);
                }}
                className={`group relative bg-slate-950 p-2.5 rounded-xl border ${selectedImage?.id === img.id ? 'border-pink-500 ring-1 ring-pink-500' : 'border-slate-800/80'} hover:border-pink-500/50 text-left transition-all overflow-hidden flex flex-col justify-between`}
              >
                <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-800 mb-2">
                  <img
                    src={`data:image/jpeg;base64,${img.url}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    alt={img.prompt}
                  />
                  <div className="absolute top-1.5 left-1.5 bg-slate-900/80 text-[9px] px-1.5 py-0.5 rounded backdrop-blur font-mono text-slate-300">
                    #{idx + 1}
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 line-clamp-2 font-serif px-1 mb-1 leading-relaxed">
                  "{img.prompt}"
                </p>

                <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-900">
                  <span>Seed: {img.seed}</span>
                  <span>
                    {img.timestamp ? (() => {
                      try {
                        const d = new Date(img.timestamp);
                        return isNaN(d.getTime()) ? img.timestamp : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      } catch {
                        return img.timestamp || "";
                      }
                    })() : ""}
                  </span>
                </div>
              </button>
            ))}

            {projectImages.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                <ImageIcon size={32} className="text-slate-700 mb-2" />
                <p className="text-xs">No snapshots generated for this world yet.</p>
                <p className="text-[10px] text-slate-600">Use Nano Banana 2 on the left to capture scene visuals!</p>
              </div>
            )}
          </div>

          {/* Image Details Card (Modal-like details sidebar) */}
          {selectedImage && (
            <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-pink-900/20 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded border border-pink-500/30 overflow-hidden shrink-0">
                  <img src={`data:image/jpeg;base64,${selectedImage.url}`} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-pink-400">Snapshot Technical Metadata</h4>
                  <p className="text-[10px] text-slate-400 max-w-xl font-mono mt-1">
                    Prompt: "{selectedImage.prompt}" | Tokens: {selectedImage.tokensUsed} | Seed: {selectedImage.seed} | Name: {selectedImage.fileName}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`data:image/jpeg;base64,${selectedImage.url}`}
                  download={selectedImage.fileName}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5"
                >
                  <Download size={11} /> Download
                </a>
                <button
                  onClick={() => {
                    setImagePrompt(selectedImage.prompt);
                    setSelectedReferences(selectedImage.references || []);
                  }}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw size={11} /> Remix Prompt
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPromptPopup && selectedImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
                <h3 className="text-sm font-semibold text-pink-400 font-mono">Snapshot Inspection Room</h3>
              </div>
              <button 
                onClick={() => setShowPromptPopup(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Full Image view */}
              <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                <img 
                  src={`data:image/jpeg;base64,${selectedImage.url}`} 
                  className="w-full h-full object-contain mx-auto" 
                  alt="Snapshot view" 
                />
              </div>

              {/* Text metadata */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">Generation Prompt</label>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 text-xs font-serif italic text-slate-200 leading-relaxed relative">
                    "{selectedImage.prompt}"
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-850">
                    <span className="block text-[8px] text-slate-500 uppercase font-mono">Tokens Used</span>
                    <span className="text-xs font-semibold text-slate-200">{selectedImage.tokensUsed}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-850">
                    <span className="block text-[8px] text-slate-500 uppercase font-mono">Seed</span>
                    <span className="text-xs font-semibold text-slate-200">{selectedImage.seed}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-850">
                    <span className="block text-[8px] text-slate-500 uppercase font-mono">Format</span>
                    <span className="text-xs font-semibold text-slate-200">1:1 Standard</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-850">
                    <span className="block text-[8px] text-slate-500 uppercase font-mono">File ID</span>
                    <span className="text-xs font-semibold text-slate-300 truncate block max-w-full" title={selectedImage.fileName}>
                      {selectedImage.fileName || "Auto-Named"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-between items-center">
              <span className="text-[9px] text-slate-500 font-mono">
                Captured: {selectedImage.timestamp ? (() => {
                  try {
                    const d = new Date(selectedImage.timestamp);
                    return isNaN(d.getTime()) ? selectedImage.timestamp : d.toLocaleString();
                  } catch {
                    return selectedImage.timestamp || "";
                  }
                })() : "Recently"}
              </span>
              <div className="flex gap-2">
                <a
                  href={`data:image/jpeg;base64,${selectedImage.url}`}
                  download={selectedImage.fileName || "snapshot.jpg"}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download size={12} /> Download
                </a>
                <button
                  onClick={() => {
                    setImagePrompt(selectedImage.prompt);
                    setSelectedReferences(selectedImage.references || []);
                    setShowPromptPopup(false);
                  }}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-pink-900/20"
                >
                  <RefreshCw size={12} /> Remix Prompt
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
