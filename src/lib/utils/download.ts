export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadMultipleBlobs(
  items: { blob: Blob; filename: string }[]
): void {
  items.forEach((item, i) => {
    setTimeout(() => downloadBlob(item.blob, item.filename), i * 100);
  });
}
