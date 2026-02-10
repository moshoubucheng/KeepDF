import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';

export async function getPageCount(file: File): Promise<number> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const count = doc.numPages;
  doc.destroy();
  return count;
}

/** Convert an image source (ImageBitmap, canvas, or raw RGBA) to PNG ArrayBuffer */
function imageToPng(
  source: ImageBitmap | HTMLCanvasElement | { data: Uint8ClampedArray; width: number; height: number },
  w: number,
  h: number,
): Promise<ArrayBuffer> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (source instanceof ImageBitmap) {
    ctx.drawImage(source, 0, 0);
  } else if (source instanceof HTMLCanvasElement) {
    ctx.drawImage(source, 0, 0);
  } else if (source && 'data' in source && source.data instanceof Uint8ClampedArray) {
    const imgData = new ImageData(new Uint8ClampedArray(source.data), w, h);
    ctx.putImageData(imgData, 0, 0);
  }

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!.arrayBuffer()), 'image/png'),
  );
}

/** Extract embedded images from a PDF page. Page must be rendered first. */
async function extractPageImages(
  page: any,
): Promise<{ buf: ArrayBuffer; width: number; height: number; y: number }[]> {
  const ops = await page.getOperatorList();
  const images: { buf: ArrayBuffer; width: number; height: number; y: number }[] = [];

  const OPS_TRANSFORM = pdfjsLib.OPS.transform;
  const OPS_PAINT_IMAGE = pdfjsLib.OPS.paintImageXObject;
  const OPS_PAINT_INLINE = pdfjsLib.OPS.paintInlineImageXObject;

  let currentY = 0;

  for (let j = 0; j < ops.fnArray.length; j++) {
    if (ops.fnArray[j] === OPS_TRANSFORM) {
      const m = ops.argsArray[j];
      if (m && m[5] != null) currentY = m[5];
    }

    const isPaintImage = ops.fnArray[j] === OPS_PAINT_IMAGE;
    const isInlineImage = ops.fnArray[j] === OPS_PAINT_INLINE;

    if (!isPaintImage && !isInlineImage) continue;

    try {
      let imgObj: any = null;

      if (isPaintImage) {
        const objId = ops.argsArray[j][0];
        // Try page.objs first, then commonObjs
        const store = typeof objId === 'string' && objId.startsWith('g_')
          ? page.commonObjs
          : page.objs;

        imgObj = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
          store.get(objId, (obj: any) => {
            clearTimeout(timeout);
            resolve(obj);
          });
        });
      } else {
        // Inline image: data is directly in args
        imgObj = ops.argsArray[j][0];
      }

      if (!imgObj) continue;

      const w = imgObj.width;
      const h = imgObj.height;
      if (!w || !h || w < 20 || h < 20) continue;

      let buf: ArrayBuffer;

      if (imgObj.bitmap && imgObj.bitmap instanceof ImageBitmap) {
        buf = await imageToPng(imgObj.bitmap, w, h);
      } else if (imgObj instanceof ImageBitmap) {
        buf = await imageToPng(imgObj, imgObj.width, imgObj.height);
      } else if (imgObj.data instanceof Uint8ClampedArray) {
        buf = await imageToPng(imgObj, w, h);
      } else if (imgObj.data instanceof Uint8Array) {
        // Convert Uint8Array to Uint8ClampedArray
        const clamped = new Uint8ClampedArray(imgObj.data.buffer, imgObj.data.byteOffset, imgObj.data.byteLength);
        buf = await imageToPng({ data: clamped, width: w, height: h }, w, h);
      } else {
        continue;
      }

      images.push({ buf, width: w, height: h, y: currentY });
    } catch {
      // Skip images we can't extract
    }
  }

  return images;
}

export async function pdfToWord(
  file: File,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, ImageRun, PageBreak } = await import('docx');

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;

  // Max image width in docx pixels (96 dpi), A4 usable ≈ 6.3 inches
  const MAX_IMG_W = Math.round(6.3 * 96);

  const sections: any[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);

    // Render the page first to populate image objects in page.objs
    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const pageHeight = viewport.height;

    // --- Extract text ---
    const textContent = await page.getTextContent();
    const items = textContent.items.filter((item: any) => item.str && item.str.trim());

    items.sort((a: any, b: any) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 2) return yDiff;
      return a.transform[4] - b.transform[4];
    });

    interface TextLine { text: string; y: number; fontSize: number }
    const lines: TextLine[] = [];
    let currentLine = '';
    let lastY = -Infinity;
    let lineY = 0;
    let lineFontSize = 12;

    for (const item of items) {
      const y = (item as any).transform[5];
      const fs = (item as any).height || 12;
      if (lastY !== -Infinity && Math.abs(y - lastY) > 2) {
        if (currentLine.trim()) lines.push({ text: currentLine.trim(), y: lineY, fontSize: lineFontSize });
        currentLine = '';
      }
      if (!currentLine) {
        lineY = y;
        lineFontSize = fs;
      }
      currentLine += (currentLine ? ' ' : '') + (item as any).str;
      lastY = y;
    }
    if (currentLine.trim()) lines.push({ text: currentLine.trim(), y: lineY, fontSize: lineFontSize });

    // --- Extract images ---
    const images = await extractPageImages(page);

    // --- Merge text and images by Y position (top to bottom) ---
    type ContentItem =
      | { type: 'text'; text: string; fontSize: number; y: number }
      | { type: 'image'; buf: ArrayBuffer; width: number; height: number; y: number };

    const content: ContentItem[] = [];
    for (const line of lines) {
      content.push({ type: 'text', text: line.text, fontSize: line.fontSize, y: line.y });
    }
    for (const img of images) {
      content.push({ type: 'image', buf: img.buf, width: img.width, height: img.height, y: img.y });
    }

    // Sort by Y descending (higher Y = higher on page in PDF coords)
    content.sort((a, b) => b.y - a.y);

    // --- Build paragraphs ---
    const paragraphs: any[] = [];

    for (const item of content) {
      if (item.type === 'text') {
        const isBold = item.fontSize > 15;
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.text,
                bold: isBold,
                size: Math.round(item.fontSize * 2),
              }),
            ],
          }),
        );
      } else {
        let w = item.width;
        let h = item.height;
        if (w > MAX_IMG_W) {
          const r = MAX_IMG_W / w;
          w = MAX_IMG_W;
          h = Math.round(h * r);
        }
        paragraphs.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: item.buf,
                transformation: { width: w, height: h },
                type: 'png',
              }),
            ],
          }),
        );
      }
    }

    if (paragraphs.length === 0) {
      paragraphs.push(new Paragraph({ children: [new TextRun('')] }));
    }

    if (i < doc.numPages) {
      paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
    }

    sections.push({ properties: {}, children: paragraphs });
    onProgress?.(Math.round((i / doc.numPages) * 100));
  }

  doc.destroy();

  const wordDoc = new Document({ sections });
  return await Packer.toBlob(wordDoc);
}
