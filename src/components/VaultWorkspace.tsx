import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Link2,
  Plus,
  Save,
  Search,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import type { AgentActivity, ParaFolderId, VaultNote } from '../types/vault';
import { PARA_FOLDERS, computeBacklinks, resolveWikilink } from '../utils/vaultLogic';
import { MarkdownRenderer } from './MarkdownRenderer';

interface VaultWorkspaceProps {
  notes: VaultNote[];
  activities: AgentActivity[];
  selectedPath: string | null;
  onSelectNote: (notePath: string) => void;
  onSaveNote: (payload: {
    path?: string;
    folder?: ParaFolderId;
    title?: string;
    content: string;
  }) => Promise<VaultNote>;
  onDeleteNote: (notePath: string) => Promise<void>;
  onReadAloud: (note: VaultNote) => void;
  readingAudioNotePath: string | null;
}

export const VaultWorkspace: React.FC<VaultWorkspaceProps> = ({
  notes,
  activities,
  selectedPath,
  onSelectNote,
  onSaveNote,
  onDeleteNote,
  onReadAloud,
  readingAudioNotePath,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() =>
    PARA_FOLDERS.reduce((acc, f) => ({ ...acc, [f.id]: true }), {}),
  );
  const [editorMode, setEditorMode] = useState<'preview' | 'edit' | 'split'>('preview');
  const [draftContent, setDraftContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFolder, setNewFolder] = useState<ParaFolderId>('01_Projects');
  const [newBody, setNewBody] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);

  const activeNote = useMemo(
    () => notes.find((n) => n.path === selectedPath) ?? notes[0] ?? null,
    [notes, selectedPath],
  );

  const backlinksMap = useMemo(() => computeBacklinks(notes), [notes]);

  useEffect(() => {
    if (activeNote) {
      setDraftContent(activeNote.content);
      setConfirmDelete(false);
      setSaveMessage(null);
    }
  }, [activeNote?.path, activeNote?.content]);

  const isDirty = activeNote ? draftContent !== activeNote.content : false;

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.slug.toLowerCase().includes(q) ||
        n.folder.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q),
    );
  }, [notes, searchQuery]);

  const notesByFolder = useMemo(() => {
    const map: Record<ParaFolderId, VaultNote[]> = {
      '00_Inbox': [],
      '01_Projects': [],
      '02_Areas': [],
      '03_Resources': [],
      '04_Archives': [],
      '05_Daily_Logs': [],
      '06_Agent_Protocols': [],
    };
    for (const note of filteredNotes) {
      map[note.folder]?.push(note);
    }
    return map;
  }, [filteredNotes]);

  const handleSaveCurrent = async () => {
    if (!activeNote) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await onSaveNote({ path: activeNote.path, content: draftContent });
      setSaveMessage('Saved to vault');
      setTimeout(() => setSaveMessage(null), 2400);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setModalError('Enter a note title before creating.');
      return;
    }
    setModalError(null);
    setSaving(true);
    try {
      const initialBody =
        newBody.trim() ||
        `# ${newTitle.trim()}\n\nConnected to [[PROTOCOL]] and [[MEMORY]].\n\n## Key Notes\n\n- \n`;
      const created = await onSaveNote({
        folder: newFolder,
        title: newTitle.trim(),
        content: initialBody,
      });
      setShowNewModal(false);
      setNewTitle('');
      setNewBody('');
      onSelectNote(created.path);
      setEditorMode('edit');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Could not create note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCurrent = async () => {
    if (!activeNote) return;
    setSaving(true);
    try {
      await onDeleteNote(activeNote.path);
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  };

  const activeBacklinks = activeNote ? backlinksMap[activeNote.path] ?? [] : [];
  const activeOutgoing = useMemo(() => {
    if (!activeNote) return [];
    return activeNote.wikilinks.map((slug) => ({
      slug,
      target: resolveWikilink(slug, notes),
    }));
  }, [activeNote, notes]);

  const relatedActivities = useMemo(() => {
    if (!activeNote) return [];
    return activities
      .filter(
        (a) =>
          a.targetPath === activeNote.path ||
          a.referencedPaths.includes(activeNote.path),
      )
      .slice(0, 5);
  }, [activities, activeNote]);

  const toggleFolder = (folderId: ParaFolderId) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-neutral-200 dark:border-[#242833] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-neutral-500 dark:text-[#8E96A8]">
            PARA Vault Tree
          </span>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Note
          </button>
        </div>

        <div className="relative">
          <label htmlFor="vault-search" className="sr-only">
            Search vault notes
          </label>
          <Search className="w-3.5 h-3.5 text-neutral-400 dark:text-[#6E768A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="vault-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter notes or [[links]]..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-neutral-100 dark:bg-[#111215] border border-neutral-200 dark:border-[#262A34] text-neutral-900 dark:text-[#E8EAF0] placeholder:text-neutral-400 dark:placeholder:text-[#646C7E] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      <nav aria-label="Obsidian PARA folders" className="flex-1 overflow-y-auto p-2 space-y-1">
        {PARA_FOLDERS.map((folder) => {
          const folderNotes = notesByFolder[folder.id];
          const isExpanded = expandedFolders[folder.id];
          return (
            <div key={folder.id}>
              <button
                type="button"
                onClick={() => toggleFolder(folder.id)}
                aria-expanded={isExpanded}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-xs font-medium text-neutral-700 dark:text-[#C5CBDA] hover:bg-neutral-100 dark:hover:bg-[#1F232D] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  )}
                  <Folder
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: folder.accentHex }}
                  />
                  <span className="truncate font-mono text-[12px]">{folder.name}</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums text-neutral-400 dark:text-[#6E768A] shrink-0">
                  {folderNotes.length}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-4 pl-2 border-l border-neutral-200 dark:border-[#242833] mt-0.5 space-y-0.5">
                  {folderNotes.length === 0 ? (
                    <p className="px-2 py-1 text-[11px] text-neutral-400 dark:text-[#5F677A]">
                      No matching notes
                    </p>
                  ) : (
                    folderNotes.map((note) => {
                      const isActive = activeNote?.path === note.path;
                      return (
                        <button
                          key={note.path}
                          type="button"
                          onClick={() => {
                            onSelectNote(note.path);
                            setMobileTreeOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[13px] transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-[#8B5CF6]/15 text-[#6D28D9] dark:text-[#C4B5FD] font-medium'
                              : 'text-neutral-600 dark:text-[#9BA3B4] hover:bg-neutral-100 dark:hover:bg-[#1D2029] hover:text-neutral-900 dark:hover:text-[#E8EAF0]'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{note.slug}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-[264px] shrink-0 flex-col border-r border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D]">
        {sidebarContent}
      </aside>

      {/* Mobile Folder Drawer */}
      {mobileTreeOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="w-[280px] max-w-[85vw] bg-white dark:bg-[#16181D] border-r border-neutral-200 dark:border-[#242833] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 dark:border-[#242833]">
              <span className="text-sm font-semibold">Vault Explorer</span>
              <button
                type="button"
                aria-label="Close vault explorer"
                onClick={() => setMobileTreeOpen(false)}
                className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-[#232732]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {sidebarContent}
          </div>
          <button
            type="button"
            aria-label="Dismiss folder drawer"
            onClick={() => setMobileTreeOpen(false)}
            className="flex-1 bg-black/50"
          />
        </div>
      )}

      {/* Center Markdown Editor / Preview */}
      <section className="flex-1 min-w-0 flex flex-col bg-[#F9FAFB] dark:bg-[#111215]">
        {activeNote ? (
          <>
            {/* Note Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6 py-3 border-b border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D]">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileTreeOpen(true)}
                  className="lg:hidden px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-200 dark:border-[#2B303C] text-neutral-700 dark:text-[#D5D9E4] whitespace-nowrap shrink-0"
                >
                  Folders
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500 dark:text-[#848C9E] truncate">
                    <span>{activeNote.folder}</span>
                    <span aria-hidden="true">/</span>
                    <span className="text-neutral-900 dark:text-[#E8EAF0] font-medium truncate">
                      {activeNote.slug}.md
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-[#7E869A] mt-0.5 tabular-nums">
                    <span>{activeNote.frontmatter.author ?? 'Workspace'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeNote.wordCount} words</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeNote.wikilinks.length} links</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeBacklinks.length} backlinks</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  role="tablist"
                  aria-label="Editor view mode"
                  className="inline-flex items-center p-0.5 rounded-md bg-neutral-100 dark:bg-[#111215] border border-neutral-200 dark:border-[#262A34]"
                >
                  {(['preview', 'edit', 'split'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={editorMode === mode}
                      onClick={() => setEditorMode(mode)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                        mode === 'split' ? 'hidden sm:inline-flex' : ''
                      } ${
                        editorMode === mode
                          ? 'bg-white dark:bg-[#232732] text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-600 dark:text-[#8C94A6] hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onReadAloud(activeNote)}
                  disabled={readingAudioNotePath === activeNote.path}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-200 dark:border-[#2B303C] bg-white dark:bg-[#1C1F26] text-neutral-700 dark:text-[#D5D9E4] hover:border-[#8B5CF6] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  {readingAudioNotePath === activeNote.path ? 'Narrating...' : 'Read Aloud'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveCurrent}
                  disabled={!isDirty || saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Note'}
                </button>

                {!confirmDelete ? (
                  <button
                    type="button"
                    aria-label={`Delete ${activeNote.slug}`}
                    onClick={() => setConfirmDelete(true)}
                    className="p-1.5 rounded-md text-neutral-500 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleDeleteCurrent}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {saveMessage && (
              <div className="px-6 py-1.5 text-xs bg-[#8B5CF6]/10 text-[#6D28D9] dark:text-[#C4B5FD] border-b border-[#8B5CF6]/20">
                {saveMessage}
              </div>
            )}

            {/* Editor / Preview Canvas */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
              {(editorMode === 'edit' || editorMode === 'split') && (
                <div
                  className={`flex-1 min-w-0 flex flex-col ${
                    editorMode === 'split'
                      ? 'border-r border-neutral-200 dark:border-[#242833]'
                      : ''
                  }`}
                >
                  <label htmlFor="markdown-editor" className="sr-only">
                    Markdown content for {activeNote.title}
                  </label>
                  <textarea
                    id="markdown-editor"
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                        e.preventDefault();
                        void handleSaveCurrent();
                      }
                    }}
                    spellCheck={false}
                    className="flex-1 w-full p-6 bg-[#F9FAFB] dark:bg-[#111215] text-neutral-900 dark:text-[#E2E6F0] font-mono text-[13.5px] leading-relaxed resize-none focus:outline-none"
                  />
                </div>
              )}

              {(editorMode === 'preview' || editorMode === 'split') && (
                <div className="flex-1 min-w-0 overflow-y-auto px-6 lg:px-10 py-8">
                  <MarkdownRenderer
                    markdown={
                      editorMode === 'split'
                        ? draftContent.replace(/^---[\s\S]*?---\r?\n?/, '')
                        : activeNote.body
                    }
                    notes={notes}
                    onNavigateNote={onSelectNote}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-neutral-500 dark:text-[#8C94A6] mb-3">
              No notes in the Obsidian vault yet.
            </p>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
            >
              Create First Note
            </button>
          </div>
        )}
      </section>

      {/* Right Backlinks & Shared Memory Inspector */}
      {activeNote && (
        <aside className="hidden xl:flex w-[276px] shrink-0 flex-col border-l border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] overflow-y-auto">
          <div className="p-4 border-b border-neutral-200 dark:border-[#242833]">
            <h2 className="text-xs font-semibold text-neutral-900 dark:text-[#E8EAF0] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
                Incoming Backlinks
              </span>
              <span className="font-mono tabular-nums text-neutral-500 dark:text-[#7E869A]">
                {activeBacklinks.length}
              </span>
            </h2>
            <div className="mt-3 space-y-1.5">
              {activeBacklinks.length === 0 ? (
                <p className="text-xs text-neutral-500 dark:text-[#757D90]">
                  No incoming links yet. Mention{' '}
                  <code className="font-mono text-[11px]">[[{activeNote.slug}]]</code> in
                  another note to connect it.
                </p>
              ) : (
                activeBacklinks.map((src) => (
                  <button
                    key={src.path}
                    type="button"
                    onClick={() => onSelectNote(src.path)}
                    className="w-full text-left px-2.5 py-2 rounded-md border border-neutral-200 dark:border-[#242833] hover:border-[#8B5CF6]/60 bg-neutral-50 dark:bg-[#111215] transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-medium text-neutral-900 dark:text-[#E8EAF0] truncate">
                      {src.title}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500 dark:text-[#7E869A] truncate mt-0.5">
                      {src.folder}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="p-4 border-b border-neutral-200 dark:border-[#242833]">
            <h2 className="text-xs font-semibold text-neutral-900 dark:text-[#E8EAF0] flex items-center justify-between">
              <span>Outgoing Wikilinks</span>
              <span className="font-mono tabular-nums text-neutral-500 dark:text-[#7E869A]">
                {activeOutgoing.length}
              </span>
            </h2>
            <div className="mt-3 space-y-1.5">
              {activeOutgoing.length === 0 ? (
                <p className="text-xs text-neutral-500 dark:text-[#757D90]">
                  No outgoing links in this note.
                </p>
              ) : (
                activeOutgoing.map((link) =>
                  link.target ? (
                    <button
                      key={link.slug}
                      type="button"
                      onClick={() => onSelectNote(link.target!.path)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-[#6D28D9] dark:text-[#A78BFA] hover:bg-[#8B5CF6]/10 transition-colors cursor-pointer"
                    >
                      <span className="truncate font-mono">[[{link.slug}]]</span>
                      <span className="text-[11px] text-neutral-400 shrink-0">Open</span>
                    </button>
                  ) : (
                    <div
                      key={link.slug}
                      className="flex items-center justify-between px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400"
                    >
                      <span className="truncate font-mono">[[{link.slug}]]</span>
                      <span className="text-[11px] shrink-0">Missing</span>
                    </div>
                  ),
                )
              )}
            </div>
          </div>

          <div className="p-4">
            <h2 className="text-xs font-semibold text-neutral-900 dark:text-[#E8EAF0]">
              Shared Agent Memory Trail
            </h2>
            <div className="mt-3 space-y-3">
              {relatedActivities.length === 0 ? (
                <p className="text-xs text-neutral-500 dark:text-[#757D90]">
                  No recent agent reads or writes recorded for this file yet.
                </p>
              ) : (
                relatedActivities.map((act) => (
                  <div
                    key={act.id}
                    className="pb-3 border-b last:border-b-0 border-neutral-100 dark:border-[#222630]"
                  >
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-[#848C9E]">
                      <span className="font-medium text-neutral-800 dark:text-[#D5D9E4]">
                        {act.agentName}
                      </span>
                      <span className="font-mono tabular-nums">
                        {act.timestamp.slice(5, 16).replace('T', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-[#9BA3B4] mt-1 leading-relaxed">
                      {act.summary}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Create New Note Modal */}
      {showNewModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-note-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <form
            onSubmit={handleCreateNote}
            className="w-full max-w-lg rounded-xl border border-neutral-200 dark:border-[#2A2F3D] bg-white dark:bg-[#16181D] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-[#242833]">
              <h2 id="new-note-title" className="text-base font-semibold">
                Create Obsidian Vault Note
              </h2>
              <button
                type="button"
                aria-label="Close create note dialog"
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {modalError && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {modalError}
                </p>
              )}

              <div>
                <label
                  htmlFor="new-note-folder"
                  className="block text-xs font-medium text-neutral-700 dark:text-[#C5CBDA] mb-1.5"
                >
                  PARA Folder
                </label>
                <select
                  id="new-note-folder"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value as ParaFolderId)}
                  className="w-full px-3 py-2 text-sm rounded-md bg-neutral-50 dark:bg-[#111215] border border-neutral-200 dark:border-[#2A2F3D] text-neutral-900 dark:text-[#E8EAF0] focus:outline-none focus:border-[#8B5CF6]"
                >
                  {PARA_FOLDERS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="new-note-name"
                  className="block text-xs font-medium text-neutral-700 dark:text-[#C5CBDA] mb-1.5"
                >
                  Note Title
                </label>
                <input
                  id="new-note-name"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Webhook Retry Playbook"
                  className="w-full px-3 py-2 text-sm rounded-md bg-neutral-50 dark:bg-[#111215] border border-neutral-200 dark:border-[#2A2F3D] text-neutral-900 dark:text-[#E8EAF0] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label
                  htmlFor="new-note-body"
                  className="block text-xs font-medium text-neutral-700 dark:text-[#C5CBDA] mb-1.5"
                >
                  Initial Markdown (supports [[Wikilinks]])
                </label>
                <textarea
                  id="new-note-body"
                  rows={5}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="# Heading&#10;&#10;Linked to [[PROTOCOL]] and [[SaaS-Launch-Pipeline]]."
                  className="w-full px-3 py-2 text-xs font-mono rounded-md bg-neutral-50 dark:bg-[#111215] border border-neutral-200 dark:border-[#2A2F3D] text-neutral-900 dark:text-[#E8EAF0] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-neutral-200 dark:border-[#242833] bg-neutral-50 dark:bg-[#13151A]">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-md text-neutral-600 dark:text-[#9BA3B4] hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Creating...' : 'Create Note'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
