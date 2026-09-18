import { useState, useEffect, useRef, useCallback } from "react";
import {
  Message,
  ModelId,
  DebateRole,
  DebateTopic,
  GeneratedImage,
  DebateMode,
  SessionUIMode,
  FormalDebateState,
  FormalRoundConfig,
  FactCheckIntervention,
  DebateSession,
  Artifact,
} from "./types";
import { DEBATE_ROLES, GEMINI_MODELS } from "./data/constants";
import { AndroidStatusBar } from "./components/AndroidStatusBar";
import { AndroidNavBar } from "./components/AndroidNavBar";
import { TopAppBar } from "./components/TopAppBar";
import { ChatMessageItem } from "./components/ChatMessageItem";
import { ChatInputBar } from "./components/ChatInputBar";
import { EmptyDebateState } from "./components/EmptyDebateState";
import { RoleSelectorModal } from "./components/RoleSelectorModal";
import { ModelSelectorModal } from "./components/ModelSelectorModal";
import { ImageStudioModal } from "./components/ImageStudioModal";
import { EpistemicGuideModal } from "./components/EpistemicGuideModal";
import { DebateModeModal } from "./components/DebateModeModal";
import { ArtifactsModal } from "./components/ArtifactsModal";
import { VoiceLiveArena } from "./components/VoiceLiveArena";
import { SessionsManagerModal } from "./components/SessionsManagerModal";
import { SystemDiagnosticsModal } from "./components/SystemDiagnosticsModal";
import {
  loadSavedSessions,
  saveDebateSession,
  deleteDebateSession,
  renameDebateSession,
  getActiveSessionId,
  setActiveSessionId,
  generateSmartSessionTitle,
} from "./utils/sessionStorage";
import { useDialeticaVoice } from "./hooks/useDialeticaVoice";
import { AlertCircle, Download, X, Plus, Check } from "lucide-react";

const DEFAULT_FORMAL_ROUNDS: FormalRoundConfig[] = [
  {
    roundNumber: 1,
    name: "Abertura & Tese",
    description: "Exposição da tese e premissas fundamentais",
    durationSeconds: 90,
    speaker: "user",
    phase: "opening",
  },
  {
    roundNumber: 2,
    name: "Refutação & Objeções",
    description: "Objeções epistêmicas e contraexemplos",
    durationSeconds: 90,
    speaker: "model",
    phase: "rebuttal",
  },
  {
    roundNumber: 3,
    name: "Tréplica & Defesa",
    description: "Defesa dialética e verificação de falácias",
    durationSeconds: 90,
    speaker: "user",
    phase: "counter_rebuttal",
  },
  {
    roundNumber: 4,
    name: "Síntese & Conclusão",
    description: "Síntese dialética e balanço probatório",
    durationSeconds: 60,
    speaker: "model",
    phase: "synthesis",
  },
];

