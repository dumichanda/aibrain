import React, { useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Play, RefreshCw, Send, Volume2 } from 'lucide-react';
import type { VaultNote, VoiceTurn } from '../types/vault';
import type { VoiceAskResponse } from '../services/api';
import { resolveWikilink } from '../utils/vaultLogic';

interface VoiceAgentViewProps {
  notes: VaultNote[];
  onAskApollo: (payload: {
    question: string;
    voiceName: string;
    speak: boolean;
  }) => Promise<VoiceAskResponse>;
  onSpeakNote: (note: VaultNote, voiceName: string) => Promise<void>;
  readingAudioNotePath: string | null;
  onOpenNoteInVault: (notePath: string) => void;
}

const VOICES = ['Kore', 'Fenrir', 'Puck', 'Charon', 'Zephyr'] as const;

const SAMPLE_VOICE_PROMPTS = [
  'What did Claude Code and Codex finish yesterday?',
  'Summarize the active blockers in SaaS Launch Pipeline.',
  'Read me a quick morning brief across all connected agents.',
  'What rules are defined in our Shared Memory Protocol?',
];

export const VoiceAgentView: React.FC<VoiceAgentViewProps> = ({
  notes,
  onAskApollo,
  onSpeakNote,
  readingAudioNotePath,
  onOpenNoteInVault,
}) => {
  const [voiceName, setVoiceName] = useState<string>('Kore');
  const [speakAloud, setSpeakAloud] = useState<boolean>(true);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNoteToRead, setSelectedNoteToRead] = useState<string>(
    notes.find((n) => n.folder === '05_Daily_Logs')?.path ?? notes[0]?.path ?? '',
  );
  const [turns, setTurns] = useState<VoiceTurn[]>([
    {
      id: 'welcome',
      role: 'apollo',
      text: 'Apollo Voice is connected to your shared Obsidian PARA vault. Ask what Hermes, Claude Code, Codex, or OpenClaw worked on, or pick any note on the right to hear it read aloud.',
      citedNotes: ['PROTOCOL', '2026-11-21-Daily-Log'],
      timestamp: new Date().toISOString(),
    },
  ]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const noteToRead = useMemo(
    () => notes.find((n) => n.path === selectedNoteToRead) ?? notes[0] ?? null,
    [notes, selectedNoteToRead],
  );

  const playBase64Wav = (base64: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audioRef.current = audio;
      void audio.play().catch(() => {
        // Browser autoplay policy fallback — inline audio element remains playable
      });
    } catch {
      // Inline audio player handles playback cleanly
    }
  };

  const handleAsk = async (promptText?: string) => {
    const q = (promptText ?? question).trim();
    if (!q) {
      setError('Type or speak a question for Apollo.');
      return;
    }
    setError(null);
    setLoading(true);

    const userTurn: VoiceTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: q,
      timestamp: new Date().toISOString(),
    };
    setTurns((prev) => [...prev, userTurn]);
    setQuestion('');

    try {
      const result = await onAskApollo({
        question: q,
        voiceName,
        speak: speakAloud,
      });

      const apolloTurn: VoiceTurn = {
        id: `a-${Date.now()}`,
        role: 'apollo',
        text: result.answer,
        citedNotes: result.citedNotes,
        audioBase64: result.audioBase64,
        voiceName: result.voiceName,
        timestamp: new Date().toISOString(),
      };
      setTurns((prev) => [...prev, apolloTurn]);

      if (result.audioBase64) {
        playBase64Wav(result.audioBase64);
      }
      if (result.ttsWarning) {
        setError(`Answered via vault text; audio note: ${result.ttsWarning}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apollo voice request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMic = () => {
    const SpeechRec =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRec) {
      setError('Browser speech recognition is unavailable here. Type your question below.');
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRec as any)();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onerror = () => {
        setListening(false);
        setError('Microphone capture did not complete. You can type your question directly.');
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setQuestion(transcript);
          void handleAsk(transcript);
        }
      };
      recognition.start();
    } catch {
      setListening(false);
      setError('Could not access microphone.');
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#F9FAFB] dark:bg-[#111215]">
      <div className="max-w-[1240px] mx-auto px-6 py-7 space-y-7">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 dark:border-[#242833] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Apollo Voice Agent
            </h1>
            <p className="text-sm text-neutral-600 dark:text-[#9BA3B4] mt-1 max-w-2xl">
              Speak or type questions directly against your shared Obsidian vault and hear answers
              or individual Markdown notes read aloud via Gemini TTS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <label
                htmlFor="apollo-voice-select"
                className="text-xs text-neutral-500 dark:text-[#848C9E]"
              >
                Voice:
              </label>
              <select
                id="apollo-voice-select"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-mono rounded-md bg-white dark:bg-[#16181D] border border-neutral-200 dark:border-[#2B303C] text-neutral-900 dark:text-[#E8EAF0] focus:outline-none focus:border-[#8B5CF6]"
              >
                {VOICES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-neutral-700 dark:text-[#C5CBDA] cursor-pointer">
              <input
                type="checkbox"
                checked={speakAloud}
                onChange={(e) => setSpeakAloud(e.target.checked)}
                className="rounded accent-[#8B5CF6]"
              />
              Auto-speak responses
            </label>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Voice Conversation & Grounded Citations */}
          <section className="lg:col-span-8 rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] flex flex-col overflow-hidden">
            <div className="p-5 space-y-4 max-h-[460px] overflow-y-auto">
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`rounded-lg p-4 border ${
                    turn.role === 'user'
                      ? 'bg-neutral-50 dark:bg-[#111215] border-neutral-200 dark:border-[#242833] ml-8'
                      : 'bg-[#8B5CF6]/5 dark:bg-[#1B1D27] border-[#8B5CF6]/25 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {turn.role === 'user' ? 'You' : `Apollo (${turn.voiceName ?? voiceName})`}
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-neutral-500 dark:text-[#7E869A]">
                      {turn.timestamp.slice(11, 16)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-700 dark:text-[#D5D9E4]">
                    {turn.text}
                  </p>

                  {turn.audioBase64 && (
                    <div className="mt-3">
                      <audio
                        controls
                        src={`data:audio/wav;base64,${turn.audioBase64}`}
                        className="w-full h-9"
                      />
                    </div>
                  )}

                  {turn.citedNotes && turn.citedNotes.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-neutral-200/70 dark:border-[#262A36] flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-neutral-500 dark:text-[#7E869A]">Vault sources:</span>
                      {turn.citedNotes.map((slug) => {
                        const matched = resolveWikilink(slug, notes);
                        return matched ? (
                          <button
                            key={slug}
                            type="button"
                            onClick={() => onOpenNoteInVault(matched.path)}
                            className="font-mono text-[#7C3AED] dark:text-[#A78BFA] hover:underline cursor-pointer"
                          >
                            [[{matched.slug}]]
                          </button>
                        ) : (
                          <span key={slug} className="font-mono text-neutral-500">
                            [[{slug}]]
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Suggested Prompts + Input Bar */}
            <div className="p-4 border-t border-neutral-200 dark:border-[#242833] bg-neutral-50 dark:bg-[#13151A] space-y-3">
              <div className="flex flex-wrap gap-2">
                {SAMPLE_VOICE_PROMPTS.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => void handleAsk(sample)}
                    disabled={loading}
                    className="px-2.5 py-1.5 text-xs rounded-md border border-neutral-200 dark:border-[#2A2F3D] bg-white dark:bg-[#191C24] text-neutral-700 dark:text-[#C5CBDA] hover:border-[#8B5CF6] transition-colors text-left cursor-pointer disabled:opacity-50"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAsk();
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  aria-label={listening ? 'Stop microphone listening' : 'Speak question with microphone'}
                  onClick={handleToggleMic}
                  className={`p-2.5 rounded-md border transition-colors shrink-0 cursor-pointer ${
                    listening
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white dark:bg-[#1C1F26] border-neutral-200 dark:border-[#2B303C] text-neutral-700 dark:text-[#D5D9E4] hover:border-[#8B5CF6]'
                  }`}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <label htmlFor="apollo-question-input" className="sr-only">
                  Ask Apollo about your Obsidian vault
                </label>
                <input
                  id="apollo-question-input"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask Apollo what your agents finished, learned, or handed off..."
                  className="flex-1 px-3.5 py-2 text-sm rounded-md bg-white dark:bg-[#111215] border border-neutral-200 dark:border-[#2B303C] text-neutral-900 dark:text-[#E8EAF0] focus:outline-none focus:border-[#8B5CF6]"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {loading ? 'Querying...' : 'Ask Apollo'}
                </button>
              </form>
            </div>
          </section>

          {/* Direct Vault Note Readback Panel */}
          <aside className="lg:col-span-4 rounded-xl border border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#8B5CF6]" />
                Read Any Vault Note Aloud
              </h2>
              <p className="text-xs text-neutral-500 dark:text-[#848C9E] mt-1">
                Pick any Markdown file from your Obsidian PARA folders and hear Apollo narrate it.
              </p>
            </div>

            <div>
              <label
                htmlFor="voice-note-picker"
                className="block text-xs font-medium text-neutral-700 dark:text-[#C5CBDA] mb-1.5"
              >
                Select Vault Note
              </label>
              <select
                id="voice-note-picker"
                value={selectedNoteToRead}
                onChange={(e) => setSelectedNoteToRead(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-neutral-50 dark:bg-[#111215] border border-neutral-200 dark:border-[#2B303C] text-neutral-900 dark:text-[#E8EAF0] focus:outline-none focus:border-[#8B5CF6]"
              >
                {notes.map((n) => (
                  <option key={n.path} value={n.path}>
                    {n.path}
                  </option>
                ))}
              </select>
            </div>

            {noteToRead && (
              <div className="rounded-lg border border-neutral-200 dark:border-[#242833] bg-neutral-50 dark:bg-[#111215] p-3.5 space-y-2">
                <div className="text-xs font-semibold text-neutral-900 dark:text-[#E8EAF0]">
                  {noteToRead.title}
                </div>
                <p className="text-xs text-neutral-600 dark:text-[#9BA3B4] leading-relaxed line-clamp-5">
                  {noteToRead.body.replace(/^#.*$/m, '').trim()}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-mono tabular-nums text-neutral-500">
                    {noteToRead.wordCount} words
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenNoteInVault(noteToRead.path)}
                    className="text-xs text-[#7C3AED] dark:text-[#A78BFA] hover:underline cursor-pointer"
                  >
                    Open Note
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={!noteToRead || readingAudioNotePath === noteToRead?.path}
              onClick={() => noteToRead && void onSpeakNote(noteToRead, voiceName)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {readingAudioNotePath === noteToRead?.path ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {readingAudioNotePath === noteToRead?.path
                ? 'Synthesizing Audio...'
                : 'Narrate Selected Note'}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
};
