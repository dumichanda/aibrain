import type { AgentActivity } from '../types/vault';

export interface SeedFile {
  path: string;
  content: string;
}

export const SEED_VAULT_FILES: SeedFile[] = [
  {
    path: '06_Agent_Protocols/PROTOCOL.md',
    content: `---
title: "Shared Memory Protocol"
folder: 06_Agent_Protocols
author: "Hermes Orchestrator"
agent: hermes
status: active
tags: [protocol, para, agent-os]
updatedAt: 2026-11-21T07:30:00Z
---

# Shared Memory Protocol

This Obsidian vault is the single source of truth shared across **Hermes**, **Claude Code**, **Codex**, and **OpenClaw**. No agent operates in an isolated memory silo.

## Core Rules

1. **Read Before Acting**: Every session starts by reading [[MEMORY]] and the newest file in \`05_Daily_Logs/\` (currently [[2026-11-21-Daily-Log]]).
2. **PARA Filing Discipline**:
   - Raw ideas go into \`00_Inbox/\`
   - Active deliverables go into \`01_Projects/\`
   - Ongoing systems belong in \`02_Areas/\`
   - Reusable templates belong in \`03_Resources/\`
   - Completed milestones move to \`04_Archives/\`
3. **Wikilink Everything**: Connect every new note to at least one existing project or playbook using \`[[Note-Slug]]\` links so the Memory Galaxy stays connected.
4. **Concise Context Hygiene**: Keep notes focused and under 1,200 words to prevent token bloat.
5. **Nightly Handoff Contract**: Before context compression, log completed work, decisions made, and next-agent handoffs into \`05_Daily_Logs/\`.
6. **Action-First Execution**: Before saying a task cannot be done, test what is reachable, complete all preparatory work end-to-end, and ask the user specifically for the missing credential, token, or permission needed to finish the job instead of handing the work back.

## Connected Agent Pointers

- [[HERMES]] — Primary Orchestrator & Morning Brief synthesis
- [[CLAUDE]] — Codebase architecture & refactoring
- [[AGENTS]] — Codex automated scripts & test verification
- [[OPENCLAW]] — Multi-channel alerts & web workflow operations
`,
  },
  {
    path: '06_Agent_Protocols/MEMORY.md',
    content: `---
title: "Master Memory Index"
folder: 06_Agent_Protocols
author: "Hermes Orchestrator"
agent: hermes
status: active
tags: [memory, index, hub]
updatedAt: 2026-11-21T08:00:00Z
---

# Master Memory Index

Compact long-term index read at boot by every connected agent. Always follow [[PROTOCOL]].

## Active Projects (01_Projects)

- [[SaaS-Launch-Pipeline]] — Webhook ingestion, Stripe checkout QA, and production launch checklist.
- [[Client-SEO-Engine]] — Automated keyword cluster briefs and content publishing workflow.
- [[Voice-Agent-Integration]] — Apollo voice layer reading Obsidian PARA logs and project status aloud.

## Operating Areas (02_Areas)

- [[Engineering-Standards]] — TypeScript strictness, API error boundaries, and zero-downtime release rules.
- [[Content-Operations]] — Weekly YouTube breakdown cadence and community resource distribution.

## Latest Nightly Sync

- Yesterday's complete cross-agent log: [[2026-11-20-Daily-Log]]
- Today's live rolling log: [[2026-11-21-Daily-Log]]
`,
  },
  {
    path: '06_Agent_Protocols/HERMES.md',
    content: `---
title: "Hermes Orchestrator Config"
folder: 06_Agent_Protocols
author: "Hermes Orchestrator"
agent: hermes
status: active
tags: [hermes, orchestrator, config]
updatedAt: 2026-11-21T07:15:00Z
---

# Hermes Orchestrator Pointer

\`OBSIDIAN_VAULT_PATH="~/Obsidian/Hermes-Shared-Brain"\`

## Responsibilities

- Enforce [[PROTOCOL]] across all connected agents.
- Trigger the **23:30 Nightly Agent Log** synthesis into \`05_Daily_Logs/\`.
- Generate the **Morning Brief** each day at 07:30 by summarizing [[2026-11-21-Daily-Log]] and flagging blockers in [[SaaS-Launch-Pipeline]].
- Feed verified project context to the Apollo voice layer ([[Voice-Agent-Integration]]).

## Linked Peers

Coordinates directly with [[CLAUDE]], [[AGENTS]], and [[OPENCLAW]] via shared markdown state instead of manual copy-pasting.
`,
  },
  {
    path: '06_Agent_Protocols/CLAUDE.md',
    content: `---
title: "Claude Code Pointer"
folder: 06_Agent_Protocols
author: "Claude Code"
agent: claude-code
status: active
tags: [claude-code, pointer, engineering]
updatedAt: 2026-11-20T22:10:00Z
---

# Claude Code — Shared Vault Pointer

Read [[PROTOCOL]] and [[MEMORY]] on startup.

## Workflow Contract

1. Inspect [[Engineering-Standards]] before refactoring any service.
2. When completing an architectural change on [[SaaS-Launch-Pipeline]], record the exact files touched and edge cases discovered.
3. Leave an explicit \`@Codex Handoff\` note inside today's file in \`05_Daily_Logs/\` so [[AGENTS]] can write automated test coverage immediately without asking the user to repeat context.
`,
  },
  {
    path: '06_Agent_Protocols/AGENTS.md',
    content: `---
title: "Codex Agent Pointer"
folder: 06_Agent_Protocols
author: "Codex"
agent: codex
status: active
tags: [codex, pointer, automation]
updatedAt: 2026-11-20T23:05:00Z
---

# Codex — Shared Vault Pointer

Bound to the shared Obsidian brain defined in [[PROTOCOL]].

## Execution Loop

- Check [[2026-11-21-Daily-Log]] for \`@Codex Handoff\` entries created by [[CLAUDE]] or [[HERMES]].
- Write deterministic test suites, migration scripts, and CI automation.
- Document reusable scripts in [[Obsidian-PARA-Playbook]] and [[Cross-Agent-Handoff-Spec]].
- Append verified test pass rates back to \`05_Daily_Logs/\`.
`,
  },
  {
    path: '06_Agent_Protocols/OPENCLAW.md',
    content: `---
title: "OpenClaw Agent Pointer"
folder: 06_Agent_Protocols
author: "OpenClaw"
agent: openclaw
status: active
tags: [openclaw, pointer, channels]
updatedAt: 2026-11-21T06:45:00Z
---

# OpenClaw — Multi-Channel Pointer

Connected to [[MEMORY]] and [[PROTOCOL]] for browser automation and channel delivery.

## Responsibilities

- Deliver morning status summaries generated by [[HERMES]] to Telegram and Slack.
- Run scheduled research sweeps for [[Client-SEO-Engine]] and drop raw findings into \`00_Inbox/\`.
- Keep outreach workflows synchronized with [[Content-Operations]].
`,
  },
  {
    path: '01_Projects/SaaS-Launch-Pipeline.md',
    content: `---
title: "SaaS Launch Pipeline"
folder: 01_Projects
author: "Claude Code"
agent: claude-code
status: in-progress
tags: [project, launch, backend, stripe]
updatedAt: 2026-11-21T08:12:00Z
---

# SaaS Launch Pipeline

Coordinated launch plan shared across [[CLAUDE]], [[AGENTS]], and [[HERMES]].

## Current State

- **Webhook Idempotency**: Claude Code refactored the Stripe event handler to use transactional deduplication keys (see [[Engineering-Standards]]).
- **Test Harness**: Codex added 14 unit tests covering duplicate deliveries and signature failures (logged in [[2026-11-20-Daily-Log]]).
- **Remaining Blocker**: Rate-limit retry backoff on the onboarding email queue needs verification before production cutover.

## Cross-Agent Next Steps

- [x] Refactor webhook deduplication layer (Claude Code)
- [x] Ship automated retry test suite (Codex)
- [ ] Draft customer launch announcement for Slack & Telegram ([[OPENCLAW]])
- [ ] Run final morning readiness brief via [[Voice-Agent-Integration]]
`,
  },
  {
    path: '01_Projects/Client-SEO-Engine.md',
    content: `---
title: "Client SEO Engine"
folder: 01_Projects
author: "OpenClaw"
agent: openclaw
status: active
tags: [project, seo, content, automation]
updatedAt: 2026-11-20T19:40:00Z
---

# Client SEO Engine

Automated keyword research, outline generation, and internal linking workflow overseen by [[OPENCLAW]] and [[HERMES]].

## Pipeline Architecture

1. **Discovery**: OpenClaw scrapes SERP gaps and stores raw clusters in \`00_Inbox/\`.
2. **Brief Compilation**: Hermes cross-references [[Content-Operations]] tone guidelines and drafts structured outlines.
3. **Quality Gate**: Verify every published draft links back to pillar resources in \`03_Resources/\`.

## Weekly Targets

- 12 programmatic comparison pages briefed
- 4 long-form case study breakdowns drafted
- Zero duplicate cannibalization across target clusters
`,
  },
  {
    path: '01_Projects/Voice-Agent-Integration.md',
    content: `---
title: "Voice Agent Integration (Apollo)"
folder: 01_Projects
author: "Hermes Orchestrator"
agent: hermes
status: active
tags: [project, voice, apollo, tts]
updatedAt: 2026-11-21T07:50:00Z
---

# Voice Agent Integration (Apollo)

Apollo connects directly to this Obsidian vault so you can ask spoken questions or hear your Morning Brief read aloud while away from the keyboard.

## Grounding Sources

- Reads [[2026-11-21-Daily-Log]] and [[2026-11-20-Daily-Log]] for cross-agent status.
- Pulls active deliverables from [[SaaS-Launch-Pipeline]] and [[Client-SEO-Engine]].
- Never hallucinates project status — always cites exact \`[[Note]]\` sources from the PARA vault.

## Verified Capabilities

- Spoken Morning Brief synthesis from nightly agent logs
- Direct voice Q&A across all PARA folders
- One-click readback of any open Markdown note
`,
  },
  {
    path: '02_Areas/Engineering-Standards.md',
    content: `---
title: "Engineering Standards"
folder: 02_Areas
author: "Claude Code"
agent: claude-code
status: active
tags: [area, engineering, standards]
updatedAt: 2026-11-19T16:20:00Z
---

# Engineering Standards

Permanent baseline followed by [[CLAUDE]] and [[AGENTS]] on all repositories.

## Non-Negotiable Principles

- **Pure Logic Decoupling**: Keep domain rules, parsers, and state transitions in pure TypeScript modules with deterministic unit tests.
- **Idempotent Webhooks**: Every external webhook handler must guard against duplicate replay events (applied in [[SaaS-Launch-Pipeline]]).
- **Explicit Handoffs**: Never finish a refactor without recording touched files and follow-up test targets in \`05_Daily_Logs/\` per [[Cross-Agent-Handoff-Spec]].
`,
  },
  {
    path: '02_Areas/Content-Operations.md',
    content: `---
title: "Content Operations"
folder: 02_Areas
author: "OpenClaw"
agent: openclaw
status: active
tags: [area, content, youtube]
updatedAt: 2026-11-18T14:00:00Z
---

# Content Operations

Ongoing editorial workflow for technical walkthroughs, community SOPs, and [[Client-SEO-Engine]].

## Cadence

- **Monday**: Extract top technical learnings from \`05_Daily_Logs/\` via [[HERMES]].
- **Wednesday**: Publish workflow demo and downloadable PARA templates ([[Obsidian-PARA-Playbook]]).
- **Friday**: OpenClaw distributes recap digest across community channels.
`,
  },
  {
    path: '03_Resources/Obsidian-PARA-Playbook.md',
    content: `---
title: "Obsidian PARA Playbook"
folder: 03_Resources
author: "Hermes Orchestrator"
agent: hermes
status: reference
tags: [resource, para, obsidian]
updatedAt: 2026-11-17T11:30:00Z
---

# Obsidian PARA Playbook

Why PARA works so reliably for multi-agent shared memory (referenced by [[PROTOCOL]]):

- **Predictable Paths**: Agents never scatter random markdown files into the vault root when folder boundaries are numbered (\`00_Inbox\` through \`06_Agent_Protocols\`).
- **Low Token Cost**: Instead of stuffing 80,000 tokens of chat history into every prompt, agents inspect [[MEMORY]] and open only the 2–3 relevant project files.
- **Vault Isolation**: Always dedicate a separate Obsidian vault for AI agents — never point agents at personal journals or credential stores.
`,
  },
  {
    path: '03_Resources/Cross-Agent-Handoff-Spec.md',
    content: `---
title: "Cross-Agent Handoff Spec"
folder: 03_Resources
author: "Codex"
agent: codex
status: reference
tags: [resource, handoff, spec]
updatedAt: 2026-11-18T18:45:00Z
---

# Cross-Agent Handoff Spec

Standard format used inside \`05_Daily_Logs/\` so one agent can continue another agent's work seamlessly.

## Required Handoff Block

- **From Agent -> To Agent**: Explicit owner transition (e.g., Claude Code -> Codex).
- **Context Link**: Exact \`[[Project-Note]]\` wikilink.
- **Completed**: Concrete files, commits, or research delivered.
- **Next Action**: Single unambiguous step for the receiving agent.

Used nightly by [[HERMES]], [[CLAUDE]], [[AGENTS]], and [[OPENCLAW]].
`,
  },
  {
    path: '04_Archives/Q3-Agent-Migration.md',
    content: `---
title: "Q3 Agent Memory Migration"
folder: 04_Archives
author: "Hermes Orchestrator"
agent: hermes
status: archived
tags: [archive, migration]
updatedAt: 2026-10-30T17:00:00Z
---

# Q3 Agent Memory Migration

Completed migration from siloed per-tool \`MEMORY.md\` files into the unified Obsidian PARA vault governed by [[PROTOCOL]].

## Measured Outcomes

- Eliminated manual context copy-pasting between Claude Code, Codex, and Hermes.
- Reduced cold-start onboarding prompts by 78% via [[MEMORY]] + \`05_Daily_Logs/\`.
`,
  },
  {
    path: '00_Inbox/Voice-Command-Ideas.md',
    content: `---
title: "Voice Command Ideas"
folder: 00_Inbox
author: "OpenClaw"
agent: openclaw
status: inbox
tags: [inbox, voice, ideas]
updatedAt: 2026-11-21T06:10:00Z
---

# Voice Command Ideas

Quick captures from morning walk to triage into [[Voice-Agent-Integration]]:

- Ask Apollo: "What did Claude Code ship last night?"
- Ask Apollo: "Read me the blockers in SaaS Launch Pipeline."
- Trigger a voice capture straight into \`00_Inbox/\` with automatic PARA folder suggestions.
`,
  },
  {
    path: '05_Daily_Logs/2026-11-20-Daily-Log.md',
    content: `---
title: "2026-11-20 Nightly Agent Log"
folder: 05_Daily_Logs
author: "Hermes Orchestrator"
agent: hermes
status: finalized
tags: [daily-log, nightly-sync]
updatedAt: 2026-11-20T23:30:00Z
---

# 2026-11-20 Nightly Agent Log

Automated 23:30 synthesis compiled by [[HERMES]] across all four connected agents.

## Completed Today

- **Claude Code**: Refactored Stripe webhook deduplication inside [[SaaS-Launch-Pipeline]] following [[Engineering-Standards]].
- **Codex**: Picked up Claude Code's handoff and shipped 14 automated webhook replay tests (14/14 passing).
- **OpenClaw**: Collected 18 new keyword gap opportunities for [[Client-SEO-Engine]] and synced weekly targets with [[Content-Operations]].

## Decisions & Learnings

- Transactional idempotency keys eliminated duplicate subscription events under concurrent load.
- Keeping nightly logs under 400 words cut morning boot context latency in half.

## Cross-Agent Handoffs

- **Codex -> OpenClaw**: Webhook QA is green; draft the launch checklist update for Slack in [[SaaS-Launch-Pipeline]].
- **Hermes -> Apollo Voice**: Ready to narrate morning brief at 07:30 via [[Voice-Agent-Integration]].
`,
  },
  {
    path: '05_Daily_Logs/2026-11-21-Daily-Log.md',
    content: `---
title: "2026-11-21 Nightly Agent Log"
folder: 05_Daily_Logs
author: "Hermes Orchestrator"
agent: hermes
status: live
tags: [daily-log, rolling]
updatedAt: 2026-11-21T08:15:00Z
---

# 2026-11-21 Daily Agent Log

Active rolling log for today's multi-agent work. Linked from [[MEMORY]] and [[PROTOCOL]].

## Completed So Far

- **Hermes**: Generated the 07:30 Morning Brief from [[2026-11-20-Daily-Log]] and verified zero broken protocol pointers.
- **OpenClaw**: Dropped new voice workflow ideas into [[Voice-Command-Ideas]] inside \`00_Inbox/\`.

## Active Focus & Handoffs

- **Claude Code**: Verify email queue retry backoff in [[SaaS-Launch-Pipeline]].
- **Codex**: Standby for final smoke test run once backoff patch lands.
- **Apollo Voice**: Wired for live vault Q&A and note readback ([[Voice-Agent-Integration]]).
`,
  },
];

