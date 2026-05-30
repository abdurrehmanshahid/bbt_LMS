import type { Metadata } from 'next';
import Link from 'next/link';

import { TrackEnrollCTA } from '@/components/TrackEnrollCTA';
import { getTracks, type TrackSummary } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Browse Skills | BBT LearnOS',
  description:
    'Browse BBT LearnOS by technology skill areas and enroll directly into the matching career track.',
};

interface SkillArea {
  title: string;
  summary: string;
  skills: string[];
  trackSlugs: string[];
}

const SKILL_AREAS: SkillArea[] = [
  {
    title: 'AI, Agents, and RAG',
    summary: 'LLM applications, retrieval systems, agent workflows, evaluation, and production AI patterns.',
    skills: ['Python', 'Prompt engineering', 'RAG', 'Vector databases', 'LangGraph', 'LLMOps'],
    trackSlugs: ['genai-agentic-ai', 'ai-integrated-fullstack'],
  },
  {
    title: 'Cloud, MLOps, and Infrastructure',
    summary: 'Ship reliable systems with containers, CI/CD, managed cloud services, and model operations.',
    skills: ['Docker', 'Kubernetes', 'Helm', 'AWS', 'Azure ML', 'MLflow'],
    trackSlugs: ['cloud-mlops', 'networking-infrastructure'],
  },
  {
    title: 'Full Stack Product Engineering',
    summary: 'Build user-facing AI products with modern frontend, backend, databases, and real-time features.',
    skills: ['Next.js', 'NestJS', 'PostgreSQL', 'pgvector', 'WebSockets', 'API design'],
    trackSlugs: ['ai-integrated-fullstack', 'genai-agentic-ai'],
  },
  {
    title: 'Cybersecurity and Networks',
    summary: 'Learn offensive testing, defensive monitoring, secure networks, and infrastructure automation.',
    skills: ['Kali Linux', 'SIEM', 'MITRE ATT&CK', 'CCNA', 'Firewalls', 'Python automation'],
    trackSlugs: ['cybersecurity', 'networking-infrastructure'],
  },
  {
    title: 'ERP and Business Automation',
    summary: 'Create business workflows, integrations, and custom enterprise apps for real operating teams.',
    skills: ['Odoo ORM', 'Python', 'QWeb', 'Owl JS', 'Integrations', 'Workflow automation'],
    trackSlugs: ['odoo-erp-development', 'ai-integrated-fullstack'],
  },
  {
    title: 'Design, Growth, and Commerce',
    summary: 'Design trustworthy interfaces and use AI-assisted growth systems for marketing and sales.',
    skills: ['Figma', 'Design systems', 'WCAG', 'Meta Ads', 'HubSpot', 'Shopify'],
    trackSlugs: ['ui-ux-brand-design', 'ai-marketing-sales'],
  },
];

function findAreaTracks(area: SkillArea, tracks: TrackSummary[]): TrackSummary[] {
  return area.trackSlugs
    .map((slug) => tracks.find((track) => track.slug === slug))
    .filter((track): track is TrackSummary => Boolean(track));
}

export default async function SkillsPage(): Promise<React.JSX.Element> {
  let tracks: TrackSummary[] = [];
  try {
    tracks = await getTracks();
  } catch {
    tracks = [];
  }

  return (
    <div className="min-h-screen bbt-screen">
      <section className="border-b border-white/10 bg-[#07071a]/80 px-4 py-14 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl">
          <p className="bbt-kicker mb-4">Technology Browser</p>
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h1 className="font-display text-5xl text-white sm:text-7xl">Browse by skill.</h1>
              <p className="mt-4 max-w-2xl text-base text-navy-300">
                Pick a technology area, inspect the matching BBT career tracks, and enroll directly from the card.
              </p>
            </div>
            <div className="bbt-panel p-5">
              <p className="text-sm font-semibold text-white">Career flow</p>
              <p className="mt-2 text-sm text-white/55">
                Every skill maps back to a track with modules, concepts, projects, assessment gates, and placement support.
              </p>
              <Link href="/onboarding/quiz" className="bbt-button-primary mt-4 w-full px-4 py-3 text-sm">
                Find my track
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        {tracks.length === 0 ? (
          <div className="bbt-card p-8 text-center">
            <p className="bbt-kicker mb-3">API Offline</p>
            <h2 className="font-display text-3xl text-white">Tracks could not be loaded.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">
              Start the API on port 4000 to show live track IDs and enrollment buttons here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {SKILL_AREAS.map((area) => {
              const areaTracks = findAreaTracks(area, tracks);
              return (
                <article key={area.title} className="bbt-card p-5">
                  <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
                    <div>
                      <p className="bbt-kicker mb-3">{area.skills[0]}</p>
                      <h2 className="font-display text-3xl text-white">{area.title}</h2>
                      <p className="mt-3 text-sm leading-relaxed text-white/55">{area.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {area.skills.map((skill) => (
                          <span key={skill} className="bbt-chip px-3 py-1">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {areaTracks.map((track) => (
                        <section key={track.id} className="bbt-panel p-4">
                          <div className="flex items-start gap-3">
                            <span className="bbt-logo-mark h-10 min-w-10 px-2 text-lg" role="img" aria-label={track.title}>
                              {track.icon}
                            </span>
                            <div className="min-w-0">
                              <Link href={`/tracks/${track.slug}`} className="group">
                                <h3 className="truncate text-base font-semibold text-white transition-colors group-hover:text-orange-300">
                                  {track.title}
                                </h3>
                              </Link>
                              <p className="mt-1 line-clamp-2 text-sm text-white/50">{track.description}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-xs font-mono text-white/35">
                            <span>{track._count.modules} modules</span>
                            <span>{track.enrollmentCount.toLocaleString()} enrolled</span>
                          </div>
                          <TrackEnrollCTA trackId={track.id} trackSlug={track.slug} freeModuleCount={2} compact />
                        </section>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
