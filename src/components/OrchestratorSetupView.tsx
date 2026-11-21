import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FolderCheck, ShieldAlert } from 'lucide-react';
import type { AgentId, OrchestratorConfig } from '../types/vault';
import {
  AGENT_PROFILES,
  generateAgentPointerConfigs,
  generateOrchestratorPrompt,
} from '../utils/vaultLogic';

interface OrchestratorSetupViewProps {
  onBootstrapVault: () => Promise<{ created: string[] }>;
}

const PITFALLS = [
  {
    mistake: 'Wiring every AI agent manually by hand',
    fix: 'Run one Orchestrator Mega-Prompt so Claude Code, Codex, or Hermes scaffolds all PARA folders and pointer files automatically.',
  },
  {
    mistake: 'Pointing agents at your personal Obsidian vault',
    fix: 'Isolate a dedicated AgentOS vault so private journals, finances, and passwords are never exposed to tool prompts.',
  },
  {
    mistake: 'Stuffing entire chat transcripts into memory files',
    fix: 'Use concise nightly summaries in 05_Daily_Logs/ (under 400 words) linked to focused 01_Projects/ notes to avoid token bloat.',
  },
  {
    mistake: 'Letting agents dump random files in the vault root',
    fix: 'Enforce numbered PARA directories (00_Inbox through 06_Agent_Protocols) in PROTOCOL.md so every agent knows exact paths.',
  },
];

