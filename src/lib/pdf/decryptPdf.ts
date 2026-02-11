import { PDFDocument } from 'pdf-lib';

export async function decryptPdf(
  file: File,
  password: string,
): Promise<Blob> {
  const data = new Uint8Array(await file.arrayBuffer());

  const pdfDoc = await PDFDocument.load(data, {
    password,
    ignoreEncryption: false,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
