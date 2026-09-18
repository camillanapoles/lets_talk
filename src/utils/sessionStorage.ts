import { DebateSession, Message, DebateMode, FormalDebateState, ModelId, DebateRole, Artifact } from "../types";

const SESSIONS_STORAGE_KEY = "dialetica_saved_sessions";
const ACTIVE_SESSION_ID_KEY = "dialetica_current_session_id";

/**
 * Load all saved debate sessions from localStorage
 */
export function loadSavedSessions(): DebateSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  } catch (err) {
    console.error("Erro ao carregar sessões de debate do localStorage:", err);
  }
  return [];
}

/**
 * Persist the entire array of sessions with QuotaExceededError protection
 */
export function persistSessions(sessions: DebateSession[]): boolean {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    return true;
  } catch (err: any) {
    console.warn("Falha no armazenamento local direto, ativando mitigação de cota:", err?.name);
    // If QuotaExceededError, safely purge old image base64 payloads to save megabytes
    if (err?.name === "QuotaExceededError" || err?.message?.includes("quota")) {
      try {
        const lightweightSessions = sessions.map((s, idx) => {
          // Keep images for the 2 most recent sessions, strip heavy base64 from older ones
          if (idx < 2) return s;
          return {
            ...s,
            messages: s.messages.map((m) => {
              if (m.attachedImage && m.attachedImage.url && m.attachedImage.url.startsWith("data:image")) {
                return {
                  ...m,
                  attachedImage: {
                    ...m.attachedImage,
                    url: "", // Strip bulky base64, preserve metadata and prompt
                  },
                };
              }
              return m;
            }),
          };
        });
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(lightweightSessions));
        return true;
      } catch (retryErr) {
        console.error("Falha irrecuperável de cota de armazenamento:", retryErr);
      }
    }
    return false;
  }
}

/**
 * Save or update a debate session
 */
export function saveDebateSession(session: DebateSession): DebateSession[] {
  const existing = loadSavedSessions();
  const index = existing.findIndex((s) => s.id === session.id);

  let updatedList: DebateSession[];
  const now = Date.now();
  const sessionToSave: DebateSession = {
    ...session,
    updatedAt: now,
  };

  if (index >= 0) {
    updatedList = [...existing];
    updatedList[index] = sessionToSave;
  } else {
    updatedList = [sessionToSave, ...existing];
  }

  persistSessions(updatedList);
  setActiveSessionId(sessionToSave.id);
  return updatedList;
}

/**
 * Delete a debate session by ID
 */
export function deleteDebateSession(id: string): DebateSession[] {
  const existing = loadSavedSessions();
  const updatedList = existing.filter((s) => s.id !== id);
  persistSessions(updatedList);

  if (getActiveSessionId() === id) {
    setActiveSessionId(null);
  }
  return updatedList;
}

/**
 * Rename a debate session
 */
export function renameDebateSession(id: string, newTitle: string): DebateSession[] {
  const existing = loadSavedSessions();
  const updatedList = existing.map((s) => {
    if (s.id === id) {
      return {
        ...s,
        title: newTitle.trim() || s.title,
        updatedAt: Date.now(),
      };
    }
    return s;
  });
  persistSessions(updatedList);
  return updatedList;
}

/**
 * Get active session ID
 */
export function getActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Set active session ID
 */
export function setActiveSessionId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
    }
  } catch (err) {
    console.error("Erro ao definir ID de sessão ativa:", err);
  }
}

/**
 * Generate a smart default title based on debate content
 */
