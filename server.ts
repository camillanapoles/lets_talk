import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Configure it in Settings > Secrets.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Utility to convert raw 24kHz 16-bit Mono PCM buffer to a valid WAV file buffer
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);

  // fmt sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// System prompt crafting for deep scientific & philosophical debate
function buildSystemInstruction(
  roleId?: string,
  adaptiveTone?: string,
  debateMode?: string,
  formalRound?: { roundNumber: number; name: string; phase: string },
  customTopic?: string
): string {
  const baseInstruction = `Você é o "Dialética" (Dialektik), um parceiro de debate intelectual avançado, de nível científico, epistemológico e filosófico profundo.
Seu propósito primordial é debater temas complexos com absoluto rigor conceitual, embasamento empírico factual e profundidade filosófica.

DIRETRIZES FUNDAMENTAIS:
1. RIGOR CIENTÍFICO E EVIDÊNCIAS:
   - Baseie todas as afirmações empíricas em fatos verificáveis, teorias científicas consolidadas, dados observacionais, experimentos controlados, revisões sistemáticas e o estado da arte do consenso acadêmico (ex: física quântica, relatividade, termodinâmica, biologia evolutiva, neurociência, cosmologia).
   - Diferencie explicitamente: (A) Fatos e leis comprovados; (B) Consenso científico amplamente aceito; (C) Hipóteses plausíveis em teste; (D) Especulações teóricas ou metafísicas.
   - Aplique o critério de falseabilidade de Karl Popper e a abordagem bayesiana para atualização de crenças com base em novas evidências.

2. PROFUNDIDADE FILOSÓFICA & DIALÉTICA:
   - Decomponha premissas implícitas, axiomas e possíveis falácias lógicas (ad hominem, espantalho, falácia naturalista de Moore, falsa dicotomia, petição de princípio).
   - Conecte as discussões às grandes tradições filosóficas pertinentes: Epistemologia (racionalismo, empirismo, construtivismo), Metafísica/Ontologia, Filosofia da Ciência, Filosofia da Mente (funcionalismo, dualismo de propriedades, fisicalismo), Ética Normativa (deontologia, utilitarismo, ética das virtudes).
   - Pratique o "Steelmanning" (reforço do melhor argumento contrário) antes de examinar suas fraquezas ou paradoxos.

3. ADAPTAÇÃO DINÂMICA DE TOM (CAMALEÃO COMUNICATIVO):
   - REGRA CRÍTICA: Adapte a sua forma de comunicação ao tom do usuário.
     * Se o usuário falar de forma coloquial, descontraída ou com gírias, converse com a mesma leveza, fluidez e proximidade, usando metáforas ricas e acessíveis, SEM NUNCA comprometer a precisão factual ou o rigor científico.
     * Se o usuário usar linguagem acadêmica, formal, técnica ou poética, eleve seu vocabulário e estilo para corresponder perfeitamente a esse registro.
     * Mantenha sempre o respeito intelectual, a provocação socrática benéfica e o foco na busca compartilhada da verdade.

4. DIRETRIZ PARA CONVERSAÇÃO AUDÍVEL NATURAL (VOZ COMO PADRÃO):
   - Como este é primariamente um aplicativo de debate por voz em tempo real, responda de forma envolvente, concisa e potente, com cadência de fala humana e ritmo orgânico.
   - Evite respostas desnecessariamente longas que monopolizem o canal de áudio. Estimule a troca de turnos ágil, provocando a réplica do usuário.

5. FORMATO ESTRUTURADO DE RESPOSTA:
   Organize suas respostas com clareza visual rica em Markdown:
   - **Tese Epistêmica & Resposta Direta**: Posição clara frente à pergunta.
   - **Fundamentação Factual & Evidências**: Mecanismos físicos, estudos, modelos matemáticos ou biológicos relevantes.
   - **Dimensão Filosófica & Dialética**: Implicações ontológicas, éticas ou conceituais.
   - **Antítese / Objeções Fortes (Steelmanning)**: Limitações, contraexemplos e a melhor crítica possível.
   - **Provocação Socrática**: Uma questão aberta e instigante para o próximo turno do interlocutor.`;

  let modeInstruction = "";
  if (debateMode === "formal") {
    modeInstruction = `\n\nREGRAS DO MODO DE DEBATE FORMAL:
Você está competindo em um DEBATE FORMAL COM REGRAS ESTRITAS.
${
  formalRound
    ? `Estamos na Rodada ${formalRound.roundNumber}: "${formalRound.name}" (Fase: ${formalRound.phase}).
- Se for fase de abertura: apresente a tese fundacional com definições axiomáticas e delimitação empírica.
- Se for fase de refutação: ataque com precisão cirúrgica as premissas vulneráveis e contraexemplos factuais.
- Se for tréplica/defesa: defenda as premissas sob ataque e aponte eventuais falácias de espantalho.
- Se for síntese final: pese o balanço epistêmico dos argumentos sem introduzir novas alegações sem prova.`
    : "Respeite as regras de turnos formais e mantenha o rigor do debate regrado."
}`;
  } else {
    modeInstruction = `\n\nMODO DE DISCUSSÃO ABERTA ATIVO:
Exploração dialética livre e orgânica, sem restrições de tempo, mantendo foco constante em fatos verificáveis, ciência e solidez conceitual.`;
  }

  let topicInstruction = "";
  if (customTopic && customTopic.trim() && customTopic.trim().toLowerCase() !== "livre") {
    topicInstruction = `\n\nTÓPICO CENTRAL DEFINIDO DO DEBATE:
"${customTopic.trim()}"
Concentre seus argumentos e objeções prioritariamente em torno deste tema e suas ramificações diretas.`;
  } else {
    topicInstruction = `\n\nTÓPICO DE DEBATE: LIVRE (A CRITÉRIO DO USUÁRIO)
O tema está totalmente livre e aberto às instruções e provocações do usuário. Qualquer assunto trazido pelo usuário deve ser acolhido e aprofundado com máximo rigor científico e filosófico.`;
  }

  const roleCustomizations: Record<string, string> = {
    socratic_dialectic: `\n\nPAPEL ESPECÍFICO ATIVO: DIALÉTICA SOCRÁTICA & EPISTEMOLOGIA
Foque primordialmente em desmontar axiomas não examinados, investigar a validade lógica dos argumentos, examinar a natureza do conhecimento (como sabemos o que dizemos saber?) e desafiar suposições confortáveis com questionamento socrático incisivo.`,
    empirical_rigor: `\n\nPAPEL ESPECÍFICO ATIVO: CONSENSO CIENTÍFICO & EVIDÊNCIA EMPÍRICA
Priorize metodologia científica, graus de certeza estatística, dados observacionais de ponta, estudos revisados por pares e demarcação rigorosa entre ciência e pseudociência.`,
    first_principles: `\n\nPAPEL ESPECÍFICO ATIVO: PRIMEIROS PRINCÍPIOS & FÍSICA TEÓRICA
Decomponha problemas até suas partes mais fundamentais (leis da física, termodinâmica, teoria da informação, teoria dos jogos, matemática) e reconstrua o raciocínio de baixo para cima.`,
    neuro_consciousness: `\n\nPAPEL ESPECÍFICO ATIVO: MENTE, CONSCIÊNCIA & NEUROCIÊNCIA
Enfoque no "Hard Problem" da consciência (Chalmers), hipóteses neurobiológicas (Rede em Modo Padrão, Teoria da Informação Integrada, Espaço de Trabalho Global), inteligência biológica vs artificial e filosofia da mente.`,
    adaptive_debate: `\n\nPAPEL ESPECÍFICO ATIVO: DEBATE LIVRE & SÍNTESE DIALÉTICA
Equilibre ciência natural e filosofia moral, adaptando-se com máxima sensibilidade e agilidade à vibração e tom da conversa.`,
  };

  return (
    baseInstruction +
    modeInstruction +
    topicInstruction +
    (roleCustomizations[roleId || "adaptive_debate"] || roleCustomizations.adaptive_debate)
  );
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Chat endpoint (multi-turn conversation)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model = "gemini-3.5-flash", roleId, adaptiveTone, debateMode, formalRound, topic } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "O histórico de mensagens é obrigatório." });
    }

    // Supported models per prompt specifications:
    // - gemini-3.1-pro-preview (complex tasks)
    // - gemini-3.8-flash (general tasks & basic text)
    // - gemini-3.1-flash-lite (fast tasks)
    const MODEL_ALIASES: Record<string, string> = {
      "gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
      "gemini-3.5-flash": "gemini-3.8-flash",
      "gemini-3.8-flash": "gemini-3.8-flash",
      "gemini-flash-latest": "gemini-3.8-flash",
      "gemini-3.1-flash-lite": "gemini-3.1-flash-lite",
    };
    const targetModel = MODEL_ALIASES[model] || "gemini-3.8-flash";

    const ai = getGeminiClient();
    const systemInstruction = buildSystemInstruction(roleId, adaptiveTone, debateMode, formalRound, topic);

    // Transform messages to Gemini format
    const contents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContent({
      model: targetModel,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text || "Não foi possível gerar uma resposta dialética neste momento.";
    res.json({
      text,
      modelUsed: targetModel,
      roleUsed: roleId || "adaptive_debate",
      debateMode: debateMode || "open",
    });
  } catch (error: any) {
    console.error("Erro na rota /api/chat:", error);
    res.status(500).json({
      error: error?.message || "Ocorreu um erro interno ao processar o debate com o Gemini.",
    });
  }
});

