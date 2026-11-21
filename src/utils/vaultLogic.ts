import type {
  AgentId,
  AgentProfile,
  BrokenLinkIssue,
  GraphEdge,
  GraphLayout,
  GraphNode,
  NoteFrontmatter,
  OrchestratorConfig,
  ParaFolderId,
  ParaFolderMeta,
  VaultHealthReport,
  VaultNote,
} from '../types/vault';

export const PARA_FOLDERS: ParaFolderMeta[] = [
  {
    id: '00_Inbox',
    name: '00_Inbox',
    shortLabel: 'Inbox',
    description: 'Raw quick captures and unsorted agent observations',
    accentHex: '#94A3B8',
  },
  {
    id: '01_Projects',
    name: '01_Projects',
    shortLabel: 'Projects',
    description: 'Active initiatives with concrete deliverables and deadlines',
    accentHex: '#8B5CF6',
  },
  {
    id: '02_Areas',
    name: '02_Areas',
    shortLabel: 'Areas',
    description: 'Ongoing responsibilities, systems, and operating standards',
    accentHex: '#3B82F6',
  },
  {
    id: '03_Resources',
    name: '03_Resources',
    shortLabel: 'Resources',
    description: 'Reusable playbooks, architecture specs, and prompt templates',
    accentHex: '#10B981',
  },
  {
    id: '04_Archives',
    name: '04_Archives',
    shortLabel: 'Archives',
    description: 'Completed projects and historical decision snapshots',
    accentHex: '#64748B',
  },
  {
    id: '05_Daily_Logs',
    name: '05_Daily_Logs',
    shortLabel: 'Daily Logs',
    description: 'Automated nightly summaries and cross-agent handoff journals',
    accentHex: '#F59E0B',
  },
  {
    id: '06_Agent_Protocols',
    name: '06_Agent_Protocols',
    shortLabel: 'Protocols',
    description: 'Shared memory rules and agent pointer configs (PROTOCOL, CLAUDE, HERMES)',
    accentHex: '#EC4899',
  },
];

export const FOLDER_COLOR_MAP: Record<ParaFolderId, string> = PARA_FOLDERS.reduce(
  (acc, folder) => {
    acc[folder.id] = folder.accentHex;
    return acc;
  },
  {} as Record<ParaFolderId, string>,
);

export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: 'hermes',
    name: 'Hermes',
    role: 'Primary Orchestrator & Control Layer',
    protocolFile: '06_Agent_Protocols/HERMES.md',
    focus: 'Coordinates nightly logs, morning briefs, PARA routing, and cross-agent handoffs.',
    accentHex: '#8B5CF6',
    sampleTasks: [
      'Review what Claude Code and Codex shipped yesterday and draft today’s top 3 priorities.',
      'Audit active notes in 01_Projects and propose missing wikilinks to 03_Resources.',
      'Synthesize an executive status brief on the SaaS Launch Pipeline for the morning standup.',
    ],
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    role: 'Codebase Architecture & Refactoring Engine',
    protocolFile: '06_Agent_Protocols/CLAUDE.md',
    focus: 'Reads project specs from the shared vault, plans refactors, and logs architectural decisions.',
    accentHex: '#D97706',
    sampleTasks: [
      'Read SaaS-Launch-Pipeline and design the webhook retry architecture, then log the decision.',
      'Check Engineering-Standards and list the concrete refactoring checklist for the auth module.',
      'Document API schema changes from today so Codex can write integration tests next.',
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    role: 'Automated Execution, Scripts & Test Runner',
    protocolFile: '06_Agent_Protocols/AGENTS.md',
    focus: 'Picks up Claude Code handoffs, writes test harnesses, and appends verified results to Daily Logs.',
    accentHex: '#10B981',
    sampleTasks: [
      'Pick up Claude Code’s latest architectural notes and outline the automated verification suite.',
      'Draft the cron automation script for 23:30 nightly vault log compaction.',
      'Verify deployment checklist items in SaaS-Launch-Pipeline and record pass/fail blockers.',
    ],
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    role: 'Multi-Channel Automation & Web Operations',
    protocolFile: '06_Agent_Protocols/OPENCLAW.md',
    focus: 'Handles Telegram/Slack briefings, content workflows, and external research ingestion into Inbox.',
    accentHex: '#3B82F6',
    sampleTasks: [
      'Pull the latest wins from 05_Daily_Logs and format a concise Slack update for the team.',
      'Review Client-SEO-Engine and prepare the outreach workflow brief for this week.',
      'Summarize recent Inbox captures and recommend which PARA folders they belong in.',
    ],
  },
];

