export type ParaFolderId =
  | '00_Inbox'
  | '01_Projects'
  | '02_Areas'
  | '03_Resources'
  | '04_Archives'
  | '05_Daily_Logs'
  | '06_Agent_Protocols';

export type AgentId = 'hermes' | 'claude-code' | 'codex' | 'openclaw';

export interface ParaFolderMeta {
  id: ParaFolderId;
  name: string;
  shortLabel: string;
  description: string;
  accentHex: string;
}

export interface NoteFrontmatter {
  title?: string;
  folder?: ParaFolderId;
  author?: string;
  agent?: AgentId | 'human';
  tags?: string[];
  updatedAt?: string;
  status?: string;
}

export interface VaultNote {
  /** Path relative to vault root, e.g. "01_Projects/SaaS-Launch-Pipeline.md" */
  path: string;
  /** Filename without .md extension, used for [[Wikilinks]] */
  slug: string;
  title: string;
  folder: ParaFolderId;
  content: string;
  body: string;
  frontmatter: NoteFrontmatter;
  wikilinks: string[];
  updatedAt: string;
  wordCount: number;
}

export interface AgentProfile {
  id: AgentId;
  name: string;
  role: string;
  protocolFile: string;
  focus: string;
  accentHex: string;
  sampleTasks: string[];
}

export interface AgentActivity {
  id: string;
  agentId: AgentId;
  agentName: string;
  action: 'read' | 'write' | 'handoff' | 'nightly-synthesis' | 'voice-brief';
  summary: string;
  targetPath: string;
  referencedPaths: string[];
  timestamp: string;
}

export interface BrokenLinkIssue {
  sourcePath: string;
  sourceTitle: string;
  missingTarget: string;
}

export interface VaultHealthReport {
  totalNotes: number;
  totalLinks: number;
  orphanNotes: VaultNote[];
  brokenLinks: BrokenLinkIssue[];
  oversizedNotes: VaultNote[];
  hasTodayLog: boolean;
  dailyLogCount: number;
  protocolCount: number;
  healthyRatio: number;
}

export interface GraphNode {
  id: string;
  slug: string;
  title: string;
  folder: ParaFolderId;
  x: number;
  y: number;
  degree: number;
  color: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface OrchestratorConfig {
  vaultPath: string;
  vaultName: string;
  enabledAgents: AgentId[];
  nightlyHour: string;
  includeVoiceAgent: boolean;
  isolatePersonalNotes: boolean;
}

export interface VoiceTurn {
  id: string;
  role: 'user' | 'apollo';
  text: string;
  citedNotes?: string[];
  audioBase64?: string | null;
  voiceName?: string;
  timestamp: string;
}