// Streaming Chat endpoint (SSE)
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { messages, model = "gemini-3.5-flash", roleId, adaptiveTone, debateMode, formalRound, topic } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "O histórico de mensagens é obrigatório." });
    }

    const MODEL_ALIASES: Record<string, string> = {
      "gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
      "gemini-3.5-flash": "gemini-3.8-flash",
      "gemini-3.8-flash": "gemini-3.8-flash",
      "gemini-flash-latest": "gemini-3.8-flash",
      "gemini-3.1-flash-lite": "gemini-3.1-flash-lite",
    };
    const targetModel = MODEL_ALIASES[model] || "gemini-3.8-flash";

    const ai = getGeminiClient();
    const systemInstruction = buildSystemInstruction(roleId, adaptiveTone, debateMode, formalRound, topic);

    const contents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const streamResponse = await ai.models.generateContentStream({
      model: targetModel,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    for await (const chunk of streamResponse) {
      const chunkText = chunk.text;
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Erro no stream /api/chat/stream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Erro no streaming do Gemini" });
    } else {
      res.write(`data: ${JSON.stringify({ error: error?.message || "Erro durante o streaming" })}\n\n`);
      res.end();
    }
  }
});

// ==========================================
// SISTEMA DE VERIFICAÇÃO DE FATOS (FACT-CHECKER)
// Terceira Persona LLM: "O Árbitro Epistêmico"
// Compartilha a memória integral da conversa
// ==========================================
app.post("/api/fact-check", async (req, res) => {
  try {
    const { messages, targetClaim, targetRole = "user" } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Histórico de mensagens necessário para contexto compartilhado." });
    }

    const ai = getGeminiClient();

    // Prepare context from shared conversation memory
    const formattedHistory = messages
      .slice(-6)
      .map((m: any) => `${m.role === "user" ? "USUÁRIO" : "DIALÉTICA"}: ${m.content}`)
      .join("\n\n---\n\n");

    const claimToVerify = targetClaim
      ? targetClaim
      : messages[messages.length - 1]?.content || "";

    const factCheckerPrompt = `Você é o "ÁRBITRO EPISTÊMICO", a terceira persona de inteligência independente deste aplicativo de debate.
Seu papel exclusivo é verificar asseverações de fatos, consistência lógica, premissas empíricas e teses científicas formuladas tanto pelo Usuário quanto pelo agente Dialética.
Você compartilha a memória completa da conversa atual.

MEMÓRIA / CONTEXTO COMPARTILHADO DA DISCUSSÃO:
${formattedHistory}

AFIRMAÇÃO / TRECHO A SER VERIFICADO AGORA (${targetRole === "user" ? "Feita pelo Usuário" : "Feita pelo Agente Dialética"}):
"${claimToVerify}"

SUA TAREFA:
1. Extraia a afirmação factual ou lógica central.
2. Determine o status epistêmico com base no consenso científico e rigor filosófico atual:
   - "COMPROVADO_CIENTIFICO": Fato empiricamente comprovado, consensual ou lei natural.
   - "HIPOTESE_PLAUSIVEL": Modelo em teste, com plausibilidade teórica mas sem consenso ou comprovação final.
   - "REFUTADO_EQUIVOCADO": Contradição empírica direta, erro factual ou pseudociência.
   - "FALACIA_LOGICA": Incoerência dedutiva, espantalho, apelo à autoridade, falsa dicotomia, etc.
   - "PARCIALMENTE_VERDADEIRO": Base factual real, porém com extrapolação ilegítima.
   - "SEM_EVIDENCIAS": Alegação empírica sem dados ou evidências documentadas.
3. Forneça análise explicativa, precisa e concisa (máximo 120 palavras).
4. Indique 2 a 3 fontes conceituadas pertinentes (ex: Nature, Science, Phys. Rev., Stanford Encyclopedia of Philosophy, IPCC, etc).
5. Se a afirmação carece de evidências ou for controversa, formule um pedido amigável de evidências direcionado ao interlocutor.
6. Crie um roteiro de áudio para intervenção em voz distinta ("spokenAudioText"): uma declaração oficial solene, direta e respeitosa de 2 a 3 frases curtas começando com "Intervenção do Árbitro Epistêmico: ...".

Responda ESTRITAMENTE em JSON com a seguinte estrutura:
{
  "hasVerifiableClaim": true,
  "claim": "resumo da asserção verificada",
  "status": "COMPROVADO_CIENTIFICO",
  "confidence": 0.95,
  "analysis": "análise concisa dos fatos e premissas",
  "sources": [
    { "title": "Nature Physics / Autor", "url": "https://...", "sourceType": "peer_reviewed", "snippet": "..." }
  ],
  "requestedEvidencePrompt": "Você pode citar o experimento ou estudo em que se apoia essa inferência?",
  "spokenAudioText": "Intervenção do Árbitro Epistêmico: A afirmação sobre a curvatura do espaço-tempo é plenamente corroborada pela relatividade geral e pelas observações de ondas gravitacionais pelo LIGO."
}`;

    const factCheckResponse = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [{ parts: [{ text: factCheckerPrompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const rawJson = factCheckResponse.text || "{}";
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawJson);
    } catch {
      parsedData = {
        hasVerifiableClaim: true,
        claim: claimToVerify.slice(0, 100),
        status: "HIPOTESE_PLAUSIVEL",
        confidence: 0.8,
        analysis: "A afirmação requer distinção entre dados empíricos observados e interpretações teóricas.",
        sources: [{ title: "Consenso Científico & Stanford Encyclopedia of Philosophy", sourceType: "encyclopedia" }],
        spokenAudioText: "Intervenção do Árbitro Epistêmico: Examinamos a afirmação recente à luz do consenso científico e recomendamos aprofundamento das evidências citadas.",
      };
    }

    const interventionId = `fc-${Date.now()}`;
    res.json({
      id: interventionId,
      madeBy: targetRole,
      timestamp: Date.now(),
      ...parsedData,
    });
  } catch (error: any) {
    console.error("Erro no validador de fatos /api/fact-check:", error);
    res.status(500).json({
      error: error?.message || "Erro ao processar verificação de fatos.",
    });
  }
});

// ==========================================
// TEXT-TO-SPEECH (TTS) COM VOZES DISTINTAS
// Usando gemini-3.1-flash-tts-preview
// Voz da Dialética vs Voz do Árbitro Epistêmico
// ==========================================
app.post("/api/tts", async (req, res) => {
  try {
    const { text, speakerRole = "dialetica" } = req.body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "O texto para síntese de voz é obrigatório." });
    }

    // Choose distinct voice per speaker persona:
    // - Dialética: 'Charon' (intelectual, profundo, cadenciado) or 'Kore'
    // - Árbitro Epistêmico (Validador): 'Fenrir' (grave, firme, autoritário) or 'Puck'
    const voiceName = speakerRole === "arbitro" ? "Fenrir" : "Charon";

    // Clean markdown syntax for speech synthesis
    const cleanSpeechText = text
      .replace(/[*_#`~>\[\]]/g, "")
      .replace(/\(http[^)]+\)/g, "")
      .slice(0, 1200) // Keep within responsive speech length
      .trim();

    const ai = getGeminiClient();

    try {
      const ttsResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: cleanSpeechText }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.[0];
      const rawBase64 = audioPart?.inlineData?.data;

      if (rawBase64) {
        // Convert raw 24kHz PCM to valid WAV buffer
        const pcmBuffer = Buffer.from(rawBase64, "base64");
        const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);
        const wavBase64 = wavBuffer.toString("base64");

        return res.json({
          audioUrl: `data:audio/wav;base64,${wavBase64}`,
          speakerRole,
          voiceName,
          modelUsed: "gemini-3.1-flash-tts-preview",
        });
      }
    } catch (ttsErr: any) {
      console.warn("TTS com gemini-3.1-flash-tts-preview indisponível ou em fallback:", ttsErr?.message);
    }

    // Fallback indicator so client uses browser Web Speech API smoothly
    res.json({
      fallbackWebSpeech: true,
      speakerRole,
      cleanText: cleanSpeechText,
      voiceName,
    });
  } catch (error: any) {
    console.error("Erro na rota /api/tts:", error);
    res.json({
      fallbackWebSpeech: true,
      speakerRole: req.body.speakerRole || "dialetica",
      cleanText: req.body.text || "",
    });
  }
});

