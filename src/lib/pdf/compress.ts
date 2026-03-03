import { PDFDocument, PDFName, PDFRawStream, PDFDict, PDFRef } from 'pdf-lib';

/**
 * Maximum image dimension after downscaling.
 * 1600px keeps ~130 DPI on A4 — good enough for screen & basic print.
 */
const MAX_IMG_DIM = 1600;
const JPEG_QUALITY = 0.5;

/**
 * Recompress an image blob via canvas → JPEG.
 * Returns the JPEG bytes and the new dimensions.
 */
async function recompressImage(
  imgBytes: Uint8Array,
  mimeType: string,
): Promise<{ jpegBytes: Uint8Array; width: number; height: number } | null> {
  try {
    const blob = new Blob([imgBytes as BlobPart], { type: mimeType });
    const bitmap = await createImageBitmap(blob);
    let { width, height } = bitmap;

    // Downscale if needed
    if (width > MAX_IMG_DIM || height > MAX_IMG_DIM) {
      const scale = MAX_IMG_DIM / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        JPEG_QUALITY,
      );
    });

    // Release canvas memory
    canvas.width = 0;
    canvas.height = 0;

    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    return { jpegBytes, width, height };
  } catch {
    // If image can't be decoded (e.g. CMYK, JBIG2), skip it
    return null;
  }
}

/**
 * Walk all pages and collect image XObject references.
 */
function collectImageRefs(doc: PDFDocument): PDFRef[] {
  const refs = new Set<string>();
  const result: PDFRef[] = [];

  for (const page of doc.getPages()) {
    const resources = page.node.get(PDFName.of('Resources'));
    if (!(resources instanceof PDFDict)) continue;

    const xObject = resources.get(PDFName.of('XObject'));
    if (!(xObject instanceof PDFDict)) continue;

    const entries = xObject.entries();
    for (const [, value] of entries) {
      if (value instanceof PDFRef) {
        const obj = doc.context.lookup(value);
        if (obj instanceof PDFRawStream) {
          const dict = obj.dict;
          const subtype = dict.get(PDFName.of('Subtype'));
          if (subtype && subtype.toString() === '/Image') {
            const key = value.toString();
            if (!refs.has(key)) {
              refs.add(key);
              result.push(value);
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Determine the MIME type of an embedded image from its filter.
 */
function getImageMimeType(dict: PDFDict): string {
  const filter = dict.get(PDFName.of('Filter'));
  if (filter) {
    const filterStr = filter.toString();
    if (filterStr.includes('DCTDecode')) return 'image/jpeg';
    if (filterStr.includes('JPXDecode')) return 'image/jp2';
    // FlateDecode often means PNG-like data
  }
  return 'image/png';
}

/**
 * Get raw bytes from a stream.
 */
function getStreamBytes(stream: PDFRawStream): Uint8Array {
  return stream.contents;
}

export async function compressPdf(
  file: File,
  onProgress?: (p: number) => void,
): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  onProgress?.(5);

  // Load the source document — we'll modify images in-place before copying
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  onProgress?.(15);

  // Collect all image XObject references
  const imageRefs = collectImageRefs(srcDoc);
  onProgress?.(20);

  // Recompress each image
  const totalImages = imageRefs.length;
  for (let i = 0; i < totalImages; i++) {
    const ref = imageRefs[i];
    const obj = srcDoc.context.lookup(ref);
    if (!(obj instanceof PDFRawStream)) continue;

    const dict = obj.dict;
    const mimeType = getImageMimeType(dict);
    const rawBytes = getStreamBytes(obj);

    // For DCTDecode (JPEG), the raw bytes are the JPEG data directly
    // For other filters, we construct an image from the raw data
    let imgBytes: Uint8Array;
    if (mimeType === 'image/jpeg') {
      imgBytes = rawBytes;
    } else {
      // For non-JPEG images (FlateDecode/PNG-like), try to build a decodable image.
      // pdf-lib stores raw decoded pixel data for FlateDecode streams,
      // so we need to construct a valid image. We'll create a BMP-like representation.
      // However, the simplest approach: embed the raw bytes as a blob and try createImageBitmap.
      // If it fails, skip this image.
      imgBytes = rawBytes;
    }

    const result = await recompressImage(imgBytes, mimeType);
    if (!result) continue;

    // Replace the image stream with the new JPEG data
    const newStream = srcDoc.context.stream(result.jpegBytes, {
      ['/Type']: '/XObject',
      ['/Subtype']: '/Image',
      ['/Width']: result.width,
      ['/Height']: result.height,
      ['/ColorSpace']: '/DeviceRGB',
      ['/BitsPerComponent']: 8,
      ['/Filter']: '/DCTDecode',
      ['/Length']: result.jpegBytes.length,
    });

    srcDoc.context.assign(ref, newStream);

    // Report progress (20% - 80% for image processing)
    onProgress?.(20 + Math.round(((i + 1) / totalImages) * 60));

    // Yield to event loop periodically
    if (i % 3 === 2) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress?.(80);

  // Create a new document and copy all pages to strip orphaned objects
  const compressedDoc = await PDFDocument.create();
  const indices = srcDoc.getPageIndices();
  const copiedPages = await compressedDoc.copyPages(srcDoc, indices);
  for (const page of copiedPages) {
    compressedDoc.addPage(page);
  }
  onProgress?.(90);

  // Strip metadata
  compressedDoc.setTitle('');
  compressedDoc.setAuthor('');
  compressedDoc.setSubject('');
  compressedDoc.setKeywords([]);
  compressedDoc.setCreator('');
  compressedDoc.setProducer('');

  // Save with object streams for additional compression
  const output = await compressedDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  onProgress?.(100);

  return output;
}
