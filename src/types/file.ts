export interface ProcessingFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  result?: ProcessingResult;
  error?: string;
}

export interface ProcessingResult {
  blob: Blob;
  filename: string;
  originalSize: number;
  resultSize: number;
}
