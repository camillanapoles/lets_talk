import { X, BookOpen, Scale, Compass, CheckCircle2, Sliders } from "lucide-react";

interface EpistemicGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EpistemicGuideModal({ isOpen, onClose }: EpistemicGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div
      id="epistemic-guide-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="epistemic-guide-modal-panel"
        className="w-full max-w-xl bg-[#101626] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white font-display">
                Manifesto Epistemológico &amp; Dialético
              </h2>
              <p className="text-xs text-slate-400">
                Fundamentos de evidência, lógica e adaptação comunicativa
              </p>
            </div>
          </div>
          <button
            id="close-epistemic-guide-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-2 font-display">
              <Scale className="w-4 h-4 text-cyan-400" />
              1. Fatos, Evidências e Consenso Científico
            </h3>
            <p>
              O aplicativo distingue expressamente entre fatos empiricamente estabelecidos,
              consenso científico hegemônico, hipóteses plausíveis em teste e especulações
              filosóficas puras. Nenhuma crença é tratada como dogma irrefutável; todas estão
              sujeitas ao teste de <strong>falseabilidade popperiana</strong> e à atualização
              de probabilidades pela <strong>lógica bayesiana</strong>.
            </p>
          </div>

          <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-xl">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-2 font-display">
              <BookOpen className="w-4 h-4 text-purple-400" />
              2. Rigor Filosófico e Desconstrução de Falácias
            </h3>
            <p>
              A Dialética analisa a estrutura lógica dos argumentos, desvelando premissas ocultas,
              axiomas fundacionais e potenciais falácias informais (como a falácia naturalista de
              Moore, espantalhos e falsas dicotomias). Aplica-se o <strong>Steelmanning</strong>,
              examinando a versão mais forte e lúcida do ponto de vista oposto.
            </p>
          </div>

          <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-2 font-display">
              <Sliders className="w-4 h-4 text-emerald-400" />
              3. Camaleão Comunicativo: Adaptação Dinâmica ao Seu Tom
            </h3>
            <p>
              Conforme solicitado nas diretrizes fundacionais, a IA espelha o seu nível de
              comunicação: se você conversar de forma descontraída ou coloquial, a IA responderá
              com a mesma naturalidade e fluidez; se você adotar terminologia técnica acadêmica, ela
              responderá com a mesma solenidade. <em>Em qualquer registro linguístico, o rigor
              factual e a solidez das evidências permanecem inegociáveis.</em>
            </p>
          </div>

          <div className="p-4 bg-pink-950/20 border border-pink-500/20 rounded-xl">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-2 font-display">
              <CheckCircle2 className="w-4 h-4 text-pink-400" />
              4. Diagramas Visuais em 1K, 2K e 4K
            </h3>
            <p>
              O motor gráfico alimentado pelo modelo <code>gemini-3-pro-image-preview</code>{" "}
              permite materializar experimentos mentais (como o Gato de Schrödinger ou a Caverna de
              Platão) e geometrias cosmológicas diretamente no debate, com escolha explícita de
              resolução até 4K Ultra-HD.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
