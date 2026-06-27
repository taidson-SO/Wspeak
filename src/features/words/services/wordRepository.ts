import { getJsonValue, removeValue, setJsonValue } from '../../../shared/services/localStorage';
import { words as suggestedWords } from '../data/words';
import type { Word } from '../types/word.types';

const STORAGE_KEY = 'wspeak.customWords.v1';
export const MAX_WORD_TEXT_LENGTH = 32;

function createId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeWordText(text: string) {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function normalizeForComparison(text: string) {
  return normalizeWordText(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeCustomWord(word: Word): Word {
  return {
    ...word,
    text: normalizeWordText(word.text),
    isCustom: true,
    createdAt: word.createdAt ?? new Date().toISOString(),
  };
}

function validateWordText(text: string, existingWords: Word[], editingWordId?: string): string | null {
  const normalizedText = normalizeWordText(text);

  if (!normalizedText) {
    return 'Digite uma palavra para adicionar.';
  }

  if (normalizedText.length > MAX_WORD_TEXT_LENGTH) {
    return `Use no máximo ${MAX_WORD_TEXT_LENGTH} caracteres.`;
  }

  const comparisonText = normalizeForComparison(normalizedText);
  const alreadyExists = existingWords.some((word) => word.id !== editingWordId && normalizeForComparison(word.text) === comparisonText);

  if (alreadyExists) {
    return 'Essa palavra já está na lista.';
  }

  return null;
}

export const wordRepository = {
  async loadCustomWords(): Promise<Word[]> {
    const customWords = await getJsonValue<Word[]>(STORAGE_KEY, []);

    return customWords.map(normalizeCustomWord);
  },

  async loadWords(): Promise<Word[]> {
    const customWords = await this.loadCustomWords();
    return [...suggestedWords, ...customWords];
  },

  async addCustomWord(text: string): Promise<Word[]> {
    const customWords = await this.loadCustomWords();
    const allWords = [...suggestedWords, ...customWords];
    const validationError = validateWordText(text, allWords);

    if (validationError) {
      throw new Error(validationError);
    }

    const nextWords = [
      ...customWords,
      {
        id: createId(),
        text: normalizeWordText(text),
        isCustom: true,
        createdAt: new Date().toISOString(),
      },
    ];

    await setJsonValue(STORAGE_KEY, nextWords);
    return [...suggestedWords, ...nextWords];
  },

  async updateCustomWord(wordId: string, text: string): Promise<Word[]> {
    const customWords = await this.loadCustomWords();
    const currentWord = customWords.find((word) => word.id === wordId);

    if (!currentWord) {
      throw new Error('Só é possível editar palavras criadas pelo usuário.');
    }

    const allWords = [...suggestedWords, ...customWords];
    const validationError = validateWordText(text, allWords, wordId);

    if (validationError) {
      throw new Error(validationError);
    }

    const nextWords = customWords.map((word) => (word.id === wordId ? { ...word, text: normalizeWordText(text) } : word));

    await setJsonValue(STORAGE_KEY, nextWords);
    return [...suggestedWords, ...nextWords];
  },

  async removeCustomWord(wordId: string): Promise<Word[]> {
    const customWords = await this.loadCustomWords();
    const nextWords = customWords.filter((word) => word.id !== wordId);

    await setJsonValue(STORAGE_KEY, nextWords);
    return [...suggestedWords, ...nextWords];
  },

  async clearCustomWords(): Promise<Word[]> {
    await removeValue(STORAGE_KEY);
    return suggestedWords;
  },
};
