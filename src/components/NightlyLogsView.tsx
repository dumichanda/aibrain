import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Moon,
  RefreshCw,
  Sun,
  Volume2,
} from 'lucide-react';
import type { VaultNote } from '../types/vault';
import { analyzeVaultHealth } from '../utils/vaultLogic';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { NightlySynthesisResponse } from '../services/api';

interface NightlyLogsViewProps {
  notes: VaultNote[];
  onRunNightlySynthesis: () => Promise<NightlySynthesisResponse>;
  onGenerateMorningBrief: () => Promise<{ brief: string }>;
  onSpeakText: (text: string, label: string) => void;
  onOpenNoteInVault: (notePath: string) => void;
}

export const NightlyLogsView: React.FC<NightlyLogsViewProps> = ({
  notes,
  onRunNightlySynthesis,
  onGenerateMorningBrief,
  onSpeakText,
  onOpenNoteInVault,
}) => {
  const dailyLogs = useMemo(
    () =>
      notes
        .filter((n) => n.folder === '05_Daily_Logs')
        .sort((a, b) => b.slug.localeCompare(a.slug)),
    [notes],
  );

  const [selectedLogPath, setSelectedLogPath] = useState<string | null>(
    dailyLogs[0]?.path ?? null,
  );
  const [synthesizing, setSynthesizing] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [morningBrief, setMorningBrief] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeLog =
    dailyLogs.find((l) => l.path === selectedLogPath) ?? dailyLogs[0] ?? null;

  const health = useMemo(() => analyzeVaultHealth(notes), [notes]);

  const handleSynthesize = async () => {
    setError(null);
    setSynthesizing(true);
    try {
      const result = await onRunNightlySynthesis();
      setSelectedLogPath(result.logPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nightly synthesis failed.');
    } finally {
      setSynthesizing(false);
    }
  };

  const handleMorningBrief = async () => {
    setError(null);
    setBriefing(true);
    try {
      const result = await onGenerateMorningBrief();
      setMorningBrief(result.brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Morning brief failed.');
    } finally {
      setBriefing(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#F9FAFB] dark:bg-[#111215]">
      <div className="max-w-[1240px] mx-auto px-6 py-7 space-y-7">
        {/* Header & Primary Routines */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 dark:border-[#242833] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Nightly Agent Logs & Morning Brief
            </h1>
            <p className="text-sm text-neutral-600 dark:text-[#9BA3B4] mt-1 max-w-2xl">
              Every night at 23:30, Hermes condenses work across Claude Code, Codex, and OpenClaw
              into a concise Markdown log so incoming agents start warm the next morning.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleMorningBrief}
              disabled={briefing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border border-neutral-200 dark:border-[#2B303C] bg-white dark:bg-[#1C1F26] text-neutral-800 dark:text-[#E8EAF0] hover:border-[#8B5CF6] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {briefing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
              {briefing ? 'Compiling Brief...' : 'Generate Morning Brief'}
            </button>

            <button
              type="button"
              onClick={handleSynthesize}
              disabled={synthesizing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {synthesizing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
              {synthesizing ? 'Synthesizing Log...' : 'Run Nightly Log Now'}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
          >
            {error}
          </div>
        )}

        {/* Morning Brief Output Card */}
        {morningBrief && (
          <section className="rounded-xl border border-[#8B5CF6]/40 bg-white dark:bg-[#171922] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                Hermes Morning Brief
              </h2>
              <button
                type="button"
                onClick={() => onSpeakText(morningBrief, 'Morning Brief')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Listen with Apollo
              </button>
            </div>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-[#D5D9E4]">
              {morningBrief}
            </p>
          </section>
        )}

        {/* Metrics Summary Row */}
        <section
          aria-label="Vault memory metrics"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] p-4">
            <div className="text-xs text-neutral-500 dark:text-[#848C9E]">Daily Logs</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
              {health.dailyLogCount}
            </div>
            <div className="text-xs text-neutral-500 dark:text-[#7E869A] mt-1">
              Stored in 05_Daily_Logs/
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] p-4">
            <div className="text-xs text-neutral-500 dark:text-[#848C9E]">Vault Notes</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
              {health.totalNotes}
            </div>
            <div className="text-xs text-neutral-500 dark:text-[#7E869A] mt-1">
              {health.protocolCount} protocol configs active
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] p-4">
            <div className="text-xs text-neutral-500 dark:text-[#848C9E]">Wikilink Edges</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
              {health.totalLinks}
            </div>
            <div className="text-xs text-neutral-500 dark:text-[#7E869A] mt-1">
              {health.brokenLinks.length} broken targets
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] p-4">
            <div className="text-xs text-neutral-500 dark:text-[#848C9E]">Orphan Notes</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
              {health.orphanNotes.length}
            </div>
            <div className="text-xs text-neutral-500 dark:text-[#7E869A] mt-1">
              {health.oversizedNotes.length} notes over 1,200 words
            </div>
          </div>
        </section>

        {/* Main 2-Column Content: Daily Logs Reader + Memory Health Check */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Daily Logs Reader */}
          <div className="lg:col-span-8 rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-neutral-200 dark:border-[#242833]">
              <div className="flex items-center gap-2 overflow-x-auto">
                <Calendar className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                {dailyLogs.map((log) => (
                  <button
                    key={log.path}
                    type="button"
                    onClick={() => setSelectedLogPath(log.path)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeLog?.path === log.path
                        ? 'bg-[#8B5CF6]/15 text-[#6D28D9] dark:text-[#C4B5FD] font-medium'
                        : 'text-neutral-600 dark:text-[#8C94A6] hover:bg-neutral-100 dark:hover:bg-[#222630]'
                    }`}
                  >
                    {log.slug.replace('-Daily-Log', '')}
                  </button>
                ))}
              </div>
              {activeLog && (
                <button
                  type="button"
                  onClick={() => onOpenNoteInVault(activeLog.path)}
                  className="text-xs text-[#7C3AED] dark:text-[#A78BFA] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Edit in Vault
                </button>
              )}
            </div>

            <div className="p-6">
              {activeLog ? (
                <MarkdownRenderer
                  markdown={activeLog.body}
                  notes={notes}
                  onNavigateNote={onOpenNoteInVault}
                />
              ) : (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-neutral-500 dark:text-[#8C94A6]">
                    No nightly logs recorded yet.
                  </p>
                  <button
                    type="button"
                    onClick={handleSynthesize}
                    className="px-4 py-2 text-xs font-medium rounded-md bg-[#8B5CF6] text-white"
                  >
                    Generate First Nightly Log
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Memory Health Diagnostics */}
          <div className="lg:col-span-4 rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] p-5 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Memory Health Check
              </h2>
              <p className="text-xs text-neutral-500 dark:text-[#848C9E] mt-1">
                Keeps your Obsidian brain clean so agents avoid token bloat and dead links.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 pb-3 border-b border-neutral-100 dark:border-[#222630]">
                {health.brokenLinks.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-neutral-900 dark:text-[#E8EAF0]">
                    Wikilink Integrity
                  </div>
                  {health.brokenLinks.length === 0 ? (
                    <p className="text-neutral-500 dark:text-[#848C9E] mt-0.5">
                      All {health.totalLinks} wikilinks resolve to valid PARA notes.
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-1">
                      {health.brokenLinks.map((issue) => (
                        <li
                          key={`${issue.sourcePath}-${issue.missingTarget}`}
                          className="flex items-center justify-between gap-2 text-amber-700 dark:text-amber-400"
                        >
                          <span className="truncate font-mono">
                            [[{issue.missingTarget}]]
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenNoteInVault(issue.sourcePath)}
                            className="underline shrink-0 cursor-pointer"
                          >
                            Fix
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5 pb-3 border-b border-neutral-100 dark:border-[#222630]">
                {health.orphanNotes.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-neutral-900 dark:text-[#E8EAF0]">
                    Graph Connectivity
                  </div>
                  {health.orphanNotes.length === 0 ? (
                    <p className="text-neutral-500 dark:text-[#848C9E] mt-0.5">
                      Zero orphan notes — every active file connects to the Memory Galaxy.
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-1">
                      {health.orphanNotes.map((orphan) => (
                        <li
                          key={orphan.path}
                          className="flex items-center justify-between gap-2 text-neutral-600 dark:text-[#9BA3B4]"
                        >
                          <span className="truncate font-mono">{orphan.slug}</span>
                          <button
                            type="button"
                            onClick={() => onOpenNoteInVault(orphan.path)}
                            className="text-[#7C3AED] dark:text-[#A78BFA] hover:underline shrink-0 cursor-pointer"
                          >
                            Link
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                {health.oversizedNotes.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-neutral-900 dark:text-[#E8EAF0]">
                    Token Bloat Guard (&le; 1,200 words)
                  </div>
                  <p className="text-neutral-500 dark:text-[#848C9E] mt-0.5">
                    {health.oversizedNotes.length === 0
                      ? 'All notes are concise enough for low-latency agent boot reads.'
                      : `${health.oversizedNotes.length} note(s) exceed 1,200 words and should be split into linked sub-notes.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
