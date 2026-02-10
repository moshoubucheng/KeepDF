import { PDFDocument } from 'pdf-lib';

export async function mergePdfs(
  files: File[],
  onProgress?: (p: number) => void,
): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const bytes = new Uint8Array(await files[i].arrayBuffer());
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());

    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }

    onProgress?.(Math.round(((i + 1) / files.length) * 100));
  }

  return mergedDoc.save();
}
