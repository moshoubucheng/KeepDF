/**
 * Crop an image file using the Canvas API.
 * All processing happens client-side -- no data leaves the browser.
 */
export interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropImage(file: File, params: CropParams): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const { x, y, width, height } = params;

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
    bitmap.close();

    const mime = (file.type || 'image/png') as string;
    return await canvas.convertToBlob({ type: mime, quality: 1 });
  }

  // Fallback: HTMLCanvasElement
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    const mime = file.type || 'image/png';
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas crop failed'));
      },
      mime,
      1,
    );
  });
}
