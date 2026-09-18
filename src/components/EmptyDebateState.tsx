import { DebateTopic, DebateRole, ModelId } from "../types";
import { DEBATE_STARTERS } from "../data/constants";
import {
  Compass,
  ArrowRight,
  Brain,
  Atom,
  Scale,
  Sparkles,
  ImageIcon,
} from "lucide-react";

interface EmptyDebateStateProps {
  onSelectStarter: (topic: DebateTopic) => void;
  onOpenImageStudio: () => void;
  selectedRole: DebateRole;
  selectedModel: ModelId;
}

export function EmptyDebateState({
  onSelectStarter,
  onOpenImageStudio,
  selectedRole,
  selectedModel,
}: EmptyDebateStateProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Filosofia da Mente":
        return <Brain className="w-4 h-4 text-purple-400" />;
      case "Física Teórica":
      case "Cosmologia":
        return <Atom className="w-4 h-4 text-cyan-400" />;
      default:
        return <Scale className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div
      id="empty-debate-state"
      className="max-w-3xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-300"
    >
      {/* Hero Welcome */}
      <div className="text-center space-y-3 pt-2 sm:pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium">
          <Compass className="w-3.5 h-3.5" />
          <span>Rigor Factual &bull; Dialética Filosófica &bull; Tom Adaptativo</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
          Debates a Níveis Profundos
        </h2>

        <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          Mais do que um chatbot convencional: uma arena dialética para examinar hipóteses,
          desconstruir falácias lógicas e confrontar teorias científicas consolidadas, espelhando o
          seu estilo comunicativo com embasamento rigoroso.
        </p>
      </div>

      {/* Feature Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="block text-cyan-400 font-bold mb-0.5">Popper &amp; Bayes</span>
          <span className="text-[11px] text-slate-400">Falseabilidade &amp; Evidência</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="block text-purple-400 font-bold mb-0.5">Lógica &amp; Ontologia</span>
          <span className="text-[11px] text-slate-400">Desconstrução de Falácias</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="block text-emerald-400 font-bold mb-0.5">Camaleão de Tom</span>
          <span className="text-[11px] text-slate-400">Coloquial ou Erudito</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="block text-pink-400 font-bold mb-0.5">Imagens 1K &bull; 2K &bull; 4K</span>
          <span className="text-[11px] text-slate-400">Modelos &amp; Experimentos</span>
        </div>
      </div>

      {/* Starter Topics Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Temas Fundamentais para Iniciar o Debate:
          </h3>
          <span className="text-[11px] text-slate-400">Clique para iniciar</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DEBATE_STARTERS.map((topic) => (
            <button
              key={topic.id}
              id={`starter-topic-${topic.id}`}
              onClick={() => onSelectStarter(topic)}
              className="text-left p-3.5 rounded-xl bg-[#111728]/80 hover:bg-[#151e34] border border-white/10 hover:border-cyan-500/40 transition-all duration-150 group flex flex-col justify-between space-y-2 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-[11px] mb-1.5">
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    {getCategoryIcon(topic.category)}
                    {topic.category}
                  </span>
                  <span className="text-[10px] font-mono text-purple-300 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                    {topic.modelId.replace("-preview", "")}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors font-display line-clamp-1">
                  {topic.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {topic.prompt}
                </p>
              </div>

              <div className="pt-1 flex items-center justify-end text-cyan-400 text-xs font-medium gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Debater</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Visualizer Prompt Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-950/30 via-purple-950/20 to-cyan-950/30 border border-pink-500/20 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300 shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white font-display">
              Visualizador Conceitual (gemini-3-pro-image-preview)
            </h4>
            <p className="text-[11px] text-slate-300">
              Gere diagramas esquemáticos e experimentos mentais em resolução 1K, 2K ou 4K Ultra-HD.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenImageStudio}
          className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white shadow-sm shadow-pink-950 transition-colors flex items-center gap-1.5 ml-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Abrir Estúdio Visual
        </button>
      </div>
    </div>
  );
}
