import { DEBATE_ROLES } from "../data/constants";
import { DebateRole, ModelId } from "../types";
import { HelpCircle, Microscope, Atom, Brain, Sparkles, X, Check } from "lucide-react";

interface RoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRole: DebateRole;
  onSelectRole: (role: DebateRole) => void;
  onSwitchModel?: (modelId: ModelId) => void;
}

const iconMap: Record<string, any> = {
  HelpCircle,
  Microscope,
  Atom,
  Brain,
  Sparkles,
};

export function RoleSelectorModal({
  isOpen,
  onClose,
  selectedRole,
  onSelectRole,
  onSwitchModel,
}: RoleSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div
      id="role-selector-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="role-selector-modal-panel"
        className="w-full max-w-lg bg-[#111625] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white font-display">
                Papéis de Debate Dialético
              </h2>
              <p className="text-xs text-slate-400">
                Diretriz sistêmica para fundamentação científica e filosófica
              </p>
            </div>
          </div>
          <button
            id="close-role-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {DEBATE_ROLES.map((role) => {
            const Icon = iconMap[role.iconName] || Sparkles;
            const isSelected = selectedRole.id === role.id;

            return (
              <button
                key={role.id}
                id={`role-option-${role.id}`}
                onClick={() => {
                  onSelectRole(role);
                  if (onSwitchModel) {
                    onSwitchModel(role.defaultModel);
                  }
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-start gap-3.5 ${
                  isSelected
                    ? "bg-cyan-950/40 border-cyan-500/50 shadow-sm shadow-cyan-950"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15"
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-white/5 text-slate-400 border border-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white truncate font-display">
                      {role.title}
                    </h3>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30 shrink-0">
                        <Check className="w-3 h-3" /> Ativo
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {role.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate pr-2">
                      <strong className="text-slate-300 font-medium">Foco Epistêmico:</strong>{" "}
                      {role.epistemicFocus}
                    </span>
                    <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                      {role.defaultModel.replace("-preview", "")}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-cyan-400">Rigor Invariável:</strong> Independentemente do papel
          escolhido, a Dialética sempre examina fatos empíricos, premissas de lógica formal e se
          adapta ao tom da conversa do usuário.
        </div>
      </div>
    </div>
  );
}
