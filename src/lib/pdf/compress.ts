/**
 * Compress a PDF by re-rendering each page as a JPEG image and
 * assembling them into a new PDF. This is the most reliable approach
 * for extreme compression — it works regardless of the internal
 * structure of the source PDF.
 *
 * Trade-off: text will no longer be selectable in the output PDF,
 * but the visual content is fully preserved.
 */
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';

/** Render DPI — 150 gives good print quality at small file size */
const RENDER_SCALE = 150 / 72; // 72 DPI is PDF default → render at ~150 DPI
const JPEG_QUALITY = 0.5;

export async function compressPdf(
  file: File,
  onProgress?: (p: number) => void,
): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  onProgress?.(5);

  const srcDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const numPages = srcDoc.numPages;
  onProgress?.(10);

  // Dynamically import jsPDF
  const { jsPDF } = await import('jspdf');

  // Get the first page to initialise the PDF
  const firstPage = await srcDoc.getPage(1);
  const firstVp = firstPage.getViewport({ scale: RENDER_SCALE });
  // Page size in mm (1 inch = 25.4 mm, rendered at RENDER_SCALE * 72 DPI)
  const toMm = 25.4 / (RENDER_SCALE * 72);

  const doc = new jsPDF({
    unit: 'mm',
    format: [firstVp.width * toMm, firstVp.height * toMm],
    orientation: firstVp.width > firstVp.height ? 'landscape' : 'portrait',
    compress: true,
  });

  for (let i = 1; i <= numPages; i++) {
    const page = await srcDoc.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport } as any).promise;

    // Convert to JPEG data URL
    const imgData = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

    // Release canvas memory
    canvas.width = 0;
    canvas.height = 0;

    const pageW = viewport.width * toMm;
    const pageH = viewport.height * toMm;

    if (i > 1) {
      doc.addPage([pageW, pageH], viewport.width > viewport.height ? 'landscape' : 'portrait');
    } else {
      // Resize first page if dimensions differ from init
      (doc.internal.pageSize as any).width = pageW;
      (doc.internal.pageSize as any).height = pageH;
    }

    doc.addImage(imgData, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');

    onProgress?.(10 + Math.round((i / numPages) * 85));

    // Yield to event loop every few pages to keep UI responsive
    if (i % 3 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  srcDoc.destroy();
  onProgress?.(100);

  // Return as Uint8Array
  const output = doc.output('arraybuffer');
  return new Uint8Array(output);
}
