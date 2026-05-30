'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { BrandLogo } from '@/components/BrandLogo';
import { getTracks, type TrackSummary } from '@/lib/api';
import { authApi } from '@/lib/auth';
import { learnerApi } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

interface Question {
  id: string;
  text: string;
  options: Array<{ value: string; label: string; hint: string }>;
}

interface RecommendedTrack {
  id: string;
  slug: string;
  title: string;
  icon: string;
  description: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'goal',
    text: 'What is your primary goal?',
    options: [
      { value: 'get_job', label: 'Get a job', hint: 'Placement-focused path' },
      { value: 'freelance', label: 'Freelance', hint: 'Client-ready skills' },
      { value: 'build_product', label: 'Build a product', hint: 'Ship a real app' },
      { value: 'upskill', label: 'Upskill professionally', hint: 'Grow in your role' },
    ],
  },
  {
    id: 'background',
    text: 'What is your background?',
    options: [
      { value: 'cs_student', label: 'CS student', hint: 'Academic base' },
      { value: 'self_taught', label: 'Self-taught developer', hint: 'Project-led learner' },
      { value: 'career_changer', label: 'Career changer', hint: 'Structured ramp' },
      { value: 'professional', label: 'Working professional', hint: 'Applied upgrade' },
    ],
  },
  {
    id: 'time',
    text: 'How much time can you dedicate per week?',
    options: [
      { value: 'lt_5h', label: 'Less than 5 hours', hint: 'Light schedule' },
      { value: '5_10h', label: '5 to 10 hours', hint: 'Steady pace' },
      { value: '10_20h', label: '10 to 20 hours', hint: 'Fast progress' },
      { value: 'gt_20h', label: '20+ hours', hint: 'Immersive sprint' },
    ],
  },
  {
    id: 'priority',
    text: 'What matters most to you?',
    options: [
      { value: 'job_guarantee', label: 'Job placement support', hint: 'Career outcome' },
      { value: 'fast_skill', label: 'Fast skill acquisition', hint: 'Practical tasks' },
      { value: 'flexibility', label: 'Flexible schedule', hint: 'Self-paced flow' },
      { value: 'certificate', label: 'Recognised certificate', hint: 'Credential path' },
    ],
  },
  {
    id: 'area',
    text: 'Which area interests you most?',
    options: [
      { value: 'ai_ml', label: 'AI / ML', hint: 'Agents, RAG, LLMOps' },
      { value: 'cloud', label: 'Cloud and DevOps', hint: 'Docker, Kubernetes, MLOps' },
      { value: 'cybersecurity', label: 'Cybersecurity', hint: 'Offense, defense, SOC' },
      { value: 'web_dev', label: 'Web Development', hint: 'Next.js, NestJS, AI apps' },
      { value: 'design', label: 'UI/UX Design', hint: 'Figma, research, systems' },
      { value: 'marketing', label: 'AI Marketing', hint: 'Growth, ads, commerce' },
      { value: 'erp', label: 'ERP / Odoo', hint: 'Business automation' },
    ],
  },
];

const AREA_TO_TRACK_SLUG: Record<string, string> = {
  ai_ml: 'genai-agentic-ai',
  cloud: 'cloud-mlops',
  cybersecurity: 'cybersecurity',
  web_dev: 'ai-integrated-fullstack',
  design: 'ui-ux-brand-design',
  marketing: 'ai-marketing-sales',
  erp: 'odoo-erp-development',
};

function toRecommendedTrack(track: TrackSummary): RecommendedTrack {
  return {
    id: track.id,
    slug: track.slug,
    title: track.title,
    icon: track.icon,
    description: track.description,
  };
}

async function findFallbackRecommendation(area: string | undefined): Promise<RecommendedTrack> {
  const tracks = await getTracks();
  const preferredSlug = AREA_TO_TRACK_SLUG[area ?? 'ai_ml'] ?? AREA_TO_TRACK_SLUG['ai_ml'];
  const track =
    tracks.find((item) => item.slug === preferredSlug) ??
    tracks.find((item) => item.slug === AREA_TO_TRACK_SLUG['ai_ml']) ??
    tracks[0];

  if (!track) {
    throw new Error('No tracks are available for quiz recommendation.');
  }

  return toRecommendedTrack(track);
}

