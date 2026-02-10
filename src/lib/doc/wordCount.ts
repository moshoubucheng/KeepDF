export interface WordCountStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  readingTimeSeconds: number;
}

export function countWords(text: string): WordCountStats {
  if (!text || text.trim().length === 0) {
    return { characters: 0, charactersNoSpaces: 0, words: 0, sentences: 0, paragraphs: 0, readingTimeSeconds: 0 };
  }

  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;

  // Word count: split on whitespace, filter empty
  // For CJK: count each CJK character as one word
  const cjkPattern = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;
  const cjkChars = text.match(cjkPattern) || [];
  const textWithoutCjk = text.replace(cjkPattern, ' ');
  const latinWords = textWithoutCjk.split(/\s+/).filter((w) => w.length > 0);
  const words = latinWords.length + cjkChars.length;

  // Sentences: split on sentence-ending punctuation
  const sentences = text.split(/[.!?\u3002\uff01\uff1f]+/).filter((s) => s.trim().length > 0).length;

  // Paragraphs: split on double newlines
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length || (text.trim().length > 0 ? 1 : 0);

  // Reading time: ~200 words per minute for English, ~400 chars per minute for CJK
  const readingTimeSeconds = Math.ceil(((latinWords.length / 200) + (cjkChars.length / 400)) * 60);

  return { characters, charactersNoSpaces, words, sentences, paragraphs, readingTimeSeconds };
}
