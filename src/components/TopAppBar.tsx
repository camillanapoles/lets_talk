import { DebateRole, ModelId, DebateMode, SessionUIMode } from "../types";
import {
  RotateCcw,
  BookOpen,
  Smartphone,
  Maximize2,
  Sparkles,
  Share2,
  Mic,
  MessageSquare,
  Scale,
  FileText,
  FolderOpen,
  Plus,
  Check,
  Activity,
} from "lucide-react";

interface TopAppBarProps {
  selectedRole: DebateRole;
  selectedModel: ModelId;
  debateMode: DebateMode;
  sessionUIMode: SessionUIMode;
  savedSessionsCount?: number;
  currentSessionTitle?: string | null;
  onOpenRoleSelector: () => void;
  onOpenModelSelector: () => void;
  onOpenEpistemicGuide: () => void;
  onOpenDebateModeModal: () => void;
  onOpenArtifactsModal: () => void;
  onOpenSessionsModal: () => void;
  onOpenDiagnostics?: () => void;
  onSelectSessionUIMode?: (mode: SessionUIMode) => void;
  onToggleSessionUIMode: () => void;
  onResetChat: () => void;
  isAndroidFrameMode: boolean;
  onToggleAndroidFrame: () => void;
  onShareNotice?: (msg: string) => void;
}

export function TopAppBar({
  selectedRole,
  selectedModel,
  debateMode,
  sessionUIMode,
  savedSessionsCount = 0,
  currentSessionTitle,
  onOpenRoleSelector,
  onOpenModelSelector,
  onOpenEpistemicGuide,
  onOpenDebateModeModal,
  onOpenArtifactsModal,
  onOpenSessionsModal,
  onOpenDiagnostics,
  onSelectSessionUIMode,
  onToggleSessionUIMode,
  onResetChat,
  isAndroidFrameMode,
  onToggleAndroidFrame,
  onShareNotice,
}: TopAppBarProps) {
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Dialética - Debate Científico & Filosófico",
          text: "Aplicativo para debates profundos baseados em fatos, ciência e filosofia.",
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      if (onShareNotice) {
        onShareNotice("Link público do aplicativo copiado para a área de transferência!");
      }
    }
  };

  return (
    <header
      id="top-app-bar"
      className="w-full bg-[#0b0f19]/90 backdrop-blur-md border-b border-white/10 px-3 sm:px-4 py-2.5 flex items-center justify-between z-20"
    >
      {/* Brand & Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-purple-600 p-0.5 shadow-md shadow-cyan-950/50">
          <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center text-cyan-400">
            {/* Dialectical geometric icon */}
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round"
            >
              <circle cx="9" cy="12" r="5" />
              <circle cx="15" cy="12" r="5" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold text-white tracking-tight font-display">
              Dialética
            </h1>
            {/* Mode switch badge */}
            <button
              onClick={onOpenDebateModeModal}
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                debateMode === "formal"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
              }`}
              title="Mudar modo de debate (Formal vs Aberto)"
            >
              <Scale className="w-2.5 h-2.5" />
              <span>{debateMode === "formal" ? "Formal" : "Aberto"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Center Controls: Voice Live vs Text Mode Toggle */}
      <div className="flex items-center gap-1 bg-[#101728] p-1 rounded-xl border border-white/10 text-xs">
        <button
          onClick={() => (onSelectSessionUIMode ? onSelectSessionUIMode("voice_live") : onToggleSessionUIMode())}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
            sessionUIMode === "voice_live"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
          title="Modo Voz-com-Voz Gemini Live (Padrão)"
        >
          <Mic className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">Voz Live</span>
        </button>

        <button
          onClick={() => (onSelectSessionUIMode ? onSelectSessionUIMode("text_chat") : onToggleSessionUIMode())}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
            sessionUIMode === "text_chat"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
          title="Modo Chat Textual Completo com Markdown"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">Texto</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1">
        {/* Sessions Manager Button */}
        <button
          id="sessions-manager-btn"
          onClick={onOpenSessionsModal}
          className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          title={
            currentSessionTitle
              ? `Sessão: "${currentSessionTitle}" (Clique para gerenciar sessões)`
              : "Gerenciador de Sessões de Debate"
          }
        >
          <FolderOpen className="w-4 h-4 text-cyan-400" />
          {savedSessionsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-cyan-500 text-slate-950 font-bold text-[9px] flex items-center justify-center font-mono">
              {savedSessionsCount}
            </span>
          )}
        </button>

        {/* Artifacts Button */}
        <button
          onClick={onOpenArtifactsModal}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          title="Gerar Artefatos (Súmula, Árvore de Argumentos, Fontes)"
        >
          <FileText className="w-4 h-4 text-cyan-400" />
        </button>

        {/* Toggle Android Phone Frame / Fluid Mode */}
        <button
          id="toggle-android-frame-btn"
          type="button"
          onClick={onToggleAndroidFrame}
          className="hidden sm:flex items-center gap-1 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 text-xs transition-colors"
          title={
            isAndroidFrameMode
              ? "Alternar para visualização expandida"
              : "Alternar para moldura Android mobile"
          }
        >
          {isAndroidFrameMode ? (
            <Maximize2 className="w-4 h-4 text-slate-400" />
          ) : (
            <Smartphone className="w-4 h-4 text-cyan-400" />
          )}
        </button>

        {/* Epistemic Guide */}
        <button
          id="epistemic-guide-btn"
          type="button"
          onClick={onOpenEpistemicGuide}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          title="Manifesto Epistemológico & Metodologia"
        >
          <BookOpen className="w-4 h-4 text-cyan-400" />
        </button>

        {/* System Diagnostics & Validity Suite */}
        {onOpenDiagnostics && (
          <button
            id="system-diagnostics-btn"
            type="button"
            onClick={onOpenDiagnostics}
            className="p-2 rounded-xl text-slate-300 hover:text-cyan-300 hover:bg-white/5 border border-white/10 transition-colors"
            title="Diagnóstico de Engenharia de Software & Bateria de Testes NFR"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
          </button>
        )}

        {/* Nova Conversa / Novo Debate */}
        <button
          id="btn-top-app-bar-new-chat"
          type="button"
          onClick={onResetChat}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 hover:text-white text-xs font-semibold shadow-sm transition-all"
          title="Iniciar nova conversa / debate em branco"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Nova Conversa</span>
        </button>
      </div>
    </header>
  );
}

