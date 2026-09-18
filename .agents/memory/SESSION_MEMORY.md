# Dialética — Memória de Continuidade e Estado Epistêmico

> Este arquivo é a memória semântica e episódica de longo prazo para agentes de IA atuando no repositório Dialética.

---

## 🧠 Estado Atual do Projeto

| Dimensão | Estado Atual | Última Atualização |
| :--- | :--- | :--- |
| **Versão da Plataforma** | 1.0.0 (PWA + TWA Android Ready) | Setembro 2026 |
| **Arquitetura** | Full-Stack (React 19 + Node.js Express Server) | Container Cloud Run / Port 3000 |
| **Engine de Voz** | Web Speech API + Web Audio API (PCM 24kHz / WAV) | VAD Adaptativo com Barge-in |
| **Sinal Acústico** | *Audible Readiness Cue* (D5 -> F#5, ~587Hz -> ~740Hz) | Zero ruído na fala / Toca apenas ao ficar pronto |
| **Sessão Unificada** | `messages: Message[]` em `App.tsx` compartilhado | Voz e Texto idênticos e sincronizados |
| **Auto-Save & Novo Debate** | Auto-arquivamento em `sessions` antes de limpar | Usuário nunca perde debates anteriores |
| **Qualidade de Código** | 7/7 Testes Operacionais + Lint 100% Green | CI/CD GitHub Actions + E2B Sandbox |

---

## 📌 Invariantes Críticas Aprendidas em Sessões Anteriores

1. **Eliminação de Beeps Inconvenientes**:
   - O usuário reportou incômodo com bips durante pausas ou durante sua fala.
   - **Regra Fixada**: Silêncio absoluto durante a fala do usuário e durante pausas reflexivas de respiração.
   - O único som emitido é o `playReadinessCue`, um acorde harmônico ascendente sutil que toca quando o modelo conclui sua fala e a arena volta a estar receptiva.

2. **Integração Total Voz + Texto**:
   - Voz e texto nunca devem operar em históricos paralelos.
   - A Arena de Voz (`VoiceLiveArena`) renderiza todos os turnos cronológicos com badge de título da sessão e contagem sincronizada.
   - O Chat em Texto exibe banner com botão direto para "Continuar por Voz".
   - O botão "Novo" arquiva o debate anterior em `sessions` e zera ambos os modos sincronicamente.

3. **Porta e Infraestrutura**:
   - Porta `3000` é a única porta exposta pelo reverse proxy.
   - O backend Express (`server.ts`) utiliza lazy initialization para o SDK `@google/genai`.
