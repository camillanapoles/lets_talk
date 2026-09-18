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
 * Persist the entire array of sessions
 */
export function persistSessions(sessions: DebateSession[]): void {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error("Erro ao salvar sessões de debate no localStorage:", err);
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
