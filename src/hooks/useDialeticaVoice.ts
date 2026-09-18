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
  | "question_detected"
  | "pause_detected"
  | "triggering"
  | "processing"
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
  cadenceHint?: string; // e.g. "Pergunta detectada (550ms)"
}

export interface CadenceAnalysis {
  isQuestion: boolean;
  pauseDelayMs: number;
  label: string;
  detectedTrigger?: string;
}

/**
 * High-precision Portuguese interrogative and cadence analyzer.
 * In spoken Brazilian Portuguese, users rarely say punctuation marks like 'interrogação'.
 * We inspect interrogative roots, conversational question tags, and declarative boundary tokens.
 */
export function detectSpeechCadence(text: string): CadenceAnalysis {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return { isQuestion: false, pauseDelayMs: 900, label: "Pausa reflexiva" };
  }

  // 1. Literal question mark
  if (trimmed.includes("?")) {
    return {
      isQuestion: true,
      pauseDelayMs: 550,
      label: "Pergunta detectada (?)",
      detectedTrigger: "?",
    };
  }

  // 2. Interrogatives anywhere in phrase or conversational end-tags
  const interrogativePatterns: Array<{ regex: RegExp; trigger: string }> = [
    { regex: /\b(o que você acha|o que acha|o que você pensa|o que pensa)\b/i, trigger: "o que acha" },
    { regex: /\b(o que é|o que são|o que significa|o que seria)\b/i, trigger: "o que é" },
    { regex: /\b(o que|o que há|o que tem)\b/i, trigger: "o que" },
    { regex: /\b(você concorda|concorda com|concorda que|concorda)\b/i, trigger: "concorda" },
    { regex: /\b(você acha|acha que|acha isso|acha mesmo)\b/i, trigger: "acha que" },
    { regex: /\b(como assim|como você|como podemos|como explicar|como refutar|como responder|como funciona)\b/i, trigger: "como" },
    { regex: /\b(por que|porque|por quê|por qual razão|por qual motivo)\b/i, trigger: "por que" },
    { regex: /\b(qual é|qual o|qual a|quais são|qual seu|qual sua|qual seria|quais seriam)\b/i, trigger: "qual" },
    { regex: /\b(quem|de quem|com quem|para quem)\b/i, trigger: "quem" },
    { regex: /\b(quando|onde|aonde|de onde)\b/i, trigger: "quando/onde" },
    { regex: /\b(quanto|quantos|quantas|quanto custa|quanto vale)\b/i, trigger: "quanto" },
    { regex: /\b(será que|seria possível|não seria|não acha|não concorda)\b/i, trigger: "será que" },
    { regex: /\b(faz sentido|me diga|me explica|explica aí)\b/i, trigger: "faz sentido" },
    { regex: /\b(qual a sua tese|qual seu argumento|qual sua opinião|qual o seu ponto)\b/i, trigger: "qual a tese" },
    // End conversational tags
    { regex: /(né|certo|correto|verdade|não é|ou não|concorda)\s*$/i, trigger: "tag interrogativa" },
  ];

  for (const { regex, trigger } of interrogativePatterns) {
    if (regex.test(lower)) {
      return {
        isQuestion: true,
        pauseDelayMs: 550, // Fast cadence for questions, like Gemini Live
        label: `Pergunta identificada (${trigger})`,
        detectedTrigger: trigger,
      };
    }
  }

  // 3. Declarative termination punctuation
  if (/[.!;:]\s*$/.test(trimmed)) {
    return {
      isQuestion: false,
      pauseDelayMs: 750,
      label: "Fim de oração",
    };
  }

  // 4. Default reflective breathing pause
  return {
    isQuestion: false,
    pauseDelayMs: 900,
    label: "Pausa reflexiva",
  };
}

