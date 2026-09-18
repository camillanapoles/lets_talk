import { DebateRole, DebateTopic, ModelOption } from "../types";

export const GEMINI_MODELS: ModelOption[] = [
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    badge: "Profundo & Complexo",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    description: "Raciocínio epistêmico avançado para tarefas particularmente complexas, ontologia e deduções formais.",
    useCase: "Debates complexos, paradoxos, física teórica e análise lógica profunda.",
    recommendedFor: "complex",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    badge: "Padrão Geral",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    description: "Equilíbrio supremo entre velocidade, rigor empírico e síntese dialética para tarefas gerais.",
    useCase: "Discussões científicas gerais, revisões de evidências e diálogo filosófico fluido.",
    recommendedFor: "general",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    badge: "Ultra Rápido",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    description: "Latência ultra-baixa para respostas ágeis, testes rápidos de hipóteses e réplicas imediatas.",
    useCase: "Perguntas pontuais, verificação rápida de falácias e trocas rápidas.",
    recommendedFor: "fast",
  },
];

export const DEBATE_ROLES: DebateRole[] = [
  {
    id: "socratic_dialectic",
    title: "Dialética Socrática & Epistemologia",
    shortTitle: "Socrático & Epistêmico",
    description: "Desconstrói premissas ocultas, investiga axiomas e expõe falácias lógicas com rigor maiêutico.",
    iconName: "HelpCircle",
    epistemicFocus: "Karl Popper, Falsificabilidade, Axiomática & Validade Lógica",
    defaultModel: "gemini-3.1-pro-preview",
  },
  {
    id: "empirical_rigor",
    title: "Consenso Científico & Evidências",
    shortTitle: "Consenso & Empiria",
    description: "Focado em estudos revisados por pares, meta-análises estatísticas e evidências empíricas concretas.",
    iconName: "Microscope",
    epistemicFocus: "Meta-análises, Graus de Evidência, Teorema de Bayes & Metodologia",
    defaultModel: "gemini-3.8-flash",
  },
  {
    id: "first_principles",
    title: "Primeiros Princípios & Física",
    shortTitle: "Primeiros Princípios",
    description: "Reduz o problema até as leis fundamentais da termodinâmica, física quântica e matemática.",
    iconName: "Atom",
    epistemicFocus: "Termodinâmica, Entropia, Mecânica Quântica & Reducionismo",
    defaultModel: "gemini-3.1-pro-preview",
  },
  {
    id: "neuro_consciousness",
    title: "Mente, Consciência & Neurociência",
    shortTitle: "Consciência & Mente",
    description: "Examina o 'Hard Problem' da consciência, fisicalismo vs panpsiquismo, conectômica e IA.",
    iconName: "Brain",
    epistemicFocus: "Teoria da Informação Integrada, Espaço Global de Trabalho & Qualia",
    defaultModel: "gemini-3.8-flash",
  },
  {
    id: "adaptive_debate",
    title: "Debate Dinâmico & Síntese Dialética",
    shortTitle: "Debate Adaptativo",
    description: "Adapta o tom à linguagem do usuário (coloquial ou erudita) sem abrir mão do rigor de fatos.",
    iconName: "Sparkles",
    epistemicFocus: "Espelhamento Comunicativo, Síntese Hegeliana & Fatos Verificados",
    defaultModel: "gemini-3.8-flash",
  },
];

