---
name: debate-session-persistence
description: Especificação técnica da sincronização de sessões, persistência híbrida, auto-salvamento e exportação acadêmica.
---

# Debate Session Persistence Skill

Esta habilidade detalha como o **Dialética** gerencia o estado unificado das sessões entre Voz e Texto.

## 1. Unificação Obrigatória de Estado
- Não existem coleções de mensagens separadas para Voz e Texto. Ambas as interfaces consomem e alimentam o mesmo array `messages: Message[]` em `src/App.tsx`.
- Quando um novo turno é concluído (seja por transcrição de voz ou envio de mensagem de texto), ele é anexado ao final do histórico cronológico.

## 2. Auto-Salvamento & Ciclo de Vida
- Chaves do LocalStorage utilizadas:
  - `dialetica_chat_history`: Histórico de mensagens do debate em tela.
  - `dialetica_saved_sessions`: Lista de debates salvos com ID, título inteligente, metadados e turnos.
  - `dialetica_current_session_id`: ID da sessão ativa vinculada.
  - `dialetica_current_artifacts`: Artefatos conceituais (diagramas, mapas e resumos).
- **Ação "Novo Debate"**:
  - Se o debate atual contém mensagens (`messages.length > 0`), ele é **automaticamente arquivado** em `sessions` com título semântico antes de a tela ser limpa.
  - O usuário nunca perde um debate anterior por clicar em "Novo".

## 3. Exportação e Importação
- **Backup JSON**: Serializa todas as sessões em arquivo JSON portável com validação de esquema na restauração.
- **Transcrição Acadêmica Markdown**: Exporta o debate estruturado por proponentes, turnos, intervenções do Árbitro e sínteses conceituais.
