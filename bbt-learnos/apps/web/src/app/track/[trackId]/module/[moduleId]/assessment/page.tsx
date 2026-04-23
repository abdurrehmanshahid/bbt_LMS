'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { assessmentApi } from '@/lib/assessment';
import type { AssessmentSession, AssessmentResult, Question } from '@/lib/assessment';

interface Props {
  params: { trackId: string; moduleId: string };
}

type Phase = 'start' | 'question' | 'submitting' | 'result';

function CircularScore({ score, passed }: { score: number; passed: boolean }): React.JSX.Element {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = passed ? '#22c55e' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={130} height={130} viewBox="0 0 130 130" aria-hidden="true">
        <circle cx={65} cy={65} r={r} stroke="#1e2042" strokeWidth={12} fill="none" />
        <circle
          cx={65}
          cy={65}
          r={r}
          stroke={color}
          strokeWidth={12}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl" style={{ color }}>{Math.round(score)}%</span>
        <span className="text-xs font-mono text-navy-400">{passed ? 'Passed' : 'Failed'}</span>
      </div>
    </div>
  );
}

function BadgeCard({ badge }: { badge: NonNullable<AssessmentResult['badge']> }): React.JSX.Element {
  return (
    <div className="relative rounded-2xl border-2 border-orange-500 bg-gradient-to-br from-navy-800 to-navy-900 p-6 text-center animate-[slideUp_0.6s_ease-out_forwards]">
      <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-indigo-600 flex items-center justify-center">
        <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.491 4.491 0 01-3.497-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.491 4.491 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-xs font-mono text-orange-400 uppercase tracking-wider mb-1">Badge Earned!</p>
      <h3 className="font-display text-xl text-white">{badge.conceptTitle}</h3>
      <p className="text-xs text-navy-400 mt-1">{badge.trackTitle}</p>
      <p className="text-xs font-mono text-navy-500 mt-2">
        Score: <span className="text-green-400">{Math.round(badge.score)}%</span> · {new Date(badge.issuedAt).toLocaleDateString()}
      </p>
      <Link
        href="/learner/portfolio"
        className="mt-4 inline-flex items-center gap-1 text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        View in Portfolio →
      </Link>
    </div>
  );
}

// Keyboard shortcut labels 1-4
const KEY_LABELS = ['1', '2', '3', '4'] as const;