export const DEBATE_STARTERS: DebateTopic[] = [
  {
    id: "consciousness-emergence",
    title: "A Consciência e o Fisicalismo",
    category: "Filosofia da Mente",
    prompt: "A consciência pode ser explicada puramente como uma propriedade emergente da computação neural ou o 'problema difícil' (Hard Problem) de David Chalmers aponta para uma lacuna ontológica irredutível?",
    roleId: "neuro_consciousness",
    modelId: "gemini-3.1-pro-preview",
  },
  {
    id: "free-will-determinism",
    title: "O Livre-Arbítrio Diante da Física",
    category: "Física Teórica",
    prompt: "Considerando o determinismo laplaciano e o indeterminismo probabilístico da mecânica quântica, o livre-arbítrio é logicamente sustentável ou é uma ilusão cognitiva gerada pela evolução?",
    roleId: "first_principles",
    modelId: "gemini-3.1-pro-preview",
  },
  {
    id: "quantum-interpretations",
    title: "Muitos Mundos vs Colapso de Copenhague",
    category: "Física Teórica",
    prompt: "Qual interpretação da mecânica quântica possui maior parcimônia ontológica (Navalha de Occam): a Interpretação de Muitos Mundos de Everett (sem colapso) ou a de Copenhague com o postulado de medição?",
    roleId: "first_principles",
    modelId: "gemini-3.1-pro-preview",
  },
  {
    id: "fermi-bayes",
    title: "O Paradoxo de Fermi & O Grande Filtro",
    category: "Cosmologia",
    prompt: "Sob a análise bayesiana, a ausência de assinaturas tecnológicas observáveis no universo observável torna mais provável que o Grande Filtro esteja atrás de nós (origem da vida) ou à nossa frente (autodestruição/IA)?",
    roleId: "empirical_rigor",
    modelId: "gemini-3.8-flash",
  },
  {
    id: "hume-guillotine",
    title: "A Guilhotina de Hume e a Moral",
    category: "Ética & Sociedade",
    prompt: "Podemos derivar um 'deve ser' (normativo) a partir de um 'é' (descritivo e factual), como propõem certas abordagens do naturalismo moral, ou a guilhotina de Hume e a falácia naturalista de Moore continuam intransponíveis?",
    roleId: "socratic_dialectic",
    modelId: "gemini-3.1-pro-preview",
  },
  {
    id: "math-discovery-invention",
    title: "A Matemática: Descoberta ou Invenção?",
    category: "Epistemologia & Lógica",
    prompt: "A 'irracional eficácia da matemática nas ciências naturais' (Eugene Wigner) indica que as estruturas matemáticas têm existência ontológica independente (Platonismo) ou são constructos conceituais moldados pelo nosso aparato sensório-motor?",
    roleId: "socratic_dialectic",
    modelId: "gemini-3.1-pro-preview",
  },
];

export const IMAGE_SIZE_OPTIONS: { size: "1K" | "2K" | "4K"; label: string; resolution: string; desc: string }[] = [
  {
    size: "1K",
    label: "1K Padrão",
    resolution: "1024 × 1024",
    desc: "Geração rápida ideal para diagramas de conceitos e esquemas mentais.",
  },
  {
    size: "2K",
    label: "2K Alta Resolução",
    resolution: "2048 × 2048",
    desc: "Maior nitidez para esquemas científicos detalhados e fórmulas visuais.",
  },
  {
    size: "4K",
    label: "4K Ultra-HD",
    resolution: "4096 × 4096",
    desc: "Máxima fidelidade visual para mapas conceituais complexos e modelos cosmológicos.",
  },
];

export const IMAGE_PROMPT_PRESETS = [
  {
    title: "Gato de Schrödinger & Superposição Quântica",
    prompt: "Esquema científico conceitual e elegante do experimento mental do Gato de Schrödinger: caixa isolada contendo um átomo radioativo, frasco de veneno e detector quântico. Visualização da função de onda simultânea viva/morta em estilo de infográfico acadêmico de alta precisão, linhas limpas sobre fundo escuro.",
  },
  {
    title: "Horizonte de Eventos de Buraco Negro",
    prompt: "Representação científica fidedigna de um Buraco Negro de Kerr em rotação, mostrando o horizonte de eventos, ergosfera, disco de acreção brilhante com efeito Doppler relativístico e curvatura extrema do espaço-tempo com lentes gravitacionais.",
  },
  {
    title: "O Mito da Caverna de Platão & Simulação",
    prompt: "Representação filosófica conceitual da Alegoria da Caverna de Platão fundida com física moderna e hipótese da simulação: prisioneiros observando sombras holográficas projetadas em uma tela geométrica, enquanto acima a luz solar representa a verdade ontológica fundamental.",
  },
  {
    title: "O Demônio de Maxwell & Entropia da Informação",
    prompt: "Diagrama físico detalhado do paradoxo do Demônio de Maxwell: duas câmaras de gás separadas por uma comporta microscopicamente controlada por uma entidade que mede a velocidade molecular, ilustrando o Princípio de Landauer e a termodinâmica da informação.",
  },
  {
    title: "Conectoma Cerebral Humano & Redes Neurais",
    prompt: "Visualização científica comparativa entre a microarquitetura do conectoma do córtex pré-frontal humano e os grafos de atenção de uma rede neural artificial de transformadores, com sinapses brilhantes e vetores de ativação em estilo cibernético sofisticado.",
  },
];
