import { PDFDocument, degrees } from 'pdf-lib';

export type RotationAngle = 90 | 180 | 270;

export function parsePageRanges(input: string, totalPages: number): number[] {
  const pages = new Set<number>();
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Math.max(1, parseInt(rangeMatch[1], 10));
      const end = Math.min(totalPages, parseInt(rangeMatch[2], 10));
      for (let i = start; i <= end; i++) pages.add(i);
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) pages.add(num);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export async function rotatePdf(
  file: File,
  angle: RotationAngle,
  pageIndices?: number[],
): Promise<Blob> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdfDoc = await PDFDocument.load(data);
  const pages = pdfDoc.getPages();

  const targets = pageIndices
    ? pageIndices.filter((i) => i >= 1 && i <= pages.length)
    : pages.map((_, i) => i + 1);

  for (const pageNum of targets) {
    const page = pages[pageNum - 1];
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + angle));
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
