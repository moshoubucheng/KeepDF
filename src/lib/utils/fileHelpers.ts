export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

export function replaceExtension(filename: string, newExt: string): string {
  const base = filename.slice(0, filename.lastIndexOf('.'));
  return `${base}.${newExt}`;
}

export function validateFileType(file: File, acceptedTypes: string[]): boolean {
  const ext = getFileExtension(file.name);
  return acceptedTypes.some(
    (t) => t === ext || t === file.type
  );
}