export default function AssessmentPage({ params }: Props): React.JSX.Element {
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [phase, setPhase] = useState<Phase>('start');
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!accessToken) router.push(`/auth/login?returnUrl=/track/${params.trackId}/module/${params.moduleId}/assessment`);
  }, [accessToken, router, params.trackId, params.moduleId]);

  useEffect(() => {
    if (phase === 'question') {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Keyboard shortcuts 1–4 for MCQ answer selection
  const currentQuestion: Question | undefined = session?.questions[questionIdx];

  const handleKeyDown = useCallback((e: KeyboardEvent): void => {
    if (phase !== 'question' || !currentQuestion) return;
    const idx = parseInt(e.key) - 1;
    if (idx >= 0 && idx < currentQuestion.options.length) {
      const opt = currentQuestion.options[idx];
      if (opt) setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt.id }));
    }
  }, [phase, currentQuestion]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  async function startAssessment(): Promise<void> {
    if (!accessToken) return;
    setStarting(true);
    setStartError(null);
    try {
      const s = await assessmentApi.startSession(accessToken, params.moduleId);
      setSession(s);
      setPhase('question');
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'ASSESSMENT_LOCKED') {
        setStartError('Assessment is locked. Please wait 24 hours before retrying.');
      } else {
        setStartError('Could not start assessment. Please try again.');
      }
    } finally {
      setStarting(false);
    }
  }

  async function submitAssessment(): Promise<void> {
    if (!accessToken || !session) return;
    clearInterval(timerRef.current);
    setPhase('submitting');
    try {
      const res = await assessmentApi.submitAnswers(accessToken, params.moduleId, answers, session.sessionId);
      setResult(res);
      setPhase('result');
    } catch {
      setPhase('question');
    }
  }

  function nextQuestion(): void {
    if (!session) return;
    if (questionIdx < session.questions.length - 1) {
      setQuestionIdx((i) => i + 1);
    } else {
      void submitAssessment();
    }
  }

  function formatElapsed(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  if (!accessToken) return <></>;

  // ── Start screen ────────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-navy-700 bg-navy-900 p-10 text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-indigo-900/40 border border-indigo-700 flex items-center justify-center">
              <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>

            <div>
              <p className="text-xs font-mono text-orange-500 uppercase tracking-wider mb-2">Module Assessment</p>
              <h1 className="font-display text-3xl text-white">Ready to be tested?</h1>
            </div>

            {startError && (
              <div role="alert" className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
                {startError}
              </div>
            )}

            <div className="flex justify-center gap-8 text-sm font-mono text-navy-400">
              <div className="text-center">
                <p className="text-white text-xl font-display">—</p>
                <p className="text-xs mt-0.5">questions</p>
              </div>
              <div className="text-center">
                <p className="text-white text-xl font-display">60%</p>
                <p className="text-xs mt-0.5">to pass</p>
              </div>
              <div className="text-center">
                <p className="text-white text-xl font-display">~15</p>
                <p className="text-xs mt-0.5">minutes</p>
              </div>
            </div>

            <div className="rounded-lg bg-navy-800 border border-navy-700 px-4 py-3 text-sm text-navy-400 text-left">
              <p className="font-semibold text-white mb-1">Before you begin:</p>
              <ul className="space-y-1 text-xs list-disc list-inside">
                <li>You cannot go back — answer each question before proceeding</li>
                <li>Use keys 1–4 to quickly select MCQ answers</li>
                <li>Submitting faster than 30% of content length flags for review</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={startAssessment}
              disabled={starting}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {starting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {starting ? 'Starting…' : 'Begin Assessment →'}
            </button>

            <Link
              href={`/track/${params.trackId}/module/${params.moduleId}`}
              className="block text-xs font-mono text-navy-500 hover:text-navy-300 transition-colors"
            >
              ← Back to module
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Question screen ──────────────────────────────────────────────────────────
  if ((phase === 'question' || phase === 'submitting') && session && currentQuestion) {
    const total = session.questions.length;
    const progress = ((questionIdx) / total) * 100;
    const selectedAnswer = answers[currentQuestion.id];
    const isLast = questionIdx === total - 1;

    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-navy-400" aria-live="polite">
              Q {questionIdx + 1} of {total}
            </span>
            <span className="text-xs font-mono text-navy-300 tabular-nums" aria-label="Time elapsed">
              ⏱ {formatElapsed(elapsed)}
            </span>
          </div>

          <div
            className="h-1.5 w-full rounded-full bg-navy-800 overflow-hidden mb-6"
            role="progressbar"
            aria-valuenow={questionIdx + 1}
            aria-valuemin={1}
            aria-valuemax={total}
          >
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${progress + (1 / total) * 100}%` }}
            />
          </div>

          <div className="rounded-2xl border border-navy-700 bg-navy-900 p-8 space-y-6">
            {/* Question text */}
            <h2 className="font-display text-2xl text-white leading-snug">{currentQuestion.text}</h2>

            {/* Code snippet */}
            {currentQuestion.codeSnippet && (
              <pre className="rounded-xl bg-navy-950 border border-navy-800 p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre">
                <code>{currentQuestion.codeSnippet}</code>
              </pre>
            )}

            {/* MCQ options */}
            {currentQuestion.type === 'MCQ' && (
              <fieldset>
                <legend className="sr-only">Select your answer</legend>
                <div className="space-y-3">
                  {currentQuestion.options.map((opt, i) => {
                    const isSelected = selectedAnswer === opt.id;
                    const keyLabel = KEY_LABELS[i];
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-navy-700 bg-navy-800 hover:border-navy-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQuestion.id}`}
                          value={opt.id}
                          checked={isSelected}
                          onChange={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt.id }))}
                          className="sr-only"
                        />
                        {keyLabel && (
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-mono transition-colors ${
                            isSelected ? 'border-orange-500 text-orange-400' : 'border-navy-600 text-navy-500'
                          }`}>
                            {keyLabel}
                          </span>
                        )}
                        <span className={`text-sm ${isSelected ? 'text-orange-200' : 'text-navy-200'}`}>
                          {opt.text}
                        </span>
                        {isSelected && (
                          <svg className="ml-auto h-4 w-4 shrink-0 text-orange-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Code submission */}
            {currentQuestion.type === 'CODE' && (
              <div>
                <label htmlFor="code-answer" className="block text-xs font-mono text-navy-400 mb-2">
                  Your solution ({currentQuestion.codeLanguage ?? 'code'})
                </label>
                <textarea
                  id="code-answer"
                  rows={10}
                  value={answers[currentQuestion.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                  className="w-full rounded-xl border border-navy-700 bg-navy-950 px-4 py-3 text-xs font-mono text-green-300 placeholder-navy-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y"
                  placeholder="// Write your solution here"
                  spellCheck={false}
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs font-mono text-navy-600">No back navigation</p>
              <button
                type="button"
                onClick={nextQuestion}
                disabled={!selectedAnswer || phase === 'submitting'}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {phase === 'submitting' && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {phase === 'submitting' ? 'Submitting…' : isLast ? 'Submit →' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Results screen ───────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-6">
          <div className="rounded-2xl border border-navy-700 bg-navy-900 p-10 text-center space-y-6">
            <CircularScore score={result.score} passed={result.passed} />

            {result.passed ? (
              <>
                <div>
                  <h1 className="font-display text-3xl text-white">You passed!</h1>
                  {result.percentile !== null && (
                    <p className="mt-1 text-sm text-navy-400">
                      Top <span className="text-orange-400">{result.percentile}%</span> in this track
                    </p>
                  )}
                </div>
                {result.badge && <BadgeCard badge={result.badge} />}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href={`/track/${params.trackId}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                  >
                    Continue Track →
                  </Link>
                  <Link
                    href="/learner/portfolio"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-navy-600 px-6 text-sm font-semibold text-white hover:border-navy-400 transition-colors"
                  >
                    View Portfolio
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h1 className="font-display text-3xl text-white">Not quite yet</h1>
                  <p className="mt-1 text-sm text-navy-400">
                    You scored {Math.round(result.score)}% — need 60% to pass.
                  </p>
                </div>

                {result.missedConcepts.length > 0 && (
                  <div className="text-left rounded-xl bg-navy-800 border border-navy-700 p-4">
                    <p className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-3">Concepts to review</p>
                    <div className="space-y-2">
                      {result.missedConcepts.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-navy-200">{c.conceptTitle}</span>
                          {c.resourceSlug && (
                            <Link
                              href={`/concepts/${c.resourceSlug}`}
                              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              Study →
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.retryAvailableAt && (
                  <div className="rounded-lg bg-navy-800 border border-navy-700 px-4 py-3">
                    <p className="text-sm text-navy-300">
                      Retry available: <span className="text-white font-mono">
                        {new Date(result.retryAvailableAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                  </div>
                )}

                <Link
                  href={`/track/${params.trackId}/module/${params.moduleId}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-navy-600 px-6 text-sm font-semibold text-white hover:border-navy-400 transition-colors"
                >
                  ← Back to Module
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <></>;
}
