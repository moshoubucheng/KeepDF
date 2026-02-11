import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';

export async function encryptPdf(
  file: File,
  password: string,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const [{ default: html2canvas }, jspdfMod] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const jsPDF = jspdfMod.default ?? jspdfMod.jsPDF;

  onProgress?.(10);

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const numPages = doc.numPages;

  onProgress?.(20);

  const pdf = new jsPDF({
    unit: 'pt',
    encryption: {
      userPassword: password,
      ownerPassword: password,
      userPermissions: ['print'],
    },
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
    else pdf.internal.pageSize.width = pageW;
    pdf.internal.pageSize.height = pageH;

    pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);

    onProgress?.(20 + Math.round((i / numPages) * 70));
  }

  doc.destroy();
  onProgress?.(100);

  return pdf.output('blob');
}
