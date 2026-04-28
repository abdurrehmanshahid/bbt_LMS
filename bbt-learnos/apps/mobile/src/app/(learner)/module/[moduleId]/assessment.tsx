import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

interface Question {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

const QUESTION_BANK: Record<string, Question[]> = {
  'module-js-foundations': [
    {
      id: 'js-1',
      prompt: 'Which choice best explains a closure?',
      options: [
        'A function that remembers variables from its outer scope',
        'A function that only returns promises',
        'A variable declared with const',
        'A module imported from another file',
      ],
      correctIndex: 0,
    },
    {
      id: 'js-2',
      prompt: 'What is the safest default for async UI state when data comes from the server?',
      options: [
        'Keep it in local component state only',
        'Use server-state tooling and model loading/error states explicitly',
        'Mutate props directly',
        'Wait until production to handle errors',
      ],
      correctIndex: 1,
    },
    {
      id: 'js-3',
      prompt: 'Why are pure array methods useful in product code?',
      options: [
        'They make mutations invisible',
        'They reduce the need for tests',
        'They help keep transforms predictable and easier to reason about',
        'They only matter in backend code',
      ],
      correctIndex: 2,
    },
  ],
  'module-react-state': [
    {
      id: 'react-1',
      prompt: 'Which data belongs in React Query rather than Zustand?',
      options: [
        'Modal open state',
        'Sidebar collapsed state',
        'Learner feed fetched from the API',
        'Active tab selection',
      ],
      correctIndex: 2,
    },
    {
      id: 'react-2',
      prompt: 'What is the main risk of fetching server data manually in useEffect across screens?',
      options: [
        'You cannot use TypeScript',
        'You lose caching, retry, and invalidation consistency',
        'The bundle becomes native-only',
        'It disables navigation',
      ],
      correctIndex: 1,
    },
    {
      id: 'react-3',
      prompt: 'A mutation succeeds. What should happen next in a well-structured flow?',
      options: [
        'Invalidate or update the relevant query cache',
        'Reload the whole app',
        'Clear every store',
        'Disable the affected screen',
      ],
      correctIndex: 0,
    },
  ],
};

function getQuestions(moduleId: string): Question[] {
  return QUESTION_BANK[moduleId] ?? QUESTION_BANK['module-react-state'] ?? [];
}

export default function AssessmentScreen(): React.JSX.Element {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const router = useRouter();
  const questions = useMemo(() => getQuestions(moduleId), [moduleId]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = questions.reduce((total, question) => {
    return total + (answers[question.id] === question.correctIndex ? 1 : 0);
  }, 0);
  const answeredAll = questions.every((question) => answers[question.id] !== undefined);
  const passRate = questions.length === 0 ? 0 : Math.round((score / questions.length) * 100);
  const passed = submitted && passRate >= 60;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()} activeOpacity={0.8}>
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backText}>Back to module</Text>
      </TouchableOpacity>

      <Text style={styles.eyebrow}>Assessment</Text>
      <Text style={styles.title}>Progression check</Text>
      <Text style={styles.sub}>
        Pass threshold is 60%. This mock assessment is here so you can walk the full learner loop.
      </Text>

      {questions.map((question, index) => (
        <View key={question.id} style={styles.questionCard}>
          <Text style={styles.questionNumber}>Question {index + 1}</Text>
          <Text style={styles.prompt}>{question.prompt}</Text>

          {question.options.map((option, optionIndex) => {
            const selected = answers[question.id] === optionIndex;
            const showCorrect = submitted && optionIndex === question.correctIndex;
            const showWrong = submitted && selected && optionIndex !== question.correctIndex;

            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.option,
                  selected && styles.optionSelected,
                  showCorrect && styles.optionCorrect,
                  showWrong && styles.optionWrong,
                ]}
                onPress={() => {
                  if (!submitted) {
                    setAnswers((current) => ({ ...current, [question.id]: optionIndex }));
                  }
                }}
                activeOpacity={0.85}
                disabled={submitted}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {!submitted ? (
        <TouchableOpacity
          style={[styles.submitBtn, !answeredAll && styles.submitBtnDisabled]}
          onPress={() => setSubmitted(true)}
          disabled={!answeredAll}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>Submit assessment</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.resultCard, passed ? styles.resultPass : styles.resultFail]}>
          <Text style={styles.resultTitle}>{passed ? 'Assessment passed' : 'Assessment not passed yet'}</Text>
          <Text style={styles.resultScore}>
            Score: {score}/{questions.length} ({passRate}%)
          </Text>
          <Text style={styles.resultBody}>
            {passed
              ? 'You cleared the threshold. In the full product this would unlock the next module and mint a badge.'
              : 'Review the highlighted answers and try again after another pass through the module.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setAnswers({});
              setSubmitted(false);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2e' },
  content: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 40 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  backArrow: { fontSize: 18, color: '#F7941D' },
  backText: { fontSize: 13, fontWeight: '600', color: '#F7941D' },
  eyebrow: { fontSize: 11, fontWeight: '700', color: '#F7941D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 22, color: '#8888bb', marginBottom: 24 },
  questionCard: { backgroundColor: '#1a1a3e', borderRadius: 16, padding: 16, marginBottom: 14 },
  questionNumber: { fontSize: 11, fontWeight: '700', color: '#8888bb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  prompt: { fontSize: 15, fontWeight: '600', color: '#fff', lineHeight: 22, marginBottom: 14 },
  option: { borderWidth: 1, borderColor: '#2a2a5e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  optionSelected: { borderColor: '#F7941D', backgroundColor: '#F7941D12' },
  optionCorrect: { borderColor: '#22c55e', backgroundColor: '#14532d33' },
  optionWrong: { borderColor: '#ef4444', backgroundColor: '#7f1d1d33' },
  optionText: { fontSize: 13, lineHeight: 20, color: '#ddddee' },
  submitBtn: { backgroundColor: '#F7941D', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  resultCard: { borderRadius: 16, padding: 18, marginTop: 10 },
  resultPass: { backgroundColor: '#14532d33', borderWidth: 1, borderColor: '#22c55e66' },
  resultFail: { backgroundColor: '#7f1d1d33', borderWidth: 1, borderColor: '#ef444466' },
  resultTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6 },
  resultScore: { fontSize: 14, fontWeight: '600', color: '#FDE68A', marginBottom: 10 },
  resultBody: { fontSize: 13, lineHeight: 20, color: '#ddddee', marginBottom: 14 },
  retryBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0d0d2e' },
  retryText: { fontSize: 13, fontWeight: '700', color: '#F7941D' },
});
