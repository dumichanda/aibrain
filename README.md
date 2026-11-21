# aibrain — Hermes Obsidian Shared AI Memory Vault

A shared Obsidian PARA memory vault and multi-agent orchestrator connecting **Hermes**, **Claude Code**, **Codex**, and **OpenClaw** with nightly agent logs, an interactive Memory Galaxy graph, Apollo voice readback, and a 1-prompt Orchestrator setup builder.

## Features

- **Obsidian PARA Vault (`00_Inbox` – `06_Agent_Protocols`)**: Real `.md` files stored locally with YAML frontmatter, live `[[Wikilink]]` navigation, Edit/Preview/Split modes, incoming backlinks, and `.zip` export ready to open in Obsidian.
- **Memory Galaxy Graph**: Interactive force-directed knowledge graph with PARA folder filtering, zoom controls, and neighborhood inspection.
- **Multi-Agent Shared Brain**: Run tasks as Hermes, Claude Code, Codex, or OpenClaw against shared vault memory; outputs are written directly to PARA notes and cross-agent handoffs are appended to `05_Daily_Logs/`.
- **Nightly Agent Logs & Morning Brief**: Automated daily log synthesis, spoken-friendly Morning Brief generation, and Memory Health Diagnostics (broken wikilinks, orphan notes, and token-bloat checks).
- **Apollo Voice Agent**: Voice & text Q&A grounded in your Obsidian vault with clickable `[[Note]]` citations and Gemini TTS audio narration.
- **Single-Prompt Orchestrator Setup**: Generate a customized Orchestrator Mega-Prompt and pointer configs (`CLAUDE.md`, `AGENTS.md`, `hermes-config.yaml`, `nightly-log.cron`).

## Quick Start

```bash
npm install
cp .env.example .env
# Add your GEMINI_API_KEY in .env
npm run dev
```

Open `http://localhost:3000`.

## Running Tests

```bash
npx tsx --test src/utils/vaultLogic.test.ts
```
