import { PDFDocument } from 'pdf-lib';

export async function compressPdf(
  file: File,
  onProgress?: (p: number) => void,
): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  onProgress?.(10);

  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  onProgress?.(30);

  const compressedDoc = await PDFDocument.create();
  onProgress?.(40);

  const indices = srcDoc.getPageIndices();
  const copiedPages = await compressedDoc.copyPages(srcDoc, indices);
  onProgress?.(60);

  for (const page of copiedPages) {
    compressedDoc.addPage(page);
  }
  onProgress?.(70);

  // Strip metadata to reduce size
  compressedDoc.setTitle('');
  compressedDoc.setAuthor('');
  compressedDoc.setSubject('');
  compressedDoc.setKeywords([]);
  compressedDoc.setCreator('');
  compressedDoc.setProducer('');
  onProgress?.(80);

  // Save with object streams for better compression
  const result = await compressedDoc.save({ useObjectStreams: true });
  onProgress?.(100);

  return result;
}
