import { useEffect, useRef } from "react";
import { Message, FormalDebateState, DebateRole, ModelId, FactCheckIntervention } from "../types";
import { FactCheckCard } from "./FactCheckCard";
import {
  Mic,
  MicOff,
  Square,
  MessageSquareText,
  Scale,
  Sparkles,
  Search,
  FileText,
  Volume2,
  Clock,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface VoiceLiveArenaProps {
  isListening: boolean;
  isSpeaking: boolean;
  activeSpeaker: "idle" | "user" | "dialetica" | "arbitro";
  liveTranscript: string;
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
  onAdvanceFormalRound: () => void;
  onPlayAudioSnippet?: (text: string, speakerRole: "arbitro" | "dialetica", base64?: string) => void;
  onRequestEvidence?: (prompt: string) => void;
}

export function VoiceLiveArena({
  isListening,
  isSpeaking,
  activeSpeaker,
  liveTranscript,
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
  onAdvanceFormalRound,
  onPlayAudioSnippet,
  onRequestEvidence,
}: VoiceLiveArenaProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll transcript to latest
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript, activeSpeaker]);

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

  // Visualizer aura color based on active speaker
  const getVisualizerStyle = () => {
    if (activeSpeaker === "arbitro") {
      return {
        glow: "from-indigo-500/40 via-purple-600/30 to-amber-500/20",
        border: "border-indigo-400/50",
        ring: "ring-indigo-400/40",
        orbGradient: "from-indigo-600 via-purple-600 to-amber-500",
        statusText: "Árbitro Epistêmico Intervindo com Voz Distinta",
        speakerIcon: <Scale className="w-4 h-4 text-indigo-400" />,
      };
    }
    if (activeSpeaker === "dialetica") {
      return {
        glow: "from-cyan-500/40 via-blue-600/30 to-purple-600/20",
        border: "border-cyan-400/50",
        ring: "ring-cyan-400/40",
        orbGradient: "from-cyan-500 via-blue-600 to-purple-600",
        statusText: "Dialética Discursando (Voz Epistêmica)",
        speakerIcon: <Volume2 className="w-4 h-4 text-cyan-400" />,
      };
    }
    if (activeSpeaker === "user" || isListening) {
      return {
        glow: "from-emerald-500/40 via-cyan-600/30 to-blue-500/20",
        border: "border-emerald-400/50",
        ring: "ring-emerald-400/40",
        orbGradient: "from-emerald-500 via-teal-500 to-cyan-600",
        statusText: "Ouvindo você...",
        speakerIcon: <Mic className="w-4 h-4 text-emerald-400" />,
      };
    }
    return {
      glow: "from-slate-700/30 via-slate-800/20 to-slate-900/10",
      border: "border-slate-700/40",
      ring: "ring-slate-700/30",
      orbGradient: "from-slate-700 via-slate-800 to-slate-900",
      statusText: "Toque no microfone para debater",
      speakerIcon: <Sparkles className="w-4 h-4 text-slate-400" />,
    };
  };

  const visualStyle = getVisualizerStyle();

  return (
    <div
      id="voice-live-arena"
      className="flex-1 flex flex-col justify-between p-3 sm:p-5 relative overflow-hidden select-none bg-gradient-to-b from-[#070b14] via-[#0a0f1d] to-[#070a14]"
    >
      {/* Background Ambient Glow */}
      <div
        className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] bg-gradient-to-tr ${visualStyle.glow} rounded-full blur-[90px] opacity-60 pointer-events-none transition-all duration-700`}
      />

      {/* Top Status & Debate Mode Info */}
      <div className="relative z-10 w-full flex items-center justify-between gap-2">
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

        {/* Persona Chip */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span className="truncate max-w-[130px]">{selectedRole.shortTitle}</span>
        </div>
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

      {/* Center Dialectic Fluid Wave Orb (Gemini Live Aesthetic) */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-4">
        {/* Pulsating Fluid Dialectic Sphere */}
        <div className="relative flex items-center justify-center">
          {/* Animated Ripples */}
          {(isListening || isSpeaking) && (
            <>
              <div
                className={`absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border ${visualStyle.border} animate-ping opacity-25`}
              />
              <div
                className={`absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border ${visualStyle.border} animate-pulse opacity-40`}
              />
            </>
          )}

          {/* Central Fluid Glowing Orb */}
          <div
            className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr ${visualStyle.orbGradient} p-1 shadow-[0_0_50px_rgba(6,182,212,0.4)] flex items-center justify-center transition-all duration-500`}
          >
            <div className="w-full h-full rounded-full bg-[#090e1a]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-1 text-white">
              {/* Animated Equalizer Wave Bars */}
              <div className="flex items-end gap-1 h-7">
                {[0.4, 0.9, 0.6, 1, 0.7, 0.5].map((scale, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full bg-cyan-400 transition-all duration-150 ${
                      isSpeaking || isListening ? "animate-pulse" : "opacity-30"
                    }`}
                    style={{
                      height:
                        isSpeaking || isListening
                          ? `${Math.max(8, scale * 26)}px`
                          : "6px",
                      animationDelay: `${i * 120}ms`,
                    }}
                  />
                ))}
              </div>

              <span className="text-[10px] font-mono tracking-tight text-cyan-200">
                {activeSpeaker === "arbitro"
                  ? "Árbitro"
                  : activeSpeaker === "dialetica"
                  ? "Dialética"
                  : isListening
                  ? "Escutando"
                  : "Voz Live"}
              </span>
            </div>
          </div>
        </div>

        {/* Active Speaker Status Caption */}
        <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-300 backdrop-blur-md">
          {visualStyle.speakerIcon}
          <span className="font-medium tracking-wide">{visualStyle.statusText}</span>
        </div>
      </div>

      {/* Live Clean Transcription Scroll Area */}
      <div className="relative z-10 w-full max-h-[38vh] overflow-y-auto rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 p-3 sm:p-4 space-y-3 shadow-inner">
        {/* User's Current Live Speech Transcript (in real time) */}
        {liveTranscript && (
          <div className="flex flex-col items-end animate-in fade-in duration-100">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-0.5">
              Você está dizendo...
            </span>
            <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-100 rounded-xl px-3 py-2 text-xs sm:text-sm italic max-w-[90%] shadow-md">
              "{liveTranscript}"
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
            <p className="text-slate-300 font-medium mb-1">
              Arena Dialética de Voz Pronta
            </p>
            <p className="text-[11px] text-slate-500">
              Fale pelo microfone com naturalidade. O Dialética responderá em áudio
              e o Árbitro Epistêmico checará os fatos de forma independente.
            </p>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      {/* Bottom Voice Controls & Quick Action Dock */}
      <div className="relative z-10 mt-3 pt-2 border-t border-white/10 flex flex-col items-center gap-3">
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

        {/* Primary Giant Glowing Mic Control */}
        <div className="flex items-center justify-center gap-4 w-full">
          {/* Stop Audio Button if currently speaking */}
          {isSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="p-3.5 rounded-full bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-300 shadow-lg transition-all"
              title="Interromper fala da IA"
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
        </div>

        <p className="text-[11px] text-slate-400 font-mono text-center">
          {isListening
            ? "Fale ao microfone • Pausa de 1.5s envia a fala"
            : "Toque para abrir canal de voz"}
        </p>
      </div>
    </div>
  );
}
