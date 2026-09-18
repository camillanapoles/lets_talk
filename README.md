# Dialética — Debate Científico & Filosófico Profundo

[![CI/CD & APK Build](https://github.com/dialetica/dialetica-app/actions/workflows/ci-cd-apk.yml/badge.svg)](https://github.com/dialetica/dialetica-app/actions/workflows/ci-cd-apk.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![React 19](https://img.shields.io/badge/react-19.0.1-blue.svg)](https://react.dev/)
[![Gemini 2.5 Flash](https://img.shields.io/badge/gemini-2.5--flash-orange.svg)](https://ai.google.dev/)
[![Android PWA / TWA](https://img.shields.io/badge/android-TWA%20Ready-green.svg)](https://developer.chrome.com/docs/android/trusted-web-activity)

**Dialética** é uma plataforma e aplicativo Android para debates intelectuais profundos, fundamentados em rigor científico, falseabilidade popperiana, lógica formal e tradição filosófica. Com suporte a **Voz em Tempo Real**, **Árbitro Epistêmico Autônomo** e **Sessão Unificada entre Voz e Texto**, permite conversas fluidas com IA tanto por fala natural quanto por mensagens escritas.

---

## ✨ Funcionalidades Principais

### 🎙️ Arena de Voz Interativa (VAD & Barge-In)
- **Detecção de Atividade de Voz (VAD)**: Reconhecimento contínuo via Web Speech API com análise adaptativa de cadência de pausas (perguntas vs afirmações).
- **Feedback Acústico Pré-Resposta**: Bip harmônico discreto acionado **exclusivamente** na captura da pausa do usuário para sinalizar o início da formulação da resposta.
- **Interrupção Natural ("Barge-in")**: O usuário pode interromper a fala da IA a qualquer momento simplesmente voltando a falar.

### ⚖️ Árbitro Epistêmico & Verificação de Fatos
- **Auditoria Lógica e Factual**: Terceira persona neutra que audita as premissas do debate.
- **Detecção de Falácias**: Identificação de *Ad Hominem*, *Espantalho*, *Falsa Dicotomia*, *Petição de Princípio* e *Falácia Naturalista*.
- **Fontes Acadêmicas**: Citação de consensos científicos, estudos com DOI e referências bibliográficas.

### 🔄 Sessão Unificada Voz + Texto
- O histórico de mensagens é rigorosamente idêntico e sincronizado em tempo real entre a **Arena de Voz** e o **Chat Textual**.
- Alterne entre voz e texto com um clique através do botão **"Continuar por Voz"** ou pela barra superior, sem reinício de contexto.
- Ao iniciar um **"Novo Debate"**, o debate anterior é salvo automaticamente no histórico de sessões para preservar seu trabalho.

### 🏆 Modos de Debate
- **Modo Aberto (Socrático)**: Discussão livre, adaptativa e contínua sobre qualquer tema científico ou filosófico.
- **Modo Formal Acadêmico**: Estruturado em rounds regulamentados (Abertura, Refutação, Réplica e Conclusão), com cronômetro regressivo e painel de pontuação lógica e evidencial.

### 💾 Persistência & Exportação Acadêmica
- Salvamento automático contínuo em armazenamento local.
- Gerenciador de sessões com renomeação, busca e contadores de turnos.
- Exportação em **Markdown Acadêmico** completo e **Backup JSON** estruturado.

---

## 🛠️ Pilha Tecnológica

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Backend**: Node.js, Express, tsx, esbuild (bundle CJS para produção).
- **Modelos de IA**: Google GenAI SDK (`@google/genai`) — Gemini 2.5 Flash, Gemini 2.5 Pro e Gemini 2.5 Flash Thinking.
- **Áudio**: Web Speech API + Web Audio API com decodificação de áudio PCM 24kHz.
- **Mobile**: Progressive Web App (PWA) instalável com compatibilidade total para Trusted Web Activity (TWA) no Android.
- **Testes**: Suíte de testes operacionais e executor em Sandbox E2B.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js versão 20 ou superior.
- Chave de API do Google Gemini (`GEMINI_API_KEY`).

### Instalação
```bash
# 1. Clone o repositório
git clone https://github.com/dialetica/dialetica-app.git
cd dialetica-app

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Adicione sua GEMINI_API_KEY no arquivo .env

# 4. Inicie o servidor de desenvolvimento
npm run dev
```
Acesse a aplicação em `http://localhost:3000`.

---

## 🧪 Testes Operacionais & Sandboxes E2B

O projeto inclui uma suíte automatizada de testes operacionais de ponta a ponta:

```bash
# Executa a suíte de testes operacionais funcionais
npm run test:operational

# Executa o orquestrador de testes E2B Sandbox
npm run test:e2b
```

A suíte valida:
1. Integridade do manifesto PWA e compatibilidade Android TWA.
2. Metadados do applet e permissões de microfone.
3. Serialização de sessões e integridade de exportação acadêmica em Markdown.
4. Cadência de fala do VAD e regras do bip sonoro pré-resposta.
5. Taxonomia epistêmica e catálogo de falácias lógicas.
6. Invariante de estado unificado entre voz e texto.
7. Scripts de build e dependências de produção.

---

## 🤖 Governança para Agentes de Código

Consulte os guias para agentes e colaboradores de IA:
- **`AGENTS.md`**: Protocolo de continuidade, invariantes arquiteturais e regras críticas de desenvolvimento.
- **`.agents/skills/`**: Habilidades modulares de engenharia:
  - `voice-vad-engine`: Pipeline de áudio, VAD e síntese.
  - `epistemic-arbitration`: Modelagem do Árbitro e detecção de falácias.
  - `debate-session-persistence`: Sincronização de sessões e ciclo de vida.
  - `android-apk-packaging`: Empacotamento em APK via Bubblewrap TWA.

---

## 📱 Compilação do APK Android (TWA / Bubblewrap)

### Via GitHub Actions (Recomendado)
O fluxo `.github/workflows/ci-cd-apk.yml` realiza o lint, executa a suíte de testes operacionais, compila o bundle web e empacota o APK Android automaticamente através do Bubblewrap CLI, disponibilizando o arquivo `.apk` pronto para download nos artefatos da Action.

### Localmente via Bubblewrap CLI
```bash
# 1. Instale o Bubblewrap globalmente
npm install -g @bubblewrap/cli

# 2. Inicialize o projeto TWA a partir do manifesto
bubblewrap init --manifest https://seu-dominio.com/manifest.json

# 3. Compile o APK
bubblewrap build
```

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais informações.
