/**
 * Resize an image to specific dimensions using the Canvas API.
 * Preserves original format. Fills white background for JPEG output.
 */
export async function resizeImage(
  file: File,
  width: number,
  height: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const mime = (file.type || 'image/png') as string;
  const isJpeg = mime === 'image/jpeg';

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;

    if (isJpeg) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return await canvas.convertToBlob({ type: mime, quality: 0.92 });
  }

  // Fallback: HTMLCanvasElement
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (isJpeg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Image resize failed'));
      },
      mime,
      0.92,
    );
  });
}
