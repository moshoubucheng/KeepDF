/**
 * Convert multiple image files into a single PDF document using jsPDF.
 * Each image is placed on its own page.
 */

export interface ImageToPdfOptions {
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  fitMode: 'fit' | 'fill';
  onProgress?: (progress: number) => void;
}

/** Page dimensions in mm */
const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  letter: { w: 215.9, h: 279.4 },
};

const MARGIN = 10; // mm

/**
 * Maximum canvas dimension.
 * 2048px ensures ~150 DPI on A4 which is sufficient for print quality
 * while keeping file size small.
 */
const MAX_DIMENSION = 2048;

async function getImageDataUrl(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Downscale very large images to avoid canvas memory limits
  let targetW = width;
  let targetH = height;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    targetW = Math.round(width * scale);
    targetH = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  // Use JPEG with aggressive compression for smallest file size
  const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

  // Release canvas memory
  canvas.width = 0;
  canvas.height = 0;

  return { dataUrl, width: targetW, height: targetH };
}

export async function imagesToPdf(
  files: File[],
  options: ImageToPdfOptions,
): Promise<Blob> {
  const { pageSize, orientation, fitMode, onProgress } = options;

  const { jsPDF } = await import('jspdf');

  const pageDim = PAGE_SIZES[pageSize] ?? PAGE_SIZES.a4;
  const pageW = orientation === 'landscape' ? pageDim.h : pageDim.w;
  const pageH = orientation === 'landscape' ? pageDim.w : pageDim.h;

  const doc = new jsPDF({
    orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: pageSize,
    compress: true,
  });

  for (let i = 0; i < files.length; i++) {
    if (i > 0) {
      doc.addPage(pageSize, orientation === 'landscape' ? 'landscape' : 'portrait');
    }

    const imgData = await getImageDataUrl(files[i]);

    const availW = pageW - MARGIN * 2;
    const availH = pageH - MARGIN * 2;

    let drawW: number;
    let drawH: number;
    let drawX: number;
    let drawY: number;

    if (fitMode === 'fit') {
      // Scale to fit within available area, maintaining aspect ratio
      const scaleW = availW / imgData.width;
      const scaleH = availH / imgData.height;
      const scale = Math.min(scaleW, scaleH);
      drawW = imgData.width * scale;
      drawH = imgData.height * scale;
      // Center on page
      drawX = MARGIN + (availW - drawW) / 2;
      drawY = MARGIN + (availH - drawH) / 2;
    } else {
      // Fill: scale to cover the full page (may crop edges)
      const scaleW = pageW / imgData.width;
      const scaleH = pageH / imgData.height;
      const scale = Math.max(scaleW, scaleH);
      drawW = imgData.width * scale;
      drawH = imgData.height * scale;
      // Center (overflow will be clipped by page bounds)
      drawX = (pageW - drawW) / 2;
      drawY = (pageH - drawH) / 2;
    }

    doc.addImage(imgData.dataUrl, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');

    // Release the data URL string to free memory before processing next image
    imgData.dataUrl = '';

    onProgress?.(Math.round(((i + 1) / files.length) * 100));

    // Yield to the event loop to prevent UI freezing with many images
    if (i % 5 === 4) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return doc.output('blob');
}
