import { useState, useCallback, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Translations } from '@/i18n/translations';

type ViewMode = 'edit' | 'split' | 'preview';

interface MarkdownEditorProps {
  translations?: {
    common: Translations['common'];
    mdEditor: Translations['mdEditor'];
  };
}

const DEFAULT_CONTENT = `# Welcome to the Markdown Editor

This is a **privacy-first** Markdown editor. Everything runs in your browser — no data is sent to any server.

## Features

- **Live preview** with GitHub Flavored Markdown
- *Italic*, **bold**, and ~~strikethrough~~ text
- Import and export \`.md\` files
- Three view modes: Edit, Split, and Preview

## Example Table

| Feature       | Status |
| ------------- | ------ |
| GFM Tables    | Yes    |
| Task Lists    | Yes    |
| Code Blocks   | Yes    |
| Syntax Highlight | Coming Soon |

## Code Block

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('World');
\`\`\`

## Task List

- [x] Create the editor
- [x] Add live preview
- [ ] Add more formatting options

## Links & Images

Visit [KeepDF.com](https://keepdf.com) for more privacy-first tools.

> "Privacy is not something that I'm merely entitled to, it's an absolute prerequisite."
> — Marlon Brando

---

Start editing to see the live preview!
`;

export default function MarkdownEditor({ translations }: MarkdownEditorProps) {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === 'string') {
          setContent(text);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    []
  );

  const handleExport = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  const handleNew = useCallback(() => {
    if (content.trim() && content !== DEFAULT_CONTENT) {
      const confirmed = window.confirm(
        'Clear the editor? Any unsaved changes will be lost.'
      );
      if (!confirmed) return;
    }
    setContent('');
  }, [content]);

  const viewModeButtons: { mode: ViewMode; label: string; icon: JSX.Element }[] = [
    {
      mode: 'edit',
      label: translations?.mdEditor.edit ?? 'Edit',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      mode: 'split',
      label: translations?.mdEditor.split ?? 'Split',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
        </svg>
      ),
    },
    {
      mode: 'preview',
      label: translations?.mdEditor.preview ?? 'Preview',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
  ];

  const showEditor = viewMode === 'edit' || viewMode === 'split';
  const showPreview = viewMode === 'preview' || viewMode === 'split';

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-surface p-3">
        {/* View mode toggle */}
        <div className="flex rounded-lg border border-edge bg-page p-0.5">
          {viewModeButtons.map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-surface text-brand-700 shadow-sm'
                  : 'text-fg-muted hover:text-fg-sec'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="hidden h-6 w-px bg-edge sm:block" />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-fg-sec transition-colors hover:bg-hover-strong hover:text-fg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {translations?.mdEditor.newDoc ?? 'New'}
          </button>

          <button
            onClick={handleImport}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-fg-sec transition-colors hover:bg-hover-strong hover:text-fg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {translations?.mdEditor.importMd ?? 'Import'}
          </button>

          <button
            onClick={handleExport}
            disabled={!content.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {translations?.mdEditor.exportMd ?? 'Export .md'}
          </button>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Editor + Preview area */}
      <div
        className={`grid min-h-[500px] gap-4 ${
          viewMode === 'split'
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1'
        }`}
      >
        {/* Editor pane */}
        {showEditor && (
          <div className="flex flex-col overflow-hidden rounded-xl border border-edge bg-surface">
            <div className="flex items-center border-b border-edge-soft bg-page px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-faint">
                {translations?.mdEditor.editor ?? 'EDITOR'}
              </span>
              <span className="ml-auto text-xs text-fg-faint">
                {content.length.toLocaleString()} {translations?.mdEditor.chars ?? 'chars'}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              className="flex-1 resize-y bg-surface p-4 font-mono text-sm leading-relaxed text-fg outline-none placeholder:text-fg-faint"
              style={{ minHeight: '460px', tabSize: 2 }}
              placeholder="Start typing Markdown..."
            />
          </div>
        )}

        {/* Preview pane */}
        {showPreview && (
          <div className="flex flex-col overflow-hidden rounded-xl border border-edge bg-surface">
            <div className="flex items-center border-b border-edge-soft bg-page px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-faint">
                {translations?.mdEditor.preview ?? 'Preview'}
              </span>
            </div>
            <div
              className="flex-1 overflow-y-auto p-4"
              style={{ minHeight: '460px' }}
            >
              <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-brand-600 prose-code:rounded prose-code:bg-inset prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-900 prose-pre:text-gray-100">
                <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <p className="text-center text-xs text-fg-faint">
        All processing happens locally in your browser. Nothing is uploaded to any server.
      </p>
    </div>
  );
}
