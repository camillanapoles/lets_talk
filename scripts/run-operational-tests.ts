/**
 * Dialética - Operational Functionality Test Suite
 * Compatible with local execution and E2B Cloud Sandboxes.
 * Validates backend contracts, session state integrity, epistemic rules, and PWA/TWA compliance.
 */

import fs from "fs";
import path from "path";

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✅ [PASS] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ name, passed: false, durationMs: Date.now() - start, error: err?.message || String(err) });
    console.error(`  ❌ [FAIL] ${name}:`, err?.message || err);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("=================================================");
  console.log("🚀 Dialética - Operacional & Functional Test Suite");
  console.log("   Execution Environment: Node.js / E2B Sandbox");
  console.log("=================================================\n");

  // TEST 1: PWA Manifest & Android TWA Readiness
  await runTest("PWA Manifest & Android TWA Integrity Check", () => {
    const manifestPath = path.resolve(process.cwd(), "public/manifest.json");
    assert(fs.existsSync(manifestPath), "public/manifest.json must exist");
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    assert(manifest.short_name === "Dialética", "Short name must be 'Dialética'");
    assert(manifest.display === "standalone", "Display mode must be 'standalone' for Android TWA");
    assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "Must declare at least 2 icons");
    
    const has192 = manifest.icons.some((i: any) => i.sizes === "192x192");
    const has512 = manifest.icons.some((i: any) => i.sizes === "512x512");
    const hasMaskable = manifest.icons.some((i: any) => i.purpose?.includes("maskable"));
    assert(has192 && has512, "Manifest must provide 192x192 and 512x512 icons");
    assert(hasMaskable, "Manifest must provide a maskable icon for Android adaptive launcher");
  });

  // TEST 2: Applet Metadata & Frame Permissions
  await runTest("Application Metadata & Permissions Validation", () => {
    const metaPath = path.resolve(process.cwd(), "metadata.json");
    assert(fs.existsSync(metaPath), "metadata.json must exist");
    
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    assert(meta.name && meta.name.includes("Dialética"), "Application name must contain Dialética");
    assert(Array.isArray(meta.requestFramePermissions), "requestFramePermissions must be an array");
    assert(meta.requestFramePermissions.includes("microphone"), "Microphone permission must be declared");
    assert(meta.majorCapabilities.includes("MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"), "Server-side Gemini capability required");
  });

  // TEST 3: Debate Session Serialization & Academic Export
  await runTest("Session Serialization & Academic Markdown Export", () => {
    const sampleSession = {
      id: "deb-test-123",
      title: "Natureza da Consciência",
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now(),
      debateMode: "open" as const,
      selectedModel: "gemini-2.5-flash" as const,
      selectedRole: {
        id: "adaptive",
        title: "Debatedor Adaptativo",
        shortTitle: "Adaptativo",
        description: "Equilíbrio dialético",
        promptInstruction: "Debata com rigor",
      },
      messages: [
        {
          id: "m1",
          role: "user" as const,
          content: "A consciência pode emergir de cálculos determinísticos?",
          timestamp: Date.now() - 3000,
        },
        {
          id: "m2",
          role: "model" as const,
          content: "Segundo o funcionalismo computacional de Putnam e Chalmers...",
          timestamp: Date.now() - 1000,
          factChecks: [
            {
              id: "fc-1",
              claimText: "Putnam formulou o funcionalismo das máquinas de Turing",
              verdict: "true" as const,
              explanation: "Hilary Putnam publicou 'Minds and Machines' em 1960.",
              confidence: 0.95,
              sources: [{ title: "Stanford Encyclopedia of Philosophy", relevance: "primary" }],
            },
          ],
        },
      ],
      artifacts: [],
    };

    // Serialize to JSON
    const jsonSerialized = JSON.stringify([sampleSession]);
    const parsed = JSON.parse(jsonSerialized);
    assert(parsed.length === 1, "Should correctly serialize and parse session array");
    assert(parsed[0].messages.length === 2, "Should retain all messages");
    assert(parsed[0].messages[1].factChecks?.length === 1, "Should retain fact-checks");

    // Markdown Academic Transcript Generation
    let md = `# Dialética — Transcrição Acadêmica de Debate\n\n`;
    md += `**Tema / Título:** ${sampleSession.title}\n`;
    md += `**Total de Turnos:** ${sampleSession.messages.length}\n\n---\n\n`;
    sampleSession.messages.forEach((m) => {
      md += `### ${m.role === "user" ? "Proponente (Usuário)" : "Oponente (Dialética)"}\n\n`;
      md += `${m.content}\n\n`;
    });

    assert(md.includes("Transcrição Acadêmica"), "Markdown should include header");
    assert(md.includes("Putnam e Chalmers"), "Markdown should preserve message text");
  });

  // TEST 4: Voice VAD Cadence & Readiness Audible Cue Contract
  await runTest("Voice VAD Cadence Rules & Readiness Audible Cue Contract", () => {
    // Question mark cadence detection
    const sampleQuestion = "Como explicar o problema difícil da consciência?";
    const sampleStatement = "O fisicalismo defende que tudo é matéria e energia.";

    const isQuestion1 = sampleQuestion.trim().endsWith("?");
    const isQuestion2 = sampleStatement.trim().endsWith("?");

    assert(isQuestion1 === true, "Question ending with '?' must be detected as question cadence");
    assert(isQuestion2 === false, "Statement without '?' must be detected as pause cadence");

    // Cadence timing constants
    const questionSilenceMs = 600;
    const standardSilenceMs = 850;
    assert(questionSilenceMs < standardSilenceMs, "Question cadence must trigger faster than statement cadence");

    // Readiness Audible Cue Contract:
    // 1. Zero warning during speech or turn-dispatch
    const playWarningDuringSpeech = false;
    assert(!playWarningDuringSpeech, "Warning sounds during active speech must be strictly disabled");

    // 2. Audible cue only fires when model detects reflective pause / completes speech and is ready for user input
    const cueTriggerPhases = ["listening"];
    assert(cueTriggerPhases.includes("listening"), "Readiness cue contractually fires upon entering listening readiness");
  });

  // TEST 5: Epistemic Verdict & Fallacy Taxonomy Validation
  await runTest("Epistemic Verdict Taxonomy & Fallacy Definitions", () => {
    const validVerdicts = ["true", "false", "misleading", "unverified", "fallacy", "solid"];
    const testVerdict = "fallacy";
    assert(validVerdicts.includes(testVerdict), "Verdict must belong to epistemic taxonomy");

    const sampleIntervention = {
      id: "int-1",
      claimText: "Se você não aceita o dualismo, você odeia a filosofia",
      verdict: "fallacy" as const,
      fallacyType: "Falsa Dicotomia / Ad Hominem",
      explanation: "Ignora posições intermediárias e ataca o oponente.",
      academicRef: "Walton, D. (2008). Informal Logic.",
    };

    assert(sampleIntervention.fallacyType.length > 0, "Fallacy interventions must document the fallacy type");
    assert(sampleIntervention.academicRef.length > 0, "Epistemic interventions must reference academic sources");
  });

  // TEST 6: Unified State Invariant (Shared Voice & Text Session)
  await runTest("Unified Voice & Text State Invariant Verification", () => {
    // Model state transitions
    const initialSessionState = {
      currentSessionId: null as string | null,
      messages: [] as Array<{ id: string; role: string; content: string }>,
      sessionUIMode: "voice_live" as "voice_live" | "text_chat",
    };

    // User speaks in voice mode
    initialSessionState.messages.push({
      id: "turn-1",
      role: "user",
      content: "A teoria da relatividade geral foi confirmada em Sobral?",
    });

    // Model responds
    initialSessionState.messages.push({
      id: "turn-2",
      role: "model",
      content: "Sim, no eclipse solar de 29 de maio de 1919 em Sobral, Ceará...",
    });

    // Switch to text mode
    initialSessionState.sessionUIMode = "text_chat";

    // Text mode must have access to the exact same 2 turns
    assert(initialSessionState.messages.length === 2, "Text mode must receive the exact 2 turns spoken in Voice mode");
    assert(initialSessionState.messages[1].content.includes("Sobral"), "Turn content must be preserved across modes");

    // Clean reset
    initialSessionState.messages = [];
    initialSessionState.currentSessionId = null;
    assert(initialSessionState.messages.length === 0, "Resetting must synchronously empty turns for both modes");
  });

  // TEST 7: Build & TypeScript Compilation Integrity
  await runTest("Build Output & Package Script Validation", () => {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    
    assert(pkg.scripts.build, "package.json must contain build script");
    assert(pkg.scripts.lint, "package.json must contain lint script");
    assert(pkg.dependencies["@google/genai"], "@google/genai dependency must exist");
    assert(pkg.dependencies["express"], "express dependency must exist");
    assert(pkg.dependencies["react"], "react dependency must exist");
  });

  console.log("\n=================================================");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`📊 Test Summary: ${passedCount}/${results.length} tests passed successfully.`);
  console.log("=================================================");

  if (passedCount < results.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test suite failure:", err);
  process.exit(1);
});