export function slugFromPath(notePath: string): string {
  const fileName = notePath.split('/').pop() ?? notePath;
  return fileName.replace(/\.md$/i, '');
}

export function folderFromPath(notePath: string): ParaFolderId {
  const firstSegment = notePath.split('/')[0] as ParaFolderId;
  const known = PARA_FOLDERS.find((f) => f.id === firstSegment);
  return known ? known.id : '00_Inbox';
}

export function sanitizeSlug(rawTitle: string): string {
  const cleaned = rawTitle
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'Untitled-Note';
}

/**
 * Parse YAML frontmatter block delimited by `---` at the start of a Markdown file.
 */
export function parseFrontmatter(raw: string): {
  frontmatter: NoteFrontmatter;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: raw };
  }

  const yamlBlock = match[1];
  const body = match[2];
  const frontmatter: NoteFrontmatter = {};

  for (const line of yamlBlock.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    if (key === 'tags') {
      const bracketMatch = rawValue.match(/^\[(.*)\]$/);
      if (bracketMatch) {
        frontmatter.tags = bracketMatch[1]
          .split(',')
          .map((t) => t.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      } else if (rawValue) {
        frontmatter.tags = rawValue
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
      continue;
    }

    const unquoted = rawValue.replace(/^["']|["']$/g, '');
    if (key === 'title') frontmatter.title = unquoted;
    else if (key === 'folder') frontmatter.folder = unquoted as ParaFolderId;
    else if (key === 'author') frontmatter.author = unquoted;
    else if (key === 'agent') frontmatter.agent = unquoted as AgentId | 'human';
    else if (key === 'updatedAt') frontmatter.updatedAt = unquoted;
    else if (key === 'status') frontmatter.status = unquoted;
  }

  return { frontmatter, body };
}

export function serializeFrontmatter(
  frontmatter: NoteFrontmatter,
  body: string,
): string {
  const lines: string[] = ['---'];
  if (frontmatter.title) lines.push(`title: "${frontmatter.title.replace(/"/g, '\\"')}"`);
  if (frontmatter.folder) lines.push(`folder: ${frontmatter.folder}`);
  if (frontmatter.author) lines.push(`author: "${frontmatter.author.replace(/"/g, '\\"')}"`);
  if (frontmatter.agent) lines.push(`agent: ${frontmatter.agent}`);
  if (frontmatter.status) lines.push(`status: ${frontmatter.status}`);
  if (frontmatter.tags && frontmatter.tags.length > 0) {
    lines.push(`tags: [${frontmatter.tags.join(', ')}]`);
  }
  if (frontmatter.updatedAt) lines.push(`updatedAt: ${frontmatter.updatedAt}`);
  lines.push('---', '');

  return `${lines.join('\n')}${body.replace(/^\r?\n/, '')}`;
}

/**
 * Extract unique [[Wikilink]] targets from Markdown, ignoring fenced code blocks and inline code.
 */
export function parseWikilinks(markdown: string): string[] {
  // Strip fenced code blocks and inline code so examples inside code fences don't create false links
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '');

  const seen = new Set<string>();
  const regex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(stripped)) !== null) {
    const rawTarget = match[1].trim();
    if (!rawTarget) continue;
    const normalized = rawTarget.replace(/\.md$/i, '').split('/').pop()?.trim();
    if (normalized) {
      seen.add(normalized);
    }
  }

  return Array.from(seen);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function buildVaultNote(
  notePath: string,
  rawContent: string,
  fallbackUpdatedAt?: string,
): VaultNote {
  const { frontmatter, body } = parseFrontmatter(rawContent);
  const slug = slugFromPath(notePath);
  const folder = folderFromPath(notePath);
  const titleFromHeading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = frontmatter.title || titleFromHeading || slug.replace(/[-_]/g, ' ');
  const updatedAt = frontmatter.updatedAt || fallbackUpdatedAt || new Date().toISOString();

  return {
    path: notePath,
    slug,
    title,
    folder,
    content: rawContent,
    body,
    frontmatter: {
      ...frontmatter,
      title,
      folder,
      updatedAt,
    },
    wikilinks: parseWikilinks(body),
    updatedAt,
    wordCount: countWords(body),
  };
}

/**
 * Find the target note matching a [[Wikilink]] slug (case-insensitive, supports spaces or dashes).
 */
export function resolveWikilink(
  target: string,
  notes: VaultNote[],
): VaultNote | undefined {
  const norm = target.trim().toLowerCase().replace(/\.md$/i, '');
  const slugNorm = norm.replace(/\s+/g, '-');
  return notes.find(
    (n) =>
      n.slug.toLowerCase() === norm ||
      n.slug.toLowerCase() === slugNorm ||
      n.title.toLowerCase() === norm,
  );
}

/**
 * Compute incoming backlinks for every note path.
 */
export function computeBacklinks(notes: VaultNote[]): Record<string, VaultNote[]> {
  const backlinks: Record<string, VaultNote[]> = {};
  for (const note of notes) {
    backlinks[note.path] = [];
  }

  for (const source of notes) {
    for (const targetSlug of source.wikilinks) {
      const targetNote = resolveWikilink(targetSlug, notes);
      if (targetNote && targetNote.path !== source.path) {
        const list = backlinks[targetNote.path];
        if (!list.some((item) => item.path === source.path)) {
          list.push(source);
        }
      }
    }
  }

  return backlinks;
}

/**
 * Analyze vault memory hygiene: orphan notes, broken wikilinks, oversized notes, and daily log freshness.
 */
export function analyzeVaultHealth(
  notes: VaultNote[],
  todayIsoDate = new Date().toISOString().slice(0, 10),
): VaultHealthReport {
  const backlinks = computeBacklinks(notes);
  const brokenLinks: BrokenLinkIssue[] = [];
  let totalLinks = 0;

  for (const note of notes) {
    for (const target of note.wikilinks) {
      totalLinks += 1;
      if (!resolveWikilink(target, notes)) {
        brokenLinks.push({
          sourcePath: note.path,
          sourceTitle: note.title,
          missingTarget: target,
        });
      }
    }
  }

  const orphanNotes = notes.filter(
    (n) =>
      (backlinks[n.path]?.length ?? 0) === 0 &&
      n.wikilinks.length === 0 &&
      n.folder !== '04_Archives',
  );

  // Oversized notes create context bloat for agents
  const oversizedNotes = notes.filter((n) => n.wordCount > 1200);
  const dailyLogs = notes.filter((n) => n.folder === '05_Daily_Logs');
  const hasTodayLog = dailyLogs.some((n) => n.slug.includes(todayIsoDate));
  const protocolCount = notes.filter((n) => n.folder === '06_Agent_Protocols').length;

  const issueCount = orphanNotes.length + brokenLinks.length + oversizedNotes.length + (hasTodayLog ? 0 : 1);
  const healthyRatio =
    notes.length === 0
      ? 1
      : Math.max(0, Math.min(1, 1 - issueCount / Math.max(notes.length * 1.5, 1)));

  return {
    totalNotes: notes.length,
    totalLinks,
    orphanNotes,
    brokenLinks,
    oversizedNotes,
    hasTodayLog,
    dailyLogCount: dailyLogs.length,
    protocolCount,
    healthyRatio,
  };
}

/**
 * Deterministic seeded force-directed graph layout for the Memory Galaxy view.
 */
export function computeGraphLayout(
  notes: VaultNote[],
  width = 960,
  height = 580,
): GraphLayout {
  if (notes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];
  const degreeMap: Record<string, number> = {};

  for (const n of notes) {
    degreeMap[n.path] = 0;
  }

  for (const source of notes) {
    for (const targetSlug of source.wikilinks) {
      const target = resolveWikilink(targetSlug, notes);
      if (!target || target.path === source.path) continue;
      const key =
        source.path < target.path
          ? `${source.path}|${target.path}`
          : `${target.path}|${source.path}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ source: source.path, target: target.path });
        degreeMap[source.path] = (degreeMap[source.path] ?? 0) + 1;
        degreeMap[target.path] = (degreeMap[target.path] ?? 0) + 1;
      }
    }
  }

  const cx = width / 2;
  const cy = height / 2;
  const padding = 72;

  // Deterministic initial placement distributed across full canvas by PARA folder ring
  const folderIds = PARA_FOLDERS.map((f) => f.id);
  const nodes: GraphNode[] = notes.map((note, idx) => {
    const folderIndex = Math.max(0, folderIds.indexOf(note.folder));
    const sectorAngle = (folderIndex / folderIds.length) * Math.PI * 2 - Math.PI / 2;
    const sameFolderIdx = notes
      .slice(0, idx)
      .filter((n) => n.folder === note.folder).length;
    const spreadAngle = sectorAngle + (sameFolderIdx - 1) * 0.28;
    const rx =
      note.folder === '06_Agent_Protocols'
        ? width * 0.17
        : width * (0.31 + (sameFolderIdx % 2) * 0.08);
    const ry =
      note.folder === '06_Agent_Protocols'
        ? height * 0.19
        : height * (0.33 + (sameFolderIdx % 2) * 0.08);
    return {
      id: note.path,
      slug: note.slug,
      title: note.title,
      folder: note.folder,
      x: cx + Math.cos(spreadAngle) * rx,
      y: cy + Math.sin(spreadAngle) * ry,
      degree: degreeMap[note.path] ?? 0,
      color: FOLDER_COLOR_MAP[note.folder] ?? '#8B5CF6',
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const vx = new Float64Array(nodes.length);
  const vy = new Float64Array(nodes.length);

  const iterations = 130;
  const repulsion = 26000;
  const springLength = 215;
  const springK = 0.025;
  const gravity = 0.007;
  const minSepX = 115;
  const minSepY = 66;

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distSq = Math.max(dx * dx + dy * dy, 400);
        const dist = Math.sqrt(distSq);
        const force = repulsion / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        vx[i] += fx;
        vy[i] += fy;
        vx[j] -= fx;
        vy[j] -= fy;
      }
    }

    // Spring attraction along edges
    for (const edge of edges) {
      const a = nodeById.get(edge.source);
      const b = nodeById.get(edge.target);
      if (!a || !b) continue;
      const ai = nodes.indexOf(a);
      const bi = nodes.indexOf(b);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const displacement = dist - springLength;
      const fx = (dx / dist) * displacement * springK;
      const fy = (dy / dist) * displacement * springK;
      vx[ai] += fx;
      vy[ai] += fy;
      vx[bi] -= fx;
      vy[bi] -= fy;
    }

    // Gentle center pull + damping + bounding box clamp
    for (let i = 0; i < nodes.length; i++) {
      vx[i] = (vx[i] + (cx - nodes[i].x) * gravity) * 0.76;
      vy[i] = (vy[i] + (cy - nodes[i].y) * gravity) * 0.76;
      nodes[i].x = Math.max(padding + 16, Math.min(width - padding - 16, nodes[i].x + vx[i]));
      nodes[i].y = Math.max(padding - 12, Math.min(height - padding, nodes[i].y + vy[i]));
    }
  }

  // Final label-aware separation pass so node circles and monospace labels stay legible
  for (let pass = 0; pass < 18; pass++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX < minSepX && absY < minSepY) {
          const pushX = ((minSepX - absX) / 2) * (dx >= 0 ? 1 : -1) * 0.45;
          const pushY = ((minSepY - absY) / 2) * (dy >= 0 ? 1 : -1) * 0.45;
          nodes[i].x = Math.max(padding + 16, Math.min(width - padding - 16, nodes[i].x + pushX));
          nodes[j].x = Math.max(padding + 16, Math.min(width - padding - 16, nodes[j].x - pushX));
          nodes[i].y = Math.max(padding - 12, Math.min(height - padding, nodes[i].y + pushY));
          nodes[j].y = Math.max(padding - 12, Math.min(height - padding, nodes[j].y - pushY));
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Generate the Single Orchestrator Mega-Prompt demonstrated in the video
 * (avoiding manual per-agent wiring by letting one orchestrator configure everything).
 */
export function generateOrchestratorPrompt(config: OrchestratorConfig): string {
  const activeProfiles = AGENT_PROFILES.filter((a) =>
    config.enabledAgents.includes(a.id),
  );
  const agentList = activeProfiles
    .map((a) => `- **${a.name}** (${a.role}) -> pointer file: \`${a.protocolFile}\``)
    .join('\n');

  const pointerFiles = activeProfiles.map((a) => `\`${a.protocolFile}\``).join(', ');

  return [
    `# Orchestrator Setup Prompt — ${config.vaultName}`,
    '',
    `You are my AgentOS Orchestrator. Do NOT ask me to wire agents manually by hand.`,
    `Execute the entire shared Obsidian memory setup automatically in one pass:`,
    '',
    `## 1. Initialize Dedicated Obsidian Vault (PARA Architecture)`,
    `Set \`OBSIDIAN_VAULT_PATH="${config.vaultPath}"\`${config.isolatePersonalNotes ? ' (strictly isolated from personal notes, passwords, or private journals).' : '.'}`,
    `Create this exact folder structure if missing:`,
    `- \`00_Inbox/\` (unsorted captures)`,
    `- \`01_Projects/\` (active deliverables)`,
    `- \`02_Areas/\` (ongoing standards & responsibilities)`,
    `- \`03_Resources/\` (reusable playbooks & references)`,
    `- \`04_Archives/\` (completed snapshots)`,
    `- \`05_Daily_Logs/\` (nightly cross-agent summaries)`,
    `- \`06_Agent_Protocols/\` (shared memory contract & agent pointers)`,
    '',
    `## 2. Write Master Shared Memory Protocol`,
    `Create \`06_Agent_Protocols/PROTOCOL.md\` with these mandatory rules for every connected agent:`,
    `1. **Session Start**: Always read \`06_Agent_Protocols/MEMORY.md\` and the latest file in \`05_Daily_Logs/\` before starting work.`,
    `2. **Wikilink Discipline**: Connect every new note to at least one existing project or resource using \`[[Note-Slug]]\` syntax.`,
    `3. **Concise Output**: Keep notes under 1,200 words so shared memory stays fast and avoids token bloat.`,
    `4. **Cross-Agent Handoff**: Log what you finished, what you learned, and what the next agent should pick up.`,
    '',
    `## 3. Link Connected AI Agents`,
    `Create thin pointer files (${pointerFiles}) so each agent reads and writes to the exact same Obsidian vault:`,
    agentList || '- (Select at least one agent)',
    '',
    `## 4. Schedule Nightly Agent Logs & Morning Brief`,
    `Configure a nightly routine at **${config.nightlyHour}** local time that:`,
    `- Collects work completed across all enabled agents today.`,
    `- Writes \`05_Daily_Logs/YYYY-MM-DD-Daily-Log.md\` with sections: Completed, Learnings, Cross-Agent Handoffs, and Tomorrow's Top 3 Priorities.`,
    config.includeVoiceAgent
      ? `- Exposes \`05_Daily_Logs/\` and \`01_Projects/\` to the Apollo Voice Agent so I can ask questions and hear my morning brief read aloud.`
      : `- Prepares a concise text Morning Brief ready for the first session tomorrow.`,
    '',
    `Confirm completion by printing the created directory tree and verifying zero orphan protocol files.`,
  ].join('\n');
}

export function generateAgentPointerConfigs(config: OrchestratorConfig): Record<string, string> {
  return {
    'CLAUDE.md': `# Claude Code — Shared Obsidian Memory Pointer\n\nOBSIDIAN_VAULT_PATH="${config.vaultPath}"\n\n## Mandatory Session Boot\n1. Read \`06_Agent_Protocols/PROTOCOL.md\` and \`06_Agent_Protocols/MEMORY.md\`.\n2. Read the most recent log inside \`05_Daily_Logs/\` to see what Hermes, Codex, or OpenClaw finished.\n3. Write architectural decisions into \`01_Projects/\` using \`[[Wikilinks]]\`.\n4. Append a 3-bullet handoff entry to today's Daily Log before ending your session.\n`,
    'AGENTS.md': `# Codex — Shared Obsidian Memory Pointer\n\nOBSIDIAN_VAULT_PATH="${config.vaultPath}"\n\n## Execution Rules\n- Check \`05_Daily_Logs/\` for pending handoffs from Claude Code or Hermes.\n- Store test scripts and runbooks in \`03_Resources/\`.\n- Record test pass/fail results and shipped PRs in \`05_Daily_Logs/YYYY-MM-DD-Daily-Log.md\`.\n`,
    'hermes-config.yaml': `vault:\n  name: "${config.vaultName}"\n  path: "${config.vaultPath}"\n  structure: PARA\n  isolate_personal: ${config.isolatePersonalNotes}\nagents:\n${config.enabledAgents.map((a) => `  - ${a}`).join('\n')}\nnightly_log:\n  enabled: true\n  schedule: "${config.nightlyHour}"\n  target_dir: "05_Daily_Logs"\nvoice_agent:\n  name: "Apollo"\n  enabled: ${config.includeVoiceAgent}\n  read_sources:\n    - "05_Daily_Logs"\n    - "01_Projects"\n`,
    'nightly-log.cron': `# Run Hermes Nightly Agent Log Synthesis every evening at ${config.nightlyHour}\n${config.nightlyHour.split(':')[1] ?? '30'} ${config.nightlyHour.split(':')[0] ?? '23'} * * * OBSIDIAN_VAULT_PATH="${config.vaultPath}" hermes run --task "Synthesize nightly agent log into 05_Daily_Logs/$(date +%F)-Daily-Log.md"\n`,
  };
}
