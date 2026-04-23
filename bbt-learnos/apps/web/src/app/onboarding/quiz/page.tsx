'use client';
import Link from 'next/link';
import { useState } from 'react';
import { authApi } from '@/lib/auth';

interface Question {
  id: string;
  text: string;
  options: Array<{ value: string; label: string; emoji: string }>;
}

const QUESTIONS: Question[] = [
  {
    id: 'goal',
    text: 'What is your primary goal?',
    options: [
      { value: 'get_job', label: 'Get a job', emoji: '💼' },
      { value: 'freelance', label: 'Freelance', emoji: '🌐' },
      { value: 'build_product', label: 'Build a product', emoji: '🚀' },
      { value: 'upskill', label: 'Upskill professionally', emoji: '📈' },
    ],
  },
  {
    id: 'background',
    text: 'What is your background?',
    options: [
      { value: 'cs_student', label: 'CS student', emoji: '🎓' },
      { value: 'self_taught', label: 'Self-taught developer', emoji: '💻' },
      { value: 'career_changer', label: 'Career changer', emoji: '🔄' },
      { value: 'professional', label: 'Working professional', emoji: '🏢' },
    ],
  },
  {
    id: 'time',
    text: 'How much time can you dedicate per week?',
    options: [
      { value: 'lt_5h', label: 'Less than 5 hours', emoji: '⏱' },
      { value: '5_10h', label: '5 – 10 hours', emoji: '⏰' },
      { value: '10_20h', label: '10 – 20 hours', emoji: '🕐' },
      { value: 'gt_20h', label: '20+ hours', emoji: '🔥' },
    ],
  },
  {
    id: 'priority',
    text: 'What matters most to you?',
    options: [
      { value: 'job_guarantee', label: 'Job placement support', emoji: '🎯' },
      { value: 'fast_skill', label: 'Fast skill acquisition', emoji: '⚡' },
      { value: 'flexibility', label: 'Flexible schedule', emoji: '🕊' },
      { value: 'certificate', label: 'Recognised certificate', emoji: '🏅' },
    ],
  },
  {
    id: 'area',
    text: 'Which area interests you most?',
    options: [
      { value: 'ai_ml', label: 'AI / ML', emoji: '🤖' },
      { value: 'cloud', label: 'Cloud & DevOps', emoji: '☁️' },
      { value: 'cybersecurity', label: 'Cybersecurity', emoji: '🛡' },
      { value: 'web_dev', label: 'Web Development', emoji: '🌐' },
      { value: 'design', label: 'UI/UX Design', emoji: '🎨' },
      { value: 'marketing', label: 'AI Marketing', emoji: '📊' },
      { value: 'erp', label: 'ERP / Odoo', emoji: '⚙️' },
    ],
  },
];

interface RecommendedTrack {
  id: string;
  slug: string;
  title: string;
  icon: string;
  description: string;
}

