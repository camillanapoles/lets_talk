import { useState } from "react";
import { DebateMode, FormalDebateState } from "../types";
import { Scale, Check, Clock, ShieldCheck, X, Award, Play } from "lucide-react";

interface DebateModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: DebateMode;
  formalState: FormalDebateState;
  onSelectMode: (mode: DebateMode, durationSeconds?: number) => void;
  onStartFormalDebate: (topic: string, durationSeconds: number) => void;
}

export function DebateModeModal({
  isOpen,
  onClose,
  currentMode,
  formalState,
  onSelectMode,
  onStartFormalDebate,
}: DebateModeModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(90);
  const [formalTopic, setFormalTopic] = useState<string>(formalState.topic || "");

  if (!isOpen) return null;

  const handleStartFormal = () => {
    onSelectMode("formal", selectedDuration);
    onStartFormalDebate(formalTopic || "Debate Científico & Filosófico Aberto", selectedDuration);
    onClose();
  };

  const handleChooseOpen = () => {
    onSelectMode("open");
    onClose();
  };

  return (
    <div
      id="debate-mode-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-[#0e1424] border border-white/15 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 p-0.5 shadow-md">
            <div className="w-full h-full bg-[#0e1424] rounded-[10px] flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight font-display text-white">
              Modos de Debate
            </h2>
            <p className="text-xs text-slate-400">Escolha a dinâmica para esta sessão</p>
          </div>
        </div>

        {/* Modes Grid */}
        <div className="space-y-4 my-4">
          {/* Option A: Discussão Aberta */}
          <div
            onClick={handleChooseOpen}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              currentMode === "open"
                ? "bg-cyan-950/40 border-cyan-500/50 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30"
                : "bg-white/[0.02] border-white/10 hover:border-white/20"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-cyan-300 font-display">
                    Modo Discussão Aberta
                  </span>
                  {currentMode === "open" && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                      Ativo
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Exploração dialética livre e contínua sem limites rígidos de tempo de turno. Foco absoluto no rigor conceitual, evidências científicas e validação em tempo real.
                </p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                  currentMode === "open"
                    ? "bg-cyan-500 text-slate-950 border-cyan-400"
                    : "border-white/20 text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Option B: Debate Formal Regrado */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              currentMode === "formal"
                ? "bg-amber-950/40 border-amber-500/50 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/30"
                : "bg-white/[0.02] border-white/10"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-amber-300 font-display">
                    Modo Debate Formal Regrado
                  </span>
                  {currentMode === "formal" && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      Ativo
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Estrutura competitiva de debate universitário em 4 rodadas com cronômetro de turno, refutação, tréplica e pontuação por juiz.
                </p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                  currentMode === "formal"
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : "border-white/20 text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Formal Rules Summary */}
            <div className="mt-3 bg-black/40 p-3 rounded-xl border border-white/5 space-y-1.5 text-[11px] text-slate-300">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Estrutura das 4 Rodadas Oficiais:</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                <div className="bg-white/5 p-1.5 rounded">
                  <strong className="text-amber-300 block">1. Abertura</strong>
                  Teses, axiomas e premissas
                </div>
                <div className="bg-white/5 p-1.5 rounded">
                  <strong className="text-amber-300 block">2. Refutação</strong>
                  Ataque a vulnerabilidades
                </div>
                <div className="bg-white/5 p-1.5 rounded">
                  <strong className="text-amber-300 block">3. Tréplica</strong>
                  Defesa e apontamento de falácias
                </div>
                <div className="bg-white/5 p-1.5 rounded">
                  <strong className="text-amber-300 block">4. Síntese</strong>
                  Veredito epistêmico do juiz
                </div>
              </div>
            </div>

            {/* Turn Timer Selector */}
            <div className="mt-3">
              <label className="text-[11px] text-slate-400 block mb-1">
                Tempo de fala por rodada:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[60, 90, 120, 180].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedDuration(sec)}
                    className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
                      selectedDuration === sec
                        ? "bg-amber-500 text-slate-950 border-amber-400"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Debate Motion/Topic */}
            <div className="mt-3">
              <label className="text-[11px] text-slate-400 block mb-1">
                Moção / Tese do debate:
              </label>
              <input
                type="text"
                value={formalTopic}
                onChange={(e) => setFormalTopic(e.target.value)}
                placeholder="Ex: A mecânica quântica é determinista ou indeterminista?"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Start Formal Button */}
            <button
              type="button"
              onClick={handleStartFormal}
              className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Debate Formal ({selectedDuration}s por turno)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
