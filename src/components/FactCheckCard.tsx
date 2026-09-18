import { useState } from "react";
import { FactCheckIntervention, FactCheckStatus } from "../types";
import {
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  XCircle,
  CheckCircle2,
  Volume2,
  VolumeX,
  ExternalLink,
  BookOpen,
  MessageSquarePlus,
  Scale,
} from "lucide-react";

interface FactCheckCardProps {
  intervention: FactCheckIntervention;
  onPlayAudio?: (text: string, speakerRole: "arbitro" | "dialetica", base64?: string) => void;
  isPlayingAudio?: boolean;
  onRequestEvidence?: (prompt: string) => void;
}

export function FactCheckCard({
  intervention,
  onPlayAudio,
  isPlayingAudio,
  onRequestEvidence,
}: FactCheckCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (status: FactCheckStatus) => {
    switch (status) {
      case "COMPROVADO_CIENTIFICO":
        return {
          label: "Fato Científico Comprovado",
          color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
        };
      case "HIPOTESE_PLAUSIVEL":
        return {
          label: "Hipótese Plausível (Em Teste)",
          color: "bg-blue-500/15 text-blue-300 border-blue-500/30",
          icon: <HelpCircle className="w-4 h-4 text-blue-400" />,
        };
      case "REFUTADO_EQUIVOCADO":
        return {
          label: "Equivocado / Refutado por Evidências",
          color: "bg-rose-500/15 text-rose-300 border-rose-500/30",
          icon: <XCircle className="w-4 h-4 text-rose-400" />,
        };
      case "FALACIA_LOGICA":
        return {
          label: "Falácia Lógica Detectada",
          color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        };
      case "PARCIALMENTE_VERDADEIRO":
        return {
          label: "Parcialmente Verdadeiro / Extrapolado",
          color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
          icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
        };
      case "SEM_EVIDENCIAS":
      default:
        return {
          label: "Alegação Sem Evidências Empíricas",
          color: "bg-slate-500/15 text-slate-300 border-slate-500/30",
          icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
        };
    }
  };

  const badge = getStatusBadge(intervention.status);

  const handleAudioClick = () => {
    if (!onPlayAudio) return;
    const textToSpeak =
      intervention.spokenAudioText ||
      `Intervenção do Árbitro Epistêmico: ${intervention.analysis}`;
    onPlayAudio(textToSpeak, "arbitro", intervention.audioBase64);
  };

  return (
    <div
      id={`fact-check-${intervention.id}`}
      className="my-2.5 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-[#0e1424] to-[#12192e] p-3.5 shadow-lg shadow-black/40 text-xs text-slate-200 transition-all"
    >
      {/* Header with Arbitrator Persona Label */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-indigo-500/20">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
            <Scale className="w-3 h-3" />
          </div>
          <span className="font-bold tracking-wide uppercase text-[10px] text-indigo-300 font-display">
            Árbitro Epistêmico (Validador Terceira Persona)
          </span>
        </div>

        {/* Audio Button for Arbitrator's Distinct Voice */}
        {onPlayAudio && (
          <button
            onClick={handleAudioClick}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
              isPlayingAudio
                ? "bg-indigo-600 text-white border-indigo-400 animate-pulse"
                : "bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-200 border-indigo-500/30"
            }`}
            title="Ouvir parecer com a voz distinta do Árbitro"
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-3 h-3" />
                <span>Pausar Voz</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 text-indigo-400" />
                <span>Ouvir Árbitro</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Claim Analysed */}
      <div className="mb-2.5">
        <div className="text-[11px] text-slate-400 mb-0.5">Afirmação em Análise:</div>
        <div className="bg-black/30 border-l-2 border-indigo-400/60 pl-2.5 py-1 text-slate-200 italic font-mono text-[11px]">
          "{intervention.claim}"
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${badge.color}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </span>
        {intervention.confidence && (
          <span className="text-[10px] text-slate-400 font-mono">
            Grau de certeza: {Math.round(intervention.confidence * 100)}%
          </span>
        )}
      </div>

      {/* Epistemic Analysis */}
      <p className="text-slate-200 text-xs leading-relaxed mb-3">
        {intervention.analysis}
      </p>

      {/* Sources & Citations */}
      {intervention.sources && intervention.sources.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 font-medium mb-1.5"
          >
            <BookOpen className="w-3 h-3 text-indigo-400" />
            <span>
              {isExpanded ? "Ocultar Fontes Acadêmicas" : `Ver ${intervention.sources.length} Fontes Confiáveis`}
            </span>
          </button>

          {isExpanded && (
            <div className="space-y-1.5 mt-2 pt-2 border-t border-white/5 animate-in fade-in duration-150">
              {intervention.sources.map((src, idx) => (
                <div
                  key={idx}
                  className="bg-black/40 rounded-lg p-2 border border-white/5 flex items-start justify-between gap-2"
                >
                  <div>
                    <span className="font-semibold text-slate-200 block text-[11px]">
                      {src.title}
                    </span>
                    {src.snippet && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{src.snippet}</p>
                    )}
                  </div>
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 p-1 shrink-0"
                      title="Abrir fonte"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action: Request Evidence Prompt */}
      {intervention.requestedEvidencePrompt && onRequestEvidence && (
        <div className="mt-2 pt-2 border-t border-indigo-500/20 flex items-center justify-between gap-2 bg-indigo-950/20 p-2 rounded-lg">
          <span className="text-[11px] text-indigo-200">
            {intervention.requestedEvidencePrompt}
          </span>
          <button
            onClick={() => onRequestEvidence(intervention.requestedEvidencePrompt!)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-bold shrink-0 transition-colors"
          >
            <MessageSquarePlus className="w-3 h-3" />
            <span>Fornecer Prova</span>
          </button>
        </div>
      )}
    </div>
  );
}
