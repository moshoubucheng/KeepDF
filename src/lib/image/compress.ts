/**
 * Compress an image file using the Canvas API.
 * All processing happens client-side -- no data leaves the browser.
 */
export async function compressImage(file: File, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const candidates: Blob[] = [];
  const originalMime = file.type || 'image/png';

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    // Try multiple formats and pick the smallest
    for (const mime of ['image/webp', 'image/jpeg', originalMime]) {
      try {
        candidates.push(await canvas.convertToBlob({ type: mime, quality }));
      } catch { /* unsupported format */ }
    }
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const toBlob = (mime: string, q: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, q));

    for (const mime of ['image/webp', 'image/jpeg', originalMime]) {
      const b = await toBlob(mime, quality);
      if (b) candidates.push(b);
    }
  }

  if (candidates.length === 0) return file;

  // Pick smallest candidate
  const smallest = candidates.reduce((a, b) => (a.size <= b.size ? a : b));

  // Never return a file larger than the original
  return smallest.size < file.size ? smallest : file;
}
