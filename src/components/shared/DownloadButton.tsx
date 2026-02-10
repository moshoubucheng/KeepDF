export interface DownloadButtonTranslations {
  download?: string;
}

interface DownloadButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  translations?: DownloadButtonTranslations;
}

export default function DownloadButton({
  onClick,
  label = 'Download',
  disabled = false,
  translations,
}: DownloadButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all active:scale-95 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {translations?.download ?? label}
    </button>
  );
}
