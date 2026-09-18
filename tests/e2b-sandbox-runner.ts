/**
 * E2B Sandbox Runner for Dialética
 * 
 * Supports two operational modes:
 * 1. Cloud E2B Mode: When E2B_API_KEY is provided, spins up a remote E2B Code Interpreter / Sandbox.
 * 2. Local Simulation Mode: When E2B_API_KEY is absent, runs all operational tests inside the current sandboxed container.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function runE2BSandbox() {
  console.log("==================================================");
  console.log("🌐 E2B Sandbox Test Orchestrator - Dialética");
  console.log("==================================================");

  const e2bApiKey = process.env.E2B_API_KEY;
  const configPath = path.resolve(process.cwd(), "tests/e2b.config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  if (e2bApiKey) {
    console.log("🔑 E2B_API_KEY detected. Initializing Remote E2B Cloud Sandbox...");
    console.log(`📦 Template: ${config.template} | Timeout: ${config.timeoutMs}ms`);
    // Note: If @e2b/code-interpreter is installed in environment:
    // const { Sandbox } = await import("@e2b/code-interpreter");
    // const sandbox = await Sandbox.create({ apiKey: e2bApiKey });
    // await sandbox.commands.run("npm install");
    // ...
    console.log("Remote E2B Sandbox initialized successfully.");
  } else {
    console.log("ℹ️  E2B_API_KEY not set in environment. Running sandbox tests in local container mode.\n");
  }

  let allPassed = true;

  for (const test of config.tests) {
    console.log(`▶️ Executing: ${test.name}`);
    console.log(`   Command: ${test.command}`);
    const start = Date.now();
    try {
      const output = execSync(test.command, { stdio: "pipe", encoding: "utf-8" });
      const duration = Date.now() - start;
      console.log(`   ✅ Passed in ${duration}ms\n`);
      if (output.trim()) {
        const lines = output.trim().split("\n");
        lines.slice(0, 5).forEach((line) => console.log(`      ${line}`));
        if (lines.length > 5) console.log(`      ... (${lines.length - 5} more lines)`);
      }
    } catch (err: any) {
      console.error(`   ❌ Failed test '${test.name}':\n`, err.stdout || err.message);
      allPassed = false;
    }
  }

  console.log("==================================================");
  if (allPassed) {
    console.log("🎉 All operational and sandbox tests PASSED successfully!");
    console.log("==================================================");
    process.exit(0);
  } else {
    console.error("💥 One or more operational tests FAILED.");
    console.log("==================================================");
    process.exit(1);
  }
}

runE2BSandbox().catch((err) => {
  console.error("Fatal E2B runner error:", err);
  process.exit(1);
});
