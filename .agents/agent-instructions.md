# Dialética — Instruções & Governança do Code Agent

Este diretório contém especificações, habilidades modulares e diretrizes operacionais para agentes de IA e engenheiros que atuam no desenvolvimento contínuo do **Dialética**.

---

## 🏛️ Filosofia e Princípios Não-Negociáveis

1. **Sessão Unificada & Única Fonte de Verdade**:
   - O estado `messages` e `currentSessionId` em `src/App.tsx` é a autoridade máxima.
   - O modo de Voz (`VoiceLiveArena`) e o modo de Texto (`ChatMessageItem`) NUNCA operam em sessões isoladas.
   - Todo turno falado em voz precisa ser renderizado no histórico cronológico de ambos os modos.
   - Qualquer ação de "Novo Debate" (`handleStartNewDebate`) deve:
     1. Arquivar a sessão anterior automaticamente em `sessions` para não perder dados.
     2. Limpar `messages = []`, `currentSessionId = null` e o localStorage correspondente.
     3. Reiniciar a escuta e os transientes de fala (`resetVoiceState`).

2. **Rigor Epistêmico & Sem Alucinação**:
   - Respostas da IA e intervenções do Árbitro Epistêmico devem sempre citar fontes e distinguir consenso científico de hipóteses em aberto.
   - O árbitro é a "terceira persona" neutra e intervém apenas quando detecta falácias ou dados empíricos contestáveis.

3. **Arquitetura de Áudio em Tempo Real**:
   - O feedback sonoro de captura de pausa ("Pre-response Chime") deve tocar **apenas** quando a pausa do usuário é detectada e a geração começa.
   - A detecção de interrupção ("barge-in") deve cortar imediatamente qualquer áudio em reprodução caso o usuário retome a fala.

4. **Compatibilidade Android / TWA**:
   - A porta `3000` é fixa e obrigatória para o container.
   - O manifesto PWA (`public/manifest.json`) deve manter ícones válidos (192, 512, maskable) e `display: standalone`.

---

## 📂 Mapa de Habilidades do Agente (`.agents/skills/`)

- `voice-vad-engine`: Gerenciamento de Web Speech API, AudioContext, debounce de silêncio e síntese PCM/WAV.
- `epistemic-arbitration`: Engenharia de prompt para o Árbitro Epistêmico, taxonomia de falácias e verificação factual.
- `debate-session-persistence`: Ciclo de vida das sessões, auto-save contínuo, backup JSON e exportação acadêmica Markdown.
- `android-apk-packaging`: Empacotamento PWA em APK Android nativo via Bubblewrap CLI e CI/CD.
