import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  color: { r: number; g: number; b: number };
  position: 'center' | 'diagonal';
}

export async function addWatermark(
  file: File,
  options: WatermarkOptions,
  onProgress?: (p: number) => void,
): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);

    let x: number, y: number, rotate: number;

    if (options.position === 'diagonal') {
      x = width / 2 - textWidth / 2;
      y = height / 2;
      rotate = options.rotation;
    } else {
      x = width / 2 - textWidth / 2;
      y = height / 2;
      rotate = 0;
    }

    page.drawText(options.text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(options.color.r, options.color.g, options.color.b),
      opacity: options.opacity,
      rotate: degrees(rotate),
    });

    onProgress?.(Math.round(((i + 1) / pages.length) * 100));
  }

  return doc.save();
}
