import { useState, useRef } from "react";
import {
  DebateSession,
  Message,
  DebateMode,
  FormalDebateState,
  ModelId,
  DebateRole,
  Artifact,
} from "../types";
import {
  FolderOpen,
  Plus,
  Save,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  MessageSquare,
  Scale,
  Award,
  FileText,
  Download,
  Upload,
  ChevronRight,
  Sparkles,
  Layers,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  generateSmartSessionTitle,
  exportSessionsToJSON,
  importSessionsFromJSON,
  exportSessionToMarkdown,
} from "../utils/sessionStorage";

interface SessionsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: DebateSession[];
  currentSessionId: string | null;
  currentMessages: Message[];
  currentDebateMode: DebateMode;
  currentFormalState: FormalDebateState;
  currentModel: ModelId;
  currentRole: DebateRole;
  currentArtifacts: Artifact[];
  onSaveCurrentSession: (customTitle?: string, asNewCopy?: boolean) => void;
  onLoadSession: (session: DebateSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onStartNewDebate: () => void;
  onImportSessionsSuccess: (importedCount: number) => void;
}

export function SessionsManagerModal({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  currentMessages,
  currentDebateMode,
  currentFormalState,
  currentModel,
  currentRole,
  currentArtifacts,
  onSaveCurrentSession,
  onLoadSession,
  onDeleteSession,
  onRenameSession,
  onStartNewDebate,
  onImportSessionsSuccess,
}: SessionsManagerModalProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [showSaveCurrentForm, setShowSaveCurrentForm] = useState(false);
  const [saveTitleInput, setSaveTitleInput] = useState("");
  const [saveAsCopy, setSaveAsCopy] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<DebateSession | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentSavedSession = sessions.find((s) => s.id === currentSessionId);
  const hasUnsavedMessages = currentMessages.length > 0;

  const handleOpenSaveForm = () => {
    const suggested = currentSavedSession
      ? currentSavedSession.title
      : generateSmartSessionTitle(currentMessages, currentFormalState, currentDebateMode);
    setSaveTitleInput(suggested);
    setSaveAsCopy(false);
    setShowSaveCurrentForm(true);
  };

  const handleConfirmSave = () => {
    if (!saveTitleInput.trim()) return;
    onSaveCurrentSession(saveTitleInput.trim(), saveAsCopy);
    setShowSaveCurrentForm(false);
    setFeedbackNotice({
      type: "success",
      text: saveAsCopy
        ? "Cópia salva com sucesso como nova sessão!"
        : "Sessão salva com sucesso!",
    });
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleStartEditing = (session: DebateSession) => {
    setEditingSessionId(session.id);
    setEditTitleValue(session.title);
  };

  const handleConfirmRename = (sessionId: string) => {
    if (editTitleValue.trim()) {
      onRenameSession(sessionId, editTitleValue.trim());
      setFeedbackNotice({ type: "success", text: "Título atualizado com sucesso." });
      setTimeout(() => setFeedbackNotice(null), 2500);
    }
    setEditingSessionId(null);
  };

  const handleExportJSON = () => {
    const jsonStr = exportSessionsToJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dialetica_sessoes_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedbackNotice({ type: "success", text: "Backup exportado para arquivo JSON." });
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleExportSingleSessionMD = (session: DebateSession) => {
    const mdStr = exportSessionToMarkdown(session);
    const blob = new Blob([mdStr], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanTitle = session.title.replace(/[^a-zA-Z0-9_\u00C0-\u00FF]/g, "_").slice(0, 30);
    link.download = `dialetica_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedbackNotice({ type: "success", text: "Transcrição acadêmica exportada em Markdown (.md)!" });
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importSessionsFromJSON(content);
      if (res.success) {
        onImportSessionsSuccess(res.count);
        setFeedbackNotice({
          type: "success",
          text: `${res.count} sessão(ões) importada(s) com sucesso!`,
        });
        setTimeout(() => setFeedbackNotice(null), 3500);
      } else {
        setFeedbackNotice({
          type: "error",
          text: `Falha na importação: ${res.error}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div
      id="sessions-manager-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-[#0b101d] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#080d18]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white font-display">
                  Sessões de Debate
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-semibold">
                  {sessions.length} salvas
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Histórico local de debates, artefatos epistêmicos e pontuações
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

        {/* Feedback Alert Notice */}
        {feedbackNotice && (
          <div
            className={`px-4 py-2 text-xs font-medium flex items-center gap-2 border-b ${
              feedbackNotice.type === "success"
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/30"
                : "bg-red-950/80 text-red-300 border-red-500/30"
            }`}
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{feedbackNotice.text}</span>
          </div>
        )}

        {/* Action Bar (Save Current Session & New Debate) */}
        <div className="p-3 sm:p-4 bg-[#0e1526] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              id="btn-save-current-debate"
              onClick={handleOpenSaveForm}
              disabled={!hasUnsavedMessages}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all shadow-sm ${
                hasUnsavedMessages
                  ? "bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-cyan-950/50"
                  : "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
              }`}
              title={
                hasUnsavedMessages
                  ? "Salvar ou nomear este debate"
                  : "O debate atual está vazio"
              }
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {currentSavedSession ? "Salvar Alterações" : "Salvar Debate Atual"}
              </span>
            </button>

            <button
              id="btn-new-clean-debate"
              onClick={() => {
                if (hasUnsavedMessages) {
                  onSaveCurrentSession();
                }
                onStartNewDebate();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-200 font-semibold transition-all shadow-sm"
              title="Iniciar novo debate em branco (o debate atual será preservado no histórico)"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Novo Debate</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Backup / Export */}
            <button
              onClick={handleExportJSON}
              disabled={sessions.length === 0}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Exportar backup em JSON"
            >
              <Download className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Import JSON */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 transition-colors"
              title="Importar debates de JSON"
            >
              <Upload className="w-4 h-4 text-purple-400" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Inline Save Form */}
        {showSaveCurrentForm && (
          <div className="p-4 bg-cyan-950/40 border-b border-cyan-500/30 animate-in slide-in-from-top-2 duration-150">
            <div className="max-w-xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Nomear e Salvar Sessão no LocalStorage
                </span>
                <button
                  onClick={() => setShowSaveCurrentForm(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={saveTitleInput}
                  onChange={(e) => setSaveTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmSave()}
                  placeholder="Ex: Consciência e Fisicalismo na Filosofia da Mente"
                  className="flex-1 bg-black/50 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
                <button
                  onClick={handleConfirmSave}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>
              </div>

              {currentSavedSession && (
                <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveAsCopy}
                    onChange={(e) => setSaveAsCopy(e.target.checked)}
                    className="rounded border-slate-600 text-cyan-500 focus:ring-0"
                  />
                  <span>Salvar como nova cópia (duplicar sessão)</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {sessions.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-300">
                  Nenhuma sessão salva ainda
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Quando você debater com o Dialética, clique em &ldquo;Salvar Debate
                  Atual&rdquo; para guardar o histórico, artefatos e pontuações no seu
                  navegador.
                </p>
              </div>
              {hasUnsavedMessages && (
                <button
                  onClick={handleOpenSaveForm}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-cyan-950/50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar o debate em andamento agora</span>
                </button>
              )}
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const isExpanded = expandedSessionId === session.id;
              const isEditing = editingSessionId === session.id;

              // Calculate fact checks count in session
              const factCheckCount = session.messages.reduce((acc, m) => {
                return acc + (m.factChecks?.length || 0);
              }, 0);

              return (
                <div
                  key={session.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isActive
                      ? "bg-cyan-950/30 border-cyan-500/50 shadow-md shadow-cyan-950/20"
                      : "bg-[#0d1424] border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* Session Header / Main Row */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Active tag & date */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {isActive && (
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            Sessão Ativa
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            session.debateMode === "formal"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          <Scale className="w-2.5 h-2.5" />
                          <span>{session.debateMode === "formal" ? "Debate Formal" : "Discussão Aberta"}</span>
                        </span>

                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>
                            {new Date(session.updatedAt || session.createdAt).toLocaleDateString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </span>
                      </div>

                      {/* Title or Edit Input */}
                      {isEditing ? (
                        <div className="flex items-center gap-2 my-1">
                          <input
                            type="text"
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleConfirmRename(session.id);
                              if (e.key === "Escape") setEditingSessionId(null);
                            }}
                            className="bg-black/60 border border-cyan-500/50 rounded-lg px-2.5 py-1 text-xs text-white flex-1 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleConfirmRename(session.id)}
                            className="p-1.5 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                            title="Salvar nome"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingSessionId(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 group truncate">
                          <span className="truncate">{session.title}</span>
                          <button
                            onClick={() => handleStartEditing(session)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-cyan-300 p-1 transition-opacity"
                            title="Renomear sessão"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </h3>
                      )}

                      {/* Metadata Chips: Messages, Artifacts, Scores */}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-cyan-400" />
                          <span>{session.messages.length} mensagens</span>
                        </span>

                        {session.artifacts && session.artifacts.length > 0 && (
                          <span className="flex items-center gap-1 text-purple-300">
                            <FileText className="w-3 h-3 text-purple-400" />
                            <span>{session.artifacts.length} artefato(s)</span>
                          </span>
                        )}

                        {factCheckCount > 0 && (
                          <span className="flex items-center gap-1 text-emerald-300">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>{factCheckCount} checagens</span>
                          </span>
                        )}

                        {/* Scores for formal debate */}
                        {session.debateMode === "formal" && session.formalState?.score && (
                          <span className="flex items-center gap-1 text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30">
                            <Award className="w-3 h-3 text-amber-400" />
                            <span>
                              Score: Você{" "}
                              {session.formalState.score.userLogicScore +
                                session.formalState.score.userEvidenceScore}{" "}
                              ×{" "}
                              {session.formalState.score.modelLogicScore +
                                session.formalState.score.modelEvidenceScore}{" "}
                              Dialética
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {/* Export Markdown */}
                      <button
                        onClick={() => handleExportSingleSessionMD(session)}
                        className="px-2 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-[11px] text-slate-300 flex items-center gap-1 transition-colors hover:text-cyan-300"
                        title="Exportar transcrição acadêmica em Markdown (.md)"
                      >
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden sm:inline">MD</span>
                      </button>

                      {/* Toggle Details Accordion */}
                      <button
                        onClick={() =>
                          setExpandedSessionId(isExpanded ? null : session.id)
                        }
                        className="px-2.5 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-[11px] text-slate-300 flex items-center gap-1 transition-colors"
                        title="Ver detalhes, artefatos e scores"
                      >
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isExpanded ? "Ocultar" : "Detalhes"}</span>
                      </button>

                      {/* Load Session */}
                      <button
                        onClick={() => {
                          onLoadSession(session);
                          onClose();
                        }}
                        disabled={isActive}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all ${
                          isActive
                            ? "bg-white/5 text-slate-500 cursor-default"
                            : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm"
                        }`}
                        title={isActive ? "Esta sessão já está aberta" : "Carregar esta sessão no debate"}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>{isActive ? "Aberta" : "Carregar"}</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setSessionToDelete(session)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-colors"
                        title="Excluir sessão permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Details Section: Artifacts & Formal Debate Breakdown */}
                  {isExpanded && (
                    <div className="p-3.5 sm:p-4 bg-black/40 border-t border-white/10 space-y-3 text-xs">
                      {/* Topic & Role info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-slate-500 block mb-0.5">Tópico / Tese:</span>
                          <p className="text-slate-200 line-clamp-2">
                            {session.formalState?.topic || session.messages[0]?.content || "Não especificado"}
                          </p>
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-slate-500 block mb-0.5">Modelo & Postura:</span>
                          <p className="text-slate-200">
                            {session.selectedModel} &bull; {session.selectedRole?.shortTitle || "Dialética"}
                          </p>
                        </div>
                      </div>

                      {/* Formal Scores Breakdown */}
                      {session.debateMode === "formal" && session.formalState?.score && (
                        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
                          <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-2">
                            <Award className="w-3.5 h-3.5" />
                            <span>Avaliação do Árbitro Epistêmico</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                            <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                              <span className="text-slate-400 block mb-1">Você (Debatedor)</span>
                              <div className="flex justify-around font-mono">
                                <span>Lógica: {session.formalState.score.userLogicScore}</span>
                                <span>Evidências: {session.formalState.score.userEvidenceScore}</span>
                              </div>
                            </div>
                            <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                              <span className="text-slate-400 block mb-1">Dialética (IA)</span>
                              <div className="flex justify-around font-mono">
                                <span>Lógica: {session.formalState.score.modelLogicScore}</span>
                                <span>Evidências: {session.formalState.score.modelEvidenceScore}</span>
                              </div>
                            </div>
                          </div>
                          {session.formalState.finalVerdict && (
                            <p className="text-[11px] text-slate-300 mt-2 italic bg-black/20 p-2 rounded-lg border border-white/5">
                              &ldquo;{session.formalState.finalVerdict}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      {/* Artifacts Attached to Session */}
                      <div>
                        <span className="text-slate-400 font-medium block mb-1.5 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-purple-400" />
                          <span>Artefatos Salvos nesta Sessão ({session.artifacts?.length || 0}):</span>
                        </span>

                        {session.artifacts && session.artifacts.length > 0 ? (
                          <div className="space-y-1.5">
                            {session.artifacts.map((art) => (
                              <div
                                key={art.id}
                                className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <span className="font-semibold text-white truncate block">
                                    {art.title}
                                  </span>
                                  <span className="text-[10px] text-slate-400 line-clamp-1">
                                    {art.description}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-purple-300 uppercase px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/30 shrink-0">
                                  {art.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">
                            Nenhum artefato gerado para esta sessão ainda.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {sessionToDelete && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#121829] border border-red-500/40 rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-2xl text-center">
              <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Excluir Sessão de Debate?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você tem certeza de que deseja remover permanentemente o debate &ldquo;
                <strong className="text-slate-200">{sessionToDelete.title}</strong>
                &rdquo; e seus artefatos associados do armazenamento local?
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onDeleteSession(sessionToDelete.id);
                    setSessionToDelete(null);
                    setFeedbackNotice({
                      type: "success",
                      text: "Sessão excluída com sucesso.",
                    });
                    setTimeout(() => setFeedbackNotice(null), 2500);
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-950/50"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-[#080d18] border-t border-white/10 flex items-center justify-between text-[11px] text-slate-500">
          <span>Armazenado localmente em seu navegador (localStorage)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-white/15 hover:bg-white/5 text-slate-300 font-medium text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
