import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import JSZip from 'jszip';
import {
  AGENT_PROFILES,
  PARA_FOLDERS,
  buildVaultNote,
  sanitizeSlug,
  serializeFrontmatter,
} from './src/utils/vaultLogic';
import { SEED_ACTIVITIES, SEED_VAULT_FILES } from './src/data/seedVault';
import type { AgentActivity, AgentId, ParaFolderId, VaultNote } from './src/types/vault';

const PORT = Number(process.env.PORT) || 3000;
const VAULT_ROOT = path.resolve(process.cwd(), 'vault-data');
const ACTIVITY_LOG_PATH = path.join(VAULT_ROOT, '.hermes-activities.json');

const VALID_FOLDER_IDS = new Set<string>(PARA_FOLDERS.map((f) => f.id));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add a Gemini API key in Settings > Secrets to run live agents and voice synthesis.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function resolveSafeVaultPath(relativeNotePath: string): {
  absPath: string;
  normalizedRel: string;
  folder: ParaFolderId;
} {
  const cleaned = relativeNotePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const segments = cleaned.split('/').filter(Boolean);
  if (segments.length !== 2) {
    throw new Error('Note path must follow "<PARA_Folder>/<Note-Name>.md".');
  }
  const [folder, rawFile] = segments;
  if (!VALID_FOLDER_IDS.has(folder)) {
    throw new Error(`Invalid PARA folder "${folder}".`);
  }
  if (!rawFile.endsWith('.md') || rawFile.includes('..') || rawFile.includes('\0')) {
    throw new Error('Note filename must be a safe .md file.');
  }
  const normalizedRel = `${folder}/${rawFile}`;
  const absPath = path.resolve(VAULT_ROOT, normalizedRel);
  if (!absPath.startsWith(VAULT_ROOT + path.sep)) {
    throw new Error('Path traversal detected.');
  }
  return { absPath, normalizedRel, folder: folder as ParaFolderId };
}

async function ensureVaultBootstrapped(): Promise<void> {
  await fs.mkdir(VAULT_ROOT, { recursive: true });
  for (const folder of PARA_FOLDERS) {
    await fs.mkdir(path.join(VAULT_ROOT, folder.id), { recursive: true });
  }

  // Check if vault already has markdown files
  let existingCount = 0;
  for (const folder of PARA_FOLDERS) {
    const dirPath = path.join(VAULT_ROOT, folder.id);
    const entries = await fs.readdir(dirPath);
    existingCount += entries.filter((e) => e.endsWith('.md')).length;
  }

  if (existingCount === 0) {
    for (const seed of SEED_VAULT_FILES) {
      const { absPath } = resolveSafeVaultPath(seed.path);
      await fs.writeFile(absPath, seed.content, 'utf8');
    }
  }

  if (!fsSync.existsSync(ACTIVITY_LOG_PATH)) {
    await fs.writeFile(ACTIVITY_LOG_PATH, JSON.stringify(SEED_ACTIVITIES, null, 2), 'utf8');
  }
}

async function readAllVaultNotes(): Promise<VaultNote[]> {
  await ensureVaultBootstrapped();
  const notes: VaultNote[] = [];

  for (const folder of PARA_FOLDERS) {
    const dirPath = path.join(VAULT_ROOT, folder.id);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const relPath = `${folder.id}/${entry.name}`;
      const absPath = path.join(dirPath, entry.name);
      const [rawContent, stat] = await Promise.all([
        fs.readFile(absPath, 'utf8'),
        fs.stat(absPath),
      ]);
      notes.push(buildVaultNote(relPath, rawContent, stat.mtime.toISOString()));
    }
  }

  return notes.sort((a, b) => a.path.localeCompare(b.path));
}

