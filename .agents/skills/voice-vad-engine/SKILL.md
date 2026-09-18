---
name: voice-vad-engine
description: Gerenciamento avançado de voz, detecção de atividade de voz (VAD), interrupções (barge-in) e síntese de áudio para debates interativos.
---

# Voice & VAD Engine Skill

Esta habilidade orienta a manutenção e evolução do motor de voz contínuo do **Dialética** (`src/hooks/useDialeticaVoice.ts`).

## 1. Pipeline de Reconhecimento de Voz
- **Engine**: Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) com `continuous: true` e `interimResults: true`.
- **Tratamento de Inércia do Navegador**: O motor implementa `restartRecognitionSafely()` com debouncing de 350ms para evitar colisões de microfone em navegadores Android/Chrome.
- **Deduplicação de Turnos**: `lastDispatchedTurnTextRef` garante que transcrições repetidas pelo motor não gerem envios em duplicidade.

## 2. Detecção de Pausas & VAD Inteligente
- **Detecção de Perguntas**: Se o texto transcrito termina com `?`, o temporizador de silêncio é reduzido para **550ms - 600ms**, garantindo resposta rápida a indagações.
- **Detecção de Afirmações Complexas**: Afirmações longas utilizam temporizador de **750ms - 850ms**, permitindo que o usuário respire ou estruture pensamentos sem cortes prematuros.
- **Barge-in (Interrupção por Voz)**: Quando o áudio da IA está tocando e o usuário fala mais de 3 caracteres de interim, `stopSpeaking()` é disparado imediatamente.

## 3. Sinal de Gatilho de Prontidão (Audible Readiness Cue)
- **Silêncio Absoluto Durante a Fala**: Não há bips ou avisos enquanto o proponente fala ou quando a pausa reflexiva é registrada.
- **Gatilho de Prontidão (`playReadinessCue`)**: O micro-acorde sutil ascendente (D5 -> F#5, 587Hz -> 740Hz) toca **apenas** quando o modelo conclui sua fala e a arena volta a estar pronta para receber a entrada do usuário (`vadPhase === 'listening'`).
- Isso provê feedback auditivo natural e amigável (estilo Gemini Live) de que o turno agora é do usuário.

## 4. Síntese e Formatação PCM
- No backend (`server.ts`), áudios gerados pelo modelo Gemini via PCM são convertidos em buffers WAV válidos de 24kHz / 16-bit Mono via `pcmToWav()`.
- O cliente reproduz via Web Audio API (`AudioContext.decodeAudioData`) para latência mínima em dispositivos móveis.
