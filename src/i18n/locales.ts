export const defaultLocale = 'en' as const;
export const locales = ['en', 'ja', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  zh: '中文',
};

export const ogLocales: Record<Locale, string> = {
  en: 'en_US',
  ja: 'ja_JP',
  zh: 'zh_CN',
};

export const hreflangCodes: Record<Locale, string> = {
  en: 'en',
  ja: 'ja',
  zh: 'zh-Hans',
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getLocaleFromPath(path: string): Locale {
  const seg = path.split('/').filter(Boolean)[0];
  if (seg && isLocale(seg)) return seg;
  return defaultLocale;
}

export function localePath(path: string, locale: Locale): string {
  if (locale === defaultLocale) return path;
  return `/${locale}${path}`;
}
