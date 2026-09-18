# AGENTS.md — Protocolo de Continuidade para Agentes de Código & IA

> **Documento Oficial de Continuidade do Projeto Dialética**  
> Este arquivo define os padrões de engenharia, arquitetura de software, invariantes de estado e regras operacionais não-negociáveis para qualquer agente de IA ou desenvolvedor atuando neste repositório.

---

## 1. Visão Geral & Arquitetura

O **Dialética** é uma plataforma full-stack para debates aprofundados sobre ciência, epistemologia e filosofia, combinando:
- **Voz Contínua em Tempo Real**: Arena de voz com detecção de pausas (VAD), interrupção natural ("barge-in") e sinalização acústica sutil pré-resposta.
- **Árbitro Epistêmico Autônomo**: Terceira persona neutra que audita premissas empíricas e detecta falácias lógicas formais e informais.
- **Sessão Unificada Voz & Texto**: O usuário pode alternar a qualquer momento entre a Arena de Voz e o Chat Textual sem perda de contexto ou separação de conversas.
- **Modos Aberto & Formal**: Modo socrático livre ou debate competitivo com rodadas cronometradas, bancas de pontuação e critérios popperianos.
- **PWA / Android TWA**: Totalmente empacotável como aplicativo Android nativo via Trusted Web Activities e Google Bubblewrap.

---

## 2. Invariantes Arquiteturais e Regras Críticas

### 🔒 Regra 1: Sessão Única e Compartilhada (Voz + Texto)
- **Proibição Absoluta**: NUNCA crie estados de mensagens paralelos ou isolados para o modo de voz e o modo de texto.
- O array `messages: Message[]` localizado em `src/App.tsx` é a **fonte única e absoluta da verdade**.
- Tanto `VoiceLiveArena.tsx` quanto `ChatMessageItem.tsx` consomem e renderizam esse mesmo histórico compartilhado.
- Quando o usuário clica em "Novo" ou inicia um novo debate:
  1. O debate anterior é salvo automaticamente no repositório de `sessions` via `saveDebateSession()`.
  2. `messages = []`, `sessionArtifacts = []` e `currentSessionId = null` são limpos sincronicamente.
  3. Ambos os modos passam imediatamente a exibir o estado limpo (`EmptyDebateState`).

### 🔊 Regra 2: Pipeline de Voz e Sinal de Gatilho de Prontidão (Audible Cue)
- **Zero Ruído Durante a Fala**: É estritamente proibido emitir bips, campainhas ou avisos sonoros durante a fala ativa do usuário, durante pausas reflexivas de respiração ou no momento da captura da réplica (`triggerSendTurn`).
- **Sinal de Gatilho de Prontidão (`playReadinessCue`)**: Um tom harmônico ascendente sutil e elegante deve tocar **exclusivamente** quando o modelo conclui sua exposição (detectando a pausa reflexiva) e a arena está 100% pronta para receber a entrada do usuário (`vadPhase === 'listening'`).
- A função de interrupção (`barge-in`) interrompe a reprodução de áudio imediatamente se o usuário retomar a fala.

### 🌐 Regra 3: Porta 3000 e Container Full-Stack
- A aplicação roda em container Cloud Run / AI Studio com proxy reverso fixado na porta `3000`.
- O servidor Express (`server.ts`) inicializa o SDK `@google/genai` no backend de forma preguiçosa (*lazy initialization*), garantindo que as chaves de API nunca sejam expostas ao navegador.

---

## 3. Diretório de Skills do Agente (`.agents/skills/`)

Ao trabalhar em módulos específicos, consulte obrigatoriamente as habilidades documentadas:

| Skill | Localização | Escopo Principal |
| :--- | :--- | :--- |
| **voice-vad-engine** | `.agents/skills/voice-vad-engine/SKILL.md` | Reconhecimento de fala contínuo, VAD, cadence detection e áudio PCM/WAV. |
| **epistemic-arbitration** | `.agents/skills/epistemic-arbitration/SKILL.md` | Engenharia de prompt do Árbitro, catálogo de falácias e veredito factual. |
| **debate-session-persistence** | `.agents/skills/debate-session-persistence/SKILL.md` | Serialização de sessões, auto-save inteligente, backup JSON e transcrição Markdown. |
| **android-apk-packaging** | `.agents/skills/android-apk-packaging/SKILL.md` | Empacotamento PWA em APK Android via TWA e Bubblewrap CLI. |

---

## 4. Bateria de Testes & Verificação Contínua

Antes de concluir qualquer turno ou submeter alterações de código:
```bash
# 1. Validação estática de tipagem TypeScript
npm run lint

# 2. Execução da suíte operacional (7/7 testes funcionais)
npm run test:operational

# 3. Execução do orquestrador de testes E2B Sandbox
npm run test:e2b

# 4. Build de produção (Vite + esbuild server bundle)
npm run build
```

---

## 5. Estrutura de Pastas Chave

```
├── .agents/                    # Habilidades e diretrizes dos agentes de código
│   ├── agent-instructions.md   # Governança geral
│   └── skills/                 # Skills especializadas modulares
├── .github/workflows/          # Automação CI/CD e compilação de APK Android
│   └── ci-cd-apk.yml
├── public/                     # Manifest PWA, ícones e assets estáticos
├── scripts/                    # Scripts de testes operacionais e automação
│   └── run-operational-tests.ts
├── tests/                      # Configurações de sandbox E2B
│   ├── e2b.config.json
│   └── e2b-sandbox-runner.ts
├── src/                        # Aplicação React frontend
│   ├── components/             # Arena de voz, Chat, TopAppBar, Modais
│   ├── hooks/                  # useDialeticaVoice (motor de VAD e áudio)
│   ├── utils/                  # sessionStorage (auto-save e persistência)
│   ├── data/                   # Constantes e papéis de debate
│   └── types.ts                # Definições completas de tipos TypeScript
└── server.ts                   # Backend Express e proxy Gemini seguro
```
