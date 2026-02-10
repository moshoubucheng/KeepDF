import { PDFDocument } from 'pdf-lib';

/**
 * Parse a range string like "1-3,5,7-9" into arrays of page indices (0-based).
 * Each comma-separated segment becomes its own group.
 * Validates that all page numbers are within bounds.
 */
export function parseRanges(rangeStr: string, pageCount: number): number[][] {
  const segments = rangeStr
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (segments.length === 0) {
    throw new Error('No ranges specified.');
  }

  const result: number[][] = [];

  for (const segment of segments) {
    const match = segment.match(/^(\d+)\s*-\s*(\d+)$/);

    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);

      if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
        throw new Error(
          `Range "${segment}" is out of bounds. PDF has ${pageCount} page(s).`,
        );
      }
      if (start > end) {
        throw new Error(`Invalid range "${segment}": start exceeds end.`);
      }

      const pages: number[] = [];
      for (let p = start; p <= end; p++) {
        pages.push(p - 1); // convert to 0-based
      }
      result.push(pages);
    } else if (/^\d+$/.test(segment)) {
      const page = parseInt(segment, 10);
      if (page < 1 || page > pageCount) {
        throw new Error(
          `Page ${page} is out of bounds. PDF has ${pageCount} page(s).`,
        );
      }
      result.push([page - 1]);
    } else {
      throw new Error(`Invalid range format: "${segment}".`);
    }
  }

  return result;
}

export async function splitPdf(
  file: File,
  mode: 'all' | 'ranges' | 'extract',
  ranges: string,
  onProgress?: (p: number) => void,
): Promise<{ filename: string; data: Uint8Array }[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();
  const baseName = file.name.replace(/\.pdf$/i, '');

  const results: { filename: string; data: Uint8Array }[] = [];

  if (mode === 'all') {
    // Split every page into a separate PDF
    for (let i = 0; i < pageCount; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);
      const pdfBytes = await newDoc.save();
      results.push({
        filename: `${baseName}_page_${i + 1}.pdf`,
        data: pdfBytes,
      });
      onProgress?.(Math.round(((i + 1) / pageCount) * 100));
    }
  } else if (mode === 'ranges') {
    // Create a separate PDF for each range segment
    const rangeGroups = parseRanges(ranges, pageCount);

    for (let g = 0; g < rangeGroups.length; g++) {
      const group = rangeGroups[g];
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, group);
      for (const page of copiedPages) {
        newDoc.addPage(page);
      }
      const pdfBytes = await newDoc.save();

      // Build a human-readable label for the filename
      const first = group[0] + 1;
      const last = group[group.length - 1] + 1;
      const label = first === last ? `${first}` : `${first}-${last}`;
      results.push({
        filename: `${baseName}_pages_${label}.pdf`,
        data: pdfBytes,
      });
      onProgress?.(Math.round(((g + 1) / rangeGroups.length) * 100));
    }
  } else if (mode === 'extract') {
    // Merge all specified pages into a single PDF
    const rangeGroups = parseRanges(ranges, pageCount);
    const allPages = rangeGroups.flat();
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, allPages);

    for (let i = 0; i < copiedPages.length; i++) {
      newDoc.addPage(copiedPages[i]);
      onProgress?.(Math.round(((i + 1) / copiedPages.length) * 100));
    }

    const pdfBytes = await newDoc.save();
    results.push({
      filename: `${baseName}_extracted.pdf`,
      data: pdfBytes,
    });
  }

  return results;
}