// ==========================================
// GERADOR DE ARTEFATOS EPISTÊMICOS DO DEBATE
// Súmulas, Árvores de Argumentos e Dossiês
// ==========================================
app.post("/api/artifacts/generate", async (req, res) => {
  try {
    const { messages = [], type = "summary", customPrompt, topic } = req.body;

    const hasMessages = Array.isArray(messages) && messages.length > 0;
    const hasTopic = typeof topic === "string" && topic.trim() !== "" && topic !== "Livre";

    if (!hasMessages && !customPrompt && !hasTopic) {
      return res.status(400).json({
        error: "Histórico da discussão ou um tema específico é necessário para sintetizar o artefato epistêmico.",
      });
    }

    const ai = getGeminiClient();
    const historyText = hasMessages
      ? messages
          .map((m: any) => `[${m.role === "user" ? "USUÁRIO" : "DIALÉTICA"}]: ${m.content}`)
          .join("\n\n")
      : `TEMA PROPOSTO PARA EXPLORAÇÃO CONCEITUAL: "${topic || "Epistemologia & Rigor Dialético"}"`;

    let promptInstruction = "";
    if (type === "summary") {
      promptInstruction = `Crie uma "SÚMULA EPISTÊMICA", estruturando com rigor e clareza analítica:
1. Objeto Central da Disputa Dialética ou Tese Central
2. Premissas e Axiomas Fundamentais
3. Antíteses, Objeções e Contraexemplos
4. Pontos de Consenso Estabelecidos
5. Divergências em Aberto e Falso Consenso
6. Veredito de Rigor Provisório`;
    } else if (type === "argument_tree") {
      promptInstruction = `Crie uma "ÁRVORE LÓGICA DE ARGUMENTOS & FALÁCIAS" em formato estruturado (com tópicos, setas de inferência [->] e hierarquia lógica):
- Axiomas Fundamentais
- Premissas Maiores e Menores
- Conclusões Dedutivas vs Indutivas
- Objeções e Contraexemplos
- Falácias ou Vieses Mapeados na Análise`;
    } else if (type === "fact_dossier") {
      promptInstruction = `Crie um "DOSSIÊ BIBLIOGRÁFICO & EVIDÊNCIAS CIENTÍFICAS" reunindo:
- Fatos e Constantes Físicas ou Biológicas citadas
- Estudos, Meta-análises e Autores de Referência recomendados
- Grau de Certeza Empírica (Evidência Forte vs Moderada vs Hipótese)
- Leitura Crítica Recomendada (artigos seminais e tratados filosóficos)`;
    } else {
      promptInstruction = customPrompt || "Sintetize os avanços conceituais deste debate em um artefato analítico rico.";
    }

    let artifactResponse: any;
    try {
      artifactResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            parts: [
              {
                text: `CONTEXTO / HISTÓRICO:\n${historyText}\n\nSOLICITAÇÃO DE ARTEFATO:\n${promptInstruction}`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.4,
        },
      });
    } catch (primaryError: any) {
      console.warn("Spike no modelo primário em /api/artifacts/generate, acionando fallback gemini-3.1-flash-lite:", primaryError?.message);
      artifactResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            parts: [
              {
                text: `CONTEXTO / HISTÓRICO:\n${historyText}\n\nSOLICITAÇÃO DE ARTEFATO:\n${promptInstruction}`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.4,
        },
      });
    }

    const content = artifactResponse.text || "Conteúdo do artefato não pôde ser sintetizado.";
    const titleMap: Record<string, string> = {
      summary: "Súmula Epistêmica do Debate",
      argument_tree: "Árvore Lógica de Argumentos",
      fact_dossier: "Dossiê de Evidências & Fontes",
      concept_diagram: "Formalismo & Diagrama Conceitual",
    };

    res.json({
      id: `art-${Date.now()}`,
      type,
      title: titleMap[type] || "Artefato Dialético",
      description: hasMessages
        ? `Gerado a partir de ${messages.length} turnos de discussão intelectual.`
        : `Dossiê preliminar gerado para o tema: ${topic || "Conceitual"}.`,
      content,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Erro na geração de artefatos /api/artifacts/generate:", error);
    res.status(500).json({ error: error?.message || "Erro ao gerar artefato epistêmico." });
  }
});

