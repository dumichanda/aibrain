import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  BookOpen,
  Download,
  Mic,
  Moon,
  Network,
  Sun,
  Terminal,
  Volume2,
  X,
} from 'lucide-react';
import type { AgentActivity, AgentId, ParaFolderId, VaultNote } from './types/vault';
import {
  askApolloVoice,
  bootstrapVaultProtocols,
  deleteVaultNote,
  fetchVaultState,
  generateMorningBrief,
  runAgentTask,
  runNightlySynthesis,
  saveVaultNote,
  speakTextWithApollo,
} from './services/api';
import { VaultWorkspace } from './components/VaultWorkspace';
import { MemoryGraphView } from './components/MemoryGraphView';
import { AgentsHubView } from './components/AgentsHubView';
import { NightlyLogsView } from './components/NightlyLogsView';
import { VoiceAgentView } from './components/VoiceAgentView';
import { OrchestratorSetupView } from './components/OrchestratorSetupView';

type ActiveView = 'vault' | 'graph' | 'agents' | 'nightly' | 'voice' | 'setup';

interface NavTab {
  id: ActiveView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_TABS: NavTab[] = [
  { id: 'vault', label: 'Vault', icon: BookOpen },
  { id: 'graph', label: 'Graph', icon: Network },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'nightly', label: 'Nightly Logs', icon: Moon },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'setup', label: 'Setup', icon: Terminal },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('vault');
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [selectedNotePath, setSelectedNotePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  // Global Apollo audio player state (for Read Aloud from Vault or Morning Brief)
  const [readingAudioNotePath, setReadingAudioNotePath] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<{
    label: string;
    src: string;
  } | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const globalAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const loadVault = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchVaultState();
      setNotes(data.notes);
      setActivities(data.activities);
      setSelectedNotePath((prev) => {
        if (prev && data.notes.some((n) => n.path === prev)) return prev;
        return (
          data.notes.find((n) => n.path === '06_Agent_Protocols/PROTOCOL.md')?.path ??
          data.notes[0]?.path ??
          null
        );
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load Obsidian vault.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVault();
  }, [loadVault]);

  const handleSaveNote = async (payload: {
    path?: string;
    folder?: ParaFolderId;
    title?: string;
    content: string;
  }): Promise<VaultNote> => {
    const { note } = await saveVaultNote(payload);
    setNotes((prev) => {
      const exists = prev.some((n) => n.path === note.path);
      const next = exists
        ? prev.map((n) => (n.path === note.path ? note : n))
        : [...prev, note];
      return next.sort((a, b) => a.path.localeCompare(b.path));
    });
    return note;
  };

  const handleDeleteNote = async (notePath: string) => {
    await deleteVaultNote(notePath);
    setNotes((prev) => {
      const remaining = prev.filter((n) => n.path !== notePath);
      if (selectedNotePath === notePath) {
        setSelectedNotePath(remaining[0]?.path ?? null);
      }
      return remaining;
    });
  };

  const handleOpenNoteInVault = (notePath: string) => {
    setSelectedNotePath(notePath);
    setActiveView('vault');
  };

  const handleSpeakText = async (
    text: string,
    label: string,
    voiceName = 'Kore',
    notePathKey = 'brief',
  ) => {
    setAudioError(null);
    setReadingAudioNotePath(notePathKey);
    try {
      const { audioBase64 } = await speakTextWithApollo({ text, voiceName });
      const src = `data:audio/wav;base64,${audioBase64}`;
      setActiveAudio({ label, src });
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Apollo audio readback failed.');
    } finally {
      setReadingAudioNotePath(null);
    }
  };

  const handleReadNoteAloud = (note: VaultNote, voiceName = 'Kore') => {
    return handleSpeakText(note.body, note.title, voiceName, note.path);
  };

  const handleRunAgent = async (payload: {
    agentId: AgentId;
    task: string;
    targetFolder: ParaFolderId;
  }) => {
    const result = await runAgentTask(payload);
    setNotes(result.notes);
    setActivities((prev) => [result.activity, ...prev]);
    return result;
  };

  const handleRunNightlySynthesis = async () => {
    const result = await runNightlySynthesis();
    setNotes(result.notes);
    setActivities((prev) => [result.activity, ...prev]);
    return result;
  };

  const handleBootstrapVault = async () => {
    const result = await bootstrapVaultProtocols();
    setNotes(result.notes);
    return { created: result.created };
  };

  return (
    <div
      data-testid="hermes-vault-app"
      data-active-view={activeView}
      className="h-screen flex flex-col overflow-hidden bg-[#F6F7F9] dark:bg-[#111215] text-[#14161A] dark:text-[#E8EAF0]"
    >
      {/* Top Bar Contract: [Brand Wordmark] — [Single-line Nav Tabs] — [Primary Action] */}
      <header className="shrink-0 border-b border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D]">
        <div className="h-14 flex items-center justify-between gap-4 lg:gap-8 px-4 lg:px-6">
          <a
            href="#vault"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('vault');
            }}
            className="text-base font-bold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap shrink-0"
          >
            Hermes Obsidian
          </a>

          <nav
            aria-label="Primary workspace views"
            className="hidden md:flex items-center gap-1"
          >
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveView(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#8B5CF6]/15 text-[#6D28D9] dark:text-[#C4B5FD]'
                      : 'text-neutral-600 dark:text-[#9BA3B4] hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#20242E]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={() => setDarkMode((d) => !d)}
              className="p-2 rounded-md border border-neutral-200 dark:border-[#2B303C] text-neutral-600 dark:text-[#9BA3B4] hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <a
              href="/api/vault/export"
              download="hermes-obsidian-vault.zip"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Vault</span>
            </a>
          </div>
        </div>

        {/* Compact Mobile View Switcher (< md, total header height ~92px < 15% of 844px) */}
        <nav
          aria-label="Mobile workspace views"
          className="flex md:hidden items-center gap-1 px-3 pb-2 overflow-x-auto"
        >
          {NAV_TABS.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActiveView(tab.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#8B5CF6]/15 text-[#6D28D9] dark:text-[#C4B5FD]'
                    : 'text-neutral-600 dark:text-[#9BA3B4]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Surface */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md space-y-3">
              <div className="h-4 w-48 rounded bg-neutral-200 dark:bg-[#232732] animate-pulse" />
              <div className="h-3 w-full rounded bg-neutral-200 dark:bg-[#1E222B] animate-pulse" />
              <div className="h-3 w-5/6 rounded bg-neutral-200 dark:bg-[#1E222B] animate-pulse" />
            </div>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadVault()}
              className="px-4 py-2 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] cursor-pointer"
            >
              Retry Loading Vault
            </button>
          </div>
        ) : (
          <>
            {activeView === 'vault' && (
              <VaultWorkspace
                notes={notes}
                activities={activities}
                selectedPath={selectedNotePath}
                onSelectNote={setSelectedNotePath}
                onSaveNote={handleSaveNote}
                onDeleteNote={handleDeleteNote}
                onReadAloud={(note) => void handleReadNoteAloud(note)}
                readingAudioNotePath={readingAudioNotePath}
              />
            )}

            {activeView === 'graph' && (
              <MemoryGraphView
                notes={notes}
                onOpenNoteInVault={handleOpenNoteInVault}
              />
            )}

            {activeView === 'agents' && (
              <AgentsHubView
                notes={notes}
                activities={activities}
                onRunAgent={handleRunAgent}
                onOpenNoteInVault={handleOpenNoteInVault}
              />
            )}

            {activeView === 'nightly' && (
              <NightlyLogsView
                notes={notes}
                onRunNightlySynthesis={handleRunNightlySynthesis}
                onGenerateMorningBrief={generateMorningBrief}
                onSpeakText={(text, label) => void handleSpeakText(text, label)}
                onOpenNoteInVault={handleOpenNoteInVault}
              />
            )}

            {activeView === 'voice' && (
              <VoiceAgentView
                notes={notes}
                onAskApollo={askApolloVoice}
                onSpeakNote={handleReadNoteAloud}
                readingAudioNotePath={readingAudioNotePath}
                onOpenNoteInVault={handleOpenNoteInVault}
              />
            )}

            {activeView === 'setup' && (
              <OrchestratorSetupView onBootstrapVault={handleBootstrapVault} />
            )}
          </>
        )}
      </main>

      {/* Apollo Floating Narration Player (only shown when reading a note/brief aloud) */}
      {(activeAudio || audioError) && (
        <div
          role="region"
          aria-label="Apollo audio player"
          className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-200 dark:border-[#2E3444] bg-white dark:bg-[#191C24] shadow-xl p-3.5 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Volume2 className="w-4 h-4 text-[#8B5CF6] shrink-0" />
              <span className="text-xs font-semibold truncate">
                {activeAudio ? `Apollo Narrating: ${activeAudio.label}` : 'Apollo Audio Notice'}
              </span>
            </div>
            <button
              type="button"
              aria-label="Close Apollo audio player"
              onClick={() => {
                setActiveAudio(null);
                setAudioError(null);
              }}
              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-[#262B38] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {audioError ? (
            <p className="text-xs text-red-600 dark:text-red-400">{audioError}</p>
          ) : (
            activeAudio && (
              <audio
                ref={globalAudioRef}
                controls
                autoPlay
                src={activeAudio.src}
                className="w-full h-9"
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
