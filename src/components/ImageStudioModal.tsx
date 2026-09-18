import { useState } from "react";
import { ImageSize, GeneratedImage } from "../types";
import { IMAGE_SIZE_OPTIONS, IMAGE_PROMPT_PRESETS } from "../data/constants";
import {
  ImageIcon,
  X,
  Sparkles,
  Download,
  Send,
  Loader2,
  Maximize2,
  Layers,
  Ratio,
  AlertCircle,
} from "lucide-react";

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (image: GeneratedImage) => void;
  initialPrompt?: string;
}

export function ImageStudioModal({
  isOpen,
  onClose,
  onInsertToChat,
  initialPrompt = "",
}: ImageStudioModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Por favor, descreva o conceito científico ou filosófico que deseja visualizar.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          imageSize,
          aspectRatio,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error || "Erro desconhecido ao gerar a imagem conceitual.");
      }

      const newImg: GeneratedImage = {
        id: `img-${Date.now()}`,
        url: data.imageUrl,
        prompt: prompt.trim(),
        imageSize: data.imageSize || imageSize,
        aspectRatio: data.aspectRatio || aspectRatio,
        timestamp: Date.now(),
      };

      setGeneratedImage(newImg);
    } catch (err: any) {
      console.error("Erro na geração de imagem:", err);
      setError(err?.message || "Falha ao conectar com o modelo gemini-3-pro-image-preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage.url;
    link.download = `dialetica-conceito-${generatedImage.imageSize}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="image-studio-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="image-studio-modal-panel"
        className="w-full max-w-2xl bg-[#0f1422] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#141b2d]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white font-display">
                  Visualizador Conceitual & Científico
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/30">
                  gemini-3-pro-image-preview
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Geração de diagramas, modelos teóricos e experimentos mentais
              </p>
            </div>
          </div>
          <button
            id="close-image-studio-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Concept Description Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span>Descrição do Conceito ou Diagrama</span>
              <span className="text-[11px] font-normal text-slate-400">
                Linguagem natural em português ou inglês
              </span>
            </label>
            <textarea
              id="image-prompt-textarea"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Diagrama do experimento do Gato de Schrödinger mostrando a superposição da função de onda..."
              className="w-full bg-black/40 border border-white/15 focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/60 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 transition-all outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-2">
              Sugestões de Experimentos Mentais &amp; Modelos Físicos:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {IMAGE_PROMPT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`preset-prompt-${idx}`}
                  onClick={() => setPrompt(preset.prompt)}
                  className="text-left text-xs bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-pink-500/40 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-all"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* Image Size Selection - MANDATORY AFFORDANCE FOR 1K, 2K, 4K */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Layers className="w-4 h-4 text-pink-400" />
              <label className="text-xs font-semibold text-white">
                Resolução da Imagem (Dimensão de Saída)
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Configure a qualidade e fidelidade geométrica exigida pelo modelo gemini-3-pro-image-preview:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {IMAGE_SIZE_OPTIONS.map((opt) => {
                const isSelected = imageSize === opt.size;
                return (
                  <button
                    key={opt.size}
                    type="button"
                    id={`image-size-btn-${opt.size}`}
                    onClick={() => setImageSize(opt.size)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-pink-950/40 border-pink-500 text-white shadow-sm shadow-pink-950"
                        : "bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/[0.05] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold tracking-tight">{opt.size}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-pink-300">
                        {opt.resolution}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium mt-1 text-white">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-snug">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Ratio Selection */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Ratio className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-300">Proporção da Tela:</span>
            </div>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              {[
                { id: "1:1", label: "1:1 Quadrado" },
                { id: "16:9", label: "16:9 Widescreen" },
                { id: "4:3", label: "4:3 Padrão" },
                { id: "9:16", label: "9:16 Vertical" },
              ].map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  id={`aspect-ratio-btn-${ratio.id.replace(":", "-")}`}
                  onClick={() => setAspectRatio(ratio.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                    aspectRatio === ratio.id
                      ? "bg-pink-600 text-white font-medium"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Falha na geração</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedImage && (
            <div className="bg-black/50 border border-white/15 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Imagem Gerada com Sucesso
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    {generatedImage.imageSize} • {generatedImage.aspectRatio}
                  </span>
                  <button
                    onClick={() => setIsZoomed(true)}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Visualizar em tamanho grande"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center max-h-72">
                <img
                  src={generatedImage.url}
                  alt={generatedImage.prompt}
                  className="max-h-72 w-auto object-contain cursor-pointer"
                  onClick={() => setIsZoomed(true)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  id="download-image-btn"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar PNG
                </button>

                {onInsertToChat && (
                  <button
                    type="button"
                    id="insert-image-to-chat-btn"
                    onClick={() => {
                      onInsertToChat(generatedImage);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow-sm shadow-cyan-900 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Inserir no Debate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-[#141b2d]/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Resolução ativa: <strong className="text-pink-300">{imageSize}</strong> (
            {IMAGE_SIZE_OPTIONS.find((s) => s.size === imageSize)?.resolution})
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Fechar
            </button>

            <button
              type="button"
              id="generate-image-submit-btn"
              disabled={isGenerating || !prompt.trim()}
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-xs font-semibold text-white shadow-lg shadow-pink-950/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sintetizando {imageSize}...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar em {imageSize}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Zoom Lightbox */}
      {isZoomed && generatedImage && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <img
            src={generatedImage.url}
            alt={generatedImage.prompt}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