export default function App() {
  // Saved sessions management
  const [sessions, setSessions] = useState<DebateSession[]>(() => loadSavedSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => getActiveSessionId());
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);

  // Determine initial session snapshot if one was active previously
  const initialSavedSession = (() => {
    const activeId = getActiveSessionId();
    if (activeId) {
      const saved = loadSavedSessions();
      return saved.find((s) => s.id === activeId) || null;
    }
    return null;
  })();

  // Messages state with local persistence or active session restore
  const [messages, setMessages] = useState<Message[]>(() => {
    if (initialSavedSession && initialSavedSession.messages) {
      return initialSavedSession.messages;
    }
    try {
      const saved = localStorage.getItem("dialetica_chat_history");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Erro ao carregar histórico local:", e);
    }
    return [];
  });

  // Artifacts associated with current debate session
  const [sessionArtifacts, setSessionArtifacts] = useState<Artifact[]>(() => {
    if (initialSavedSession && initialSavedSession.artifacts) {
      return initialSavedSession.artifacts;
    }
    try {
      const saved = localStorage.getItem("dialetica_current_artifacts");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Erro ao carregar artefatos locais:", e);
    }
    return [];
  });

  // Session UI mode: defaults to Voice-Live ("voice_live") as requested
  const [sessionUIMode, setSessionUIMode] = useState<SessionUIMode>("voice_live");

  // Debate Mode: "open" (Discussão Aberta) or "formal" (Debate Formal Regrado)
  const [debateMode, setDebateMode] = useState<DebateMode>(() => {
    return initialSavedSession?.debateMode || "open";
  });

  // Formal Debate Structured State
  const [formalState, setFormalState] = useState<FormalDebateState>(() => {
    if (initialSavedSession?.formalState) {
      return initialSavedSession.formalState;
    }
    return {
      isActive: false,
      topic: "A consciência é um fenômeno exclusivamente físico ou computacional?",
      currentRoundIndex: 0,
      timeRemainingSeconds: 90,
      isTimerRunning: false,
      rounds: DEFAULT_FORMAL_ROUNDS,
      score: {
        userLogicScore: 8,
        userEvidenceScore: 7,
        modelLogicScore: 9,
        modelEvidenceScore: 9,
      },
      concluded: false,
    };
  });

  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    return initialSavedSession?.selectedModel || "gemini-3.8-flash";
  });

  const [customTopic, setCustomTopic] = useState<string>(() => {
    return initialSavedSession?.customTopic || "Livre";
  });

  const [selectedRole, setSelectedRole] = useState<DebateRole>(() => {
    if (initialSavedSession?.selectedRole) {
      const match = DEBATE_ROLES.find((r) => r.id === initialSavedSession.selectedRole?.id);
      return match || initialSavedSession.selectedRole;
    }
    return DEBATE_ROLES[4]; // Adaptive Debate default
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isEpistemicGuideOpen, setIsEpistemicGuideOpen] = useState(false);
  const [isDebateModeModalOpen, setIsDebateModeModalOpen] = useState(false);
  const [isArtifactsModalOpen, setIsArtifactsModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [imageStudioInitialPrompt, setImageStudioInitialPrompt] = useState("");
  const [zoomedImage, setZoomedImage] = useState<GeneratedImage | null>(null);

  // Android Frame Mode (true on wide screens, can be toggled)
  const [isAndroidFrameMode, setIsAndroidFrameMode] = useState<boolean>(() => {
    return window.innerWidth >= 1024;
  });

  // In-app New Conversation confirmation modal & toast notifications
  const [isNewDebateConfirmOpen, setIsNewDebateConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // PWA install prompt deferred event
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  // Sync messages to local storage
  useEffect(() => {
    try {
      localStorage.setItem("dialetica_chat_history", JSON.stringify(messages));
    } catch (e) {
      console.error("Erro ao persistir mensagens:", e);
    }
  }, [messages]);

  // Sync session artifacts to local storage
  useEffect(() => {
    try {
      localStorage.setItem("dialetica_current_artifacts", JSON.stringify(sessionArtifacts));
    } catch (e) {
      console.error("Erro ao persistir artefatos:", e);
    }
  }, [sessionArtifacts]);

  // Sync active session ID
  useEffect(() => {
    setActiveSessionId(currentSessionId);
  }, [currentSessionId]);

  // Continuous auto-sync: if current session is a saved session, keep it updated
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return;
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === currentSessionId);
      if (idx === -1) return prev;
      const existing = prev[idx];
      const updated: DebateSession = {
        ...existing,
        messages,
        debateMode,
        formalState,
        selectedModel,
        selectedRole,
        customTopic,
        artifacts: sessionArtifacts,
        summarySnippet: messages[0]?.content?.slice(0, 120),
        updatedAt: Date.now(),
      };
      const next = [...prev];
      next[idx] = updated;
      try {
        localStorage.setItem("dialetica_saved_sessions", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, [messages, debateMode, formalState, selectedModel, selectedRole, customTopic, sessionArtifacts, currentSessionId]);

  // Auto-scroll on new messages in text mode
  useEffect(() => {
    if (sessionUIMode === "text_chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, sessionUIMode]);

  // Catch PWA beforeinstallprompt on Android
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  // Asynchronous Fact-Check trigger with shared memory (Context)
  const triggerFactCheckAsync = useCallback(
    async (targetMsgId: string, claimText: string, contextMessages: Message[]) => {
      if (!claimText.trim()) return;

      try {
        const payload = {
          messages: contextMessages.map((m) => ({ role: m.role, content: m.content })),
          claim: claimText.slice(0, 800),
        };

        const res = await fetch("/api/fact-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) return;

        const data: FactCheckIntervention = await res.json();

        // Inject intervention into message state
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === targetMsgId) {
              const currentChecks = msg.factChecks || [];
              return {
                ...msg,
                factChecks: [...currentChecks, data],
              };
            }
            return msg;
          })
        );

        // Voice injection with distinct persona voice ('Fenrir' / solemn arbitro voice)
        if (data.spokenAudioText) {
          speakText(data.spokenAudioText, "arbitro", data.audioBase64);
        }
      } catch (err) {
        console.warn("Verificação assíncrona de fatos falhou silenciosamente:", err);
      }
    },
    []
  );

  // Multi-turn message sender
  const handleSendMessage = async (
    text: string,
    attachedImg?: GeneratedImage,
    isVoiceTurn?: boolean
  ) => {
    if (!text.trim()) return;
    if (isLoading) {
      showToast("Aguarde a Dialética concluir o raciocínio atual...");
      resetVoiceState("Aguarde a conclusão da fala anterior");
      return;
    }

    setErrorMessage(null);

    const isVoice = isVoiceTurn || sessionUIMode === "voice_live";

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
      attachedImage: attachedImg,
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setIsLoading(true);

    const assistantPlaceholderId = `bot-${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantPlaceholderId,
      role: "model",
      content: "",
      timestamp: Date.now(),
      modelUsed: selectedModel,
      roleUsed: selectedRole.id,
      isStreaming: true,
    };

    setMessages([...newHistory, assistantPlaceholder]);

    let finalSpokenText = "";

    try {
      // Prepare messages for backend Gemini endpoint
      const payloadMessages = newHistory.map((m) => ({
        role: m.role,
        content: m.attachedImage
          ? `${m.content}\n[Imagem/Diagrama Anexado pelo usuário: ${m.attachedImage.prompt}]`
          : m.content,
      }));

      // Try streaming endpoint first
      let streamedSuccess = false;
      try {
        const streamRes = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: payloadMessages,
            model: selectedModel,
            roleId: selectedRole.id,
            adaptiveTone: "mirror_user",
            debateMode,
            isVoiceMode: isVoice,
            topic: debateMode === "formal" ? formalState.topic : customTopic,
            formalRound:
              debateMode === "formal"
                ? {
                    roundNumber: formalState.currentRoundIndex + 1,
                    name: formalState.rounds[formalState.currentRoundIndex]?.name || "Rodada",
                    phase: formalState.rounds[formalState.currentRoundIndex]?.phase || "Geral",
                  }
                : undefined,
          }),
        });

        if (streamRes.ok && streamRes.body) {
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let accumulatedText = "";
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ")) {
                const dataPayload = trimmed.slice(6);
                if (dataPayload === "[DONE]") {
                  streamedSuccess = true;
                  break;
                }
                try {
                  const parsed = JSON.parse(dataPayload);
                  if (parsed.text) {
                    accumulatedText += parsed.text;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantPlaceholderId
                          ? { ...msg, content: accumulatedText }
                          : msg
                      )
                    );
                  }
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                } catch (e) {
                  // ignore partial json
                }
              }
            }
          }

          if (accumulatedText.trim().length > 0) {
            streamedSuccess = true;
            finalSpokenText = accumulatedText;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantPlaceholderId
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            );
          }
        }
      } catch (streamErr) {
        console.warn("Stream falhou, tentando fallback padrão POST:", streamErr);
      }

      // If streaming didn't complete, fallback to standard POST
      if (!streamedSuccess) {
        const postRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: payloadMessages,
            model: selectedModel,
            roleId: selectedRole.id,
            adaptiveTone: "mirror_user",
            debateMode,
            isVoiceMode: isVoice,
            topic: debateMode === "formal" ? formalState.topic : customTopic,
            formalRound:
              debateMode === "formal"
                ? {
                    roundNumber: formalState.currentRoundIndex + 1,
                    name: formalState.rounds[formalState.currentRoundIndex]?.name || "Rodada",
                    phase: formalState.rounds[formalState.currentRoundIndex]?.phase || "Geral",
                  }
                : undefined,
          }),
        });

        const postData = await postRes.json();

        if (!postRes.ok || !postData.text) {
          throw new Error(
            postData.error || "Erro ao conectar com o serviço de debate."
          );
        }

        finalSpokenText = postData.text;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  content: postData.text,
                  modelUsed: postData.modelUsed || selectedModel,
                  roleUsed: postData.roleUsed || selectedRole.id,
                  isStreaming: false,
                }
              : msg
          )
        );
      }

      // Voice output: speak Dialética's philosophical/scientific response
      if (finalSpokenText.trim()) {
        speakText(finalSpokenText, "dialetica");

        // Asynchronous Fact-Check validation by the third-persona Arbitrator
        // Sharing conversation memory (context)
        const updatedFullHistory = [
          ...newHistory,
          {
            ...assistantPlaceholder,
            content: finalSpokenText,
            isStreaming: false,
          },
        ];

        triggerFactCheckAsync(
          assistantPlaceholderId,
          finalSpokenText,
          updatedFullHistory
        );
      } else {
        notifyTurnError("Não foi possível gerar a fala. Toque para tentar novamente.");
      }
    } catch (err: any) {
      console.error("Erro na chamada do debate:", err);
      const errMsg = err?.message || "Ocorreu um erro ao processar o debate com o Gemini.";
      setErrorMessage(errMsg);
      // Remove placeholder on total error
      setMessages((prev) => prev.filter((m) => m.id !== assistantPlaceholderId));
      notifyTurnError("Instabilidade na conexão • Toque no microfone para tentar de novo");
    } finally {
      setIsLoading(false);
    }
  };

  // Voice recognition hook connected to message sender
  const handleUserVoiceSpoken = useCallback(
    (spokenText: string) => {
      handleSendMessage(spokenText, undefined, true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, selectedModel, selectedRole, sessionUIMode]
  );

  const {
    voiceState,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    triggerManualSend,
    notifyTurnError,
    resetVoiceState,
  } = useDialeticaVoice(handleUserVoiceSpoken);

  // Retry the last user prompt in case of error
  const handleRetryLastTurn = useCallback(() => {
    setErrorMessage(null);
    if (messages.length === 0) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg && lastUserMsg.content) {
      handleSendMessage(lastUserMsg.content, undefined, sessionUIMode === "voice_live");
    }
  }, [messages, sessionUIMode]);

  // Toggle Microphone in Voice Arena
  const handleToggleMic = () => {
    if (voiceState.isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Trigger fact-checking on the latest message or specific message
  const handleTriggerFactCheck = () => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    triggerFactCheckAsync(lastMsg.id, lastMsg.content, messages);
  };

  // Handle formal debate round timer countdown
  useEffect(() => {
    if (debateMode !== "formal" || !formalState.isActive) return;

    const timer = setInterval(() => {
      setFormalState((prev) => {
        if (prev.timeRemainingSeconds <= 1) {
          // Time expired for this round!
          return {
            ...prev,
            timeRemainingSeconds: 0,
          };
        }
        return {
          ...prev,
          timeRemainingSeconds: prev.timeRemainingSeconds - 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [debateMode, formalState.isActive]);

  // Advance formal debate round
  const handleAdvanceFormalRound = async () => {
    const nextIndex = formalState.currentRoundIndex + 1;

    if (nextIndex >= formalState.rounds.length) {
      // Completed all 4 rounds! Call Judge for final verdict
      try {
        const res = await fetch("/api/formal-debate/judge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            roundNumber: 4,
            roundName: "Síntese Epistêmica",
          }),
        });
        const verdict = await res.json();
        if (verdict.announcement) {
          speakText(verdict.announcement, "arbitro");
        }
        if (verdict.score) {
          setFormalState((prev) => ({
            ...prev,
            isActive: false,
            concluded: true,
            score: verdict.score,
            finalVerdict: verdict.announcement,
          }));
        }
      } catch (e) {
        setFormalState((prev) => ({ ...prev, isActive: false, concluded: true }));
      }
      return;
    }

    const nextRound = formalState.rounds[nextIndex];
    setFormalState((prev) => ({
      ...prev,
      currentRoundIndex: nextIndex,
      timeRemainingSeconds: nextRound.durationSeconds,
    }));

    // Announce round transition via Arbitrator's voice
    const roundAnnouncement = `Atenção debatedores: Início da Rodada ${
      nextIndex + 1
    }: ${nextRound.name}. Tempo limite: ${nextRound.durationSeconds} segundos. A palavra pertence a ${
      nextRound.speaker === "user" ? "você" : "Dialética"
    }.`;
    speakText(roundAnnouncement, "arbitro");
  };

  // Start a formal debate
  const handleStartFormalDebate = (topic: string, durationPerRound: number = 90) => {
    setDebateMode("formal");
    setFormalState({
      isActive: true,
      topic,
      currentRoundIndex: 0,
      timeRemainingSeconds: durationPerRound,
      isTimerRunning: true,
      rounds: [
        {
          roundNumber: 1,
          name: "Abertura & Tese",
          description: "Exposição da tese e premissas fundamentais",
          durationSeconds: durationPerRound,
          speaker: "user",
          phase: "opening",
        },
        {
          roundNumber: 2,
          name: "Refutação & Objeções",
          description: "Objeções epistêmicas e contraexemplos",
          durationSeconds: durationPerRound,
          speaker: "model",
          phase: "rebuttal",
        },
        {
          roundNumber: 3,
          name: "Tréplica & Defesa",
          description: "Defesa dialética e verificação de falácias",
          durationSeconds: durationPerRound,
          speaker: "user",
          phase: "counter_rebuttal",
        },
        {
          roundNumber: 4,
          name: "Síntese & Veredito",
          description: "Síntese dialética e balanço probatório",
          durationSeconds: Math.min(60, durationPerRound),
          speaker: "model",
          phase: "synthesis",
        },
      ],
      score: {
        userLogicScore: 0,
        userEvidenceScore: 0,
        modelLogicScore: 0,
        modelEvidenceScore: 0,
      },
      concluded: false,
    });

    const initAnnouncement = `Abertura oficial do Debate Formal sobre: ${topic}. Rodada um: Proposição de Tese em ${durationPerRound} segundos. Proponha sua tese agora.`;
    speakText(initAnnouncement, "arbitro");
    startListening();
  };

  // Quick Starter Topic Handler
  const handleSelectStarter = (topic: DebateTopic) => {
    setSelectedRole(
      DEBATE_ROLES.find((r) => r.id === topic.roleId) || DEBATE_ROLES[0]
    );
    setSelectedModel(topic.modelId);
    handleSendMessage(topic.prompt);
  };

  // Save current debate session (new or update existing)
  const handleSaveCurrentSession = (customTitle?: string, asNewCopy?: boolean) => {
    const existing = !asNewCopy && currentSessionId ? sessions.find((s) => s.id === currentSessionId) : null;
    const title = customTitle?.trim() || existing?.title || generateSmartSessionTitle(messages, formalState, debateMode);
    const targetId = asNewCopy || !currentSessionId ? `deb-${Date.now()}` : currentSessionId;

    const sessionToSave: DebateSession = {
      id: targetId,
      title,
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now(),
      messages,
      debateMode,
      formalState,
      selectedModel,
      selectedRole,
      customTopic,
      artifacts: sessionArtifacts,
      summarySnippet: messages[0]?.content?.slice(0, 120),
    };

    const updated = saveDebateSession(sessionToSave);
    setSessions(updated);
    setCurrentSessionId(targetId);
    setActiveSessionId(targetId);
  };

  // Load a previously saved debate session
  const handleLoadSession = (session: DebateSession) => {
    stopSpeaking();
    setMessages(session.messages || []);
    setDebateMode(session.debateMode || "open");
    setCustomTopic(session.customTopic || "Livre");
    if (session.formalState) {
      setFormalState(session.formalState);
    }
    if (session.selectedModel) {
      setSelectedModel(session.selectedModel);
    }
    if (session.selectedRole) {
      const matched = DEBATE_ROLES.find((r) => r.id === session.selectedRole?.id) || session.selectedRole;
      setSelectedRole(matched);
    }
    setSessionArtifacts(session.artifacts || []);
    setCurrentSessionId(session.id);
    setActiveSessionId(session.id);
    try {
      localStorage.setItem("dialetica_chat_history", JSON.stringify(session.messages || []));
      localStorage.setItem("dialetica_current_artifacts", JSON.stringify(session.artifacts || []));
    } catch (e) {}
  };

  // Delete a saved debate session
  const handleDeleteSession = (sessionId: string) => {
    const updated = deleteDebateSession(sessionId);
    setSessions(updated);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setActiveSessionId(null);
    }
  };

  // Rename a saved debate session
  const handleRenameSession = (sessionId: string, newTitle: string) => {
    const updated = renameDebateSession(sessionId, newTitle);
    setSessions(updated);
  };

  // Start a completely fresh debate session
  const handleStartNewDebate = useCallback(() => {
    stopSpeaking();
    stopListening();
    setCurrentSessionId(null);
    setActiveSessionId(null);
    setMessages([]);
    setSessionArtifacts([]);
    setErrorMessage(null);
    setDebateMode("open");
    setCustomTopic("Livre");
    setFormalState({
      isActive: false,
      topic: "A consciência é um fenômeno exclusivamente físico ou computacional?",
      currentRoundIndex: 0,
      timeRemainingSeconds: 90,
      isTimerRunning: false,
      rounds: DEFAULT_FORMAL_ROUNDS,
      score: {
        userLogicScore: 0,
        userEvidenceScore: 0,
        modelLogicScore: 0,
        modelEvidenceScore: 0,
      },
      concluded: false,
    });
    try {
      localStorage.removeItem("dialetica_chat_history");
      localStorage.removeItem("dialetica_current_artifacts");
      localStorage.removeItem("dialetica_current_session_id");
    } catch (e) {}
  }, [stopSpeaking, stopListening]);

  // Request new debate safely (non-blocking in-app modal if messages exist)
  const handleRequestNewDebate = useCallback(() => {
    if (messages.length === 0) {
      handleStartNewDebate();
      showToast("Nova conversa pronta para iniciar!");
      return;
    }
    setIsNewDebateConfirmOpen(true);
  }, [messages.length, handleStartNewDebate, showToast]);

  const handleConfirmNewDebateWithSave = useCallback(() => {
    handleSaveCurrentSession();
    handleStartNewDebate();
    setIsNewDebateConfirmOpen(false);
    showToast("Nova conversa iniciada. Debate anterior salvo em Sessões.");
  }, [handleSaveCurrentSession, handleStartNewDebate, showToast]);

  const handleConfirmNewDebateWithoutSave = useCallback(() => {
    handleStartNewDebate();
    setIsNewDebateConfirmOpen(false);
    showToast("Nova conversa limpa iniciada.");
  }, [handleStartNewDebate, showToast]);

  // Add an artifact generated in the current session
  const handleAddArtifact = (artifact: Artifact) => {
    setSessionArtifacts((prev) => {
      const updated = [...prev.filter((a) => a.id !== artifact.id), artifact];
      try {
        localStorage.setItem("dialetica_current_artifacts", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Open Image Studio with prefilled prompt
  const handleRequestImageForMessage = (prompt: string) => {
    setImageStudioInitialPrompt(prompt);
    setIsImageStudioOpen(true);
  };

  // Insert generated image directly into chat as user message / reference
  const handleInsertImageToChat = (image: GeneratedImage) => {
    const textPrompt = `[Diagrama Conceitual Anexado]\nAnalise dialeticamente este esquema conceitual (${image.imageSize}) sobre: "${image.prompt}". Como este modelo visual fundamenta ou desafia as premissas em debate?`;
    handleSendMessage(textPrompt, image);
  };

  return (
    <div className="min-h-screen w-full bg-[#070a12] text-slate-100 flex items-center justify-center p-0 lg:p-4 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Android Device Mockup Wrapper (Adaptive) */}
      <div
        id="app-shell"
        className={`w-full flex flex-col bg-[#0b0f19] transition-all duration-200 overflow-hidden ${
          isAndroidFrameMode
            ? "max-w-[500px] h-[100dvh] lg:h-[92vh] lg:rounded-[40px] lg:border-[8px] lg:border-[#1e293b] lg:shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative"
            : "w-full h-[100dvh] border-none rounded-none"
        }`}
      >
        {/* Android Native Camera Hole (only in mockup frame mode on large screens) */}
        {isAndroidFrameMode && (
          <div className="hidden lg:block absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full border border-slate-700/50 z-30 pointer-events-none"></div>
        )}

        {/* Android Status Bar */}
        <AndroidStatusBar />

        {/* PWA Public Android Install Banner */}
        {showInstallBanner && (
          <div className="bg-cyan-950/90 border-b border-cyan-500/30 px-4 py-2 flex items-center justify-between text-xs text-cyan-200 z-20">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Instalar Dialética no seu Android para acesso rápido</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors"
              >
                Instalar
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Top App Bar with Voice/Text Mode and Debate Mode Toggle */}
        <TopAppBar
          selectedRole={selectedRole}
          selectedModel={selectedModel}
          debateMode={debateMode}
          sessionUIMode={sessionUIMode}
          savedSessionsCount={sessions.length}
          currentSessionTitle={sessions.find((s) => s.id === currentSessionId)?.title}
          onOpenRoleSelector={() => setIsRoleModalOpen(true)}
          onOpenModelSelector={() => setIsModelModalOpen(true)}
          onOpenEpistemicGuide={() => setIsEpistemicGuideOpen(true)}
          onOpenDebateModeModal={() => setIsDebateModeModalOpen(true)}
          onOpenArtifactsModal={() => setIsArtifactsModalOpen(true)}
          onOpenSessionsModal={() => setIsSessionsModalOpen(true)}
          onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
          onToggleSessionUIMode={() =>
            setSessionUIMode((prev) => (prev === "voice_live" ? "text_chat" : "voice_live"))
          }
          onResetChat={handleRequestNewDebate}
          isAndroidFrameMode={isAndroidFrameMode}
          onToggleAndroidFrame={() => setIsAndroidFrameMode(!isAndroidFrameMode)}
          onShareNotice={(msg) => showToast(msg)}
        />

        {/* Global Error Notice */}
        {errorMessage && (
          <div className="bg-red-950/70 border-b border-red-500/30 px-4 py-2 text-xs text-red-200 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 text-red-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MAIN VIEWPORT: Voice Live Arena (Default) vs Classic Text Chat */}
        {sessionUIMode === "voice_live" ? (
          <VoiceLiveArena
            isListening={voiceState.isListening}
            isSpeaking={voiceState.isSpeaking}
            activeSpeaker={voiceState.activeSpeaker}
            liveTranscript={voiceState.liveTranscript}
            micVolume={voiceState.micVolume}
            vadPhase={voiceState.vadPhase}
            silenceCountdownMs={voiceState.silenceCountdownMs}
            interruptedCount={voiceState.interruptedCount}
            cadenceHint={voiceState.cadenceHint}
            customTopic={customTopic}
            messages={messages}
            selectedRole={selectedRole}
            selectedModel={selectedModel}
            debateMode={debateMode}
            formalState={formalState}
            onToggleMic={handleToggleMic}
            onStopSpeaking={stopSpeaking}
            onSwitchToTextMode={() => setSessionUIMode("text_chat")}
            onTriggerFactCheck={handleTriggerFactCheck}
            onOpenFormalDebateModal={() => setIsDebateModeModalOpen(true)}
            onOpenArtifactsModal={() => setIsArtifactsModalOpen(true)}
            onOpenSessionsModal={() => setIsSessionsModalOpen(true)}
            onStartNewDebate={handleRequestNewDebate}
            onAdvanceFormalRound={handleAdvanceFormalRound}
            onPlayAudioSnippet={(txt, role, b64) => speakText(txt, role, b64)}
            onRequestEvidence={(prompt) => handleSendMessage(prompt)}
            onSetCustomTopic={(newTopic) => setCustomTopic(newTopic)}
            onTriggerManualSend={triggerManualSend}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
            onRetry={handleRetryLastTurn}
          />
        ) : (
          /* Text Chat Classic Mode */
          <>
            <main
              id="chat-messages-container"
              className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-2 relative"
            >
              {messages.length === 0 ? (
                <EmptyDebateState
                  onSelectStarter={handleSelectStarter}
                  onOpenImageStudio={() => {
                    setImageStudioInitialPrompt("");
                    setIsImageStudioOpen(true);
                  }}
                  selectedRole={selectedRole}
                  selectedModel={selectedModel}
                />
              ) : (
                <div className="max-w-3xl mx-auto space-y-1">
                  {messages.map((message) => (
                    <ChatMessageItem
                      key={message.id}
                      message={message}
                      onRequestImageForMessage={handleRequestImageForMessage}
                      onZoomImage={(img) => setZoomedImage(img)}
                      onFactCheckMessage={(msgId, content) =>
                        triggerFactCheckAsync(msgId, content, messages)
                      }
                      onPlayAudio={(txt, role, b64) => speakText(txt, role, b64)}
                      onRequestEvidence={(prompt) => handleSendMessage(prompt)}
                      isAudioPlaying={voiceState.isSpeaking}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </main>

            {/* Bottom Input Controls for Text Mode */}
            <ChatInputBar
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              selectedModel={selectedModel}
              selectedRole={selectedRole}
              onOpenModelSelector={() => setIsModelModalOpen(true)}
              onOpenRoleSelector={() => setIsRoleModalOpen(true)}
              onOpenImageStudio={() => {
                setImageStudioInitialPrompt("");
                setIsImageStudioOpen(true);
              }}
            />
          </>
        )}

        {/* Android Gesture Bar */}
        <AndroidNavBar />
      </div>

      {/* Role Selection Sheet / Modal */}
      <RoleSelectorModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        selectedRole={selectedRole}
        onSelectRole={(role) => setSelectedRole(role)}
        onSwitchModel={(modelId) => setSelectedModel(modelId)}
      />

      {/* Model Selection Sheet / Modal */}
      <ModelSelectorModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={(model) => setSelectedModel(model)}
      />

      {/* Debate Mode Modal (Formal vs Aberto) */}
      <DebateModeModal
        isOpen={isDebateModeModalOpen}
        onClose={() => setIsDebateModeModalOpen(false)}
        currentMode={debateMode}
        formalState={formalState}
        onSelectMode={(mode) => setDebateMode(mode)}
        onStartFormalDebate={handleStartFormalDebate}
      />

      {/* Artifacts Modal (Súmula, Árvore Lógica, Dossiê de Evidências) */}
      <ArtifactsModal
        isOpen={isArtifactsModalOpen}
        onClose={() => setIsArtifactsModalOpen(false)}
        messages={messages}
        sessionArtifacts={sessionArtifacts}
        onSaveArtifact={handleAddArtifact}
        customTopic={customTopic}
      />

      {/* Debate Sessions Manager Modal (Save, Load, Export/Import, Manage History) */}
      <SessionsManagerModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        currentMessages={messages}
        currentDebateMode={debateMode}
        currentFormalState={formalState}
        currentModel={selectedModel}
        currentRole={selectedRole}
        currentArtifacts={sessionArtifacts}
        onSaveCurrentSession={handleSaveCurrentSession}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onStartNewDebate={handleStartNewDebate}
        onImportSessionsSuccess={() => setSessions(loadSavedSessions())}
      />

      {/* Image Studio Modal (gemini-3-pro-image-preview with 1K, 2K, 4K affordance) */}
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        onInsertToChat={handleInsertImageToChat}
        initialPrompt={imageStudioInitialPrompt}
      />

      {/* Epistemic Guide Modal */}
      <EpistemicGuideModal
        isOpen={isEpistemicGuideOpen}
        onClose={() => setIsEpistemicGuideOpen(false)}
      />

      {/* System Engineering Diagnostics & Validity Test Suite Modal */}
      <SystemDiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
      />

      {/* Global Image Zoom Lightbox */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full flex flex-col items-center">
            <img
              src={zoomedImage.url}
              alt={zoomedImage.prompt}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/20"
            />
            <div className="mt-3 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 text-center max-w-lg">
              <span className="text-xs font-mono text-pink-300 font-bold block mb-0.5">
                Resolução: {zoomedImage.imageSize} ({zoomedImage.aspectRatio}) &bull;
                gemini-3-pro-image-preview
              </span>
              <p className="text-xs text-slate-300 line-clamp-2">{zoomedImage.prompt}</p>
            </div>
          </div>
        </div>
      )}

      {/* Non-intrusive floating toast notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-70 bg-[#0c1427]/95 border border-cyan-500/50 text-cyan-200 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none"
        >
          <Check className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* In-app New Conversation Confirmation Dialog (iframe safe) */}
      {isNewDebateConfirmOpen && (
        <div className="fixed inset-0 z-65 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0b1020] border border-cyan-500/30 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Iniciar Nova Conversa?</h3>
                <p className="text-xs text-slate-400">
                  Você já possui turnos de debate em andamento nesta sessão.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-white/[0.03] p-3 rounded-xl border border-white/5">
              Deseja arquivar e salvar este debate no seu histórico de <strong>Sessões</strong> para consultá-lo quando quiser, ou iniciar uma tela completamente limpa?
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewDebateConfirmOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmNewDebateWithoutSave}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-center"
              >
                Iniciar Sem Salvar
              </button>
              <button
                type="button"
                onClick={handleConfirmNewDebateWithSave}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-950 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Salvar &amp; Iniciar Nova</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
