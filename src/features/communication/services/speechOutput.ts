import * as Speech from 'expo-speech';

export function stopSpeechAsync() {
  try {
    Speech.stop();
  } catch (error) {
    console.warn('Falha ao parar a fala sintetizada.', error);
  }
}

export async function speakWordAsync(word: string) {
  const text = word.trim();

  if (!text) {
    return;
  }

  await new Promise<void>((resolve) => {
    try {
      Speech.stop();
      Speech.speak(text, {
        language: 'pt-BR',
        rate: 0.95,
        pitch: 1,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: (error) => {
          console.warn('Falha ao falar palavra reconhecida.', error);
          resolve();
        },
      });
    } catch (error) {
      console.warn('Falha ao iniciar fala sintetizada.', error);
      resolve();
    }
  });
}