export const SEED_ACTIVITIES: AgentActivity[] = [
  {
    id: 'act-1',
    agentId: 'hermes',
    agentName: 'Hermes',
    action: 'nightly-synthesis',
    summary: 'Compiled 2026-11-20 Nightly Agent Log across Claude Code, Codex, and OpenClaw.',
    targetPath: '05_Daily_Logs/2026-11-20-Daily-Log.md',
    referencedPaths: [
      '01_Projects/SaaS-Launch-Pipeline.md',
      '01_Projects/Client-SEO-Engine.md',
    ],
    timestamp: '2026-11-20T23:30:00Z',
  },
  {
    id: 'act-2',
    agentId: 'claude-code',
    agentName: 'Claude Code',
    action: 'handoff',
    summary: 'Logged Stripe webhook deduplication refactor and posted @Codex Handoff.',
    targetPath: '01_Projects/SaaS-Launch-Pipeline.md',
    referencedPaths: ['02_Areas/Engineering-Standards.md'],
    timestamp: '2026-11-20T21:45:00Z',
  },
  {
    id: 'act-3',
    agentId: 'codex',
    agentName: 'Codex',
    action: 'write',
    summary: 'Read Claude Code handoff and recorded 14/14 passing webhook idempotency tests.',
    targetPath: '05_Daily_Logs/2026-11-20-Daily-Log.md',
    referencedPaths: ['01_Projects/SaaS-Launch-Pipeline.md'],
    timestamp: '2026-11-20T22:55:00Z',
  },
  {
    id: 'act-4',
    agentId: 'openclaw',
    agentName: 'OpenClaw',
    action: 'write',
    summary: 'Captured morning voice command ideas into 00_Inbox linked to Voice-Agent-Integration.',
    targetPath: '00_Inbox/Voice-Command-Ideas.md',
    referencedPaths: ['01_Projects/Voice-Agent-Integration.md'],
    timestamp: '2026-11-21T06:10:00Z',
  },
];
