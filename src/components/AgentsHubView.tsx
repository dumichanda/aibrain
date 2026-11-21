import React, { useState } from 'react';
import { ArrowRight, ExternalLink, Play, RefreshCw } from 'lucide-react';
import type { AgentActivity, AgentId, ParaFolderId, VaultNote } from '../types/vault';
import { AGENT_PROFILES, PARA_FOLDERS } from '../utils/vaultLogic';
import type { AgentRunResponse } from '../services/api';

interface AgentsHubViewProps {
  notes: VaultNote[];
  activities: AgentActivity[];
  onRunAgent: (payload: {
    agentId: AgentId;
    task: string;
    targetFolder: ParaFolderId;
  }) => Promise<AgentRunResponse>;
  onOpenNoteInVault: (notePath: string) => void;
}

export const AgentsHubView: React.FC<AgentsHubViewProps> = ({
  notes,
  activities,
  onRunAgent,
  onOpenNoteInVault,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>('claude-code');
  const [targetFolder, setTargetFolder] = useState<ParaFolderId>('01_Projects');
  const [taskInput, setTaskInput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<AgentRunResponse | null>(null);

  const selectedAgent =
    AGENT_PROFILES.find((a) => a.id === selectedAgentId) ?? AGENT_PROFILES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) {
      setError('Enter a task or select one of the suggested handoff prompts below.');
      return;
    }
    setError(null);
    setRunning(true);
    try {
      const result = await onRunAgent({
        agentId: selectedAgentId,
        task: taskInput.trim(),
        targetFolder,
      });
      setLastRun(result);
      setTaskInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent execution failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#F9FAFB] dark:bg-[#111215]">
      <div className="max-w-[1240px] mx-auto px-6 py-7 space-y-8">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 dark:border-[#242833] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Multi-Agent Shared Brain
            </h1>
            <p className="text-sm text-neutral-600 dark:text-[#9BA3B4] mt-1 max-w-2xl">
              Every connected agent reads from and writes to the same Obsidian PARA vault. Run a
              task with one agent, then switch to another — it immediately inherits the logged
              context without manual copy-pasting.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-neutral-500 dark:text-[#848C9E]">
            {AGENT_PROFILES.length} agents linked · {notes.length} shared notes
          </div>
        </div>

        {/* Connected Agents Grid */}
        <section aria-label="Connected AI agents">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {AGENT_PROFILES.map((agent) => {
              const isSelected = agent.id === selectedAgentId;
              const pointerExists = notes.some((n) => n.path === agent.protocolFile);
              const lastAct = activities.find((a) => a.agentId === agent.id);
              return (
                <div
                  key={agent.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-colors ${
                    isSelected
                      ? 'border-[#8B5CF6] bg-white dark:bg-[#191C24]'
                      : 'border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                        {agent.name}
                      </h2>
                      <span
                        className="text-xs font-medium"
                        style={{ color: agent.accentHex }}
                      >
                        {pointerExists ? 'Linked' : 'Unlinked'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-neutral-500 dark:text-[#8C94A6] mt-0.5">
                      {agent.role}
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-[#9BA3B4] leading-relaxed mt-3">
                      {agent.focus}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-[#222630] space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 dark:text-[#7E869A]">
                      <span className="truncate">{agent.protocolFile.split('/').pop()}</span>
                      {pointerExists && (
                        <button
                          type="button"
                          onClick={() => onOpenNoteInVault(agent.protocolFile)}
                          className="inline-flex items-center gap-1 text-[#7C3AED] dark:text-[#A78BFA] hover:underline shrink-0 cursor-pointer"
                        >
                          Inspect
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {lastAct && (
                      <p className="text-[11px] text-neutral-500 dark:text-[#7E869A] line-clamp-2">
                        Last sync: {lastAct.summary}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`w-full py-1.5 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#8B5CF6] text-white'
                          : 'bg-neutral-100 dark:bg-[#222630] text-neutral-800 dark:text-[#D5D9E4] hover:bg-neutral-200 dark:hover:bg-[#2B303D]'
                      }`}
                    >
                      {isSelected ? `Active: ${agent.name}` : `Select ${agent.name}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Live Shared-Memory Task Runner */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                  Execute Task with {selectedAgent.name}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-[#848C9E]">
                  Reads shared vault memory, writes a linked PARA note, and appends a Daily Log
                  handoff automatically.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="agent-target-folder"
                  className="text-xs text-neutral-500 dark:text-[#848C9E]"
                >
                  Write to:
                </label>
                <select
                  id="agent-target-folder"
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value as ParaFolderId)}
                  className="px-2.5 py-1.5 text-xs font-mono rounded-md bg-neutral-50 dark:bg-[#111215] border border-neutral-200 dark:border-[#2B303C] text-neutral-900 dark:text-[#E8EAF0] focus:outline-none focus:border-[#8B5CF6]"
                >
                  {PARA_FOLDERS.filter((f) => f.id !== '06_Agent_Protocols').map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="agent-task-input" className="sr-only">
                Task instruction for {selectedAgent.name}
              </label>
              <textarea
                id="agent-task-input"
                rows={4}
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder={`Ask ${selectedAgent.name} to read the shared Obsidian vault and complete a task...`}
                className="w-full p-3.5 text-sm rounded-lg bg-neutral-50 dark:bg-[#111215] border border-neutral-200 dark:border-[#2B303C] text-neutral-900 dark:text-[#E8EAF0] placeholder:text-neutral-400 dark:placeholder:text-[#636B7E] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-neutral-500 dark:text-[#848C9E]">
                Quick cross-agent handoff prompts for {selectedAgent.name}:
              </div>
              <div className="space-y-1.5">
                {selectedAgent.sampleTasks.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setTaskInput(sample)}
                    className="w-full text-left px-3 py-2 text-xs rounded-md border border-neutral-200 dark:border-[#242833] bg-neutral-50 dark:bg-[#111215] text-neutral-700 dark:text-[#B9C0D0] hover:border-[#8B5CF6]/70 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-500 dark:text-[#7E869A]">
                Context source: <code className="font-mono">PROTOCOL.md</code> +{' '}
                <code className="font-mono">05_Daily_Logs/</code>
              </span>
              <button
                type="submit"
                disabled={running}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {running ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {running ? `Running ${selectedAgent.name}...` : `Run ${selectedAgent.name}`}
              </button>
            </div>

            {lastRun && (
              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-[#242833] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    Shared Memory Output ({lastRun.activity.agentName})
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Written to Obsidian Vault
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-neutral-700 dark:text-[#CFD5E2]">
                  {lastRun.reply}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => onOpenNoteInVault(lastRun.createdNotePath)}
                    className="inline-flex items-center gap-1 font-mono text-[#7C3AED] dark:text-[#A78BFA] hover:underline cursor-pointer"
                  >
                    Open {lastRun.createdNotePath}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <span aria-hidden="true" className="text-neutral-400">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenNoteInVault(lastRun.dailyLogPath)}
                    className="inline-flex items-center gap-1 font-mono text-[#7C3AED] dark:text-[#A78BFA] hover:underline cursor-pointer"
                  >
                    Open {lastRun.dailyLogPath}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Cross-Agent Handoff Activity Table */}
          <div className="lg:col-span-5 rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-[#242833] flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Shared Memory Activity Log
              </h2>
              <span className="text-xs font-mono tabular-nums text-neutral-500 dark:text-[#7E869A]">
                {activities.length} events
              </span>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-[#222630] max-h-[520px] overflow-y-auto">
              {activities.map((act) => (
                <div key={act.id} className="px-5 py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-neutral-900 dark:text-[#E8EAF0]">
                      {act.agentName}
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-neutral-500 dark:text-[#7E869A]">
                      {act.timestamp.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-neutral-600 dark:text-[#9BA3B4]">
                    {act.summary}
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenNoteInVault(act.targetPath)}
                    className="text-[11px] font-mono text-[#7C3AED] dark:text-[#A78BFA] hover:underline cursor-pointer"
                  >
                    {act.targetPath}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
