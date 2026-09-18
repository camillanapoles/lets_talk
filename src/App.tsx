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
  FactCheckIntervention,
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
import { useDialeticaVoice } from "./hooks/useDialeticaVoice";
import { AlertCircle, Download, X } from "lucide-react";

export default function App() {
  // Messages state with local persistence
  const [messages, setMessages] = useState<Message[]>(() => {
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

  // Session UI mode: defaults to Voice-Live ("voice_live") as requested
  const [sessionUIMode, setSessionUIMode] = useState<SessionUIMode>("voice_live");

  // Debate Mode: "open" (Discussão Aberta) or "formal" (Debate Formal Regrado)
  const [debateMode, setDebateMode] = useState<DebateMode>("open");

  // Formal Debate Structured State
  const [formalState, setFormalState] = useState<FormalDebateState>({
    isActive: false,
    topic: "A consciência é um fenômeno exclusivamente físico ou computacional?",
    currentRoundIndex: 0,
    timeRemainingSeconds: 90,
    isTimerRunning: false,
    rounds: [
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
    ],
    score: {
      userLogicScore: 8,
      userEvidenceScore: 7,
      modelLogicScore: 9,
      modelEvidenceScore: 9,
    },
    concluded: false,
  });

  const [selectedModel, setSelectedModel] = useState<ModelId>("gemini-3.5-flash");
  const [selectedRole, setSelectedRole] = useState<DebateRole>(DEBATE_ROLES[4]); // Adaptive Debate default
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isEpistemicGuideOpen, setIsEpistemicGuideOpen] = useState(false);
  const [isDebateModeModalOpen, setIsDebateModeModalOpen] = useState(false);
  const [isArtifactsModalOpen, setIsArtifactsModalOpen] = useState(false);
  const [imageStudioInitialPrompt, setImageStudioInitialPrompt] = useState("");
  const [zoomedImage, setZoomedImage] = useState<GeneratedImage | null>(null);

  // Android Frame Mode (true on wide screens, can be toggled)
  const [isAndroidFrameMode, setIsAndroidFrameMode] = useState<boolean>(() => {
    return window.innerWidth >= 1024;
  });

  // PWA install prompt deferred event
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem("dialetica_chat_history", JSON.stringify(messages));
    } catch (e) {
      console.error("Erro ao persistir mensagens:", e);
    }
  }, [messages]);

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
  const handleSendMessage = async (text: string, attachedImg?: GeneratedImage) => {
    if (!text.trim() || isLoading) return;

    setErrorMessage(null);

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
      }
    } catch (err: any) {
      console.error("Erro na chamada do debate:", err);
      const errMsg = err?.message || "Ocorreu um erro ao processar o debate com o Gemini.";
      setErrorMessage(errMsg);
      // Remove placeholder on total error
      setMessages((prev) => prev.filter((m) => m.id !== assistantPlaceholderId));
    } finally {
      setIsLoading(false);
    }
  };

  // Voice recognition hook connected to message sender
  const handleUserVoiceSpoken = useCallback(
    (spokenText: string) => {
      handleSendMessage(spokenText);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, selectedModel, selectedRole]
  );

  const {
    voiceState,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  } = useDialeticaVoice(handleUserVoiceSpoken);

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

  // Reset/Clear conversation
  const handleResetChat = () => {
    if (messages.length === 0) return;
    if (window.confirm("Deseja reiniciar a arena dialética e limpar o histórico da conversa?")) {
      stopSpeaking();
      setMessages([]);
      setErrorMessage(null);
      localStorage.removeItem("dialetica_chat_history");
      setFormalState((prev) => ({ ...prev, isActive: false, currentRoundIndex: 0 }));
    }
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
          onOpenRoleSelector={() => setIsRoleModalOpen(true)}
          onOpenModelSelector={() => setIsModelModalOpen(true)}
          onOpenEpistemicGuide={() => setIsEpistemicGuideOpen(true)}
          onOpenDebateModeModal={() => setIsDebateModeModalOpen(true)}
          onOpenArtifactsModal={() => setIsArtifactsModalOpen(true)}
          onToggleSessionUIMode={() =>
            setSessionUIMode((prev) => (prev === "voice_live" ? "text_chat" : "voice_live"))
          }
          onResetChat={handleResetChat}
          isAndroidFrameMode={isAndroidFrameMode}
          onToggleAndroidFrame={() => setIsAndroidFrameMode(!isAndroidFrameMode)}
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
            onAdvanceFormalRound={handleAdvanceFormalRound}
            onPlayAudioSnippet={(txt, role, b64) => speakText(txt, role, b64)}
            onRequestEvidence={(prompt) => handleSendMessage(prompt)}
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
    </div>
  );
}
