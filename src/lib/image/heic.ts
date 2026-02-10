/**
 * Convert HEIC/HEIF images to JPG or PNG using heic2any.
 * All processing happens client-side -- no data leaves the browser.
 */
export async function convertHeic(
  file: File,
  targetFormat: 'image/jpeg' | 'image/png',
  quality: number,
): Promise<Blob> {
  const heic2any = (await import('heic2any')).default;

  const result = await heic2any({
    blob: file,
    toType: targetFormat,
    quality,
  });

  // heic2any may return a Blob or Blob[]
  if (Array.isArray(result)) {
    return result[0];
  }
  return result;
}
