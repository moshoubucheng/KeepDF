import { describe, it, expect } from 'vitest';
import { countWords } from './wordCount';

describe('countWords', () => {
    it('returns zeros for empty string', () => {
        const result = countWords('');
        expect(result.characters).toBe(0);
        expect(result.words).toBe(0);
        expect(result.sentences).toBe(0);
        expect(result.paragraphs).toBe(0);
        expect(result.readingTimeSeconds).toBe(0);
    });

    it('counts English words correctly', () => {
        const result = countWords('Hello world, this is a test.');
        expect(result.words).toBe(6);
        expect(result.sentences).toBe(1);
        expect(result.paragraphs).toBe(1);
    });

    it('counts characters including spaces', () => {
        const result = countWords('ab cd');
        expect(result.characters).toBe(5);
        expect(result.charactersNoSpaces).toBe(4);
    });

    it('counts CJK characters as individual words', () => {
        const result = countWords('こんにちは世界');
        expect(result.words).toBe(7); // each CJK char is a word
        expect(result.characters).toBe(7);
    });

    it('counts multiple paragraphs', () => {
        const result = countWords('First paragraph.\n\nSecond paragraph.');
        expect(result.paragraphs).toBe(2);
    });

    it('counts multiple sentences', () => {
        const result = countWords('Hello. How are you? Fine!');
        expect(result.sentences).toBe(3);
    });

    it('estimates reading time in seconds', () => {
        // ~200 words per minute = 60s for 200 words
        const words = Array(200).fill('word').join(' ');
        const result = countWords(words);
        expect(result.readingTimeSeconds).toBe(60);
    });
});
