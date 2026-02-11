import { useState, useCallback, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { mdToPdf, type MdToPdfOptions } from '@lib/doc/mdToPdf';
import { useDownload } from '@hooks/useDownload';
import { Button } from '@/components/ui/button';
import type { Translations } from '@/i18n/translations';

interface MdToPdfProps {
  translations?: {
    common: Translations['common'];
    mdToPdf: Translations['mdToPdf'];
  };
}

export default function MdToPdf({ translations }: MdToPdfProps) {
  const [content, setContent] = useState('');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [margins, setMargins] = useState<'normal' | 'narrow' | 'wide'>('normal');
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const { download } = useDownload();

  const tr = translations?.mdToPdf;
  const common = translations?.common;

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
    [],
  );

  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!previewRef.current || !content.trim()) return;
    setExporting(true);
    setError(null);
    try {
      const htmlContent = previewRef.current.innerHTML;
      const options: MdToPdfOptions = { pageSize, margins };
      const blob = await mdToPdf(htmlContent, options);
      download(blob, tr?.resultName ?? 'document.pdf');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [content, pageSize, margins, download, tr]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-surface p-3">
        <Button variant="ghost" size="sm" onClick={handleImport}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {tr?.importFile ?? 'Import .md file'}
        </Button>

        <div className="hidden h-6 w-px bg-edge sm:block" />

        {/* Page size */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-fg-sec">
            {tr?.pageSize ?? 'Page size'}
          </label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter')}
            className="rounded-lg border border-edge bg-surface px-2.5 py-2.5 text-sm text-fg-sec outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          >
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </div>

        {/* Margins */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-fg-sec">
            {tr?.margins ?? 'Margins'}
          </label>
          <select
            value={margins}
            onChange={(e) => setMargins(e.target.value as 'normal' | 'narrow' | 'wide')}
            className="rounded-lg border border-edge bg-surface px-2.5 py-2.5 text-sm text-fg-sec outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          >
            <option value="normal">{tr?.marginsNormal ?? 'Normal'}</option>
            <option value="narrow">{tr?.marginsNarrow ?? 'Narrow'}</option>
            <option value="wide">{tr?.marginsWide ?? 'Wide'}</option>
          </select>
        </div>

        <div className="hidden h-6 w-px bg-edge sm:block" />

        {/* Export button */}
        <Button size="sm" onClick={handleExport} disabled={!content.trim() || exporting}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exporting ? (tr?.exporting ?? 'Exporting PDF...') : (tr?.exportBtn ?? 'Export as PDF')}
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Editor + Preview */}
      <div className="grid min-h-[500px] grid-cols-1 gap-4 md:grid-cols-2">
        {/* Editor pane */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-edge bg-surface">
          <div className="flex items-center border-b border-edge-soft bg-page px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-faint">
              MARKDOWN
            </span>
            <span className="ml-auto text-xs text-fg-faint">
              {content.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="flex-1 resize-y bg-surface p-4 font-mono text-sm leading-relaxed text-fg outline-none placeholder:text-fg-faint"
            style={{ minHeight: '460px', tabSize: 2 }}
            placeholder={tr?.pasteMarkdown ?? 'Paste or type Markdown here...'}
          />
        </div>

        {/* Preview pane */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-edge bg-surface">
          <div className="flex items-center border-b border-edge-soft bg-page px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-faint">
              PREVIEW
            </span>
          </div>
          <div
            className="flex-1 overflow-y-auto p-4"
            style={{ minHeight: '460px' }}
          >
            <div
              ref={previewRef}
              className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-brand-600 prose-code:rounded prose-code:bg-inset prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-900 prose-pre:text-gray-100"
            >
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
          Export failed: {error}
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-fg-faint">
        All processing happens locally in your browser. Nothing is uploaded to any server.
      </p>
    </div>
  );
}
