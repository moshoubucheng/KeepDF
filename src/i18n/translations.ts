import type { Locale } from './locales';
import { en, type Translations } from './en';
import { ja } from './ja';
import { zh } from './zh';

const translations: Record<Locale, Translations> = { en, ja, zh };

export type { Translations };
export default translations;
