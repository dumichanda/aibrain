import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeVaultHealth,
  buildVaultNote,
  computeBacklinks,
  computeGraphLayout,
  generateOrchestratorPrompt,
  parseFrontmatter,
  parseWikilinks,
  serializeFrontmatter,
} from './vaultLogic';

test('parseWikilinks extracts targets and aliases while ignoring code blocks', () => {
  const md = [
    '# Sample Note',
    'See [[PROTOCOL]] and [[SaaS-Launch-Pipeline|Launch Plan]] for details.',
    'Also check [[03_Resources/Obsidian-PARA-Playbook#Rules]].',
    'Inline code `[[Not-A-Link]]` should be ignored.',
    '```md',
    '[[Also-Not-A-Link]]',
    '```',
  ].join('\n');

  const links = parseWikilinks(md);
  assert.deepEqual(links, [
    'PROTOCOL',
    'SaaS-Launch-Pipeline',
    'Obsidian-PARA-Playbook',
  ]);
});

test('parseFrontmatter and serializeFrontmatter round-trip metadata cleanly', () => {
  const serialized = serializeFrontmatter(
    {
      title: 'Shared Memory Protocol',
      folder: '06_Agent_Protocols',
      author: 'Hermes',
      agent: 'hermes',
      status: 'active',
      tags: ['protocol', 'para', 'memory'],
      updatedAt: '2026-11-21T08:00:00Z',
    },
    '# Shared Memory Protocol\n\nAll agents read [[MEMORY]].',
  );

  const parsed = parseFrontmatter(serialized);
  assert.equal(parsed.frontmatter.title, 'Shared Memory Protocol');
  assert.equal(parsed.frontmatter.folder, '06_Agent_Protocols');
  assert.equal(parsed.frontmatter.agent, 'hermes');
  assert.deepEqual(parsed.frontmatter.tags, ['protocol', 'para', 'memory']);
  assert.ok(parsed.body.includes('All agents read [[MEMORY]].'));
});

test('computeBacklinks maps incoming links across PARA folders', () => {
  const protocol = buildVaultNote(
    '06_Agent_Protocols/PROTOCOL.md',
    '# Protocol\nCore rules.',
  );
  const project = buildVaultNote(
    '01_Projects/SaaS-Launch.md',
    '# SaaS Launch\nFollows [[PROTOCOL]] and links [[NonExistent]].',
  );
  const log = buildVaultNote(
    '05_Daily_Logs/2026-11-21-Daily-Log.md',
    '# Daily Log\nUpdated [[SaaS-Launch]] per [[PROTOCOL]].',
  );

  const backlinks = computeBacklinks([protocol, project, log]);
  assert.equal(backlinks[protocol.path].length, 2);
  assert.equal(backlinks[project.path].length, 1);
  assert.equal(backlinks[log.path].length, 0);
});

test('analyzeVaultHealth flags orphan notes, broken links, and missing today log', () => {
  const connected = buildVaultNote(
    '06_Agent_Protocols/PROTOCOL.md',
    '# Protocol\nSee [[Missing-Spec]].',
  );
  const orphan = buildVaultNote(
    '00_Inbox/Stray-Thought.md',
    '# Stray Thought\nNo links here.',
  );

  const report = analyzeVaultHealth([connected, orphan], '2026-11-21');
  assert.equal(report.totalNotes, 2);
  assert.equal(report.orphanNotes.length, 1);
  assert.equal(report.orphanNotes[0].slug, 'Stray-Thought');
  assert.equal(report.brokenLinks.length, 1);
  assert.equal(report.brokenLinks[0].missingTarget, 'Missing-Spec');
  assert.equal(report.hasTodayLog, false);
});

test('computeGraphLayout returns bounded finite coordinates and undirected edges', () => {
  const a = buildVaultNote('06_Agent_Protocols/PROTOCOL.md', '# Protocol\n[[Alpha]]');
  const b = buildVaultNote('01_Projects/Alpha.md', '# Alpha\n[[PROTOCOL]]');
  const layout = computeGraphLayout([a, b], 800, 500);

  assert.equal(layout.nodes.length, 2);
  assert.equal(layout.edges.length, 1);
  for (const node of layout.nodes) {
    assert.ok(Number.isFinite(node.x) && node.x >= 0 && node.x <= 800);
    assert.ok(Number.isFinite(node.y) && node.y >= 0 && node.y <= 500);
  }
});

test('generateOrchestratorPrompt embeds vault path, enabled agents, and schedule', () => {
  const prompt = generateOrchestratorPrompt({
    vaultPath: '~/Obsidian/AgentOS-Brain',
    vaultName: 'AgentOS Brain',
    enabledAgents: ['hermes', 'claude-code', 'openclaw'],
    nightlyHour: '23:30',
    includeVoiceAgent: true,
    isolatePersonalNotes: true,
  });

  assert.ok(prompt.includes('OBSIDIAN_VAULT_PATH="~/Obsidian/AgentOS-Brain"'));
  assert.ok(prompt.includes('Hermes'));
  assert.ok(prompt.includes('Claude Code'));
  assert.ok(prompt.includes('OpenClaw'));
  assert.ok(!prompt.includes('**Codex**'));
  assert.ok(prompt.includes('23:30'));
  assert.ok(prompt.includes('Apollo Voice Agent'));
});
