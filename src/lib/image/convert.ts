/**
 * Convert an image file to a target format using the Canvas API.
 * Handles transparency correctly when converting to JPEG (fills white background).
 */

const FORMAT_MIME: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export async function convertImage(
  file: File,
  targetFormat: 'png' | 'jpeg' | 'webp',
  quality: number = 0.92,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const mime = FORMAT_MIME[targetFormat];

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;

    // JPEG does not support transparency -- fill white first
    if (targetFormat === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    return await canvas.convertToBlob({ type: mime, quality });
  }

  // Fallback: HTMLCanvasElement
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (targetFormat === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Image conversion failed'));
      },
      mime,
      quality,
    );
  });
}