export default function OnboardingQuizPage(): React.JSX.Element {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [recommended, setRecommended] = useState<RecommendedTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const current = QUESTIONS[step];
  const total = QUESTIONS.length;
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

    setSubmitting(true);
    setError(null);
    try {
      const res = await authApi.submitQuiz(answers);
      setRecommended(res.recommendedTrack);
    } catch {
      try {
        setRecommended(await findFallbackRecommendation(answers['area']));
      } catch {
        setError('Could not load a real track recommendation. Please browse all tracks instead.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack(): void {
    if (step > 0) setStep((s) => s - 1);
  }

  if (recommended) {
    return (
      <div className="min-h-screen bbt-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8 text-center">
          <div>
            <p className="bbt-kicker mb-2">Your recommended track</p>
            <h1 className="font-display text-4xl bbt-title">We found your path</h1>
          </div>

          <div className="bbt-card p-8">
            <span className="bbt-logo-mark mx-auto mb-4 h-16 min-w-16 px-4 text-3xl" role="img" aria-label={recommended.title}>
              {recommended.icon}
            </span>
            <h2 className="font-display text-3xl bbt-title">{recommended.title}</h2>
            <p className="mt-3 bbt-copy">{recommended.description}</p>
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {accessToken ? (
              <button
                type="button"
                disabled={enrolling}
                onClick={async () => {
                  setEnrolling(true);
                  try {
                    await learnerApi.enrollFree(accessToken, recommended.id);
                  } catch {
                    setError('Enrollment did not complete. Open the track page and try again.');
                  }
                  router.push('/dashboard');
                }}
                className="bbt-button-primary h-12 px-8 text-base disabled:opacity-60"
              >
                {enrolling ? 'Enrolling...' : 'Enroll Free'}
              </button>
            ) : (
              <Link
                href={`/auth/signup?track=${recommended.slug}`}
                className="bbt-button-primary h-12 px-8 text-base"
              >
                Start Free
              </Link>
            )}
            <Link
              href={`/tracks/${recommended.slug}`}
              className="bbt-button-secondary h-12 px-8 text-base"
            >
              View full track
            </Link>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="button"
            onClick={() => {
              setRecommended(null);
              setStep(0);
              setAnswers({});
              setError(null);
            }}
            className="font-mono text-xs uppercase tracking-[0.12em] bbt-muted transition-colors hover:text-[var(--bbt-text-1)]"
          >
            Retake quiz
          </button>
        </div>
      </div>
    );
  }

  if (!current) return <></>;

  return (
    <div className="min-h-screen bbt-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <BrandLogo compact priority />
            <span className="font-mono text-xs bbt-muted" aria-live="polite">
              {step + 1} / {total}
            </span>
          </div>

          <div
            className="bbt-progress"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-label={`Question ${step + 1} of ${total}`}
          >
            <div
              className="bbt-progress-fill transition-all duration-500"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="bbt-card p-8">
          <p className="bbt-kicker mb-4">Track Finder</p>
          <h1 className="mb-6 font-display text-3xl bbt-title">{current.text}</h1>

          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
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
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-orange-500/50 bg-orange-500/10 text-orange-200'
                        : 'border-[var(--bbt-border)] bg-[var(--bbt-surface-1)] text-[var(--bbt-text-2)] hover:border-[var(--bbt-border-strong)] hover:text-[var(--bbt-text-1)]'
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
                    <span className="block text-sm font-semibold">{opt.label}</span>
                    <span className="mt-1 block text-xs bbt-muted">{opt.hint}</span>
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
              className="font-mono text-xs uppercase tracking-[0.12em] bbt-muted transition-colors hover:text-[var(--bbt-text-1)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!selectedAnswer || submitting}
              className="bbt-button-primary h-11 px-6 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {step < total - 1 ? 'Next' : submitting ? 'Finding your path...' : 'See my recommendation'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/tracks" className="font-mono text-xs uppercase tracking-[0.12em] bbt-muted transition-colors hover:text-[var(--bbt-text-1)]">
            Skip and browse all tracks
          </Link>
        </div>
      </div>
    </div>
  );
}