export default function OnboardingQuizPage(): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [recommended, setRecommended] = useState<RecommendedTrack | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = QUESTIONS[step];
  const total = QUESTIONS.length;
  const progress = ((step) / total) * 100;
  const selectedAnswer = current ? answers[current.id] : undefined;

  function selectAnswer(questionId: string, value: string): void {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleNext(): Promise<void> {
    if (!current || !selectedAnswer) return;

    if (step < total - 1) {
      setStep((s) => s + 1);
      return;
    }

    // Final step — submit
    setSubmitting(true);
    setError(null);
    try {
      const res = await authApi.submitQuiz(answers);
      setRecommended(res.recommendedTrack);
    } catch {
      // Fallback: derive recommendation from 'area' answer locally
      const areaMap: Record<string, RecommendedTrack> = {
        ai_ml: { id: '1', slug: 'genai-agentic-ai', title: 'GenAI + Agentic AI', icon: '🤖', description: 'Master LLMs, agents, and production AI systems.' },
        cloud: { id: '2', slug: 'cloud-mlops', title: 'Cloud + MLOps', icon: '☁️', description: 'Build and ship scalable ML pipelines on cloud.' },
        cybersecurity: { id: '5', slug: 'cybersecurity', title: 'Cybersecurity', icon: '🛡', description: 'Penetration testing, threat modelling, and defence.' },
        web_dev: { id: '4', slug: 'ai-full-stack', title: 'AI-Integrated Full Stack', icon: '💻', description: 'Build AI-powered web applications end to end.' },
        design: { id: '6', slug: 'ui-ux-design', title: 'UI/UX + Brand Design', icon: '🎨', description: 'Design systems, user research, and prototyping.' },
        marketing: { id: '7', slug: 'ai-marketing', title: 'AI Marketing + Sales', icon: '📊', description: 'AI-driven marketing, Shopify, and growth.' },
        erp: { id: '3', slug: 'odoo-erp', title: 'Odoo ERP Development', icon: '⚙️', description: 'Build and customise enterprise ERP systems.' },
      };
      const area = answers['area'] ?? 'ai_ml';
      setRecommended(areaMap[area] ?? areaMap['ai_ml']!);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack(): void {
    if (step > 0) setStep((s) => s - 1);
  }

  // Results screen
  if (recommended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4 py-12">
        <div className="w-full max-w-lg text-center space-y-8">
          <div>
            <p className="text-xs font-mono text-orange-500 uppercase tracking-wider mb-2">Your recommended track</p>
            <h1 className="font-display text-4xl text-white">We found your path</h1>
          </div>

          <div className="rounded-2xl border-2 border-orange-500 bg-navy-900 p-8">
            <span className="text-6xl mb-4 block" role="img" aria-label={recommended.title}>
              {recommended.icon}
            </span>
            <h2 className="font-display text-3xl text-white">{recommended.title}</h2>
            <p className="mt-3 text-navy-300">{recommended.description}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/auth/signup?track=${recommended.slug}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 text-base font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Start Free →
            </Link>
            <Link
              href={`/tracks/${recommended.slug}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-navy-600 px-8 text-base font-semibold text-white hover:border-navy-400 transition-colors"
            >
              View full track
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              setRecommended(null);
              setStep(0);
              setAnswers({});
            }}
            className="text-xs font-mono text-navy-500 hover:text-navy-300 transition-colors"
          >
            Retake quiz
          </button>
        </div>
      </div>
    );
  }

  if (!current) return <></>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="font-display text-xl text-white">BBT</span>
              <span className="font-mono text-xs text-orange-500 border border-orange-500 px-1.5 py-0.5 rounded">LearnOS</span>
            </Link>
            <span className="text-xs font-mono text-navy-400" aria-live="polite">
              {step + 1} / {total}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="h-1.5 w-full rounded-full bg-navy-800 overflow-hidden"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-label={`Question ${step + 1} of ${total}`}
          >
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${progress + (1 / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-2xl border border-navy-700 bg-navy-900 p-8">
          <h1 className="font-display text-2xl sm:text-3xl text-white mb-6">
            {current.text}
          </h1>

          {error && (
            <div role="alert" className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <fieldset>
            <legend className="sr-only">{current.text}</legend>
            <div className={`grid gap-3 ${current.options.length > 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {current.options.map((opt) => {
                const isSelected = selectedAnswer === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-navy-700 bg-navy-800 hover:border-navy-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name={current.id}
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => selectAnswer(current.id, opt.value)}
                      className="sr-only"
                    />
                    <span className="text-2xl shrink-0" aria-hidden="true">{opt.emoji}</span>
                    <span className={`text-sm font-medium ${isSelected ? 'text-orange-300' : 'text-navy-200'}`}>
                      {opt.label}
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

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className="text-sm font-mono text-navy-400 hover:text-navy-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!selectedAnswer || submitting}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {step < total - 1 ? 'Next →' : submitting ? 'Finding your path…' : 'See my recommendation →'}
            </button>
          </div>
        </div>

        {/* Skip link */}
        <div className="mt-6 text-center">
          <Link href="/tracks" className="text-xs font-mono text-navy-500 hover:text-navy-300 transition-colors">
            Skip and browse all tracks
          </Link>
        </div>
      </div>
    </div>
  );
}
