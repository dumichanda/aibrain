import type { AgentActivity, AgentId, ParaFolderId, VaultNote } from '../types/vault';

export interface VaultStateResponse {
  notes: VaultNote[];
  activities: AgentActivity[];
  vaultRootName: string;
}

export interface AgentRunResponse {
  reply: string;
  createdNotePath: string;
  dailyLogPath: string;
  referencedSlugs: string[];
  activity: AgentActivity;
  notes: VaultNote[];
}

export interface NightlySynthesisResponse {
  logPath: string;
  note: VaultNote;
  activity: AgentActivity;
  notes: VaultNote[];
}

export interface VoiceAskResponse {
  answer: string;
  citedNotes: string[];
  audioBase64: string | null;
  voiceName: string;
  ttsWarning: string | null;
}

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchVaultState(): Promise<VaultStateResponse> {
  const res = await fetch('/api/vault');
  return handleJson<VaultStateResponse>(res);
}

export async function saveVaultNote(payload: {
  path?: string;
  folder?: ParaFolderId;
  title?: string;
  content: string;
  agent?: AgentId | 'human';
}): Promise<{ note: VaultNote }> {
  const res = await fetch('/api/vault/note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson<{ note: VaultNote }>(res);
}

export async function deleteVaultNote(notePath: string): Promise<{ deleted: string }> {
  const res = await fetch(`/api/vault/note?path=${encodeURIComponent(notePath)}`, {
    method: 'DELETE',
  });
  return handleJson<{ deleted: string }>(res);
}

export async function bootstrapVaultProtocols(): Promise<{
  created: string[];
  notes: VaultNote[];
}> {
  const res = await fetch('/api/vault/bootstrap', { method: 'POST' });
  return handleJson<{ created: string[]; notes: VaultNote[] }>(res);
}

export async function runAgentTask(payload: {
  agentId: AgentId;
  task: string;
  targetFolder: ParaFolderId;
}): Promise<AgentRunResponse> {
  const res = await fetch('/api/agents/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson<AgentRunResponse>(res);
}

export async function runNightlySynthesis(): Promise<NightlySynthesisResponse> {
  const res = await fetch('/api/nightly/synthesize', { method: 'POST' });
  return handleJson<NightlySynthesisResponse>(res);
}

export async function generateMorningBrief(): Promise<{ brief: string }> {
  const res = await fetch('/api/nightly/morning-brief', { method: 'POST' });
  return handleJson<{ brief: string }>(res);
}

export async function askApolloVoice(payload: {
  question: string;
  voiceName: string;
  speak: boolean;
}): Promise<VoiceAskResponse> {
  const res = await fetch('/api/voice/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson<VoiceAskResponse>(res);
}

export async function speakTextWithApollo(payload: {
  text: string;
  voiceName: string;
}): Promise<{ audioBase64: string; voiceName: string }> {
  const res = await fetch('/api/voice/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson<{ audioBase64: string; voiceName: string }>(res);
}
