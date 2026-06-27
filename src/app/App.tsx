import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AssessmentScreen } from '../features/assessment/screens/AssessmentScreen';
import { assessmentRepository } from '../features/assessment/services/assessmentRepository';
import { CommunicationScreen } from '../features/communication/screens/CommunicationScreen';
import { ExerciseScreen } from '../features/exercise/screens/ExerciseScreen';
import { exerciseAttemptRepository } from '../features/exercise/services/exerciseAttemptRepository';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { PrivacyScreen } from '../features/privacy/screens/PrivacyScreen';
import { TrainingScreen } from '../features/training/screens/TrainingScreen';
import { speechTrainer } from '../features/training/services/speechTrainer';
import type { TrainedWord } from '../features/training/types/training.types';
import { words as suggestedWords } from '../features/words/data/words';
import { wordRepository } from '../features/words/services/wordRepository';
import type { Word } from '../features/words/types/word.types';
import { colors } from '../shared/theme/colors';

type Screen = 'home' | 'training' | 'assessment' | 'exercise' | 'communication' | 'privacy';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [trainedWords, setTrainedWords] = useState<TrainedWord[]>([]);
  const [words, setWords] = useState<Word[]>(suggestedWords);

  useEffect(() => {
    speechTrainer.loadTrainedWords().then(setTrainedWords).catch((error) => {
      console.error('Falha ao carregar palavras treinadas', error);
    });
    wordRepository.loadWords().then(setWords).catch((error) => {
      console.error('Falha ao carregar palavras personalizadas', error);
    });
  }, []);

  const trainedWordCount = useMemo(() => trainedWords.filter((word) => word.samples.length > 0).length, [trainedWords]);
  const readyWordCount = useMemo(
    () => trainedWords.filter((word) => word.samples.filter((sample) => sample.analysisStatus === 'ready' && sample.features).length >= 3).length,
    [trainedWords],
  );
  const customWordCount = useMemo(() => words.filter((word) => word.isCustom).length, [words]);

  async function handleClearLocalData() {
    await speechTrainer.clearAll();
    await assessmentRepository.clearAll();
    await exerciseAttemptRepository.clearAll();
    const nextWords = await wordRepository.clearCustomWords();

    setTrainedWords([]);
    setWords(nextWords);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        {screen === 'home' ? (
          <HomeScreen
            trainedWordCount={trainedWordCount}
            readyWordCount={readyWordCount}
            onOpenTraining={() => setScreen('training')}
            onOpenAssessment={() => setScreen('assessment')}
            onOpenExercise={() => setScreen('exercise')}
            onOpenCommunication={() => setScreen('communication')}
            onOpenPrivacy={() => setScreen('privacy')}
          />
        ) : null}

        {screen === 'training' ? (
          <TrainingScreen
            words={words}
            trainedWords={trainedWords}
            onWordsChange={setWords}
            onTrainedWordsChange={setTrainedWords}
            onBack={() => setScreen('home')}
            onOpenCommunication={() => setScreen('communication')}
          />
        ) : null}

        {screen === 'assessment' ? <AssessmentScreen words={words} onBack={() => setScreen('home')} /> : null}

        {screen === 'exercise' ? (
          <ExerciseScreen trainedWords={trainedWords} onBack={() => setScreen('home')} onOpenTraining={() => setScreen('training')} />
        ) : null}

        {screen === 'communication' ? (
          <CommunicationScreen trainedWords={trainedWords} onBack={() => setScreen('home')} onOpenTraining={() => setScreen('training')} />
        ) : null}

        {screen === 'privacy' ? (
          <PrivacyScreen
            trainedWordCount={trainedWordCount}
            customWordCount={customWordCount}
            onBack={() => setScreen('home')}
            onClearData={handleClearLocalData}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
