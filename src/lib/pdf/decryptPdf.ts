import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';

export async function decryptPdf(
  file: File,
  password: string,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const data = new Uint8Array(await file.arrayBuffer());

  onProgress?.(10);

  // pdfjs-dist supports all encryption types (RC4, AES-128, AES-256)
  let doc;
  try {
    doc = await pdfjsLib.getDocument({ data, password }).promise;
  } catch (err: any) {
    if (err?.name === 'PasswordException') {
      throw new Error('WRONG_PASSWORD');
    }
    throw err;
  }

  onProgress?.(20);

  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.default ?? jspdfMod.jsPDF;

  const numPages = doc.numPages;

  // Get first page to determine initial size
  const firstPage = await doc.getPage(1);
  const firstVp = firstPage.getViewport({ scale: 2 });

  const pdf = new jsPDF({
    unit: 'pt',
    format: [firstVp.width / 2, firstVp.height / 2],
    orientation: firstVp.width > firstVp.height ? 'landscape' : 'portrait',
  });

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pageW = viewport.width / 2;
    const pageH = viewport.height / 2;

    if (i > 1) pdf.addPage([pageW, pageH]);
    else {
      pdf.internal.pageSize.width = pageW;
      pdf.internal.pageSize.height = pageH;
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);

    onProgress?.(20 + Math.round((i / numPages) * 70));
  }

  doc.destroy();
  onProgress?.(100);

  return pdf.output('blob');
}
