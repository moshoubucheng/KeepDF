/**
 * OG Image Generator
 * Generates 1200×630 static PNG images for all pages at build time.
 * Uses satori (HTML/CSS → SVG) + sharp (SVG → PNG).
 *
 * Output: public/og/{locale}/{slug}.png
 *   - Homepage: public/og/en/home.png
 *   - Category: public/og/en/pdf.png
 *   - Tool:     public/og/en/pdf-merge.png
 */

import satori from 'satori';
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'og');

const WIDTH = 1200;
const HEIGHT = 630;

// ── Translations (inlined minimal subset) ───────────────────────────
const translations = {
  en: {
    site: { name: 'KeepDF', tagline: 'Privacy-First File Tools', description: 'Free online file tools that work entirely in your browser. Merge, split, compress PDFs, process images, and edit Markdown — no uploads, no servers.' },
    categories: {
      pdf: { name: 'PDF Tools', description: 'Merge, split, compress, watermark, convert to image or Word from PDF files locally in your browser.' },
      image: { name: 'Image Tools', description: 'Compress, convert, resize, crop, stitch, convert HEIC, and create PDF from images without uploading.' },
      doc: { name: 'Document Tools', description: 'Edit Markdown, export to PDF, and count words in your browser.' },
    },
    tools: {
      pdfMerge: { name: 'Merge PDF', description: 'Combine multiple PDF files into one document.' },
      pdfSplit: { name: 'Split PDF', description: 'Split a PDF into individual pages or custom ranges.' },
      pdfCompress: { name: 'Compress PDF', description: 'Reduce PDF file size by optimizing structure.' },
      pdfToImage: { name: 'PDF to Image', description: 'Convert PDF pages to PNG or JPG images.' },
      pdfWatermark: { name: 'PDF Watermark', description: 'Add text watermarks to PDF documents.' },
      pdfToWord: { name: 'PDF to Word', description: 'Extract text from PDF and convert to Word document.' },
      imageCompress: { name: 'Compress Image', description: 'Reduce image file size with adjustable quality.' },
      imageConvert: { name: 'Convert Image', description: 'Convert images between PNG, JPG, and WebP formats.' },
      imageResize: { name: 'Resize Image', description: 'Resize images to specific dimensions with aspect ratio control.' },
      imageCrop: { name: 'Crop Image', description: 'Crop images with interactive selection and preset ratios.' },
      imageStitch: { name: 'Stitch Images', description: 'Join multiple images vertically or horizontally into one.' },
      heicConvert: { name: 'HEIC Convert', description: 'Convert HEIC/HEIF photos to JPG or PNG format.' },
      imageToPdf: { name: 'Image to PDF', description: 'Convert multiple images into a single PDF document.' },
      mdEditor: { name: 'Markdown Editor', description: 'Edit and preview Markdown with live rendering.' },
      mdToPdf: { name: 'Markdown to PDF', description: 'Convert Markdown documents to PDF files.' },
      wordCount: { name: 'Word Count', description: 'Count words, characters, sentences, and estimate reading time.' },
    },
  },
  ja: {
    site: { name: 'KeepDF', tagline: 'プライバシー優先のファイルツール', description: 'ブラウザで完結する無料ファイルツール。PDF結合・分割・圧縮、画像処理、Markdown編集など。アップロード不要、サーバー通信なし。' },
    categories: {
      pdf: { name: 'PDFツール', description: 'ブラウザ上でPDFの結合・分割・圧縮・透かし・画像変換・Word変換を行えます。' },
      image: { name: '画像ツール', description: '画像の圧縮・変換・リサイズ・切り抜き・結合・HEIC変換・PDF作成をアップロードなしで。' },
      doc: { name: '文書ツール', description: 'ブラウザ上でMarkdown編集・PDF変換・文字数カウント。' },
    },
    tools: {
      pdfMerge: { name: 'PDF結合', description: '複数のPDFファイルを1つにまとめます。' },
      pdfSplit: { name: 'PDF分割', description: 'PDFをページごとやカスタム範囲で分割します。' },
      pdfCompress: { name: 'PDF圧縮', description: 'PDFの構造を最適化してファイルサイズを縮小します。' },
      pdfToImage: { name: 'PDFを画像に', description: 'PDFのページをPNGまたはJPG画像に変換します。' },
      pdfWatermark: { name: 'PDF透かし', description: 'PDF文書にテキスト透かしを追加します。' },
      pdfToWord: { name: 'PDFをWordに', description: 'PDFからテキストを抽出してWord文書に変換します。' },
      imageCompress: { name: '画像圧縮', description: '品質を調整して画像ファイルサイズを縮小します。' },
      imageConvert: { name: '画像変換', description: 'PNG、JPG、WebP形式の間で画像を変換します。' },
      imageResize: { name: '画像リサイズ', description: 'アスペクト比制御で特定のサイズに変更します。' },
      imageCrop: { name: '画像切り抜き', description: 'インタラクティブな範囲選択とプリセット比率で画像を切り抜きます。' },
      imageStitch: { name: '画像結合', description: '複数の画像を縦または横に1枚にまとめます。' },
      heicConvert: { name: 'HEIC変換', description: 'HEIC/HEIF写真をJPGまたはPNG形式に変換します。' },
      imageToPdf: { name: '画像をPDFに', description: '複数の画像を1つのPDF文書に変換します。' },
      mdEditor: { name: 'Markdownエディタ', description: 'リアルタイムプレビュー付きのMarkdown編集。' },
      mdToPdf: { name: 'MarkdownをPDFに', description: 'Markdown文書をPDFファイルに変換します。' },
      wordCount: { name: '文字数カウント', description: '単語数・文字数・文数をカウントし、読了時間を推定します。' },
    },
  },
  zh: {
    site: { name: 'KeepDF', tagline: '隐私优先的文件工具', description: '完全在浏览器中运行的免费文件工具。合并、拆分、压缩 PDF，处理图像，编辑 Markdown——无需上传，无需服务器。' },
    categories: {
      pdf: { name: 'PDF 工具', description: '在浏览器中本地完成 PDF 的合并、拆分、压缩、水印、图片转换和 Word 转换。' },
      image: { name: '图像工具', description: '无需上传即可压缩、转换、调整大小、裁剪、拼接图像，转换 HEIC，创建 PDF。' },
      doc: { name: '文档工具', description: '在浏览器中编辑 Markdown、导出 PDF、统计字数。' },
    },
    tools: {
      pdfMerge: { name: '合并 PDF', description: '将多个 PDF 文件合并为一个文档。' },
      pdfSplit: { name: '拆分 PDF', description: '按页面或自定义范围拆分 PDF。' },
      pdfCompress: { name: '压缩 PDF', description: '通过优化结构减小 PDF 文件大小。' },
      pdfToImage: { name: 'PDF 转图片', description: '将 PDF 页面转换为 PNG 或 JPG 图片。' },
      pdfWatermark: { name: 'PDF 水印', description: '为 PDF 文档添加文字水印。' },
      pdfToWord: { name: 'PDF 转 Word', description: '从 PDF 提取文本并转换为 Word 文档。' },
      imageCompress: { name: '压缩图片', description: '通过调节质量来缩小图片文件大小。' },
      imageConvert: { name: '转换图片', description: '在 PNG、JPG 和 WebP 格式之间转换图片。' },
      imageResize: { name: '调整图片大小', description: '按指定尺寸调整图片，支持锁定纵横比。' },
      imageCrop: { name: '裁剪图片', description: '通过交互式选区和预设比例裁剪图片。' },
      imageStitch: { name: '拼接图片', description: '将多张图片纵向或横向拼接为一张。' },
      heicConvert: { name: 'HEIC 转换', description: '将 HEIC/HEIF 照片转换为 JPG 或 PNG 格式。' },
      imageToPdf: { name: '图片转 PDF', description: '将多张图片转换为一个 PDF 文档。' },
      mdEditor: { name: 'Markdown 编辑器', description: '实时预览的 Markdown 编辑器。' },
      mdToPdf: { name: 'Markdown 转 PDF', description: '将 Markdown 文档转换为 PDF 文件。' },
      wordCount: { name: '字数统计', description: '统计字数、字符数、句数，估算阅读时间。' },
    },
  },
};

