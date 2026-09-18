#!/usr/bin/env bash
# .agents/hooks/pre-turn-check.sh
# Hook de pré-execução para validar se o repositório está íntegro antes de novas edições

set -e

echo "🔍 [HOOK: PRE-TURN-CHECK] Verificando sanidade estática..."

# 1. Checagem de Linter TypeScript
npm run lint

# 2. Checagem de Testes Operacionais
npm run test:operational

echo "✅ [HOOK: PRE-TURN-CHECK] Sanidade confirmada. Pronto para modificações."
