import { useState, useEffect, useRef, useCallback } from "react";

// Types for SpeechRecognition API
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export type VADPhase =
  | "idle"
  | "listening"
  | "speech_active"
  | "pause_detected"
  | "triggering"
  | "speaking";

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  activeSpeaker: "idle" | "user" | "dialetica" | "arbitro";
  liveTranscript: string;
  hasSpeechSupport: boolean;
  micPermissionDenied: boolean;
  micVolume: number; // 0 to 1 real-time RMS volume
  vadPhase: VADPhase;
  silenceCountdownMs: number; // remaining ms before triggering response
  interruptedCount: number; // count of barge-ins
}

// Utility: synthesizes subtle pleasant micro-earcons with Web Audio API (zero latency, zero assets)
function playEarconTone(
  audioCtx: AudioContext | null,
  type: "barge_in" | "turn_sent" | "mic_on"
) {
  if (!audioCtx || audioCtx.state === "suspended") {
    audioCtx?.resume().catch(() => {});
  }
  if (!audioCtx) return;

  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "barge_in") {
      // Soft organic double-click indicating interruption registered
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === "turn_sent") {
      // Subtle ascending confirmation chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === "mic_on") {
      // Gentle opening tone
      osc.type = "sine";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {
    // Ignore audio context errors
  }
}

