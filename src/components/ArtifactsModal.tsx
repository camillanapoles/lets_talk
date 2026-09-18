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
} from "lucide-react";

interface ArtifactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

export function ArtifactsModal({ isOpen, onClose, messages }: ArtifactsModalProps) {
  const [selectedType, setSelectedType] = useState<"summary" | "argument_tree" | "fact_dossier">("summary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArtifact, setGeneratedArtifact] = useState<Artifact | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (type: "summary" | "argument_tree" | "fact_dossier") => {
    setSelectedType(type);
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/artifacts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          type,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao sintetizar artefato.");
      }

      setGeneratedArtifact(data);
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
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-[#0c1220] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-display">
                Artefatos Epistêmicos do Debate
              </h2>
              <p className="text-[11px] text-slate-400">
                Súmulas analíticas, árvores de argumentos e dossiês de fontes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Artifact Type Selector Tabs */}
        <div className="p-3 bg-[#080d17] border-b border-white/10 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => handleGenerate("summary")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-medium whitespace-nowrap transition-all ${
              selectedType === "summary"
                ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-sm"
                : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Súmula Epistêmica</span>
          </button>

          <button
            onClick={() => handleGenerate("argument_tree")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-medium whitespace-nowrap transition-all ${
              selectedType === "argument_tree"
                ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-sm"
                : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            <span>Árvore de Argumentos</span>
          </button>

          <button
            onClick={() => handleGenerate("fact_dossier")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-medium whitespace-nowrap transition-all ${
              selectedType === "fact_dossier"
                ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-sm"
                : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dossiê de Fontes & Evidências</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          {isGenerating ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs font-mono">
                Sintetizando premissas, teses e evidências científicas com Gemini...
              </p>
            </div>
          ) : generatedArtifact ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-cyan-300 font-display">
                    {generatedArtifact.title}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {generatedArtifact.description}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-slate-300 flex items-center gap-1"
                    title="Copiar texto"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline text-[11px]">
                      {copied ? "Copiado" : "Copiar"}
                    </span>
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-slate-300 flex items-center gap-1"
                    title="Baixar arquivo Markdown"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline text-[11px]">Baixar</span>
                  </button>
                </div>
              </div>

              <div className="prose-dialetica text-xs sm:text-sm leading-relaxed max-w-none bg-black/30 p-4 rounded-2xl border border-white/5 overflow-x-auto">
                <Markdown>{generatedArtifact.content}</Markdown>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Sparkles className="w-8 h-8 text-cyan-400/60 mx-auto" />
              <p className="text-xs max-w-md mx-auto leading-relaxed">
                Clique em uma das abas acima para que a inteligência artificial compile uma
                visão formal dos tópicos debatidos até aqui.
              </p>
              <button
                onClick={() => handleGenerate("summary")}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950/50"
              >
                Gerar Súmula Agora
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
