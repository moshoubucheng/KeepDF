/**
 * Stitch multiple images into one using the Canvas API.
 * All processing happens client-side -- no data leaves the browser.
 */
export interface StitchOptions {
  direction: 'vertical' | 'horizontal';
  align: 'start' | 'center' | 'end';
  spacing: number;
}

export async function stitchImages(files: File[], options: StitchOptions): Promise<Blob> {
  const { direction, align, spacing } = options;

  const bitmaps = await Promise.all(files.map((f) => createImageBitmap(f)));

  let totalWidth: number;
  let totalHeight: number;

  if (direction === 'vertical') {
    totalWidth = Math.max(...bitmaps.map((b) => b.width));
    totalHeight = bitmaps.reduce((sum, b) => sum + b.height, 0) + spacing * (bitmaps.length - 1);
  } else {
    totalWidth = bitmaps.reduce((sum, b) => sum + b.width, 0) + spacing * (bitmaps.length - 1);
    totalHeight = Math.max(...bitmaps.map((b) => b.height));
  }

  const draw = (ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D) => {
    let offset = 0;
    for (const bmp of bitmaps) {
      let x = 0;
      let y = 0;

      if (direction === 'vertical') {
        y = offset;
        if (align === 'center') x = (totalWidth - bmp.width) / 2;
        else if (align === 'end') x = totalWidth - bmp.width;
        offset += bmp.height + spacing;
      } else {
        x = offset;
        if (align === 'center') y = (totalHeight - bmp.height) / 2;
        else if (align === 'end') y = totalHeight - bmp.height;
        offset += bmp.width + spacing;
      }

      ctx.drawImage(bmp, x, y);
    }
    for (const bmp of bitmaps) bmp.close();
  };

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(totalWidth, totalHeight);
    const ctx = canvas.getContext('2d')!;
    draw(ctx);
    return await canvas.convertToBlob({ type: 'image/png' });
  }

  // Fallback: HTMLCanvasElement
  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas stitch failed'));
      },
      'image/png',
    );
  });
}
