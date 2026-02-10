export interface MdToPdfOptions {
  pageSize: 'a4' | 'letter';
  margins: 'normal' | 'narrow' | 'wide';
}

const BASE_STYLES = `
  *, *::before, *::after {
    color: inherit;
    background-color: transparent;
    border-color: #dddddd;
    outline-color: currentColor;
    text-decoration-color: currentColor;
    column-rule-color: currentColor;
    -webkit-text-fill-color: inherit;
  }
  body {
    margin: 0; padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", "Noto Sans JP", sans-serif;
    line-height: 1.7; color: #333333; font-size: 14px; background: #ffffff;
  }
  h1 { font-size: 24px; font-weight: bold; margin: 20px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  h2 { font-size: 20px; font-weight: bold; margin: 18px 0 8px; }
  h3 { font-size: 16px; font-weight: bold; margin: 14px 0 6px; }
  p { margin: 6px 0; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 13px; overflow-x: auto; margin: 8px 0; }
  code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-size: 13px; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #ddd; padding-left: 12px; color: #666; margin: 8px 0; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-weight: bold; background: #f9f9f9; }
  td { border: 1px solid #ddd; padding: 8px 12px; }
  ul { padding-left: 24px; list-style-type: disc; margin: 4px 0; }
  ol { padding-left: 24px; list-style-type: decimal; margin: 4px 0; }
  li { margin-bottom: 2px; }
  a { color: #2563eb; text-decoration: underline; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
  img { max-width: 100%; }
`;

export async function mdToPdf(
  htmlContent: string,
  options: MdToPdfOptions,
): Promise<Blob> {
  const [{ default: html2canvas }, jspdfMod] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const jsPDF = jspdfMod.default ?? jspdfMod.jsPDF;

  const marginMap = { normal: 10, narrow: 5, wide: 20 };
  const margin = marginMap[options.margins];

  const pageW = options.pageSize === 'a4' ? 210 : 215.9;
  const pageH = options.pageSize === 'a4' ? 297 : 279.4;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;

  // Use an iframe to isolate from Tailwind CSS 4 oklch() colors
  // (html2canvas v1.x cannot parse oklch)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = `${contentW}mm`;
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument!;
    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head><body>${htmlContent}</body></html>`);
    iframeDoc.close();

    // Let the iframe render before capturing
    await new Promise((r) => setTimeout(r, 100));

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: iframeDoc.body.scrollWidth,
      height: iframeDoc.body.scrollHeight,
      windowWidth: iframeDoc.body.scrollWidth,
      windowHeight: iframeDoc.body.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgW = contentW;
    const imgH = (canvas.height * contentW) / canvas.width;

    const pdf = new jsPDF({
      unit: 'mm',
      format: options.pageSize,
      orientation: 'portrait',
    });

    let yOffset = 0;
    let page = 0;
    while (yOffset < imgH) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, margin - yOffset, imgW, imgH);
      yOffset += contentH;
      page++;
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(iframe);
  }
}