const toolDefs = [
  { id: 'pdf-merge', translationKey: 'pdfMerge', category: 'pdf', slug: 'merge' },
  { id: 'pdf-split', translationKey: 'pdfSplit', category: 'pdf', slug: 'split' },
  { id: 'pdf-compress', translationKey: 'pdfCompress', category: 'pdf', slug: 'compress' },
  { id: 'pdf-to-image', translationKey: 'pdfToImage', category: 'pdf', slug: 'to-image' },
  { id: 'pdf-watermark', translationKey: 'pdfWatermark', category: 'pdf', slug: 'watermark' },
  { id: 'pdf-to-word', translationKey: 'pdfToWord', category: 'pdf', slug: 'to-word' },
  { id: 'image-compress', translationKey: 'imageCompress', category: 'image', slug: 'compress' },
  { id: 'image-convert', translationKey: 'imageConvert', category: 'image', slug: 'convert' },
  { id: 'image-resize', translationKey: 'imageResize', category: 'image', slug: 'resize' },
  { id: 'image-crop', translationKey: 'imageCrop', category: 'image', slug: 'crop' },
  { id: 'image-stitch', translationKey: 'imageStitch', category: 'image', slug: 'stitch' },
  { id: 'heic-convert', translationKey: 'heicConvert', category: 'image', slug: 'heic' },
  { id: 'image-to-pdf', translationKey: 'imageToPdf', category: 'image', slug: 'to-pdf' },
  { id: 'md-editor', translationKey: 'mdEditor', category: 'doc', slug: 'editor' },
  { id: 'md-to-pdf', translationKey: 'mdToPdf', category: 'doc', slug: 'md-to-pdf' },
  { id: 'word-count', translationKey: 'wordCount', category: 'doc', slug: 'word-count' },
];

