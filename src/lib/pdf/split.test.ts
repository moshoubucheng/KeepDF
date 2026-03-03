import { describe, it, expect } from 'vitest';
import { parseRanges } from './split';

describe('parseRanges', () => {
    it('parses a single page (returns 0-based index)', () => {
        expect(parseRanges('3', 10)).toEqual([[2]]);
    });

    it('parses a simple range', () => {
        expect(parseRanges('1-3', 10)).toEqual([[0, 1, 2]]);
    });

    it('parses multiple ranges separated by commas', () => {
        expect(parseRanges('1-3, 5, 7-9', 10)).toEqual([
            [0, 1, 2],
            [4],
            [6, 7, 8],
        ]);
    });

    it('trims whitespace around ranges', () => {
        expect(parseRanges('  2 - 4 , 6 ', 10)).toEqual([
            [1, 2, 3],
            [5],
        ]);
    });

    it('throws on out-of-bounds range', () => {
        expect(() => parseRanges('8-15', 10)).toThrow('out of bounds');
    });

    it('throws on page number below 1', () => {
        expect(() => parseRanges('0', 10)).toThrow('out of bounds');
    });

    it('throws on empty string', () => {
        expect(() => parseRanges('', 10)).toThrow('No ranges specified');
    });

    it('throws on invalid (non-numeric) entries', () => {
        expect(() => parseRanges('abc', 10)).toThrow('Invalid range format');
    });

    it('throws when start exceeds end in range', () => {
        expect(() => parseRanges('5-3', 10)).toThrow('start exceeds end');
    });

    it('handles a single page equal to totalPages', () => {
        expect(parseRanges('10', 10)).toEqual([[9]]);
    });
});
