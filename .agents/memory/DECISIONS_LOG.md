# Architectural Decision Records (ADR) — Dialética

## ADR 001: Unificação de Sessão entre Voz e Texto
- **Status**: Aceito e Implementado
- **Contexto**: O usuário reportou que voz e texto pareciam desconectados e que criar novo debate em voz mantinha mensagens antigas em texto.
- **Decisão**: Estabelecer `App.tsx` como autoridade única através de `messages: Message[]`. A Arena de Voz consome a lista completa de mensagens e qualquer comando de "Novo Debate" limpa sincronicamente ambos os modos após auto-arquivar a sessão ativa.
- **Consequências**: Consistência absoluta em transições de UI e eliminação de bugs de desincronização de contexto.

---

## ADR 002: Eliminação de Bips e Adoção do Sinal de Gatilho de Prontidão (Audible Cue)
- **Status**: Aceito e Implementado
- **Contexto**: Avisos sonoros durante a fala ou logo após pausas do usuário causavam interrupções desagradáveis no raciocínio filosófico.
- **Decisão**: Silêncio absoluto durante a fala ativa do usuário e durante pausas reflexivas. Introduzir `playReadinessCue` (micro-acorde suave senoidal D5 -> F#5 de ~140ms) executado exclusivamente quando o modelo conclui sua exposição e a arena passa para `vadPhase === 'listening'`.
- **Consequências**: Experiência auditiva orgânica similar ao Gemini Live, com feedback límpido e não-invasivo.

---

## ADR 003: Empacotamento Android nativo via Trusted Web Activities (TWA)
- **Status**: Aceito e Implementado
- **Contexto**: Necessidade de fornecer aplicativo instalável no Android com performance nativa sem reescrever a base de código.
- **Decisão**: Utilizar Google Bubblewrap CLI e arquitetura TWA baseada no manifesto PWA (`public/manifest.json`).
- **Consequências**: Pipeline no GitHub Actions compila o APK nativo automaticamente mantendo paridade 1:1 com a web.
