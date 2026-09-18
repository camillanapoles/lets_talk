import { useState, useEffect, useRef, useCallback } from "react";

// Types for SpeechRecognition API
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  activeSpeaker: "idle" | "user" | "dialetica" | "arbitro";
  liveTranscript: string;
  hasSpeechSupport: boolean;
  micPermissionDenied: boolean;
}

export function useDialeticaVoice(onUserSpoken: (text: string) => void) {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    activeSpeaker: "idle",
    liveTranscript: "",
    hasSpeechSupport: true,
    micPermissionDenied: false,
  });

  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const speechQueueRef = useRef<Array<{ text: string; role: "dialetica" | "arbitro"; base64?: string }>>([]);
  const isPlayingQueueRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const currentSpeechTextRef = useRef("");

  // Stop currently playing audio immediately (barge-in)
  const stopSpeaking = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speechQueueRef.current = [];
    isPlayingQueueRef.current = false;
    setVoiceState((prev) => ({
      ...prev,
      isSpeaking: false,
      activeSpeaker: prev.isListening ? "user" : "idle",
    }));
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceState((prev) => ({ ...prev, hasSpeechSupport: false }));
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "pt-BR";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState((prev) => ({
          ...prev,
          isListening: true,
          activeSpeaker: "user",
          micPermissionDenied: false,
        }));
      };

      recognition.onresult = (event: any) => {
        let interimText = "";
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript;
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        const combined = (finalText || interimText).trim();
        if (combined) {
          // Barge-in: if AI is speaking and user speaks, stop AI immediately
          stopSpeaking();
          currentSpeechTextRef.current = combined;
          setVoiceState((prev) => ({
            ...prev,
            liveTranscript: combined,
            activeSpeaker: "user",
          }));

          // Reset silence debounce timer: send after 1.6s of silence
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (currentSpeechTextRef.current.trim().length > 2) {
              const textToSend = currentSpeechTextRef.current.trim();
              currentSpeechTextRef.current = "";
              setVoiceState((prev) => ({ ...prev, liveTranscript: "" }));
              onUserSpoken(textToSend);
            }
          }, 1600);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          setVoiceState((prev) => ({ ...prev, micPermissionDenied: true, isListening: false }));
        } else if (event.error !== "no-speech") {
          console.warn("Speech recognition warning:", event.error);
        }
      };

      recognition.onend = () => {
        setVoiceState((prev) => {
          // If we intentionally want it to keep listening in continuous live mode:
          if (prev.isListening) {
            try {
              recognition.start();
            } catch (e) {
              // ignore restart errors
            }
          }
          return prev;
        });
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Falha ao inicializar Speech Recognition:", err);
      setVoiceState((prev) => ({ ...prev, hasSpeechSupport: false }));
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [onUserSpoken, stopSpeaking]);

  // Start listening to user voice
  const startListening = useCallback(() => {
    stopSpeaking();
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setVoiceState((prev) => ({ ...prev, isListening: true, activeSpeaker: "user" }));
    } catch (e) {
      // already started
    }
  }, [stopSpeaking]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {}
    setVoiceState((prev) => ({
      ...prev,
      isListening: false,
      activeSpeaker: prev.isSpeaking ? prev.activeSpeaker : "idle",
    }));
  }, []);

  // Internal audio queue processor
  const processNextSpeechItem = useCallback(async () => {
    if (speechQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      setVoiceState((prev) => ({
        ...prev,
        isSpeaking: false,
        activeSpeaker: prev.isListening ? "user" : "idle",
      }));
      return;
    }

    isPlayingQueueRef.current = true;
    const item = speechQueueRef.current.shift()!;

    setVoiceState((prev) => ({
      ...prev,
      isSpeaking: true,
      activeSpeaker: item.role,
    }));

    // Method A: If base64 audio is already provided
    if (item.base64) {
      try {
        const audio = new Audio(item.base64);
        audioPlayerRef.current = audio;
        audio.onended = () => {
          setTimeout(processNextSpeechItem, 400); // Natural pause between speakers
        };
        audio.onerror = () => {
          playWithWebSpeechFallback(item.text, item.role, processNextSpeechItem);
        };
        await audio.play();
        return;
      } catch (err) {
        console.warn("Falha ao reproduzir áudio base64 pré-gerado, usando fallback:", err);
      }
    }

    // Method B: Call server TTS endpoint
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: item.text,
          speakerRole: item.role,
        }),
      });

      const data = await res.json();

      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audioPlayerRef.current = audio;
        audio.onended = () => {
          setTimeout(processNextSpeechItem, 450); // Pause before next turn
        };
        audio.onerror = () => {
          playWithWebSpeechFallback(item.text, item.role, processNextSpeechItem);
        };
        await audio.play();
        return;
      }
    } catch (apiErr) {
      console.warn("TTS backend offline ou erro, usando sintetizador nativo Web Speech:", apiErr);
    }

    // Method C: High-fidelity Web Speech Synthesis fallback
    playWithWebSpeechFallback(item.text, item.role, processNextSpeechItem);
  }, []);

  // Native Web Speech Synthesis player with distinct timbre/pitch
  const playWithWebSpeechFallback = (
    text: string,
    role: "dialetica" | "arbitro",
    onComplete: () => void
  ) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onComplete();
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text for speech
    const cleaned = text
      .replace(/[*_#`~>\[\]]/g, "")
      .replace(/\(http[^)]+\)/g, "")
      .slice(0, 1000);

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = "pt-BR";

    // Persona-specific vocal profiles:
    if (role === "arbitro") {
      // O Árbitro: voz mais grave, cadenciada, solene de juiz
      utterance.pitch = 0.78;
      utterance.rate = 0.95;
    } else {
      // O Dialética: voz reflexiva, clara, dinâmica
      utterance.pitch = 1.02;
      utterance.rate = 1.05;
    }

    // Choose appropriate voice if available
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang.startsWith("pt")) || voices[0];
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    utterance.onend = () => {
      setTimeout(onComplete, 350);
    };
    utterance.onerror = () => {
      onComplete();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Public method to enqueue speech (Dialética or Arbitrator)
  const speakText = useCallback(
    (text: string, role: "dialetica" | "arbitro" = "dialetica", base64Audio?: string) => {
      speechQueueRef.current.push({ text, role, base64: base64Audio });
      if (!isPlayingQueueRef.current) {
        processNextSpeechItem();
      }
    },
    [processNextSpeechItem]
  );

  return {
    voiceState,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  };
}
