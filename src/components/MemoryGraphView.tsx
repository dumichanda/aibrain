import React, { useMemo, useState } from 'react';
import { ArrowUpRight, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { ParaFolderId, VaultNote } from '../types/vault';
import { PARA_FOLDERS, computeBacklinks, computeGraphLayout } from '../utils/vaultLogic';

interface MemoryGraphViewProps {
  notes: VaultNote[];
  onOpenNoteInVault: (notePath: string) => void;
}

export const MemoryGraphView: React.FC<MemoryGraphViewProps> = ({
  notes,
  onOpenNoteInVault,
}) => {
  const [hiddenFolders, setHiddenFolders] = useState<Set<ParaFolderId>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    notes.find((n) => n.slug === 'PROTOCOL')?.path ?? notes[0]?.path ?? null,
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const visibleNotes = useMemo(
    () => notes.filter((n) => !hiddenFolders.has(n.folder)),
    [notes, hiddenFolders],
  );

  const layout = useMemo(
    () => computeGraphLayout(visibleNotes, 960, 580),
    [visibleNotes],
  );

  const backlinksMap = useMemo(() => computeBacklinks(notes), [notes]);

  const activeFocusId = hoveredNodeId ?? selectedNodeId;

  const connectedSet = useMemo(() => {
    const set = new Set<string>();
    if (!activeFocusId) return set;
    set.add(activeFocusId);
    for (const edge of layout.edges) {
      if (edge.source === activeFocusId) set.add(edge.target);
      if (edge.target === activeFocusId) set.add(edge.source);
    }
    return set;
  }, [activeFocusId, layout.edges]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.path === selectedNodeId) ?? null,
    [notes, selectedNodeId],
  );

  const nodeById = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout.nodes],
  );

  const toggleFolderFilter = (folderId: ParaFolderId) => {
    setHiddenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-[#F9FAFB] dark:bg-[#111215]">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Graph Controls Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D]">
          <div>
            <h1 className="text-base font-semibold text-neutral-900 dark:text-white">
              Memory Galaxy Graph
            </h1>
            <p className="text-xs text-neutral-500 dark:text-[#848C9E] tabular-nums">
              {layout.nodes.length} notes · {layout.edges.length} wikilink connections across PARA folders
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Zoom out graph"
              onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.15).toFixed(2))))}
              className="p-2 rounded-md border border-neutral-200 dark:border-[#2B303C] text-neutral-700 dark:text-[#C5CBDA] hover:border-[#8B5CF6] cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Reset graph zoom"
              onClick={() => setZoom(1)}
              className="px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-md border border-neutral-200 dark:border-[#2B303C] text-neutral-700 dark:text-[#C5CBDA] hover:border-[#8B5CF6] cursor-pointer"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="Zoom in graph"
              onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
              className="p-2 rounded-md border border-neutral-200 dark:border-[#2B303C] text-neutral-700 dark:text-[#C5CBDA] hover:border-[#8B5CF6] cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Show all folders"
              onClick={() => {
                setHiddenFolders(new Set());
                setZoom(1);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-200 dark:border-[#2B303C] text-neutral-700 dark:text-[#C5CBDA] hover:border-[#8B5CF6] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Folder Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 px-6 py-2.5 border-b border-neutral-200 dark:border-[#242833] bg-neutral-50 dark:bg-[#13151A]">
          {PARA_FOLDERS.map((folder) => {
            const active = !hiddenFolders.has(folder.id);
            return (
              <button
                key={folder.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleFolderFilter(folder.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-[#1E222B] border-neutral-300 dark:border-[#323847] text-neutral-900 dark:text-[#E8EAF0]'
                    : 'bg-transparent border-transparent text-neutral-400 dark:text-[#5F677A] hover:text-neutral-700 dark:hover:text-[#9BA3B4]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: active ? folder.accentHex : 'currentColor',
                  }}
                />
                {folder.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Interactive SVG Graph Canvas */}
        <div className="flex-1 min-h-[380px] relative overflow-hidden">
          <svg
            data-testid="memory-graph-svg"
            viewBox="0 0 960 580"
            className="w-full h-full select-none"
            role="img"
            aria-label="Obsidian Shared Memory Knowledge Graph"
          >
            <g transform={`translate(${480 * (1 - zoom)} ${290 * (1 - zoom)}) scale(${zoom})`}>
              {/* Edges */}
              {layout.edges.map((edge) => {
                const a = nodeById.get(edge.source);
                const b = nodeById.get(edge.target);
                if (!a || !b) return null;
                const highlighted =
                  !activeFocusId ||
                  (connectedSet.has(edge.source) && connectedSet.has(edge.target));
                return (
                  <line
                    key={`${edge.source}-${edge.target}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={highlighted ? '#8B5CF6' : '#64748B'}
                    strokeOpacity={highlighted ? 0.52 : 0.14}
                    strokeWidth={highlighted ? 1.6 : 1}
                  />
                );
              })}

              {/* Nodes */}
              {layout.nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const isHighlighted = !activeFocusId || connectedSet.has(node.id);
                const radius = Math.min(14, 6 + node.degree * 1.4);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                    opacity={isHighlighted ? 1 : 0.25}
                  >
                    {isSelected && (
                      <circle
                        r={radius + 6}
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        strokeOpacity={0.7}
                      />
                    )}
                    <circle
                      r={radius}
                      fill={node.color}
                      stroke="#111215"
                      strokeWidth={2}
                    />
                    <text
                      y={radius + 14}
                      textAnchor="middle"
                      className="fill-neutral-700 dark:fill-[#CBD1DF] text-[10.5px] font-mono pointer-events-none"
                    >
                      {node.slug.length > 22 ? `${node.slug.slice(0, 21)}…` : node.slug}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Right Selected Node Inspector */}
      <aside className="w-full lg:w-[320px] shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-[#242833] bg-white dark:bg-[#16181D] p-5 overflow-y-auto">
        {selectedNote ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-mono text-neutral-500 dark:text-[#848C9E]">
                {selectedNote.folder}
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mt-1">
                {selectedNote.title}
              </h2>
              <div className="text-xs text-neutral-500 dark:text-[#7E869A] mt-1 tabular-nums">
                {selectedNote.frontmatter.author ?? 'Workspace'} · {selectedNote.wordCount} words ·{' '}
                {selectedNote.wikilinks.length} outgoing ·{' '}
                {(backlinksMap[selectedNote.path] ?? []).length} incoming
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenNoteInVault(selectedNote.path)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-colors cursor-pointer"
            >
              Open Note in Vault
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            <div className="pt-3 border-t border-neutral-200 dark:border-[#242833]">
              <h3 className="text-xs font-semibold text-neutral-800 dark:text-[#D5D9E4] mb-2">
                Excerpt
              </h3>
              <p className="text-xs leading-relaxed text-neutral-600 dark:text-[#9BA3B4] whitespace-pre-line">
                {selectedNote.body
                  .replace(/^#.*$/m, '')
                  .replace(/#{1,3}\s+/g, '')
                  .replace(/\*\*([^*]+)\*\*/g, '$1')
                  .replace(/`([^`]+)`/g, '$1')
                  .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
                  .replace(/\[\[([^\]]+)\]\]/g, '$1')
                  .trim()
                  .slice(0, 320)}
                {selectedNote.body.length > 320 ? '…' : ''}
              </p>
            </div>

            <div className="pt-3 border-t border-neutral-200 dark:border-[#242833]">
              <h3 className="text-xs font-semibold text-neutral-800 dark:text-[#D5D9E4] mb-2">
                Connected Neighbors
              </h3>
              <div className="space-y-1">
                {Array.from(connectedSet)
                  .filter((id) => id !== selectedNote.path)
                  .map((neighborPath) => {
                    const neighbor = notes.find((n) => n.path === neighborPath);
                    if (!neighbor) return null;
                    return (
                      <button
                        key={neighbor.path}
                        type="button"
                        onClick={() => setSelectedNodeId(neighbor.path)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-neutral-700 dark:text-[#C5CBDA] hover:bg-neutral-100 dark:hover:bg-[#222630] transition-colors cursor-pointer"
                      >
                        <span className="truncate font-mono">{neighbor.slug}</span>
                        <span className="text-[11px] text-neutral-400 shrink-0">Focus</span>
                      </button>
                    );
                  })}
                {connectedSet.size <= 1 && (
                  <p className="text-xs text-neutral-500 dark:text-[#757D90]">
                    Orphan node — add [[Wikilinks]] to connect it into the memory galaxy.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-500">Select a node in the graph to inspect it.</p>
        )}
      </aside>
    </div>
  );
};