const categoryDefs = [
  { id: 'pdf', translationKey: 'pdf' },
  { id: 'image', translationKey: 'image' },
  { id: 'doc', translationKey: 'doc' },
];

const locales = ['en', 'ja', 'zh'];

// ── Font loading ────────────────────────────────────────────────────
// We need a font for satori. Use a system font or download one.
// For CJK support, we'll use Noto Sans from Google Fonts (bundled).
async function loadFonts() {
  const fonts = [];

  // Try loading Inter (Latin) from system or a bundled copy
  const interPath = join(__dirname, 'fonts', 'Inter-Bold.ttf');
  const notoSansCJKPath = join(__dirname, 'fonts', 'NotoSansCJK-Bold.ttc');
  const notoSansJPPath = join(__dirname, 'fonts', 'NotoSansJP-Bold.ttf');

  // Download fonts if not present
  const fontsDir = join(__dirname, 'fonts');
  if (!existsSync(fontsDir)) mkdirSync(fontsDir, { recursive: true });

  // Use Inter Bold for Latin text
  if (existsSync(interPath)) {
    fonts.push({
      name: 'Inter',
      data: readFileSync(interPath),
      weight: 700,
      style: 'normal',
    });
  } else {
    // Download Inter Bold
    console.log('Downloading Inter Bold font...');
    const res = await fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf');
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(interPath, buf);
    fonts.push({ name: 'Inter', data: buf, weight: 700, style: 'normal' });
  }

  // Use Noto Sans JP Bold for Japanese text
  if (existsSync(notoSansJPPath)) {
    fonts.push({
      name: 'Noto Sans JP',
      data: readFileSync(notoSansJPPath),
      weight: 700,
      style: 'normal',
    });
  } else {
    console.log('Downloading Noto Sans JP Bold font...');
    const res = await fetch('https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk75s.ttf');
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(notoSansJPPath, buf);
    fonts.push({ name: 'Noto Sans JP', data: buf, weight: 700, style: 'normal' });
  }

  // Use Noto Sans SC Bold for Simplified Chinese text
  const notoSansSCPath = join(__dirname, 'fonts', 'NotoSansSC-Bold.ttf');
  if (existsSync(notoSansSCPath)) {
    fonts.push({
      name: 'Noto Sans SC',
      data: readFileSync(notoSansSCPath),
      weight: 700,
      style: 'normal',
    });
  } else {
    console.log('Downloading Noto Sans SC Bold font...');
    const res = await fetch('https://fonts.gstatic.com/s/notosanssc/v40/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaGzjCnYw.ttf');
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(notoSansSCPath, buf);
    fonts.push({ name: 'Noto Sans SC', data: buf, weight: 700, style: 'normal' });
  }

  return fonts;
}

