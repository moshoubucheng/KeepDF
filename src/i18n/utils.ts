import type { Locale } from './locales';
import type { Translations } from './translations';
import translations from './translations';

export function t(locale: Locale): Translations {
  return translations[locale];
}

export function getHtmlLang(locale: Locale): string {
  const map: Record<Locale, string> = { en: 'en', ja: 'ja', zh: 'zh-CN' };
  return map[locale];
}