export const OrchestratorSetupView: React.FC<OrchestratorSetupViewProps> = ({
  onBootstrapVault,
}) => {
  const [config, setConfig] = useState<OrchestratorConfig>({
    vaultPath: '~/Obsidian/Hermes-Shared-Brain',
    vaultName: 'Hermes Shared Brain',
    enabledAgents: ['hermes', 'claude-code', 'codex', 'openclaw'],
    nightlyHour: '23:30',
    includeVoiceAgent: true,
    isolatePersonalNotes: true,
  });

  const [activeConfigTab, setActiveConfigTab] = useState<string>('CLAUDE.md');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bootstrapStatus, setBootstrapStatus] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);

  const megaPrompt = useMemo(() => generateOrchestratorPrompt(config), [config]);
  const pointerConfigs = useMemo(() => generateAgentPointerConfigs(config), [config]);

  const toggleAgent = (agentId: AgentId) => {
    setConfig((prev) => {
      const exists = prev.enabledAgents.includes(agentId);
      const next = exists
        ? prev.enabledAgents.filter((id) => id !== agentId)
        : [...prev.enabledAgents, agentId];
      return { ...prev, enabledAgents: next.length > 0 ? next : [agentId] };
    });
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    setBootstrapStatus(null);
    try {
      const result = await onBootstrapVault();
      setBootstrapStatus(
        result.created.length > 0
          ? `Restored ${result.created.length} missing protocol file(s).`
          : 'All 7 PARA folders and agent protocol files are verified present.',
      );
    } catch (err) {
      setBootstrapStatus(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setBootstrapping(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#F9FAFB] dark:bg-[#111215]">
      <div className="max-w-[1240px] mx-auto px-6 py-7 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 dark:border-[#242833] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Single-Prompt Orchestrator Setup
            </h1>
            <p className="text-sm text-neutral-600 dark:text-[#9BA3B4] mt-1 max-w-2xl">
              Instead of wiring Hermes, Claude Code, Codex, and OpenClaw by hand, configure your
              vault parameters below and paste one Orchestrator Mega-Prompt — or export this live
              Obsidian vault as a ready-to-open `.zip`.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleBootstrap}
              disabled={bootstrapping}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-neutral-200 dark:border-[#2B303C] bg-white dark:bg-[#1C1F26] text-neutral-800 dark:text-[#E8EAF0] hover:border-[#8B5CF6] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderCheck className="w-3.5 h-3.5 text-emerald-500" />
              {bootstrapping ? 'Verifying...' : 'Verify Local PARA Vault'}
            </button>

            <a
              href="/api/vault/export"
              download="hermes-obsidian-vault.zip"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export Obsidian Vault (.zip)
            </a>
          </div>
        </div>

        {bootstrapStatus && (
          <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5">
            {bootstrapStatus}
          </div>
        )}

        {/* Builder Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Configuration Form */}
          <div className="lg:col-span-5 rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] p-5 space-y-5">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              Vault & Agent Parameters
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="setup-vault-name"
                  className="block text-xs font-medium text-neutral-700 dark:text-[#C5CBDA] mb-1.5"
                >
                  Vault Name
                </label>
                <input
                  id="setup-vault-name"
                  type="text"
                  value={config.vaultName}
                  onChange={(e) => setConfig((c) => ({ ...c, vaultName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-md bg-neutral-50 dark:bg-[#111215] border border-neutral-200 dark:border-[#2B303C] text-neutral-900 dark:text-[#E8EAF0] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label
                  htmlFor="setup-vault-path"
                  className="block text-xs font-medium text-neutral-700 dark:text-[#C5CBDA] mb-1.5"
                >
                  OBSIDIAN_VAULT_PATH
                </label>
                <input
                  id="setup-vault-path"
                  type="text"
                  value={config.vaultPath}
                  onChange={(e) => setConfig((c) => ({ ...c, vaultPath: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md bg-neutral-50 dark:bg-[#111215] border border-neutral-200 dark:border-[#2B303C] text-neutral-900 dark:text-[#E8EAF0] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label
                  htmlFor="setup-nightly-time"
                  className="block text-xs font-medium text-neutral-700 dark:text-[#C5CBDA] mb-1.5"
                >
                  Nightly Agent Log Schedule (24h)
                </label>
                <input
                  id="setup-nightly-time"
                  type="time"
                  value={config.nightlyHour}
                  onChange={(e) => setConfig((c) => ({ ...c, nightlyHour: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md bg-neutral-50 dark:bg-[#111215] border border-neutral-200 dark:border-[#2B303C] text-neutral-900 dark:text-[#E8EAF0] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-neutral-700 dark:text-[#C5CBDA]">
                  Connected AI Agents
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {AGENT_PROFILES.map((agent) => {
                    const checked = config.enabledAgents.includes(agent.id);
                    return (
                      <label
                        key={agent.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#8B5CF6]/60 bg-[#8B5CF6]/10 text-neutral-900 dark:text-white'
                            : 'border-neutral-200 dark:border-[#262A34] text-neutral-600 dark:text-[#8C94A6]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAgent(agent.id)}
                          className="accent-[#8B5CF6]"
                        />
                        <span>{agent.name}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-[#222630]">
                <label className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-[#C5CBDA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeVoiceAgent}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, includeVoiceAgent: e.target.checked }))
                    }
                    className="accent-[#8B5CF6]"
                  />
                  Enable Apollo Voice Agent morning brief readback
                </label>

                <label className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-[#C5CBDA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.isolatePersonalNotes}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, isolatePersonalNotes: e.target.checked }))
                    }
                    className="accent-[#8B5CF6]"
                  />
                  Enforce isolated agent vault (exclude personal journals & secrets)
                </label>
              </div>
            </div>
          </div>

          {/* Right Live Generated Mega-Prompt */}
          <div className="lg:col-span-7 rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-[#242833]">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Orchestrator Mega-Prompt
                </h2>
                <p className="text-xs text-neutral-500 dark:text-[#848C9E]">
                  Paste into Claude Code, Codex, or Hermes to build the full shared vault in one
                  shot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopy('mega', megaPrompt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedId === 'mega' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Prompt
                  </>
                )}
              </button>
            </div>

            <pre className="p-5 text-xs font-mono leading-relaxed text-neutral-800 dark:text-[#D5D9E4] bg-neutral-50 dark:bg-[#0E1014] overflow-x-auto max-h-[400px] whitespace-pre-wrap">
              {megaPrompt}
            </pre>
          </div>
        </section>

        {/* Generated Pointer Config Files */}
        <section className="rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-neutral-200 dark:border-[#242833]">
            <div role="tablist" aria-label="Generated pointer files" className="flex items-center gap-1.5 overflow-x-auto">
              {Object.keys(pointerConfigs).map((filename) => (
                <button
                  key={filename}
                  type="button"
                  role="tab"
                  aria-selected={activeConfigTab === filename}
                  onClick={() => setActiveConfigTab(filename)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeConfigTab === filename
                      ? 'bg-[#8B5CF6]/15 text-[#6D28D9] dark:text-[#C4B5FD] font-medium'
                      : 'text-neutral-600 dark:text-[#8C94A6] hover:bg-neutral-100 dark:hover:bg-[#222630]'
                  }`}
                >
                  {filename}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                void handleCopy(activeConfigTab, pointerConfigs[activeConfigTab] ?? '')
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-200 dark:border-[#2B303C] text-neutral-700 dark:text-[#D5D9E4] hover:border-[#8B5CF6] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedId === activeConfigTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Copied {activeConfigTab}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy File
                </>
              )}
            </button>
          </div>

          <pre className="p-5 text-xs font-mono leading-relaxed text-neutral-800 dark:text-[#D5D9E4] bg-neutral-50 dark:bg-[#0E1014] overflow-x-auto whitespace-pre-wrap">
            {pointerConfigs[activeConfigTab]}
          </pre>
        </section>

        {/* Common Mistakes vs Protocol Fixes */}
        <section className="rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 dark:border-[#242833] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              Common Setup Mistakes & Protocol Fixes
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-[#242833] text-xs text-neutral-500 dark:text-[#848C9E]">
                  <th className="py-3 px-5 font-medium w-2/5">Common Pitfall</th>
                  <th className="py-3 px-5 font-medium">Shared Memory Protocol Fix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-[#222630] text-sm">
                {PITFALLS.map((row) => (
                  <tr key={row.mistake}>
                    <td className="py-3.5 px-5 font-medium text-neutral-800 dark:text-[#E2E5EE] align-top">
                      {row.mistake}
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600 dark:text-[#9BA3B4] align-top">
                      {row.fix}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
