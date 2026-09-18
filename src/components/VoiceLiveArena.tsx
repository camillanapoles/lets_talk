import { useState, useEffect, useRef } from "react";
import { Message, FormalDebateState, DebateRole, ModelId, FactCheckIntervention } from "../types";
import { VADPhase } from "../hooks/useDialeticaVoice";
import { FactCheckCard } from "./FactCheckCard";
import {
  Mic,
  MicOff,
  Square,
  MessageSquareText,
  Scale,
  Sparkles,
  FileText,
  Volume2,
  Clock,
  ArrowRight,
  ShieldAlert,
  FolderOpen,
  SendHorizontal,
  Edit3,
  Check,
  X,
  Radio,
  Zap,
  Plus,
} from "lucide-react";

interface VoiceLiveArenaProps {
  isListening: boolean;
  isSpeaking: boolean;
  activeSpeaker: "idle" | "user" | "dialetica" | "arbitro";
  liveTranscript: string;
  micVolume?: number;
  vadPhase?: VADPhase;
  silenceCountdownMs?: number;
  interruptedCount?: number;
  customTopic?: string;
  cadenceHint?: string;
  messages: Message[];
  selectedRole: DebateRole;
  selectedModel: ModelId;
  debateMode: "formal" | "open";
  formalState: FormalDebateState;
  onToggleMic: () => void;
  onStopSpeaking: () => void;
  onSwitchToTextMode: () => void;
  onTriggerFactCheck: () => void;
  onOpenFormalDebateModal: () => void;
  onOpenArtifactsModal: () => void;
  onOpenSessionsModal?: () => void;
  onStartNewDebate?: () => void;
  onAdvanceFormalRound: () => void;
  onPlayAudioSnippet?: (text: string, speakerRole: "arbitro" | "dialetica", base64?: string) => void;
  onRequestEvidence?: (prompt: string) => void;
  onSetCustomTopic?: (newTopic: string) => void;
  onTriggerManualSend?: () => void;
  errorMessage?: string | null;
  onClearError?: () => void;
  onRetry?: () => void;
}

