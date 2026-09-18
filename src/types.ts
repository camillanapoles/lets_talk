export type ModelId = "gemini-3.1-pro-preview" | "gemini-3.8-flash" | "gemini-3.5-flash" | "gemini-3.1-flash-lite";

export type ImageSize = "1K" | "2K" | "4K";

export type DebateMode = "formal" | "open";

export type SessionUIMode = "voice_live" | "text_chat";

export type FactCheckStatus =
  | "COMPROVADO_CIENTIFICO"
  | "HIPOTESE_PLAUSIVEL"
  | "REFUTADO_EQUIVOCADO"
  | "FALACIA_LOGICA"
  | "PARCIALMENTE_VERDADEIRO"
  | "SEM_EVIDENCIAS";

export interface FactCheckSource {
  title: string;
  url?: string;
  sourceType: "peer_reviewed" | "encyclopedia" | "consensual_data" | "scientific_body";
  snippet?: string;
}

export interface FactCheckIntervention {
  id: string;
  claim: string;
  madeBy: "user" | "model";
  status: FactCheckStatus;
  confidence: number;
  analysis: string;
  sources: FactCheckSource[];
  requestedEvidencePrompt?: string;
  spokenAudioText?: string;
  audioBase64?: string;
  timestamp: number;
  readByVoice?: boolean;
}

export interface FormalRoundConfig {
  roundNumber: number;
  name: string;
  description: string;
  speaker: "user" | "model";
  durationSeconds: number;
  phase: "opening" | "rebuttal" | "counter_rebuttal" | "synthesis";
}

export interface FormalDebateState {
  isActive: boolean;
  topic: string;
  currentRoundIndex: number;
  rounds: FormalRoundConfig[];
  timeRemainingSeconds: number;
  isTimerRunning: boolean;
  score: {
    userLogicScore: number;
    modelLogicScore: number;
    userEvidenceScore: number;
    modelEvidenceScore: number;
  };
  concluded: boolean;
  finalVerdict?: string;
}

export interface Artifact {
  id: string;
  type: "summary" | "argument_tree" | "fact_dossier" | "concept_diagram";
  title: string;
  description: string;
  content: string;
  timestamp: number;
  data?: any;
}

export interface DebateSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  debateMode: DebateMode;
  formalState: FormalDebateState;
  selectedModel: ModelId;
  selectedRole: DebateRole;
  artifacts: Artifact[];
  summarySnippet?: string;
  customTopic?: string;
}

export interface ModelOption {
  id: ModelId;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  useCase: string;
  recommendedFor: "complex" | "general" | "fast";
}

export interface DebateRole {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  iconName: string;
  epistemicFocus: string;
  defaultModel: ModelId;
}

export interface DebateTopic {
  id: string;
  title: string;
  category: "Filosofia da Mente" | "Física Teórica" | "Epistemologia & Lógica" | "Ética & Sociedade" | "Cosmologia";
  prompt: string;
  roleId: string;
  modelId: ModelId;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  imageSize: ImageSize;
  aspectRatio: string;
  timestamp: number;
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  modelUsed?: ModelId;
  roleUsed?: string;
  attachedImage?: GeneratedImage;
  isStreaming?: boolean;
  audioBase64?: string;
  factChecks?: FactCheckIntervention[];
  isFactChecking?: boolean;
}
