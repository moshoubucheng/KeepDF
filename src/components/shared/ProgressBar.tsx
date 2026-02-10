interface ProgressBarProps {
  progress: number;
  label?: string;
}

export default function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div className="mt-4">
      {label && <p className="mb-1 text-sm text-fg-sec">{label}</p>}
      <div className="h-2 overflow-hidden rounded-full bg-inset">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
