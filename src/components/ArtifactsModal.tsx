import { useState } from "react";
import { Message, Artifact } from "../types";
import Markdown from "react-markdown";
import {
  FileText,
  GitBranch,
  BookOpen,
  Copy,
  Check,
  Download,
  Loader2,
  X,
  Sparkles,
  Layers,
  Send,
  HelpCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface ArtifactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  sessionArtifacts?: Artifact[];
  onSaveArtifact?: (artifact: Artifact) => void;
  customTopic?: string;
}

type ArtifactCategory = "summary" | "argument_tree" | "fact_dossier" | "concept_diagram";

export function ArtifactsModal({
  isOpen,
  onClose,
  messages,
  sessionArtifacts = [],
  onSaveArtifact,
  customTopic,
}: ArtifactsModalProps) {
  const [selectedType, setSelectedType] = useState<ArtifactCategory>("summary");
  const [customFocus, setCustomFocus] = useState("");
  const [initialThesis, setInitialThesis] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArtifact, setGeneratedArtifact] = useState<Artifact | null>(() => {
    return sessionArtifacts.length > 0 ? sessionArtifacts[sessionArtifacts.length - 1] : null;
  });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasMessages = messages && messages.length > 0;
  const effectiveTopic = customTopic && customTopic.trim() !== "" && customTopic !== "Livre" ? customTopic : null;

  const handleGenerate = async (type: ArtifactCategory = selectedType, specificFocus?: string) => {
    setSelectedType(type);
    setIsGenerating(true);
    setError(null);

    try {
      const focusText = specificFocus !== undefined ? specificFocus : customFocus;
      const payload: any = {
        type,
        topic: effectiveTopic || (initialThesis.trim() ? initialThesis.trim() : "Epistemologia & Rigor Dialético"),
      };

      if (hasMessages) {
        payload.messages = messages.map((m) => ({ role: m.role, content: m.content }));
      } else if (initialThesis.trim()) {
        payload.messages = [{ role: "user", content: initialThesis.trim() }];
      }

      if (focusText && focusText.trim()) {
        payload.customPrompt = focusText.trim();
      }

      const res = await fetch("/api/artifacts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao sintetizar artefato epistêmico.");
      }

      setGeneratedArtifact(data);
      if (onSaveArtifact) {
        onSaveArtifact(data);
      }
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro ao gerar o artefato.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedArtifact) return;
    navigator.clipboard.writeText(generatedArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!generatedArtifact) return;
    const blob = new Blob([generatedArtifact.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${generatedArtifact.title.toLowerCase().replace(/\s+/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="artifacts-modal"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div className="bg-[#0b1120] border border-white/15 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#080d18]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-display tracking-tight">
                  Artefatos Epistêmicos do Debate
                </h2>
                {hasMessages ? (
                  <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                    {messages.length} turno(s) no debate
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
                    Modo Exploratório
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Súmulas analíticas, árvores de premissas, vereditos e bibliografia científica
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Artifact Categories Bar */}
        <div className="p-3 bg-[#060912] border-b border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => handleGenerate("summary")}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-medium whitespace-nowrap transition-all ${
              selectedType === "summary"
                ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-200 shadow-sm"
                : "bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
            } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Súmula Epistêmica</span>
          </button>

          <button
            onClick={() => handleGenerate("argument_tree")}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-medium whitespace-nowrap transition-all ${
              selectedType === "argument_tree"
                ? "bg-purple-950/70 border-purple-500/50 text-purple-200 shadow-sm"
                : "bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
            } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            <span>Árvore de Argumentos</span>
          </button>

          <button
            onClick={() => handleGenerate("fact_dossier")}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-medium whitespace-nowrap transition-all ${
              selectedType === "fact_dossier"
                ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200 shadow-sm"
                : "bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
            } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dossiê de Fontes &amp; Evidências</span>
          </button>

          <button
            onClick={() => handleGenerate("concept_diagram")}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-medium whitespace-nowrap transition-all ${
              selectedType === "concept_diagram"
                ? "bg-amber-950/70 border-amber-500/50 text-amber-200 shadow-sm"
                : "bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
            } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Formalismo Conceitual</span>
          </button>
        </div>

        {/* Existing Session Artifacts Bar (if any were previously saved) */}
        {sessionArtifacts.length > 0 && (
          <div className="px-4 py-2 bg-[#05070f] border-b border-white/5 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-slate-400 shrink-0 font-medium">Salvos nesta sessão ({sessionArtifacts.length}):</span>
            {sessionArtifacts.map((art) => (
              <button
                key={art.id}
                onClick={() => setGeneratedArtifact(art)}
                className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  generatedArtifact?.id === art.id
                    ? "bg-cyan-950/80 border-cyan-500/60 text-cyan-300 font-semibold shadow-xs"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="truncate max-w-[140px]">{art.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-start gap-2.5 shadow-md">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-100">Falha ao sintetizar o artefato:</p>
                <p className="mt-0.5 text-red-300">{error}</p>
              </div>
              <button
                onClick={() => handleGenerate(selectedType)}
                className="px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-100 text-[11px] font-bold shrink-0 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Tentar de novo</span>
              </button>
            </div>
          )}

          {isGenerating ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                <Sparkles className="w-4 h-4 text-cyan-300 absolute top-0 right-0 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-white font-display">
                  Sintetizando premissas e teses com Gemini 3.8 Flash...
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Catalogando axiomas, identificando inferências lógicas e validando fontes científicas de referência.
                </p>
              </div>
            </div>
          ) : generatedArtifact ? (
            <div className="space-y-4">
              {/* Header of the generated artifact */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-cyan-300 font-display">
                    {generatedArtifact.title}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {generatedArtifact.description}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                    title="Copiar texto para área de transferência"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 font-medium">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                    title="Baixar arquivo Markdown (.md)"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Baixar (.md)</span>
                  </button>

                  <button
                    onClick={() => handleGenerate(selectedType)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs text-cyan-200 flex items-center gap-1.5 transition-colors"
                    title="Regenerar com o estado mais recente da conversa"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Atualizar</span>
                  </button>
                </div>
              </div>

              {/* Rendered content */}
              <div className="prose-dialetica text-xs sm:text-sm leading-relaxed max-w-none bg-[#070b14] p-5 rounded-2xl border border-white/5 overflow-x-auto shadow-inner text-slate-200">
                <Markdown>{generatedArtifact.content}</Markdown>
              </div>

              {/* Refinement input */}
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-2">
                <input
                  type="text"
                  value={customFocus}
                  onChange={(e) => setCustomFocus(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customFocus.trim()) {
                      handleGenerate(selectedType, customFocus);
                    }
                  }}
                  placeholder="Instrução adicional de foco (ex: 'destacar falácias formais', 'focar em Popper e falsacionismo')..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => handleGenerate(selectedType, customFocus)}
                  disabled={!customFocus.trim() || isGenerating}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Send className="w-3 h-3" />
                  <span>Refinar</span>
                </button>
              </div>
            </div>
          ) : !hasMessages ? (
            /* Empty conversation state: allow exploratory dossier generation */
            <div className="py-8 px-4 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white font-display">
                  Sintetize um Dossiê Conceitual Imediato
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Você ainda não iniciou turnos de debate nesta sessão. Você pode formular uma tese ou gerar um dossiê exploratório com base no tema atual:{" "}
                  <strong className="text-cyan-300">{effectiveTopic || "Epistemologia & Rigor Dialético"}</strong>.
                </p>
              </div>

              <div className="space-y-2 text-left bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Tese ou problema a dissecar (opcional):
                </label>
                <textarea
                  rows={2}
                  value={initialThesis}
                  onChange={(e) => setInitialThesis(e.target.value)}
                  placeholder="Ex: 'O livre-arbítrio é uma ilusão derivada de processos determinísticos neurais'..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleGenerate("summary")}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-950 transition-all flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Gerar Súmula Conceitual</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate("fact_dossier")}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-medium text-xs transition-colors flex items-center gap-2"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dossiê de Referências</span>
                </button>
              </div>
            </div>
          ) : (
            /* Has messages but no artifact generated yet */
            <div className="py-12 text-center text-slate-400 space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-display">
                  Pronto para sintetizar seu debate
                </h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  Selecione uma modalidade acima ou clique abaixo para que o Gemini 3.8 Flash
                  compile uma análise formal das teses, objeções e consensos estabelecidos até aqui.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleGenerate("summary")}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950/50 transition-all flex items-center justify-center gap-2 mx-auto"
              >
                <Sparkles className="w-4 h-4" />
                <span>Gerar Súmula Epistêmica do Debate</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#060912] border-t border-white/10 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Os artefatos gerados são sincronizados automaticamente na sua sessão salva.</span>
          </div>
          <span className="font-mono text-cyan-500/70 hidden sm:inline">gemini-3.8-flash</span>
        </div>
      </div>
    </div>
  );
}