export function VoiceLiveArena({
  isListening,
  isSpeaking,
  activeSpeaker,
  liveTranscript,
  micVolume = 0,
  vadPhase = "idle",
  silenceCountdownMs = 0,
  interruptedCount = 0,
  customTopic = "Livre",
  cadenceHint,
  messages,
  selectedRole,
  selectedModel,
  debateMode,
  formalState,
  onToggleMic,
  onStopSpeaking,
  onSwitchToTextMode,
  onTriggerFactCheck,
  onOpenFormalDebateModal,
  onOpenArtifactsModal,
  onOpenSessionsModal,
  onStartNewDebate,
  onAdvanceFormalRound,
  onPlayAudioSnippet,
  onRequestEvidence,
  onSetCustomTopic,
  onTriggerManualSend,
  errorMessage,
  onClearError,
  onRetry,
}: VoiceLiveArenaProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicInput, setTopicInput] = useState(customTopic === "Livre" ? "" : customTopic);

  // Auto scroll transcript to latest
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript, activeSpeaker]);

  // Keep topic input in sync if prop changes
  useEffect(() => {
    if (!isEditingTopic) {
      setTopicInput(customTopic === "Livre" ? "" : customTopic);
    }
  }, [customTopic, isEditingTopic]);

  const handleSaveTopic = () => {
    const trimmed = topicInput.trim();
    if (onSetCustomTopic) {
      onSetCustomTopic(trimmed || "Livre");
    }
    setIsEditingTopic(false);
  };

  // Find latest model message and latest fact-check intervention
  const lastModelMsg = [...messages].reverse().find((m) => m.role === "model");
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

  // All fact checks across messages
  const allFactChecks: FactCheckIntervention[] = [];
  messages.forEach((m) => {
    if (m.factChecks) {
      allFactChecks.push(...m.factChecks);
    }
  });
  const latestFactCheck = allFactChecks[allFactChecks.length - 1];

  // Visualizer aura color based on active speaker & VAD phase
  const getVisualizerStyle = () => {
    if (activeSpeaker === "arbitro") {
      return {
        glow: "from-indigo-500/40 via-purple-600/30 to-amber-500/20",
        border: "border-indigo-400/50",
        ring: "ring-indigo-400/40",
        orbGradient: "from-indigo-600 via-purple-600 to-amber-500",
        statusText: "Árbitro Epistêmico Intervindo",
        subStatus: "Voz distinta do validador factual",
        speakerIcon: <Scale className="w-4 h-4 text-indigo-400" />,
      };
    }
    if (activeSpeaker === "dialetica" && vadPhase === "processing") {
      return {
        glow: "from-indigo-500/50 via-cyan-600/30 to-purple-600/30",
        border: "border-cyan-400/70",
        ring: "ring-cyan-400/50",
        orbGradient: "from-cyan-500 via-indigo-600 to-purple-600",
        statusText: "Dialética Formulando Resposta...",
        subStatus: cadenceHint || "Pausa capturada • Gerando réplica dialética",
        speakerIcon: <Zap className="w-4 h-4 text-cyan-300 animate-pulse" />,
      };
    }
    if (activeSpeaker === "dialetica" || isSpeaking) {
      return {
        glow: "from-cyan-500/40 via-blue-600/30 to-purple-600/20",
        border: "border-cyan-400/50",
        ring: "ring-cyan-400/40",
        orbGradient: "from-cyan-500 via-blue-600 to-purple-600",
        statusText: "Dialética Discursando",
        subStatus: "Toque no orbe ou fale com firmeza para interromper",
        speakerIcon: <Volume2 className="w-4 h-4 text-cyan-400" />,
      };
    }
    if (activeSpeaker === "user" || isListening) {
      if (vadPhase === "question_detected") {
        return {
          glow: "from-amber-500/50 via-yellow-600/30 to-emerald-500/30",
          border: "border-amber-400/80",
          ring: "ring-amber-400/60",
          orbGradient: "from-amber-500 via-yellow-500 to-emerald-500",
          statusText: "Pergunta Identificada",
          subStatus: cadenceHint || `Disparando réplica rápida em ${(silenceCountdownMs / 1000).toFixed(1)}s`,
          speakerIcon: <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />,
        };
      }
      if (vadPhase === "pause_detected") {
        return {
          glow: "from-teal-500/50 via-emerald-600/30 to-cyan-500/30",
          border: "border-teal-400/60",
          ring: "ring-teal-400/50",
          orbGradient: "from-teal-500 via-emerald-500 to-cyan-600",
          statusText: "Pausa Detectada",
          subStatus: cadenceHint || `Pausa capturada • Iniciando resposta em ${(silenceCountdownMs / 1000).toFixed(1)}s`,
          speakerIcon: <Zap className="w-4 h-4 text-teal-300 animate-pulse" />,
        };
      }
      return {
        glow: "from-emerald-500/40 via-cyan-600/30 to-blue-500/20",
        border: "border-emerald-400/50",
        ring: "ring-emerald-400/40",
        orbGradient: "from-emerald-500 via-teal-500 to-cyan-600",
        statusText: liveTranscript ? "Ouvindo sua fala..." : "Sua vez • Fale ao microfone",
        subStatus: cadenceHint || "Modo Conversa Contínua (Gemini Live) ativo",
        speakerIcon: <Mic className="w-4 h-4 text-emerald-400" />,
      };
    }
    return {
      glow: "from-slate-700/30 via-slate-800/20 to-slate-900/10",
      border: "border-slate-700/40",
      ring: "ring-slate-700/30",
      orbGradient: "from-slate-700 via-slate-800 to-slate-900",
      statusText: "Canal de Voz em Espera",
      subStatus: "Toque no orbe ou microfone para debater por voz",
      speakerIcon: <Sparkles className="w-4 h-4 text-slate-400" />,
    };
  };

  const visualStyle = getVisualizerStyle();

  // Dynamic dynamic scale for orb based on live microphone energy
  const orbScaleMultiplier =
    activeSpeaker === "user" || isListening ? 1 + Math.min(0.35, micVolume * 0.45) : 1;

  return (
    <div
      id="voice-live-arena"
      className="flex-1 flex flex-col justify-between p-3 sm:p-5 relative overflow-hidden select-none bg-gradient-to-b from-[#070b14] via-[#0a0f1d] to-[#070a14]"
    >
      {/* Background Ambient Glow */}
      <div
        className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] bg-gradient-to-tr ${visualStyle.glow} rounded-full blur-[90px] opacity-60 pointer-events-none transition-all duration-700`}
      />

      {/* Top Status, Debate Mode & Topic Configuration Bar */}
      <div className="relative z-10 w-full flex flex-col gap-2">
        <div className="w-full flex items-center justify-between gap-2">
          {/* Debate Mode Chip */}
          <button
            onClick={onOpenFormalDebateModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md transition-all ${
              debateMode === "formal"
                ? "bg-amber-950/40 border-amber-500/40 text-amber-300 shadow-md shadow-amber-950/30"
                : "bg-cyan-950/30 border-cyan-500/30 text-cyan-300"
            }`}
            title="Alternar entre Debate Formal Regrado e Discussão Aberta"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{debateMode === "formal" ? "Debate Formal Regrado" : "Discussão Aberta"}</span>
          </button>

          {/* Persona Chip & New Debate Button */}
          <div className="flex items-center gap-1.5">
            {onStartNewDebate && (
              <button
                id="voice-arena-new-debate-top-btn"
                onClick={onStartNewDebate}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 hover:text-white text-xs font-semibold transition-all shadow-sm"
                title="Iniciar nova conversa / debate em branco"
              >
                <Plus className="w-3 h-3 text-cyan-400" />
                <span>Novo</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span className="truncate max-w-[120px]">{selectedRole.shortTitle}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Topic Bar (Configurable or Free) */}
        {debateMode === "open" && (
          <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs backdrop-blur-md">
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider shrink-0">
                Tema:
              </span>
              {isEditingTopic ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Digite o tema (ou deixe vazio para Livre)..."
                    className="flex-1 bg-black/50 border border-cyan-500/50 rounded-lg px-2 py-0.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTopic();
                      if (e.key === "Escape") setIsEditingTopic(false);
                    }}
                  />
                  <button
                    onClick={handleSaveTopic}
                    className="p-1 rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    title="Salvar tema"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingTopic(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-white"
                    title="Cancelar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  className="truncate text-slate-300 font-medium cursor-pointer hover:text-cyan-200 transition-colors"
                  onClick={() => setIsEditingTopic(true)}
                  title="Clique para definir ou alterar o tema do debate"
                >
                  {customTopic && customTopic !== "Livre" ? (
                    <span className="text-cyan-200 font-semibold">"{customTopic}"</span>
                  ) : (
                    <span className="text-slate-400 italic">
                      Livre (a critério das suas instruções)
                    </span>
                  )}
                </div>
              )}
            </div>

            {!isEditingTopic && (
              <button
                onClick={() => setIsEditingTopic(true)}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium shrink-0 ml-1"
                title="Definir tema específico"
              >
                <Edit3 className="w-3 h-3" />
                <span className="hidden sm:inline">Definir</span>
              </button>
            )}
          </div>
        )}

        {/* Real-time Arena Error Notification Banner */}
        {errorMessage && (
          <div className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 animate-ping"></span>
              <span className="truncate">{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-2.5 py-1 rounded-lg bg-rose-600/40 hover:bg-rose-600/60 border border-rose-400/50 text-rose-100 font-semibold text-[11px] transition-colors"
                >
                  Tentar novamente
                </button>
              )}
              {onClearError && (
                <button
                  onClick={onClearError}
                  className="p-1 text-rose-300 hover:text-white"
                  title="Fechar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Formal Debate Progress Bar (if in formal mode) */}
      {debateMode === "formal" && formalState.isActive && (
        <div className="relative z-10 w-full mt-2 bg-[#0e1628]/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Rodada {formalState.currentRoundIndex + 1}/4:{" "}
                {formalState.rounds[formalState.currentRoundIndex]?.name}
              </span>
            </div>
            <div className="font-mono text-amber-200 font-bold">
              {Math.floor(formalState.timeRemainingSeconds / 60)}:
              {(formalState.timeRemainingSeconds % 60).toString().padStart(2, "0")}
            </div>
          </div>

          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-1000"
              style={{
                width: `${
                  (formalState.timeRemainingSeconds /
                    (formalState.rounds[formalState.currentRoundIndex]?.durationSeconds || 90)) *
                  100
                }%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-300">
            <span>
              Orador do turno:{" "}
              <strong className="text-amber-300">
                {formalState.rounds[formalState.currentRoundIndex]?.speaker === "user"
                  ? "Você"
                  : "Dialética"}
              </strong>
            </span>
            <button
              onClick={onAdvanceFormalRound}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold underline"
            >
              <span>Passar a Palavra</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Center Fluid Conversational Wave Orb */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-3">
        <div className="relative flex items-center justify-center">
          {/* Animated Ripples based on active speaker and mic volume */}
          {(isListening || isSpeaking) && (
            <>
              <div
                className={`absolute rounded-full border ${visualStyle.border} transition-all duration-300 ${
                  micVolume > 0.08 ? "scale-125 opacity-40 animate-ping" : "scale-100 opacity-20"
                }`}
                style={{
                  width: `${180 + micVolume * 70}px`,
                  height: `${180 + micVolume * 70}px`,
                }}
              />
              <div
                className={`absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border ${visualStyle.border} animate-pulse opacity-30`}
              />
            </>
          )}

          {/* Central Fluid Glowing Orb */}
          <div
            onClick={() => {
              if (isSpeaking) {
                onStopSpeaking();
              } else if (isListening && liveTranscript && onTriggerManualSend) {
                onTriggerManualSend();
              } else {
                onToggleMic();
              }
            }}
            className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr ${visualStyle.orbGradient} p-1 shadow-[0_0_50px_rgba(6,182,212,0.4)] flex items-center justify-center transition-transform duration-150 cursor-pointer hover:brightness-110 active:scale-95`}
            style={{
              transform: `scale(${orbScaleMultiplier})`,
            }}
            title={
              isSpeaking
                ? "Clique no orbe para interromper (barge-in imediato)"
                : isListening && liveTranscript
                ? "Clique no orbe para enviar fala imediatamente"
                : isListening
                ? "Clique para pausar microfone"
                : "Clique para ativar conversa contínua por voz"
            }
          >
            <div className="w-full h-full rounded-full bg-[#090e1a]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-1 text-white">
              {/* Animated Equalizer Wave Bars reacting dynamically to speech */}
              <div className="flex items-end gap-1 h-7">
                {[0.4, 0.9, 0.6, 1, 0.7, 0.5].map((scale, i) => {
                  const dynamicHeight = isSpeaking
                    ? Math.max(8, scale * 26)
                    : isListening
                    ? Math.max(6, (micVolume * 36 * scale) + (liveTranscript ? 8 : 4))
                    : 6;

                  return (
                    <span
                      key={i}
                      className={`w-1 rounded-full bg-cyan-400 transition-all duration-75 ${
                        isSpeaking || (isListening && micVolume > 0.02)
                          ? "bg-cyan-300"
                          : "opacity-30 bg-slate-500"
                      }`}
                      style={{
                        height: `${dynamicHeight}px`,
                      }}
                    />
                  );
                })}
              </div>

              <span className="text-[10px] font-mono tracking-tight text-cyan-200 text-center px-1">
                {activeSpeaker === "arbitro"
                  ? "Árbitro"
                  : isSpeaking
                  ? "Interromper"
                  : vadPhase === "processing"
                  ? "Pensando..."
                  : vadPhase === "question_detected"
                  ? "Pergunta!"
                  : vadPhase === "pause_detected"
                  ? "Pausa..."
                  : isListening
                  ? "Escutando"
                  : "Voz Live"}
              </span>
            </div>
          </div>
        </div>

        {/* Active Speaker Status Caption & Barge-in Guidance */}
        <div className="mt-3 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-300 backdrop-blur-md">
            {visualStyle.speakerIcon}
            <span className="font-semibold tracking-wide">{visualStyle.statusText}</span>
          </div>

          <span className="text-[10px] text-slate-400 tracking-tight">
            {visualStyle.subStatus}
          </span>

          {/* Barge-in notice if interrupted */}
          {interruptedCount > 0 && !isSpeaking && (
            <div className="flex items-center gap-1 text-[10px] text-amber-300/80 mt-0.5">
              <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>Interrupção registrada • Palavra concedida a você</span>
            </div>
          )}
        </div>
      </div>

      {/* Live Clean Transcription Scroll Area */}
      <div className="relative z-10 w-full max-h-[34vh] overflow-y-auto rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 p-3 sm:p-4 space-y-3 shadow-inner">
        {/* User's Current Live Speech Transcript (in real time) */}
        {liveTranscript && (
          <div className="flex flex-col items-end animate-in fade-in duration-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Você falando...
              </span>
              {vadPhase === "question_detected" && (
                <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1 font-mono shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  Pergunta detectada ({((silenceCountdownMs || 550) / 1000).toFixed(1)}s)
                </span>
              )}
              {vadPhase === "pause_detected" && (
                <span className="text-[10px] text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-500/30 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
                  Pausa detectada ({((silenceCountdownMs || 750) / 1000).toFixed(1)}s)
                </span>
              )}
            </div>

            <div className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-100 rounded-xl px-3 py-2 text-xs sm:text-sm italic max-w-[92%] shadow-md flex items-center justify-between gap-2">
              <p className="flex-1">"{liveTranscript}"</p>
              {onTriggerManualSend && (
                <button
                  onClick={onTriggerManualSend}
                  className="p-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-400/40 shrink-0 transition-colors"
                  title="Enviar imediatamente sem aguardar silêncio"
                >
                  <SendHorizontal className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Injected Latest Fact-Check Card (The Third Persona) */}
        {latestFactCheck && (
          <div className="animate-in slide-in-from-bottom-2 duration-200">
            <FactCheckCard
              intervention={latestFactCheck}
              onPlayAudio={onPlayAudioSnippet}
              onRequestEvidence={onRequestEvidence}
            />
          </div>
        )}

        {/* Latest Spoken Response from Dialética */}
        {lastModelMsg && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-cyan-400 tracking-wider mb-0.5">
              <span>Dialética ({selectedRole.shortTitle})</span>
              {isSpeaking && activeSpeaker === "dialetica" && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}
            </div>
            <div className="bg-[#111728]/90 border border-white/10 text-slate-100 rounded-xl p-3 text-xs sm:text-sm leading-relaxed max-w-full">
              <p className="line-clamp-6">
                {lastModelMsg.content.replace(/[#*_`]/g, "").slice(0, 420)}
                {lastModelMsg.content.length > 420 ? "..." : ""}
              </p>
            </div>
          </div>
        )}

        {/* Previous User Prompt */}
        {lastUserMsg && !liveTranscript && (
          <div className="flex flex-col items-end opacity-75">
            <span className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
              Sua última fala
            </span>
            <div className="bg-white/5 border border-white/10 text-slate-300 rounded-xl px-3 py-1.5 text-xs max-w-[85%]">
              "{lastUserMsg.content.slice(0, 140)}"
            </div>
          </div>
        )}

        {messages.length === 0 && !liveTranscript && (
          <div className="text-center py-4 text-xs text-slate-400">
            <p className="text-slate-300 font-semibold mb-1">
              Arena Dialética de Voz Pronta
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              Fale ao microfone com naturalidade. O sistema detecta suas pausas automaticamente e você pode intervir por voz a qualquer momento para interromper o áudio.
            </p>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      {/* Bottom Voice Controls & Quick Action Dock */}
      <div className="relative z-10 mt-3 pt-2 border-t border-white/10 flex flex-col items-center gap-2.5">
        {/* Action Row: Fact-Checker Trigger & Secondary Actions */}
        <div className="w-full flex items-center justify-between gap-2 px-1 text-xs">
          {/* Fact Check Trigger */}
          <button
            onClick={onTriggerFactCheck}
            disabled={messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-200 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Solicitar intervenção assíncrona do Árbitro Epistêmico para checar fatos"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
            <span>Checar Fatos</span>
          </button>

          {/* Artifacts Tool */}
          <button
            onClick={onOpenArtifactsModal}
            disabled={messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 text-xs font-medium disabled:opacity-30 transition-colors"
            title="Súmula, árvore de argumentos e fontes científicas"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Artefatos</span>
          </button>

          {/* Sessions Manager */}
          {onOpenSessionsModal && (
            <button
              onClick={onOpenSessionsModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 text-xs font-medium transition-colors"
              title="Gerenciar e carregar sessões de debate anteriores"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sessões</span>
            </button>
          )}

          {/* New Debate Button */}
          {onStartNewDebate && (
            <button
              id="btn-voice-arena-new-clean-debate"
              onClick={onStartNewDebate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-950/50 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-200 text-xs font-semibold transition-all shadow-sm"
              title="Iniciar nova conversa / debate em branco"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Novo</span>
            </button>
          )}

          {/* Switch to Full Text Mode Button */}
          <button
            onClick={onSwitchToTextMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-200 text-xs font-semibold transition-colors"
            title="Alternar para visualização clássica com chat em texto completo"
          >
            <MessageSquareText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Modo Texto</span>
          </button>
        </div>

        {/* Primary Giant Glowing Mic Control with Barge-In & Instant Trigger */}
        <div className="flex items-center justify-center gap-4 w-full">
          {/* Stop Audio Button if currently speaking */}
          {isSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="p-3.5 rounded-full bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-300 shadow-lg transition-all animate-pulse"
              title="Interromper fala da IA manualmente (ou apenas fale ao microfone)"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          )}

          {/* Big Center Microphone */}
          <button
            id="main-voice-mic-btn"
            onClick={onToggleMic}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative ${
              isListening
                ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 ring-4 ring-emerald-400/40 shadow-emerald-500/50 scale-105"
                : "bg-gradient-to-tr from-cyan-600 via-blue-600 to-purple-600 text-white hover:scale-105 shadow-cyan-600/40"
            }`}
            title={isListening ? "Desativar microfone" : "Ativar microfone de debate"}
          >
            {isListening ? (
              <Mic className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse" />
            ) : (
              <MicOff className="w-7 h-7 sm:w-8 sm:h-8 opacity-90" />
            )}
          </button>

          {/* Quick Instant Send Button if live transcript exists */}
          {isListening && liveTranscript && onTriggerManualSend && (
            <button
              onClick={onTriggerManualSend}
              className="p-3.5 rounded-full bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-300 shadow-lg transition-all"
              title="Enviar agora sem aguardar silêncio"
            >
              <SendHorizontal className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-400 font-mono text-center">
          {isSpeaking
            ? "Dialética falando • Toque no orbe ou fale para interromper (barge-in)"
            : vadPhase === "processing"
            ? "Dialética formulando réplica dialética concisa..."
            : vadPhase === "question_detected"
            ? `Pergunta identificada (${((silenceCountdownMs || 550) / 1000).toFixed(1)}s) • Disparando resposta rápida...`
            : vadPhase === "pause_detected"
            ? `Silêncio detectado (${((silenceCountdownMs || 750) / 1000).toFixed(1)}s) • Concluindo turno...`
            : isListening && liveTranscript
            ? "Ouvindo sua fala • Pausa ou pergunta dispara resposta imediata"
            : isListening
            ? "Modo Conversa Contínua (Gemini Live) • Fale com naturalidade"
            : "Toque no orbe ou microfone para abrir canal de voz contínuo"}
        </p>
      </div>
    </div>
  );
}
