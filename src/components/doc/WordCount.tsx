import { useState, useCallback, useMemo, useRef } from 'react';
import { countWords } from '@lib/doc/wordCount';
import type { Translations } from '@/i18n/translations';

interface WordCountProps {
  translations?: {
    common: Translations['common'];
    wordCount: Translations['wordCount'];
  };
}

export default function WordCount({ translations }: WordCountProps) {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tr = translations?.wordCount;

  const stats = useMemo(() => countWords(text), [text]);

  const formatReadingTime = useCallback(
    (seconds: number) => {
      if (seconds === 0) return `0 ${tr?.minutes ?? 'min'} 0 ${tr?.seconds ?? 'sec'}`;
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return `${min} ${tr?.minutes ?? 'min'} ${sec} ${tr?.seconds ?? 'sec'}`;
    },
    [tr],
  );

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === 'string') {
          setText(result);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [],
  );

  const statItems = [
    { label: tr?.characters ?? 'Characters', value: stats.characters },
    { label: tr?.charactersNoSpaces ?? 'Characters (no spaces)', value: stats.charactersNoSpaces },
    { label: tr?.words ?? 'Words', value: stats.words },
    { label: tr?.sentences ?? 'Sentences', value: stats.sentences },
    { label: tr?.paragraphs ?? 'Paragraphs', value: stats.paragraphs },
    { label: tr?.readingTime ?? 'Reading time', value: formatReadingTime(stats.readingTimeSeconds) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-surface p-3">
        <button
          onClick={handleImport}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-fg-sec transition-colors hover:bg-hover-strong hover:text-fg"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {tr?.importFile ?? 'Import .txt or .md file'}
        </button>

        <button
          onClick={() => setText('')}
          disabled={!text}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-fg-sec transition-colors hover:bg-hover-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {translations?.common?.clear ?? 'Clear'}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,text/plain,text/markdown"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Stats panel */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statItems.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-xl border border-edge bg-surface p-4"
          >
            <span className="text-2xl font-bold text-brand-700">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            <span className="mt-1 text-xs font-medium text-fg-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Text input */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-edge bg-surface">
        <div className="flex items-center border-b border-edge-soft bg-page px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-faint">
            TEXT
          </span>
          <span className="ml-auto text-xs text-fg-faint">
            {text.length.toLocaleString()} chars
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="flex-1 resize-y bg-surface p-4 text-sm leading-relaxed text-fg outline-none placeholder:text-fg-faint"
          style={{ minHeight: '400px', tabSize: 2 }}
          placeholder={tr?.pasteText ?? 'Paste or type text here to see word count...'}
        />
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-fg-faint">
        All processing happens locally in your browser. Nothing is uploaded to any server.
      </p>
    </div>
  );
}