export function useDialeticaVoice(onUserSpoken: (text: string) => void) {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    activeSpeaker: "idle",
    liveTranscript: "",
    hasSpeechSupport: true,
    micPermissionDenied: false,
    micVolume: 0,
    vadPhase: "idle",
    silenceCountdownMs: 0,
    interruptedCount: 0,
  });

  const onUserSpokenRef = useRef(onUserSpoken);
  onUserSpokenRef.current = onUserSpoken;

  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const speechQueueRef = useRef<Array<{ text: string; role: "dialetica" | "arbitro"; base64?: string }>>([]);
  const isPlayingQueueRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const currentSpeechTextRef = useRef("");
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);

  // Web Audio Context & Analyser for real-time VAD & Barge-in
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const voiceEnergyConsecutiveHits = useRef(0);

  // Stop currently playing audio immediately (Instant Barge-in)
  const stopSpeaking = useCallback((triggeredByBargeIn: boolean = false) => {
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
    isSpeakingRef.current = false;

    if (triggeredByBargeIn && audioContextRef.current) {
      playEarconTone(audioContextRef.current, "barge_in");
    }

    setVoiceState((prev) => ({
      ...prev,
      isSpeaking: false,
      activeSpeaker: prev.isListening ? "user" : "idle",
      vadPhase: prev.isListening ? "listening" : "idle",
      interruptedCount: triggeredByBargeIn ? prev.interruptedCount + 1 : prev.interruptedCount,
    }));
  }, []);

  // Web Audio setup for live mic energy analysis & instant barge-in
  const initMicAudioContext = useCallback(async () => {
    if (audioContextRef.current && micStreamRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkEnergy = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Calculate Root Mean Square (RMS) volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / bufferLength);
        const normalizedVolume = Math.min(1, rms * 4.5);

        setVoiceState((prev) => {
          if (Math.abs(prev.micVolume - normalizedVolume) > 0.02) {
            return { ...prev, micVolume: normalizedVolume };
          }
          return prev;
        });

        // Instant Barge-In detection:
        // If AI is currently speaking and user speaks (rms > threshold for 2 consecutive frames)
        if (isSpeakingRef.current) {
          if (rms > 0.042) {
            voiceEnergyConsecutiveHits.current += 1;
            if (voiceEnergyConsecutiveHits.current >= 2) {
              // User interrupted the AI!
              stopSpeaking(true);
              voiceEnergyConsecutiveHits.current = 0;
            }
          } else {
            voiceEnergyConsecutiveHits.current = 0;
          }
        } else {
          voiceEnergyConsecutiveHits.current = 0;
        }

        animFrameRef.current = requestAnimationFrame(checkEnergy);
      };

      animFrameRef.current = requestAnimationFrame(checkEnergy);
    } catch (err) {
      console.warn("AudioContext para monitoramento de energia/barge-in não inicializado:", err);
    }
  }, [stopSpeaking]);

  // Teardown Web Audio
  const teardownMicAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Clear timers helper
  const clearSilenceDebounce = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setVoiceState((prev) => ({ ...prev, silenceCountdownMs: 0 }));
  }, []);

  // Dispatch accumulated speech immediately
  const triggerSendTurn = useCallback(
    (textToDispatch?: string) => {
      clearSilenceDebounce();
      const text = (textToDispatch || currentSpeechTextRef.current).trim();
      if (text.length >= 2) {
        currentSpeechTextRef.current = "";
        setVoiceState((prev) => ({
          ...prev,
          liveTranscript: "",
          vadPhase: "triggering",
          silenceCountdownMs: 0,
        }));
        if (audioContextRef.current) {
          playEarconTone(audioContextRef.current, "turn_sent");
        }
        onUserSpokenRef.current(text);
      }
    },
    [clearSilenceDebounce]
  );

  // Initialize Speech Recognition once
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
        isListeningRef.current = true;
        setVoiceState((prev) => ({
          ...prev,
          isListening: true,
          activeSpeaker: isSpeakingRef.current ? prev.activeSpeaker : "user",
          vadPhase: "listening",
          micPermissionDenied: false,
        }));
      };

      // Native speech start event: instant barge-in if AI is speaking
      recognition.onspeechstart = () => {
        if (isSpeakingRef.current) {
          stopSpeaking(true);
        }
      };

      recognition.onsoundstart = () => {
        if (isSpeakingRef.current) {
          stopSpeaking(true);
        }
      };

      recognition.onresult = (event: any) => {
        // If AI is speaking, user speech stops it immediately!
        if (isSpeakingRef.current) {
          stopSpeaking(true);
        }

        let interimText = "";
        let finalText = "";
        let isFinalBatch = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript;
            isFinalBatch = true;
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        const combined = (finalText || interimText).trim();
        if (!combined) return;

        currentSpeechTextRef.current = combined;

        // Determine smart silence window based on natural speech cadence
        const lower = combined.toLowerCase();
        const hasQuestionMark = combined.includes("?");
        const hasQuestionCadence =
          hasQuestionMark ||
          /(o que você acha|o que acha|concorda|acha que|como assim|por que|qual a|qual é|né\?|certo\?|faz sentido\?|me diga|qual o motivo|o que significa)$/i.test(
            lower
          );

        let pauseDelayMs = 1050; // default conversational pause (breathing gap)

        if (hasQuestionCadence) {
          // Question asked: fast conversational turn-taking
          pauseDelayMs = 650;
        } else if (isFinalBatch && combined.length > 8) {
          // Complete utterance boundary finalized by speech recognizer
          pauseDelayMs = 800;
        }

        setVoiceState((prev) => ({
          ...prev,
          liveTranscript: combined,
          activeSpeaker: "user",
          vadPhase: "pause_detected",
          silenceCountdownMs: pauseDelayMs,
        }));

        // Reset silence timer
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        let remaining = pauseDelayMs;
        countdownIntervalRef.current = setInterval(() => {
          remaining -= 100;
          if (remaining <= 0) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setVoiceState((prev) => ({
            ...prev,
            silenceCountdownMs: Math.max(0, remaining),
          }));
        }, 100);

        silenceTimerRef.current = setTimeout(() => {
          triggerSendTurn();
        }, pauseDelayMs);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          setVoiceState((prev) => ({
            ...prev,
            micPermissionDenied: true,
            isListening: false,
            vadPhase: "idle",
          }));
        } else if (event.error !== "no-speech") {
          console.warn("Aviso do reconhecimento de voz:", event.error);
        }
      };

      recognition.onend = () => {
        // Continuous conversational loop: if listening is enabled, auto-restart
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // Already active or transient
          }
        } else {
          setVoiceState((prev) => ({
            ...prev,
            isListening: false,
            vadPhase: "idle",
          }));
        }
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
      clearSilenceDebounce();
      teardownMicAudio();
    };
  }, [stopSpeaking, triggerSendTurn, clearSilenceDebounce, teardownMicAudio]);

  // Start listening to user voice
  const startListening = useCallback(async () => {
    stopSpeaking();
    isListeningRef.current = true;

    // Initialize Web Audio API energy monitoring
    await initMicAudioContext();

    if (audioContextRef.current) {
      playEarconTone(audioContextRef.current, "mic_on");
    }

    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setVoiceState((prev) => ({
        ...prev,
        isListening: true,
        activeSpeaker: "user",
        vadPhase: "listening",
      }));
    } catch (e) {
      // already active
    }
  }, [stopSpeaking, initMicAudioContext]);

  // Stop listening
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    clearSilenceDebounce();
    teardownMicAudio();

    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {}

    setVoiceState((prev) => ({
      ...prev,
      isListening: false,
      micVolume: 0,
      vadPhase: "idle",
      activeSpeaker: prev.isSpeaking ? prev.activeSpeaker : "idle",
    }));
  }, [clearSilenceDebounce, teardownMicAudio]);

  // Internal audio queue processor
  const processNextSpeechItem = useCallback(async () => {
    if (speechQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      isSpeakingRef.current = false;
      setVoiceState((prev) => ({
        ...prev,
        isSpeaking: false,
        activeSpeaker: isListeningRef.current ? "user" : "idle",
        vadPhase: isListeningRef.current ? "listening" : "idle",
      }));
      return;
    }

    isPlayingQueueRef.current = true;
    isSpeakingRef.current = true;
    const item = speechQueueRef.current.shift()!;

    setVoiceState((prev) => ({
      ...prev,
      isSpeaking: true,
      activeSpeaker: item.role,
      vadPhase: "speaking",
    }));

    // Method A: If base64 audio is already provided
    if (item.base64) {
      try {
        const audio = new Audio(item.base64);
        audioPlayerRef.current = audio;
        audio.onended = () => {
          setTimeout(processNextSpeechItem, 350); // Natural conversational pause
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
          setTimeout(processNextSpeechItem, 380);
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

    // Clean text for natural speech
    const cleaned = text
      .replace(/[*_#`~>\[\]]/g, "")
      .replace(/\(http[^)]+\)/g, "")
      .slice(0, 1000);

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = "pt-BR";

    // Distinct vocal signatures:
    if (role === "arbitro") {
      // O Árbitro: voz mais grave, cadenciada, solene de juiz
      utterance.pitch = 0.78;
      utterance.rate = 0.95;
    } else {
      // O Dialética: voz reflexiva, clara, dinâmica
      utterance.pitch = 1.02;
      utterance.rate = 1.05;
    }

    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang.startsWith("pt")) || voices[0];
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    utterance.onend = () => {
      setTimeout(onComplete, 300);
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
    stopSpeaking: () => stopSpeaking(false),
    triggerManualSend: () => triggerSendTurn(),
  };
}