// ── OG Image template ───────────────────────────────────────────────
function createOGMarkup(title, description, subtitle) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
        padding: '60px 80px',
        fontFamily: 'Inter, Noto Sans SC, Noto Sans JP',
      },
      children: [
        // Logo area
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '40px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: 'white',
                    fontWeight: 700,
                  },
                  children: 'K',
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#93c5fd',
                    letterSpacing: '-0.5px',
                  },
                  children: 'KeepDF',
                },
              },
            ],
          },
        },
        // Title
        {
          type: 'div',
          props: {
            style: {
              fontSize: title.length > 20 ? '52px' : '64px',
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.2,
              maxWidth: '900px',
              letterSpacing: '-1px',
            },
            children: title,
          },
        },
        // Description
        {
          type: 'div',
          props: {
            style: {
              fontSize: '24px',
              color: '#94a3b8',
              textAlign: 'center',
              marginTop: '20px',
              maxWidth: '800px',
              lineHeight: 1.5,
            },
            children: description,
          },
        },
        // Subtitle / badge
        ...(subtitle
          ? [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '32px',
                    padding: '8px 20px',
                    borderRadius: '999px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: {
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#22c55e',
                        },
                        children: '',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: { fontSize: '16px', color: '#93c5fd' },
                        children: subtitle,
                      },
                    },
                  ],
                },
              },
            ]
          : []),
      ],
    },
  };
}

// ── Generate single OG image ────────────────────────────────────────
async function generateImage(markup, outPath, fonts) {
  const dir = dirname(outPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const svg = await satori(markup, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });

  await sharp(Buffer.from(svg)).png({ quality: 85 }).toFile(outPath);
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('Generating OG images...');
  const fonts = await loadFonts();
  let count = 0;

  const privacyBadge = {
    en: '100% Local Processing — No Uploads',
    ja: '100% ローカル処理 — アップロード不要',
    zh: '100% 本地处理 — 无需上传',
  };

  const freeBadge = {
    en: 'Free — No Sign-up Required',
    ja: '無料 — 登録不要',
    zh: '免费 — 无需注册',
  };

  for (const locale of locales) {
    const tr = translations[locale];

    // 1. Homepage
    const homeMarkup = createOGMarkup(
      tr.site.tagline,
      tr.site.description.length > 100 ? tr.site.description.slice(0, 97) + '...' : tr.site.description,
      privacyBadge[locale],
    );
    const homePath = join(OUT_DIR, locale, 'home.png');
    await generateImage(homeMarkup, homePath, fonts);
    count++;

    // 2. Category pages
    for (const cat of categoryDefs) {
      const catTr = tr.categories[cat.translationKey];
      const markup = createOGMarkup(
        catTr.name,
        catTr.description,
        privacyBadge[locale],
      );
      const outPath = join(OUT_DIR, locale, `${cat.id}.png`);
      await generateImage(markup, outPath, fonts);
      count++;
    }

    // 3. Tool pages
    for (const tool of toolDefs) {
      const toolTr = tr.tools[tool.translationKey];
      const markup = createOGMarkup(
        toolTr.name,
        toolTr.description,
        freeBadge[locale],
      );
      const outPath = join(OUT_DIR, locale, `${tool.category}-${tool.slug}.png`);
      await generateImage(markup, outPath, fonts);
      count++;
    }
  }

  console.log(`Generated ${count} OG images.`);
}

main().catch((err) => {
  console.error('OG image generation failed:', err);
  process.exit(1);
});
