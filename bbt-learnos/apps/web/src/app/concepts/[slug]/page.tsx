import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ConceptEnrollCTA } from './ConceptEnrollCTA';

interface ConceptData {
  id: string;
  slug: string;
  title: string;
  description: string;
  muxPlaybackId: string | null;
  transcript: string | null;
  track: { title: string; slug: string };
  module: { title: string };
  relatedConcepts: Array<{ id: string; slug: string; title: string }>;
}

interface Props {
  params: { slug: string };
}

async function getConcept(slug: string): Promise<ConceptData | null> {
  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';
  try {
    const res = await fetch(`${apiBase}/concepts/${slug}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<ConceptData>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const concept = await getConcept(params.slug);
  if (!concept) return { title: 'Concept | BBT LearnOS' };

  return {
    title: `${concept.title} — ${concept.module.title}`,
    description: concept.description,
    openGraph: {
      title: `${concept.title} | BBT LearnOS`,
      description: concept.description,
      type: 'video.other',
      url: `https://bbt.edu.pk/concepts/${concept.slug}`,
    },
    alternates: {
      canonical: `/concepts/${concept.slug}`,
      languages: { 'ur-PK': `/ur/concepts/${concept.slug}` },
    },
  };
}

export default async function ConceptPage({ params }: Props): Promise<React.JSX.Element> {
  const concept = await getConcept(params.slug);
  if (!concept) notFound();

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-navy-950 px-4 py-3">
        <nav className="mx-auto max-w-4xl flex items-center gap-2 text-xs font-mono text-navy-400" aria-label="Breadcrumb">
          <Link href="/tracks" className="hover:text-navy-200 transition-colors">Tracks</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/tracks/${concept.track.slug}`} className="hover:text-navy-200 transition-colors">{concept.track.title}</Link>
          <span aria-hidden="true">/</span>
          <span className="text-navy-200">{concept.title}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <p className="text-sm font-mono text-orange-500 mb-2">{concept.module.title}</p>
              <h1 className="font-display text-4xl text-navy-900 dark:text-white">{concept.title}</h1>
              <p className="mt-3 text-navy-500 dark:text-navy-300">{concept.description}</p>
            </div>

            {/* 30-second preview video */}
            {concept.muxPlaybackId && (
              <div>
                <h2 className="font-display text-xl text-navy-900 dark:text-white mb-3">Preview</h2>
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-navy-900">
                  <iframe
                    src={`https://player.mux.com/${concept.muxPlaybackId}?metadata-video-title=${encodeURIComponent(concept.title)}`}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={`Preview: ${concept.title}`}
                  />
                </div>
                <p className="mt-2 text-xs font-mono text-navy-400 dark:text-navy-500">
                  30-second preview — enroll to access full content
                </p>
              </div>
            )}

            {/* Transcript (for SEO indexability) */}
            {concept.transcript && (
              <div>
                <h2 className="font-display text-xl text-navy-900 dark:text-white mb-3">Transcript</h2>
                <div className="rounded-xl bg-navy-50 dark:bg-navy-800 border border-navy-100 dark:border-navy-700 p-5">
                  <p className="text-sm text-navy-600 dark:text-navy-300 whitespace-pre-line leading-relaxed font-body">
                    {concept.transcript}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Enroll CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white">
              <p className="text-sm font-mono opacity-80 mb-1">This concept is part of</p>
              <p className="font-display text-lg">{concept.track.title}</p>
              <p className="mt-2 text-sm opacity-80 font-body">
                Enroll free to access the first 2 modules including this concept.
              </p>
              <ConceptEnrollCTA trackSlug={concept.track.slug} />
            </div>

            {/* Related concepts */}
            {concept.relatedConcepts.length > 0 && (
              <div>
                <h2 className="font-display text-lg text-navy-900 dark:text-white mb-3">Related Concepts</h2>
                <div className="flex flex-col gap-2">
                  {concept.relatedConcepts.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/concepts/${rel.slug}`}
                      className="flex items-center gap-2 rounded-lg border border-navy-100 dark:border-navy-700 px-3 py-2.5 text-sm text-navy-700 dark:text-navy-200 hover:border-navy-300 dark:hover:border-navy-500 hover:text-orange-500 transition-colors"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" aria-hidden="true" />
                      {rel.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* JSON-LD: LearningResource */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LearningResource',
            name: concept.title,
            description: concept.description,
            url: `https://bbt.edu.pk/concepts/${concept.slug}`,
            educationalLevel: 'intermediate',
            learningResourceType: 'video',
            provider: {
              '@type': 'Organization',
              name: 'Big Binary Tech',
              url: 'https://bbt.edu.pk',
            },
            isPartOf: {
              '@type': 'Course',
              name: concept.track.title,
              url: `https://bbt.edu.pk/tracks/${concept.track.slug}`,
            },
            ...(concept.transcript && { text: concept.transcript.slice(0, 500) }),
          }),
        }}
      />
    </>
  );
}
