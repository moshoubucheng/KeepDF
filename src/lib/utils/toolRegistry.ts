import type { ToolCategory } from '@types/tool';
import type { Locale } from '../../i18n/locales';
import { localePath } from '../../i18n/locales';
import { t } from '../../i18n/utils';

export interface ToolDef {
  id: string;
  translationKey: string;
  category: ToolCategory;
  path: string;
  icon: string;
  acceptedTypes: string[];
}

export interface CategoryDef {
  id: ToolCategory;
  translationKey: string;
  path: string;
  icon: string;
  color: string;
}

export const categoryDefs: CategoryDef[] = [
  { id: 'pdf', translationKey: 'pdf', path: '/pdf', icon: '📄', color: 'brand' },
  { id: 'image', translationKey: 'image', path: '/image', icon: '🖼️', color: 'accent' },
  { id: 'doc', translationKey: 'doc', path: '/doc', icon: '📝', color: 'success' },
];

export const toolDefs: ToolDef[] = [
  { id: 'pdf-merge', translationKey: 'pdfMerge', category: 'pdf', path: '/pdf/merge', icon: '📎', acceptedTypes: ['.pdf', 'application/pdf'] },
  { id: 'pdf-split', translationKey: 'pdfSplit', category: 'pdf', path: '/pdf/split', icon: '✂️', acceptedTypes: ['.pdf', 'application/pdf'] },
  { id: 'pdf-compress', translationKey: 'pdfCompress', category: 'pdf', path: '/pdf/compress', icon: '🗜️', acceptedTypes: ['.pdf', 'application/pdf'] },
  { id: 'pdf-to-image', translationKey: 'pdfToImage', category: 'pdf', path: '/pdf/to-image', icon: '🖼️', acceptedTypes: ['.pdf', 'application/pdf'] },
  { id: 'pdf-watermark', translationKey: 'pdfWatermark', category: 'pdf', path: '/pdf/watermark', icon: '💧', acceptedTypes: ['.pdf', 'application/pdf'] },
  { id: 'pdf-to-word', translationKey: 'pdfToWord', category: 'pdf', path: '/pdf/to-word', icon: '📝', acceptedTypes: ['.pdf', 'application/pdf'] },
  { id: 'image-compress', translationKey: 'imageCompress', category: 'image', path: '/image/compress', icon: '🗜️', acceptedTypes: ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'] },
  { id: 'image-convert', translationKey: 'imageConvert', category: 'image', path: '/image/convert', icon: '🔄', acceptedTypes: ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'] },
  { id: 'image-resize', translationKey: 'imageResize', category: 'image', path: '/image/resize', icon: '📐', acceptedTypes: ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'] },
  { id: 'image-crop', translationKey: 'imageCrop', category: 'image', path: '/image/crop', icon: '✂️', acceptedTypes: ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'] },
  { id: 'image-stitch', translationKey: 'imageStitch', category: 'image', path: '/image/stitch', icon: '🧩', acceptedTypes: ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'] },
  { id: 'heic-convert', translationKey: 'heicConvert', category: 'image', path: '/image/heic', icon: '📱', acceptedTypes: ['.heic', '.heif', 'image/heic', 'image/heif'] },
  { id: 'image-to-pdf', translationKey: 'imageToPdf', category: 'image', path: '/image/to-pdf', icon: '📄', acceptedTypes: ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'] },
  { id: 'md-editor', translationKey: 'mdEditor', category: 'doc', path: '/doc/editor', icon: '✏️', acceptedTypes: ['.md', '.markdown', 'text/markdown'] },
  { id: 'md-to-pdf', translationKey: 'mdToPdf', category: 'doc', path: '/doc/md-to-pdf', icon: '📄', acceptedTypes: ['.md', '.markdown', 'text/markdown'] },
  { id: 'word-count', translationKey: 'wordCount', category: 'doc', path: '/doc/word-count', icon: '🔢', acceptedTypes: ['.txt', '.md', '.markdown', 'text/plain', 'text/markdown'] },
];

export function getLocalizedCategories(locale: Locale) {
  const tr = t(locale);
  return categoryDefs.map((c) => {
    const catTr = tr.categories[c.translationKey as keyof typeof tr.categories];
    return {
      ...c,
      name: catTr.name,
      description: catTr.description,
      path: localePath(c.path, locale),
    };
  });
}

export function getLocalizedTools(locale: Locale) {
  const tr = t(locale);
  return toolDefs.map((tool) => {
    const toolTr = tr.tools[tool.translationKey as keyof typeof tr.tools];
    return {
      ...tool,
      name: toolTr.name,
      description: toolTr.description,
      path: localePath(tool.path, locale),
    };
  });
}

export function getToolsByCategory(locale: Locale, category: ToolCategory) {
  return getLocalizedTools(locale).filter((t) => t.category === category);
}

export function getCategoryMeta(locale: Locale, category: ToolCategory) {
  return getLocalizedCategories(locale).find((c) => c.id === category);
}