export function generateSmartSessionTitle(
  messages: Message[],
  formalState: FormalDebateState,
  debateMode: DebateMode
): string {
  if (debateMode === "formal" && formalState.topic && formalState.topic.trim()) {
    const topic = formalState.topic.trim();
    return topic.length > 55 ? topic.slice(0, 52) + "..." : topic;
  }

  const firstUserMsg = messages.find((m) => m.role === "user" && m.content.trim());
  if (firstUserMsg) {
    const clean = firstUserMsg.content
      .replace(/^\[.*?\]\s*/g, "") // remove attachments tags
      .replace(/\n+/g, " ")
      .trim();
    if (clean.length > 0) {
      return clean.length > 55 ? clean.slice(0, 52) + "..." : clean;
    }
  }

  return `Debate Dialético #${new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/**
 * Export sessions to JSON string
 */
export function exportSessionsToJSON(): string {
  const sessions = loadSavedSessions();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "Dialética - Debate Científico & Filosófico",
      version: "2.0.0",
      sessions,
    },
    null,
    2
  );
}

/**
 * Import sessions from JSON string
 */
export function importSessionsFromJSON(jsonString: string): {
  success: boolean;
  count: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    const sessionsToImport: DebateSession[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.sessions)
      ? parsed.sessions
      : null;

    if (!sessionsToImport) {
      return { success: false, count: 0, error: "Formato de arquivo JSON inválido." };
    }

    const currentSessions = loadSavedSessions();
    const existingIds = new Set(currentSessions.map((s) => s.id));

    let importedCount = 0;
    const merged = [...currentSessions];

    for (const session of sessionsToImport) {
      if (session && session.title && Array.isArray(session.messages)) {
        if (existingIds.has(session.id)) {
          // If collision, give new unique ID
          session.id = `deb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        }
        merged.push(session);
        existingIds.add(session.id);
        importedCount++;
      }
    }

    persistSessions(merged.sort((a, b) => b.updatedAt - a.updatedAt));
    return { success: true, count: importedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || "Erro ao ler JSON." };
  }
}

/**
 * Export a session to a formatted academic/scientific Markdown transcript
 */
export function exportSessionToMarkdown(session: DebateSession): string {
  const dateStr = new Date(session.updatedAt || session.createdAt).toLocaleString("pt-BR");
  let md = `# Transcrição Dialética: ${session.title}\n\n`;
  md += `**Data:** ${dateStr}  \n`;
  md += `**Modo de Debate:** ${session.debateMode === "formal" ? "Debate Formal Estruturado" : "Debate Aberto Livre"}  \n`;
  md += `**Papel Dialético:** ${session.selectedRole?.title || "Dialética & Epistemologia"}  \n`;
  md += `**Modelo Utilizado:** ${session.selectedModel || "gemini-3.8-flash"}  \n\n`;
  md += `---\n\n`;

  session.messages.forEach((msg, index) => {
    const isModel = msg.role === "model";
    const speaker = isModel ? "DIALÉTICA" : "USUÁRIO";
    const time = new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    md += `### ${index + 1}. ${speaker} (${time})\n\n`;
    md += `${msg.content}\n\n`;

    if (msg.factChecks && msg.factChecks.length > 0) {
      md += `> **⚖️ Intervenção do Árbitro Epistêmico**  \n`;
      msg.factChecks.forEach((fc) => {
        md += `> - **Asserção Avaliada:** *${fc.claim}*  \n`;
        md += `> - **Status:** \`${fc.status}\` (Confiança: ${Math.round(fc.confidence * 100)}%)  \n`;
        md += `> - **Análise:** ${fc.analysis}  \n`;
        if (fc.sources && fc.sources.length > 0) {
          md += `> - **Fontes Citadas:** ${fc.sources.map((s) => s.title).join(", ")}  \n`;
        }
      });
      md += `\n`;
    }

    if (msg.attachedImage && msg.attachedImage.prompt) {
      md += `> **🖼️ Diagrama Conceitual Gerado:** ${msg.attachedImage.prompt} (${msg.attachedImage.imageSize || "1K"})\n\n`;
    }

    md += `---\n\n`;
  });

  return md;
}

/**
 * Diagnostic test to verify integrity of localStorage access and quota
 */
export function verifyStorageIntegrity(): {
  isAvailable: boolean;
  quotaUsable: boolean;
  activeSessionsCount: number;
  estimatedBytesUsed: number;
  error?: string;
} {
  try {
    const testKey = `dialetica_test_${Date.now()}`;
    localStorage.setItem(testKey, "validity_check");
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    if (retrieved !== "validity_check") {
      return { isAvailable: false, quotaUsable: false, activeSessionsCount: 0, estimatedBytesUsed: 0, error: "Falha de leitura/escrita." };
    }

    const sessions = loadSavedSessions();
    const rawData = localStorage.getItem(SESSIONS_STORAGE_KEY) || "";
    return {
      isAvailable: true,
      quotaUsable: true,
      activeSessionsCount: sessions.length,
      estimatedBytesUsed: rawData.length * 2, // UTF-16 approx bytes
    };
  } catch (err: any) {
    return {
      isAvailable: false,
      quotaUsable: false,
      activeSessionsCount: 0,
      estimatedBytesUsed: 0,
      error: err?.message || "localStorage indisponível.",
    };
  }
}
