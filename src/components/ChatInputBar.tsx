import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ModelId, DebateRole } from "../types";
import { GEMINI_MODELS } from "../data/constants";
import {
  Send,
  Loader2,
  ImageIcon,
  Sparkles,
  Cpu,
  ChevronUp,
} from "lucide-react";

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  selectedModel: ModelId;
  selectedRole: DebateRole;
  onOpenModelSelector: () => void;
  onOpenRoleSelector: () => void;
  onOpenImageStudio: () => void;
}

export function ChatInputBar({
  onSendMessage,
  isLoading,
  selectedModel,
  selectedRole,
  onOpenModelSelector,
  onOpenRoleSelector,
  onOpenImageStudio,
}: ChatInputBarProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentModel = GEMINI_MODELS.find((m) => m.id === selectedModel);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      id="chat-input-container"
      className="w-full bg-[#0d1220]/95 backdrop-blur-md border-t border-white/10 p-3 sm:p-4 z-20 shadow-2xl"
    >
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Chips for Model & Role & Image Studio */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Model Pill */}
            <button
              type="button"
              id="model-chip-btn"
              onClick={onOpenModelSelector}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-200 transition-colors"
              title="Mudar modelo Gemini"
            >
              <Cpu className="w-3 h-3 text-purple-400" />
              <span className="font-semibold font-display">
                {currentModel?.name || "Gemini"}
              </span>
              <span className="text-[10px] text-purple-300/80">({currentModel?.badge})</span>
              <ChevronUp className="w-3 h-3 text-purple-400" />
            </button>

            {/* Role Pill */}
            <button
              type="button"
              id="role-chip-btn"
              onClick={onOpenRoleSelector}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-200 transition-colors"
              title="Mudar papel de debate"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="font-medium truncate max-w-[140px] sm:max-w-none">
                {selectedRole.shortTitle}
              </span>
              <ChevronUp className="w-3 h-3 text-cyan-400" />
            </button>
          </div>

          {/* Image Studio Button */}
          <button
            type="button"
            id="image-studio-btn"
            onClick={onOpenImageStudio}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-950/40 hover:bg-pink-900/50 border border-pink-500/30 text-pink-200 transition-colors font-medium ml-auto"
            title="Gerar esquemas e experimentos mentais em 1K, 2K ou 4K"
          >
            <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Gerador de Imagens</span>
            <span className="text-[10px] font-mono font-bold bg-pink-500/20 px-1.5 py-0.5 rounded text-pink-300">
              1K • 2K • 4K
            </span>
          </button>
        </div>

        {/* Text Input Row */}
        <div className="flex items-end gap-2 bg-[#12182b] border border-white/15 focus-within:border-cyan-500/60 rounded-2xl p-2 transition-all shadow-inner">
          <textarea
            ref={textareaRef}
            id="debate-input-textarea"
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Proponha uma tese, questão filosófica, hipótese científica ou contra-argumento..."
            className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-slate-500 p-2 focus:ring-0 outline-none resize-none max-h-44 leading-relaxed"
          />

          <button
            type="button"
            id="send-message-btn"
            disabled={isLoading || !text.trim()}
            onClick={handleSend}
            className="p-3 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-cyan-950/60 transition-all shrink-0"
            title="Enviar mensagem dialética (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Dynamic Tone & Rigor Hint */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="truncate">
            <span className="text-cyan-400 font-medium">Adaptação de tom ativa:</span> Fale
            como quiser (coloquial ou acadêmico); o rigor científico e filosófico é constante.
          </span>
          <span className="hidden sm:inline text-slate-400/80 font-mono text-[10px]">
            Shift + Enter para quebra de linha
          </span>
        </div>
      </div>
    </div>
  );
}
