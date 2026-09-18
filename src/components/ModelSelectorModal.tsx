import { GEMINI_MODELS } from "../data/constants";
import { ModelId, ModelOption } from "../types";
import { Cpu, X, Check, Zap, Sparkles, BrainCircuit } from "lucide-react";

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: ModelId;
  onSelectModel: (model: ModelId) => void;
}

export function ModelSelectorModal({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
}: ModelSelectorModalProps) {
  if (!isOpen) return null;

  const getModelIcon = (recommendedFor: string) => {
    switch (recommendedFor) {
      case "complex":
        return <BrainCircuit className="w-5 h-5" />;
      case "general":
        return <Sparkles className="w-5 h-5" />;
      case "fast":
        return <Zap className="w-5 h-5" />;
      default:
        return <Cpu className="w-5 h-5" />;
    }
  };

  return (
    <div
      id="model-selector-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="model-selector-modal-panel"
        className="w-full max-w-lg bg-[#111625] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white font-display">
                Motor de Inteligência Gemini
              </h2>
              <p className="text-xs text-slate-400">
                Selecione o modelo apropriado para o nível de complexidade
              </p>
            </div>
          </div>
          <button
            id="close-model-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {GEMINI_MODELS.map((model: ModelOption) => {
            const isSelected = selectedModel === model.id;

            return (
              <button
                key={model.id}
                id={`model-option-${model.id}`}
                onClick={() => {
                  onSelectModel(model.id);
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-start gap-3.5 ${
                  isSelected
                    ? "bg-purple-950/40 border-purple-500/50 shadow-sm shadow-purple-950"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15"
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                    isSelected
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "bg-white/5 text-slate-400 border border-white/10"
                  }`}
                >
                  {getModelIcon(model.recommendedFor)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white font-display">
                        {model.name}
                      </h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${model.badgeColor}`}
                      >
                        {model.badge}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30 shrink-0">
                        <Check className="w-3 h-3" /> Selecionado
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {model.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[11px] text-slate-400">
                    <strong className="text-slate-300 font-medium">Recomendado para:</strong>{" "}
                    {model.useCase}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl text-[11px] text-slate-300 leading-relaxed">
          <strong className="text-purple-300">Diretriz da Arquitetura:</strong> O{" "}
          <span className="text-white font-semibold">Gemini 3.1 Pro</span> é indicado para debates
          particularmente complexos e ontológicos; o{" "}
          <span className="text-white font-semibold">Gemini 3.5 Flash</span> para tarefas gerais; e o{" "}
          <span className="text-white font-semibold">Gemini 3.1 Flash Lite</span> para trocas
          rápidas e verificações de hipóteses instantâneas.
        </div>
      </div>
    </div>
  );
}
