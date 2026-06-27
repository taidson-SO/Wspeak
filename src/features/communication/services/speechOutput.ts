import * as Speech from 'expo-speech';

export function stopSpeechAsync() {
  Speech.stop();
}

export async function speakWordAsync(word: string) {
  await new Promise<void>((resolve, reject) => {
    Speech.stop();
    Speech.speak(word, {
      language: 'pt-BR',
      rate: 0.95,
      pitch: 1,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: (error) => reject(error),
    });
  });
}
