import React from 'react';
import type { VaultNote } from '../types/vault';
import { resolveWikilink } from '../utils/vaultLogic';

interface MarkdownRendererProps {
  markdown: string;
  notes: VaultNote[];
  onNavigateNote: (notePath: string) => void;
}

function renderInline(
  text: string,
  notes: VaultNote[],
  onNavigateNote: (notePath: string) => void,
  keyPrefix: string,
): React.ReactNode[] {
  // Tokenize [[Wikilinks]], `inline code`, and **bold**
  const tokenRegex = /(\[\[[^\]]+\]\]|`[^`]+`|\*\*[^*]+\*\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;

    if (part.startsWith('[[') && part.endsWith(']]')) {
      const inner = part.slice(2, -2);
      const [rawTarget, alias] = inner.split('|');
      const target = rawTarget.split('#')[0].trim();
      const label = (alias ?? rawTarget).trim();
      const matched = resolveWikilink(target, notes);

      if (matched) {
        return (
          <button
            key={key}
            type="button"
            onClick={() => onNavigateNote(matched.path)}
            className="inline font-medium text-[#7C3AED] dark:text-[#A78BFA] underline decoration-[#8B5CF6]/40 underline-offset-2 hover:decoration-[#8B5CF6] transition-colors cursor-pointer"
          >
            {label}
          </button>
        );
      }

      return (
        <span
          key={key}
          title={`Unresolved link: ${target}`}
          className="inline font-medium text-amber-700 dark:text-amber-400 underline decoration-dashed decoration-amber-500/60 underline-offset-2"
        >
          {label}
        </span>
      );
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={key}
          className="px-1.5 py-0.5 text-[13px] rounded bg-neutral-100 dark:bg-[#232732] text-neutral-800 dark:text-[#D5D9E4] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={key} className="font-semibold text-neutral-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  markdown,
  notes,
  onNavigateNote,
}) => {
  const lines = markdown.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code blocks
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <div
          key={`code-${i}`}
          className="my-4 rounded-lg border border-neutral-200 dark:border-[#262A34] bg-neutral-50 dark:bg-[#0D0E11] overflow-x-auto"
        >
          {lang && (
            <div className="px-3 py-1.5 border-b border-neutral-200 dark:border-[#262A34] text-[11px] font-mono text-neutral-500 dark:text-[#848C9E]">
              {lang}
            </div>
          )}
          <pre className="p-3.5 text-[13px] leading-relaxed font-mono text-neutral-800 dark:text-[#D5D9E4]">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>,
      );
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2], notes, onNavigateNote, `h-${i}`);
      if (level === 1) {
        blocks.push(
          <h1
            key={`h1-${i}`}
            className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1 mb-4"
          >
            {content}
          </h1>,
        );
      } else if (level === 2) {
        blocks.push(
          <h2
            key={`h2-${i}`}
            className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-[#F1F3F8] mt-7 mb-2.5 pb-1.5 border-b border-neutral-200 dark:border-[#242833]"
          >
            {content}
          </h2>,
        );
      } else {
        blocks.push(
          <h3
            key={`h3-${i}`}
            className="text-base font-semibold text-neutral-800 dark:text-[#E2E5EE] mt-5 mb-2"
          >
            {content}
          </h3>,
        );
      }
      i += 1;
      continue;
    }

    // Bullet / checklist lists
    if (/^\s*-\s+/.test(line)) {
      const listItems: React.ReactNode[] = [];
      const startIdx = i;
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*-\s+/, '');
        const checkMatch = itemText.match(/^\[(x|X| )\]\s+(.+)$/);
        if (checkMatch) {
          const checked = checkMatch[1].toLowerCase() === 'x';
          listItems.push(
            <li key={`li-${i}`} className="flex items-start gap-2.5 leading-relaxed">
              <span
                aria-hidden="true"
                className={`mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-mono ${
                  checked
                    ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white'
                    : 'border-neutral-300 dark:border-[#3A4050] text-transparent'
                }`}
              >
                ✓
              </span>
              <span className={checked ? 'line-through text-neutral-500 dark:text-[#7E869A]' : ''}>
                {renderInline(checkMatch[2], notes, onNavigateNote, `chk-${i}`)}
              </span>
            </li>,
          );
        } else {
          listItems.push(
            <li key={`li-${i}`} className="flex items-start gap-2.5 leading-relaxed">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400 dark:bg-[#5E667A]" />
              <span>{renderInline(itemText, notes, onNavigateNote, `bul-${i}`)}</span>
            </li>,
          );
        }
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${startIdx}`} className="my-3 space-y-2 text-[15px] text-neutral-700 dark:text-[#C9CFDC]">
          {listItems}
        </ul>,
      );
      continue;
    }

    // Numbered lists
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: React.ReactNode[] = [];
      const startIdx = i;
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const numMatch = lines[i].match(/^\s*(\d+)\.\s+(.+)$/);
        if (numMatch) {
          listItems.push(
            <li key={`oli-${i}`} className="flex items-start gap-2.5 leading-relaxed">
              <span className="font-mono text-xs tabular-nums text-neutral-500 dark:text-[#7F879A] mt-1 shrink-0 w-5">
                {numMatch[1]}.
              </span>
              <span>{renderInline(numMatch[2], notes, onNavigateNote, `num-${i}`)}</span>
            </li>,
          );
        }
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${startIdx}`} className="my-3 space-y-2 text-[15px] text-neutral-700 dark:text-[#C9CFDC]">
          {listItems}
        </ol>,
      );
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    blocks.push(
      <p key={`p-${i}`} className="my-3 text-[15px] leading-[1.7] text-neutral-700 dark:text-[#C9CFDC]">
        {renderInline(line, notes, onNavigateNote, `p-${i}`)}
      </p>,
    );
    i += 1;
  }

  return <div className="max-w-[74ch]">{blocks}</div>;
};
