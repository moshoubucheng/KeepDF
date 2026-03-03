import { describe, it, expect } from 'vitest';
import {
    isLocale,
    getLocaleFromPath,
    localePath,
    defaultLocale,
    locales,
} from './locales';

describe('isLocale', () => {
    it('returns true for valid locales', () => {
        expect(isLocale('en')).toBe(true);
        expect(isLocale('ja')).toBe(true);
        expect(isLocale('zh')).toBe(true);
    });

    it('returns false for invalid strings', () => {
        expect(isLocale('fr')).toBe(false);
        expect(isLocale('')).toBe(false);
        expect(isLocale('EN')).toBe(false);
    });
});

describe('getLocaleFromPath', () => {
    it('returns ja for /ja/pdf/merge', () => {
        expect(getLocaleFromPath('/ja/pdf/merge')).toBe('ja');
    });

    it('returns zh for /zh/image/compress', () => {
        expect(getLocaleFromPath('/zh/image/compress')).toBe('zh');
    });

    it('returns default locale for /pdf/merge', () => {
        expect(getLocaleFromPath('/pdf/merge')).toBe(defaultLocale);
    });

    it('returns default locale for /', () => {
        expect(getLocaleFromPath('/')).toBe(defaultLocale);
    });

    it('returns default for unknown prefix', () => {
        expect(getLocaleFromPath('/fr/pdf/merge')).toBe(defaultLocale);
    });
});

describe('localePath', () => {
    it('returns path as-is for default locale', () => {
        expect(localePath('/pdf/merge', 'en')).toBe('/pdf/merge');
    });

    it('prepends /ja for Japanese locale', () => {
        expect(localePath('/pdf/merge', 'ja')).toBe('/ja/pdf/merge');
    });

    it('prepends /zh for Chinese locale', () => {
        expect(localePath('/', 'zh')).toBe('/zh/');
    });
});

describe('locales constant', () => {
    it('contains exactly 3 locales', () => {
        expect(locales).toHaveLength(3);
        expect([...locales]).toEqual(['en', 'ja', 'zh']);
    });
});
