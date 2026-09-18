import { useState, memo } from "react";
import Markdown from "react-markdown";
import { Message, GeneratedImage } from "../types";
import { DEBATE_ROLES, GEMINI_MODELS } from "../data/constants";
import { FactCheckCard } from "./FactCheckCard";
import {
  Copy,
  Check,
  ImageIcon,
  Maximize2,
  Sparkles,
  Bot,
  User,
  Loader2,
  Volume2,
  VolumeX,
  ShieldCheck,
} from "lucide-react";

interface ChatMessageItemProps {
  message: Message;
  onRequestImageForMessage?: (prompt: string) => void;
  onZoomImage?: (image: GeneratedImage) => void;
  onFactCheckMessage?: (messageId: string, content: string) => void;
  onPlayAudio?: (text: string, speakerRole: "arbitro" | "dialetica", base64?: string) => void;
  onRequestEvidence?: (prompt: string) => void;
  isAudioPlaying?: boolean;
}

export const ChatMessageItem = memo(function ChatMessageItem({
  message,
  onRequestImageForMessage,
  onZoomImage,
  onFactCheckMessage,
  onPlayAudio,
  onRequestEvidence,
  isAudioPlaying,
}: ChatMessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isModel = message.role === "model";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleObj = message.roleUsed
    ? DEBATE_ROLES.find((r) => r.id === message.roleUsed)
    : null;
  const modelObj = message.modelUsed
    ? GEMINI_MODELS.find((m) => m.id === message.modelUsed)
    : null;

  // Extract candidate concept for visualization if user clicks "Visualizar Conceito"
  const handleVisualize = () => {
    if (!onRequestImageForMessage) return;
    const firstLine = message.content.split("\n")[0].replace(/[#*]/g, "").trim();
    const promptSummary = `Diagrama científico conceitual e representação visual de alta precisão sobre: ${firstLine.slice(0, 180)}`;
    onRequestImageForMessage(promptSummary);
  };

  const handleAudioPlay = () => {
    if (!onPlayAudio) return;
    onPlayAudio(message.content, isModel ? "dialetica" : "arbitro", message.audioBase64);
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`w-full flex ${isModel ? "justify-start" : "justify-end"} py-2 animate-in fade-in duration-150`}
    >
      <div
        className={`max-w-[95%] sm:max-w-[88%] rounded-2xl p-4 transition-all ${
          isModel
            ? "bg-[#111728] border border-white/10 shadow-lg text-slate-100"
            : "bg-gradient-to-br from-cyan-900/60 to-blue-900/60 border border-cyan-500/30 text-white shadow-md"
        }`}
      >
        {/* Header with Role/Model info */}
        <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-white/[0.08] text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                isModel
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-white/10 text-white"
              }`}
            >
              {isModel ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            </div>
            <span className="font-semibold font-display tracking-tight text-slate-200">
              {isModel ? "Dialética" : "Você"}
            </span>

            {isModel && roleObj && (
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium truncate max-w-[150px]">
                {roleObj.shortTitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[10px]">
            {isModel && modelObj && (
              <span
                className={`px-1.5 py-0.5 rounded border font-mono ${modelObj.badgeColor}`}
                title={modelObj.name}
              >
                {modelObj.name}
              </span>
            )}
            <span>
              {new Date(message.timestamp).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Attached Generated Image (if any) */}
        {message.attachedImage && (
          <div className="mb-3 rounded-xl overflow-hidden border border-white/15 bg-black/60 relative group">
            <img
              src={message.attachedImage.url}
              alt={message.attachedImage.prompt}
              className="w-full max-h-72 object-contain cursor-pointer"
              onClick={() => onZoomImage && onZoomImage(message.attachedImage!)}
            />
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15 text-[10px] text-pink-300 font-mono">
              <span>{message.attachedImage.imageSize}</span>
              <span>•</span>
              <span>{message.attachedImage.aspectRatio}</span>
              <button
                onClick={() => onZoomImage && onZoomImage(message.attachedImage!)}
                className="hover:text-white p-0.5"
                title="Ampliar"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
            <p className="p-2 text-[11px] text-slate-400 bg-[#0d121f] border-t border-white/10 line-clamp-2">
              <strong className="text-slate-300">Conceito Visualizado:</strong>{" "}
              {message.attachedImage.prompt}
            </p>
          </div>
        )}

        {/* Message Content */}
        {isModel ? (
          <div className="prose-dialetica text-sm leading-relaxed overflow-x-auto">
            <Markdown>{message.content}</Markdown>
            {message.isStreaming && (
              <span className="inline-flex items-center gap-1 text-cyan-400 text-xs font-mono ml-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="animate-pulse">pensando e articulando...</span>
              </span>
            )}
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
        )}

        {/* Injected Fact Check Interventions (Arbitrator Persona) */}
        {message.factChecks && message.factChecks.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.factChecks.map((intervention) => (
              <FactCheckCard
                key={intervention.id}
                intervention={intervention}
                onPlayAudio={onPlayAudio}
                onRequestEvidence={onRequestEvidence}
              />
            ))}
          </div>
        )}

        {/* Actions Bar */}
        {!message.isStreaming && (
          <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Fact Check trigger button for this message */}
              {onFactCheckMessage && (
                <button
                  onClick={() => onFactCheckMessage(message.id, message.content)}
                  className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 px-2.5 py-1 rounded-lg transition-colors font-medium"
                  title="Acionar Árbitro Epistêmico para checar as afirmações desta fala"
                >
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  <span>Checar Fatos (Árbitro)</span>
                </button>
              )}

              {/* Play Audio Button */}
              {onPlayAudio && (
                <button
                  onClick={handleAudioPlay}
                  className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 px-2 py-1 rounded-lg transition-colors"
                  title="Ouvir com síntese de voz"
                >
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  <span>Ouvir</span>
                </button>
              )}

              {/* Visualizer option on Model messages */}
              {isModel && (
                <button
                  onClick={handleVisualize}
                  className="flex items-center gap-1 text-[11px] text-pink-400 hover:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 px-2 py-1 rounded-lg transition-colors font-medium"
                  title="Gerar diagrama conceitual com gemini-3-pro-image-preview (1K-4K)"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Esquema Visual</span>
                </button>
              )}
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-white/5 transition-colors"
              title="Copiar texto"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