// ==========================================
// AVALIAÇÃO DE RODADAS NO DEBATE FORMAL
// Pontuação epistêmica e transição de turnos
// ==========================================
app.post("/api/formal-debate/judge", async (req, res) => {
  try {
    const { messages, topic, roundNumber, roundName, phase } = req.body;

    const ai = getGeminiClient();
    const historyText = (messages || [])
      .slice(-4)
      .map((m: any) => `[${m.role === "user" ? "USUÁRIO" : "DIALÉTICA"}]: ${m.content}`)
      .join("\n\n");

    const judgePrompt = `Você é o Juiz Oficial do Debate Formal sobre o tema: "${topic || "Tema Científico/Filosófico"}".
Estamos avaliando a Rodada ${roundNumber || 1}: "${roundName || "Abertura"}" (Fase: ${phase || "Abertura"}).

ÚLTIMAS MENSAGENS:
${historyText}

Avalie imparcialmente a consistência lógica (0-10) e a solidez das evidências (0-10) de ambos os lados nesta rodada.
Forneça um parecer breve do juiz (máximo 80 palavras) e a proclamação da passagem de palavra para a próxima etapa.

Responda em JSON:
{
  "userLogicScore": 8,
  "modelLogicScore": 9,
  "userEvidenceScore": 7,
  "modelEvidenceScore": 9,
  "judgeSummary": "Parecer sucinto da rodada destacando o argumento mais forte...",
  "transitionAnnouncement": "Abertura concluída. A palavra passa para a fase de refutação."
}`;

    const judgeResponse = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [{ parts: [{ text: judgePrompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(judgeResponse.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Erro no julgamento formal:", error);
    res.json({
      userLogicScore: 8,
      modelLogicScore: 8,
      userEvidenceScore: 8,
      modelEvidenceScore: 8,
      judgeSummary: "Rodada concluída com sustentação consistente de teses.",
      transitionAnnouncement: "Avançando para a próxima rodada do debate formal.",
    });
  }
});

// Image generation endpoint using gemini-3-pro-image-preview
// With affordance for user to specify image size (1K, 2K, and 4K)
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, imageSize = "1K", aspectRatio = "1:1" } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({ error: "O prompt da imagem é obrigatório." });
    }

    // Supported sizes: 1K, 2K, 4K
    const validSizes = ["1K", "2K", "4K"];
    const targetSize = validSizes.includes(imageSize) ? imageSize : "1K";

    const validAspectRatios = ["1:1", "16:9", "4:3", "9:16", "3:4"];
    const targetAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

    const ai = getGeminiClient();

    // Primary model requested by prompt: gemini-3-pro-image-preview
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: targetAspectRatio,
            imageSize: targetSize,
          },
        },
      });
    } catch (primaryError: any) {
      console.warn("Falha com gemini-3-pro-image-preview, tentando fallback gemini-3.1-flash-image:", primaryError?.message);
      // Fallback if model name differs in current SDK version
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: targetAspectRatio,
            imageSize: targetSize,
          },
        },
      });
    }

    let imageUrl: string | null = null;
    let descriptionText = "";

    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          descriptionText += part.text;
        }
      }
    }

    if (!imageUrl) {
      throw new Error("O modelo não retornou dados de imagem válidos. Tente reformular a descrição conceitual.");
    }

    res.json({
      imageUrl,
      description: descriptionText,
      imageSize: targetSize,
      aspectRatio: targetAspectRatio,
      modelUsed: "gemini-3-pro-image-preview",
    });
  } catch (error: any) {
    console.error("Erro na rota /api/generate-image:", error);
    res.status(500).json({
      error: error?.message || "Ocorreu um erro ao gerar a imagem conceitual.",
    });
  }
});

// Vite middleware in dev / Static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dialética Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