async function readActivities(): Promise<AgentActivity[]> {
  await ensureVaultBootstrapped();
  try {
    const raw = await fs.readFile(ACTIVITY_LOG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_ACTIVITIES;
  } catch {
    return SEED_ACTIVITIES;
  }
}

async function appendActivity(activity: Omit<AgentActivity, 'id' | 'timestamp'>): Promise<AgentActivity> {
  const list = await readActivities();
  const entry: AgentActivity = {
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [entry, ...list].slice(0, 50);
  await fs.writeFile(ACTIVITY_LOG_PATH, JSON.stringify(updated, null, 2), 'utf8');
  return entry;
}

function buildCompactVaultContext(notes: VaultNote[], maxChars = 24000): string {
  // Prioritize protocols, daily logs, and active projects first so context stays high-signal
  const priorityOrder: Record<ParaFolderId, number> = {
    '06_Agent_Protocols': 1,
    '05_Daily_Logs': 2,
    '01_Projects': 3,
    '02_Areas': 4,
    '03_Resources': 5,
    '00_Inbox': 6,
    '04_Archives': 7,
  };

  const sorted = [...notes].sort((a, b) => {
    const diff = priorityOrder[a.folder] - priorityOrder[b.folder];
    if (diff !== 0) return diff;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const chunks: string[] = [];
  let total = 0;
  for (const note of sorted) {
    const snippet = `### FILE: ${note.path} (slug: [[${note.slug}]])\n${note.body.slice(0, 2200)}\n`;
    if (total + snippet.length > maxChars) break;
    chunks.push(snippet);
    total += snippet.length;
  }

  return chunks.join('\n---\n');
}

async function startServer() {
  await ensureVaultBootstrapped();
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // 1. Read entire Obsidian Vault + recent multi-agent activities
  app.get('/api/vault', async (_req, res) => {
    try {
      const [notes, activities] = await Promise.all([readAllVaultNotes(), readActivities()]);
      res.json({ notes, activities, vaultRootName: 'Hermes-Shared-Brain' });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load vault' });
    }
  });

  // 2. Create or update a Markdown note in a PARA folder
  app.post('/api/vault/note', async (req, res) => {
    try {
      const { path: rawPath, folder, title, content, agent } = req.body as {
        path?: string;
        folder?: ParaFolderId;
        title?: string;
        content?: string;
        agent?: AgentId | 'human';
      };

      let targetPath = rawPath;
      if (!targetPath) {
        if (!folder || !VALID_FOLDER_IDS.has(folder)) {
          res.status(400).json({ error: 'Valid PARA folder is required.' });
          return;
        }
        if (!title || !title.trim()) {
          res.status(400).json({ error: 'Note title is required.' });
          return;
        }
        targetPath = `${folder}/${sanitizeSlug(title)}.md`;
      }

      const { absPath, normalizedRel, folder: safeFolder } = resolveSafeVaultPath(targetPath);
      const now = new Date().toISOString();

      let finalContent = typeof content === 'string' ? content : '';
      if (!finalContent.trim().startsWith('---')) {
        const noteTitle = title?.trim() || path.basename(normalizedRel, '.md').replace(/[-_]/g, ' ');
        finalContent = serializeFrontmatter(
          {
            title: noteTitle,
            folder: safeFolder,
            author: agent && agent !== 'human' ? agent : 'Workspace User',
            agent: agent ?? 'human',
            status: 'active',
            updatedAt: now,
          },
          finalContent || `# ${noteTitle}\n\nLinked to [[PROTOCOL]].\n`,
        );
      }

      await fs.writeFile(absPath, finalContent, 'utf8');
      const note = buildVaultNote(normalizedRel, finalContent, now);
      res.json({ note });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save note' });
    }
  });

  // 3. Delete a note from the Obsidian Vault
  app.delete('/api/vault/note', async (req, res) => {
    try {
      const notePath = String(req.query.path ?? '');
      const { absPath, normalizedRel } = resolveSafeVaultPath(notePath);
      await fs.unlink(absPath);
      res.json({ deleted: normalizedRel });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete note' });
    }
  });

  // 4. Bootstrap / repair PARA folders and missing protocol files
  app.post('/api/vault/bootstrap', async (_req, res) => {
    try {
      await fs.mkdir(VAULT_ROOT, { recursive: true });
      for (const folder of PARA_FOLDERS) {
        await fs.mkdir(path.join(VAULT_ROOT, folder.id), { recursive: true });
      }
      const created: string[] = [];
      for (const seed of SEED_VAULT_FILES) {
        if (!seed.path.startsWith('06_Agent_Protocols/')) continue;
        const { absPath } = resolveSafeVaultPath(seed.path);
        if (!fsSync.existsSync(absPath)) {
          await fs.writeFile(absPath, seed.content, 'utf8');
          created.push(seed.path);
        }
      }
      const notes = await readAllVaultNotes();
      res.json({ created, notes });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Bootstrap failed' });
    }
  });

  // 5. Export entire real Obsidian PARA Vault as a downloadable .zip
  app.get('/api/vault/export', async (_req, res) => {
    try {
      const notes = await readAllVaultNotes();
      const zip = new JSZip();
      for (const folder of PARA_FOLDERS) {
        zip.folder(folder.id);
      }
      for (const note of notes) {
        zip.file(note.path, note.content);
      }
      zip.file(
        'README.md',
        `# Hermes Shared AI Memory Vault (Obsidian PARA)\n\nOpen this folder directly in Obsidian ("Open folder as vault").\n\n- Master rules: \`06_Agent_Protocols/PROTOCOL.md\`\n- Long-term index: \`06_Agent_Protocols/MEMORY.md\`\n- Nightly logs: \`05_Daily_Logs/\`\n`,
      );
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="hermes-obsidian-vault.zip"');
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Export failed' });
    }
  });

  // 6. Run a Multi-Agent Shared-Memory Task (Hermes, Claude Code, Codex, OpenClaw)
  // Reads real vault context, executes task via Gemini, writes new/updated note + appends to Daily Log
  app.post('/api/agents/run', async (req, res) => {
    try {
      const { agentId, task, targetFolder } = req.body as {
        agentId: AgentId;
        task: string;
        targetFolder?: ParaFolderId;
      };

      const profile = AGENT_PROFILES.find((a) => a.id === agentId);
      if (!profile) {
        res.status(400).json({ error: 'Unknown agent selected.' });
        return;
      }
      if (!task || !task.trim()) {
        res.status(400).json({ error: 'Enter a task for the agent to execute.' });
        return;
      }

      const notes = await readAllVaultNotes();
      const context = buildCompactVaultContext(notes);
      const ai = getGeminiClient();

      const folderChoice: ParaFolderId =
        targetFolder && VALID_FOLDER_IDS.has(targetFolder) ? targetFolder : '01_Projects';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `SHARED OBSIDIAN VAULT CONTEXT:\n${context}\n\nUSER TASK FOR ${profile.name.toUpperCase()}:\n${task.trim()}`,
        config: {
          systemInstruction: `You are ${profile.name} (${profile.role}) operating inside a shared Obsidian PARA memory vault alongside Hermes, Claude Code, Codex, and OpenClaw.
You MUST read the provided shared vault context (including previous handoffs from other agents) and return structured JSON describing:
1. "reply": Concise, concrete response explaining what you read from the vault, what you executed, and what you handed off.
2. "noteTitle": A crisp title for a Markdown note to create or update inside ${folderChoice}.
3. "noteMarkdown": Clean Obsidian Markdown body (under 450 words) using [[Wikilinks]] to existing vault slugs where relevant.
4. "dailyLogBullet": One single concise bullet summarizing what ${profile.name} finished and any @NextAgent handoff to append to today's Daily Log.
5. "referencedSlugs": Array of existing note slugs you read and relied upon.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              noteTitle: { type: Type.STRING },
              noteMarkdown: { type: Type.STRING },
              dailyLogBullet: { type: Type.STRING },
              referencedSlugs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['reply', 'noteTitle', 'noteMarkdown', 'dailyLogBullet', 'referencedSlugs'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        reply: string;
        noteTitle: string;
        noteMarkdown: string;
        dailyLogBullet: string;
        referencedSlugs: string[];
      };

      const now = new Date().toISOString();
      const slug = sanitizeSlug(parsed.noteTitle || `${profile.name}-Update`);
      const targetRelPath = `${folderChoice}/${slug}.md`;
      const { absPath } = resolveSafeVaultPath(targetRelPath);

      const fullNoteContent = serializeFrontmatter(
        {
          title: parsed.noteTitle || slug.replace(/-/g, ' '),
          folder: folderChoice,
          author: profile.name,
          agent: profile.id,
          status: 'active',
          tags: [profile.id, 'shared-memory'],
          updatedAt: now,
        },
        parsed.noteMarkdown || `# ${parsed.noteTitle}\n\n${parsed.reply}\n`,
      );
      await fs.writeFile(absPath, fullNoteContent, 'utf8');

      // Also append concise cross-agent handoff bullet to today's Daily Log
      const todayDate = now.slice(0, 10);
      const dailyLogRel = `05_Daily_Logs/${todayDate}-Daily-Log.md`;
      const { absPath: dailyAbs } = resolveSafeVaultPath(dailyLogRel);
      const bulletLine = `- **${profile.name}** (${now.slice(11, 16)} UTC): ${parsed.dailyLogBullet} (see [[${slug}]])`;

      if (fsSync.existsSync(dailyAbs)) {
        const existingLog = await fs.readFile(dailyAbs, 'utf8');
        await fs.writeFile(dailyAbs, `${existingLog.trimEnd()}\n${bulletLine}\n`, 'utf8');
      } else {
        const freshLog = serializeFrontmatter(
          {
            title: `${todayDate} Nightly Agent Log`,
            folder: '05_Daily_Logs',
            author: 'Hermes Orchestrator',
            agent: 'hermes',
            status: 'live',
            tags: ['daily-log', 'rolling'],
            updatedAt: now,
          },
          `# ${todayDate} Daily Agent Log\n\nLinked from [[MEMORY]] and [[PROTOCOL]].\n\n## Agent Activity\n\n${bulletLine}\n`,
        );
        await fs.writeFile(dailyAbs, freshLog, 'utf8');
      }

      const referencedPaths = (parsed.referencedSlugs ?? [])
        .map((s) => notes.find((n) => n.slug.toLowerCase() === s.toLowerCase())?.path)
        .filter((p): p is string => Boolean(p));

      const activity = await appendActivity({
        agentId: profile.id,
        agentName: profile.name,
        action: 'handoff',
        summary: parsed.dailyLogBullet || parsed.reply.slice(0, 160),
        targetPath: targetRelPath,
        referencedPaths,
      });

      const updatedNotes = await readAllVaultNotes();
      res.json({
        reply: parsed.reply,
        createdNotePath: targetRelPath,
        dailyLogPath: dailyLogRel,
        referencedSlugs: parsed.referencedSlugs ?? [],
        activity,
        notes: updatedNotes,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Agent execution failed.',
      });
    }
  });

  // 7. Run Nightly Agent Log Synthesis (writes structured YYYY-MM-DD-Daily-Log.md)
  app.post('/api/nightly/synthesize', async (_req, res) => {
    try {
      const [notes, activities] = await Promise.all([readAllVaultNotes(), readActivities()]);
      const context = buildCompactVaultContext(notes);
      const recentActivityText = activities
        .slice(0, 12)
        .map((a) => `- [${a.timestamp}] ${a.agentName} (${a.action}) -> ${a.targetPath}: ${a.summary}`)
        .join('\n');

      const ai = getGeminiClient();
      const todayDate = new Date().toISOString().slice(0, 10);

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `VAULT NOTES:\n${context}\n\nRECENT AGENT ACTIVITY:\n${recentActivityText}\n\nCompile the structured Nightly Agent Log for ${todayDate}.`,
        config: {
          systemInstruction: `You are Hermes Orchestrator running the automated 23:30 Nightly Agent Log routine for a shared Obsidian PARA vault.
Output ONLY clean Obsidian Markdown (no YAML frontmatter, no outer markdown code fences) under 420 words with these exact sections:
# ${todayDate} Nightly Agent Log
## Completed Today
## Decisions & Learnings
## Cross-Agent Handoffs
## Tomorrow's Top 3 Priorities
Use [[Note-Slug]] wikilinks to reference real notes in the vault.`,
        },
      });

      const body = (response.text ?? '').trim().replace(/^```(?:markdown|md)?\n?|\n?```$/g, '');
      const now = new Date().toISOString();
      const relPath = `05_Daily_Logs/${todayDate}-Daily-Log.md`;
      const { absPath } = resolveSafeVaultPath(relPath);

      const fullContent = serializeFrontmatter(
        {
          title: `${todayDate} Nightly Agent Log`,
          folder: '05_Daily_Logs',
          author: 'Hermes Orchestrator',
          agent: 'hermes',
          status: 'finalized',
          tags: ['daily-log', 'nightly-sync'],
          updatedAt: now,
        },
        body || `# ${todayDate} Nightly Agent Log\n\nNo entries synthesized.`,
      );

      await fs.writeFile(absPath, fullContent, 'utf8');
      const activity = await appendActivity({
        agentId: 'hermes',
        agentName: 'Hermes',
        action: 'nightly-synthesis',
        summary: `Synthesized nightly log ${todayDate}-Daily-Log.md across all active vault notes.`,
        targetPath: relPath,
        referencedPaths: ['06_Agent_Protocols/MEMORY.md'],
      });

      const updatedNotes = await readAllVaultNotes();
      res.json({ logPath: relPath, note: buildVaultNote(relPath, fullContent, now), activity, notes: updatedNotes });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Nightly log synthesis failed.',
      });
    }
  });

  // 8. Morning Brief (Hermes summarizes latest Daily Logs & Active Projects)
  app.post('/api/nightly/morning-brief', async (_req, res) => {
    try {
      const notes = await readAllVaultNotes();
      const context = buildCompactVaultContext(notes);
      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `VAULT CONTEXT:\n${context}\n\nGenerate my crisp Morning Brief based on the latest Daily Logs and active 01_Projects notes.`,
        config: {
          systemInstruction: `You are Hermes delivering a spoken-friendly Morning Brief from the user's shared Obsidian vault.
Keep it under 180 words, crisp, natural prose (no raw markdown symbols like ## or **), covering:
1. What agents shipped overnight.
2. Active blockers to unblock first.
3. Recommended first handoff for today.
Also mention exact note names naturally.`,
        },
      });

      const briefText = (response.text ?? '').trim();
      res.json({ brief: briefText });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to generate Morning Brief.',
      });
    }
  });

  // 9. Apollo Voice Agent Q&A + Optional Real Gemini TTS Audio (gemini-3.8-flash-lite-tts)
  app.post('/api/voice/ask', async (req, res) => {
    try {
      const { question, voiceName = 'Kore', speak = true } = req.body as {
        question: string;
        voiceName?: string;
        speak?: boolean;
      };

      if (!question || !question.trim()) {
        res.status(400).json({ error: 'Ask Apollo a question about your Obsidian vault.' });
        return;
      }

      const notes = await readAllVaultNotes();
      const context = buildCompactVaultContext(notes);
      const ai = getGeminiClient();

      const qaResponse = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `SHARED OBSIDIAN VAULT:\n${context}\n\nUSER SPOKEN QUESTION:\n${question.trim()}`,
        config: {
          systemInstruction: `You are Apollo, the voice interface connected to the user's shared Obsidian PARA memory vault (Hermes, Claude Code, Codex, OpenClaw).
Answer strictly from the vault notes without hallucinating. Keep your spoken answer concise (2 to 5 crisp sentences) and natural to hear aloud (no markdown tables or hashtags).
Return JSON with "answer" (string) and "citedNotes" (array of matching note slugs from the vault).`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING },
              citedNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['answer', 'citedNotes'],
          },
        },
      });

      const parsed = JSON.parse((qaResponse.text ?? '{}').trim()) as {
        answer: string;
        citedNotes: string[];
      };

      let audioBase64: string | null = null;
      let ttsWarning: string | null = null;

      if (speak && parsed.answer) {
        try {
          const validVoices = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr']);
          const safeVoice = validVoices.has(voiceName) ? voiceName : 'Kore';
          const ttsResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: parsed.answer,
                    speechMetadata: {
                      style: 'Calm, articulate technical briefing assistant',
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: safeVoice },
                },
              },
            },
          });
          audioBase64 =
            ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
        } catch (ttsErr) {
          ttsWarning =
            ttsErr instanceof Error ? ttsErr.message : 'Audio synthesis unavailable.';
        }
      }

      await appendActivity({
        agentId: 'hermes',
        agentName: 'Apollo Voice',
        action: 'voice-brief',
        summary: `Answered voice query: "${question.trim().slice(0, 90)}"`,
        targetPath: '01_Projects/Voice-Agent-Integration.md',
        referencedPaths: (parsed.citedNotes ?? [])
          .map((s) => notes.find((n) => n.slug.toLowerCase() === s.toLowerCase())?.path)
          .filter((p): p is string => Boolean(p)),
      });

      res.json({
        answer: parsed.answer,
        citedNotes: parsed.citedNotes ?? [],
        audioBase64,
        voiceName,
        ttsWarning,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Apollo voice query failed.',
      });
    }
  });

  // 10. Read Any Vault Note Aloud via Gemini TTS (gemini-3.8-flash-lite-tts)
  app.post('/api/voice/speak', async (req, res) => {
    try {
      const { text, voiceName = 'Kore' } = req.body as {
        text: string;
        voiceName?: string;
      };
      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Text to read aloud is required.' });
        return;
      }

      // Clean markdown punctuation for smooth narration and cap length for crisp latency
      const cleaned = text
        .replace(/^---[\s\S]*?---\s*/m, '')
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/[#*`_>~]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1400);

      const ai = getGeminiClient();
      const validVoices = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr']);
      const safeVoice = validVoices.has(voiceName) ? voiceName : 'Kore';

      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleaned,
                speechMetadata: {
                  style: 'Clear, grounded executive narrator',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: safeVoice },
            },
          },
        },
      });

      const audioBase64 =
        ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
      if (!audioBase64) {
        res.status(502).json({ error: 'Speech model returned no audio payload.' });
        return;
      }

      res.json({ audioBase64, voiceName: safeVoice });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Speech synthesis failed.',
      });
    }
  });

  // Mount Vite middleware in development or serve built dist/ in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hermes Obsidian Vault server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