// Exclusively plays a subtle, pleasant micro-chime on pre-response capture:
// Confirms that the pause in user speech was detected and the system is initiating its reply.
// All other disruptive beeps (mic start, mic end, barge-in) are eliminated as requested.
function playPreResponseChime(audioCtx: AudioContext | null) {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    // Soft, pleasant harmonic tone (480Hz -> 540Hz subtle lift)
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.055);

    // Very gentle volume (0.045), fading out smoothly in 70ms
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
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
    cadenceHint: undefined,
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
  // Continuous conversation loop flag (Gemini Live style)
  const isContinuousSessionRef = useRef(false);
  const speechStartTimeRef = useRef<number>(0);

  // Web Audio Context & Analyser for real-time VAD & Barge-in
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const voiceEnergyConsecutiveHits = useRef(0);
  // In-memory TTS audio cache (max 30 items) to eliminate duplicate network latency
  const ttsCacheRef = useRef<Map<string, string>>(new Map());
  const watchdogTimerRef = useRef<any>(null);

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

  // Safe restart of speech recognition
  const restartRecognitionSafely = useCallback(() => {
    if (!recognitionRef.current || !isContinuousSessionRef.current) return;
    try {
      recognitionRef.current.abort();
    } catch (e) {}
    setTimeout(() => {
      if (!isContinuousSessionRef.current || !recognitionRef.current) return;
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already active
      }
    }, 120);
  }, []);

  // Dispatch accumulated speech turn immediately
  const triggerSendTurn = useCallback(
    (textToDispatch?: string) => {
      clearSilenceDebounce();
      const text = (textToDispatch || currentSpeechTextRef.current).trim();
      if (text.length >= 2) {
        currentSpeechTextRef.current = "";

        // Transition to processing state (AI thinking)
        setVoiceState((prev) => ({
          ...prev,
          liveTranscript: "",
          vadPhase: "processing",
          silenceCountdownMs: 0,
          activeSpeaker: "dialetica",
          cadenceHint: "Pausa capturada • Formulando réplica...",
        }));

        // Pre-response chime: exclusively signals that the pause was captured and reply generation begins
        if (audioContextRef.current) {
          playPreResponseChime(audioContextRef.current);
        }

        // Safety Watchdog: recover cleanly if backend fails or speech queue never starts within 18s
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = setTimeout(() => {
          if (!isSpeakingRef.current && isContinuousSessionRef.current) {
            console.warn("Watchdog da arena ativado: resposta demorou ou falhou, restaurando escuta.");
            setVoiceState((prev) => ({
              ...prev,
              vadPhase: "listening",
              activeSpeaker: "user",
              cadenceHint: "Pronto para sua fala",
            }));
            restartRecognitionSafely();
          }
        }, 18000);

        // Restart recognition cleanly so previous utterance results are flushed
        restartRecognitionSafely();

        onUserSpokenRef.current(text);
      }
    },
    [clearSilenceDebounce, restartRecognitionSafely]
  );

  // Stop currently playing audio immediately (Instant Barge-in)
  const stopSpeaking = useCallback(
    (triggeredByBargeIn: boolean = false) => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
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

      // Note: No barge_in beep played, honoring user's request for exclusively pre-response chime

      setVoiceState((prev) => ({
        ...prev,
        isSpeaking: false,
        activeSpeaker: isContinuousSessionRef.current ? "user" : "idle",
        vadPhase: isContinuousSessionRef.current ? "listening" : "idle",
        interruptedCount: triggeredByBargeIn ? prev.interruptedCount + 1 : prev.interruptedCount,
        cadenceHint: triggeredByBargeIn ? "Interrupção ativa • Palavra concedida a você" : undefined,
      }));

      // If user interrupted, immediately ensure recognition is ready for their input
      if (isContinuousSessionRef.current) {
        isListeningRef.current = true;
        restartRecognitionSafely();
      }
    },
    [restartRecognitionSafely]
  );

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
      analyser.smoothingTimeConstant = 0.35;
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

        // Smart Barge-In detection:
        // When AI is speaking, protect against speaker echo feedback loop.
        // Require:
        // 1. At least 600ms have elapsed since AI started speaking (grace period against playback start burst)
        // 2. High deliberate vocal energy (RMS > 0.12) sustained for 3 consecutive frames
        if (isSpeakingRef.current) {
          const speechElapsed = Date.now() - speechStartTimeRef.current;
          if (speechElapsed > 600 && rms > 0.12) {
            voiceEnergyConsecutiveHits.current += 1;
            if (voiceEnergyConsecutiveHits.current >= 3) {
              // Deliberate user voice interruption!
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

  // Native Web Speech Synthesis player with distinct timbre/pitch
  const playWithWebSpeechFallback = useCallback(
    (text: string, role: "dialetica" | "arbitro", onComplete: () => void) => {
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
        utterance.pitch = 0.8;
        utterance.rate = 0.96;
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

      speechStartTimeRef.current = Date.now();

      let isFinished = false;
      const safeFinish = () => {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(safetyTimer);
        onComplete();
      };

      // Guard against Chrome Web Speech API getting stuck on utterances
      const maxEstimatedDuration = Math.max(3500, Math.min(24000, (cleaned.length / 12) * 1000 + 4000));
      const safetyTimer = setTimeout(safeFinish, maxEstimatedDuration);

      utterance.onend = () => {
        setTimeout(safeFinish, 200);
      };
      utterance.onerror = () => {
        safeFinish();
      };

      window.speechSynthesis.speak(utterance);
    },
    []
  );

  // Internal audio queue processor with Gemini Live continuity
  const processNextSpeechItem = useCallback(async () => {
    // If queue is empty, finish speaking and RETURN CONTROL TO USER (Gemini Live loop!)
    if (speechQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      isSpeakingRef.current = false;

      if (isContinuousSessionRef.current) {
        // Return to listening immediately!
        isListeningRef.current = true;
        setVoiceState((prev) => ({
          ...prev,
          isSpeaking: false,
          isListening: true,
          activeSpeaker: "user",
          vadPhase: "listening",
          liveTranscript: "",
          silenceCountdownMs: 0,
          cadenceHint: "Sua vez • Fale quando quiser",
        }));

        // Note: mic_on beep eliminated to ensure clean conversational silence
        restartRecognitionSafely();
      } else {
        setVoiceState((prev) => ({
          ...prev,
          isSpeaking: false,
          activeSpeaker: "idle",
          vadPhase: "idle",
        }));
      }
      return;
    }

    // Clear watchdog when reply speech begins
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    isPlayingQueueRef.current = true;
    isSpeakingRef.current = true;
    speechStartTimeRef.current = Date.now();
    const item = speechQueueRef.current.shift()!;

    setVoiceState((prev) => ({
      ...prev,
      isSpeaking: true,
      activeSpeaker: item.role,
      vadPhase: "speaking",
      cadenceHint: "Discursando • Toque no orbe ou fale para interromper",
    }));

    // Method A: If base64 audio is already provided
    if (item.base64) {
      try {
        const audio = new Audio(item.base64);
        audioPlayerRef.current = audio;
        audio.onended = () => {
          setTimeout(processNextSpeechItem, 250);
        };
        audio.onerror = () => {
          playWithWebSpeechFallback(item.text, item.role, processNextSpeechItem);
        };
        speechStartTimeRef.current = Date.now();
        await audio.play();
        return;
      } catch (err) {
        console.warn("Falha ao reproduzir áudio base64 pré-gerado, usando fallback:", err);
      }
    }

    // Method B: Check TTS in-memory cache or call server TTS endpoint with 2.5s fast timeout
    const cacheKey = `${item.role}:${item.text.slice(0, 150)}`;
    const cachedAudioUrl = ttsCacheRef.current.get(cacheKey);

    if (cachedAudioUrl) {
      try {
        const audio = new Audio(cachedAudioUrl);
        audioPlayerRef.current = audio;
        audio.onended = () => {
          setTimeout(processNextSpeechItem, 250);
        };
        audio.onerror = () => {
          playWithWebSpeechFallback(item.text, item.role, processNextSpeechItem);
        };
        speechStartTimeRef.current = Date.now();
        await audio.play();
        return;
      } catch (err) {
        console.warn("Falha no áudio em cache:", err);
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: item.text,
          speakerRole: item.role,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.audioUrl && isSpeakingRef.current) {
          // Store in cache (capped at 30 items)
          if (ttsCacheRef.current.size >= 30) {
            const firstKey = ttsCacheRef.current.keys().next().value;
            if (firstKey) ttsCacheRef.current.delete(firstKey);
          }
          ttsCacheRef.current.set(cacheKey, data.audioUrl);

          const audio = new Audio(data.audioUrl);
          audioPlayerRef.current = audio;
          audio.onended = () => {
            setTimeout(processNextSpeechItem, 250);
          };
          audio.onerror = () => {
            playWithWebSpeechFallback(item.text, item.role, processNextSpeechItem);
          };
          speechStartTimeRef.current = Date.now();
          await audio.play();
          return;
        }
      }
    } catch (apiErr) {
      // If server TTS timed out or errored, immediately fall back to browser Web Speech
    }

    // Method C: High-fidelity Web Speech Synthesis fallback
    if (isSpeakingRef.current) {
      playWithWebSpeechFallback(item.text, item.role, processNextSpeechItem);
    }
  }, [playWithWebSpeechFallback, restartRecognitionSafely]);

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
          vadPhase: isSpeakingRef.current ? "speaking" : "listening",
          micPermissionDenied: false,
        }));
      };

      // Native speech start event: barge-in only after grace period
      recognition.onspeechstart = () => {
        if (isSpeakingRef.current) {
          const elapsed = Date.now() - speechStartTimeRef.current;
          if (elapsed > 700) {
            stopSpeaking(true);
          }
        }
      };

      recognition.onresult = (event: any) => {
        // If AI is speaking, ignore incoming recognition results unless user explicitly interrupted
        if (isSpeakingRef.current) {
          const elapsed = Date.now() - speechStartTimeRef.current;
          if (elapsed > 700) {
            stopSpeaking(true);
          } else {
            return;
          }
        }

        // Build accumulated transcript across all results in current session
        let finalAccumulated = "";
        let interimAccumulated = "";

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalAccumulated += result[0].transcript + " ";
          } else {
            interimAccumulated += result[0].transcript;
          }
        }

        const combined = (finalAccumulated + interimAccumulated).trim();
        if (!combined) return;

        currentSpeechTextRef.current = combined;

        // Perform smart Portuguese cadence analysis
        const cadence = detectSpeechCadence(combined);
        const pauseDelayMs = cadence.pauseDelayMs;

        const nextPhase: VADPhase = cadence.isQuestion ? "question_detected" : "pause_detected";

        setVoiceState((prev) => ({
          ...prev,
          liveTranscript: combined,
          activeSpeaker: "user",
          vadPhase: nextPhase,
          silenceCountdownMs: pauseDelayMs,
          cadenceHint: cadence.label,
        }));

        // Reset silence countdown timer
        clearSilenceDebounce();

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
        // If continuous session is active:
        if (isContinuousSessionRef.current) {
          // If speech was captured and waiting, dispatch it immediately!
          if (currentSpeechTextRef.current.trim().length >= 2 && !isSpeakingRef.current) {
            triggerSendTurn();
          } else {
            // Auto restart recognition after brief debounce
            setTimeout(() => {
              if (isContinuousSessionRef.current && !isSpeakingRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {}
              }
            }, 100);
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

  // Start continuous conversational voice session (Gemini Live Mode)
  const startListening = useCallback(async () => {
    stopSpeaking();
    isContinuousSessionRef.current = true;
    isListeningRef.current = true;

    // Initialize Web Audio API energy monitoring
    await initMicAudioContext();

    // Note: mic_on beep eliminated to ensure clean conversational silence without distracting beeps

    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setVoiceState((prev) => ({
        ...prev,
        isListening: true,
        activeSpeaker: "user",
        vadPhase: "listening",
        cadenceHint: "Modo Conversa Contínua ativo • Fale com naturalidade",
      }));
    } catch (e) {
      // Already active
    }
  }, [stopSpeaking, initMicAudioContext]);

  // Stop listening session
  const stopListening = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    isContinuousSessionRef.current = false;
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
      cadenceHint: undefined,
      activeSpeaker: prev.isSpeaking ? prev.activeSpeaker : "idle",
    }));
  }, [clearSilenceDebounce, teardownMicAudio]);

  // Handle errors or API failures gracefully without freezing arena
  const notifyTurnError = useCallback(
    (customHint?: string) => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      isSpeakingRef.current = false;
      isPlayingQueueRef.current = false;
      setVoiceState((prev) => ({
        ...prev,
        isSpeaking: false,
        vadPhase: isContinuousSessionRef.current ? "listening" : "idle",
        activeSpeaker: isContinuousSessionRef.current ? "user" : "idle",
        cadenceHint: customHint || "Instabilidade temporária • Toque para tentar novamente",
      }));
      if (isContinuousSessionRef.current) {
        restartRecognitionSafely();
      }
    },
    [restartRecognitionSafely]
  );

  // Clean state reset
  const resetVoiceState = useCallback(
    (customHint?: string) => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      setVoiceState((prev) => ({
        ...prev,
        isSpeaking: false,
        vadPhase: isContinuousSessionRef.current ? "listening" : "idle",
        activeSpeaker: isContinuousSessionRef.current ? "user" : "idle",
        cadenceHint: customHint || "Pronto",
      }));
      if (isContinuousSessionRef.current) {
        restartRecognitionSafely();
      }
    },
    [restartRecognitionSafely]
  );

  return {
    voiceState,
    startListening,
    stopListening,
    speakText,
    stopSpeaking: () => stopSpeaking(false),
    triggerManualSend: () => triggerSendTurn(),
    notifyTurnError,
    resetVoiceState,
  };
}
