#!/usr/bin/env bash
# .agents/hooks/post-edit-verify.sh
# Hook de pós-edição: valida linter, testes operacionais e compilação de produção

set -e

echo "🚀 [HOOK: POST-EDIT-VERIFY] Executando validação completa pós-alteração..."

# 1. Lint
echo "▶️  Executando verificação de tipos..."
npm run lint

# 2. Testes Operacionais
echo "▶️  Executando bateria de testes operacionais..."
npm run test:operational

# 3. Build de Produção
echo "▶️  Compilando bundle de produção (Vite + esbuild CJS)..."
npm run build

echo "🎉 [HOOK: POST-EDIT-VERIFY] Todas as verificações foram concluídas com sucesso!"
