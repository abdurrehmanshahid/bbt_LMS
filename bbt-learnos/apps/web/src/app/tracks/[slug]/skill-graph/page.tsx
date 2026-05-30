import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SkillGraphViz } from './SkillGraphViz';

import { getTrack } from '@/lib/api';
import { getTrackSkillGraph, getReadyToLearn } from '@/lib/skill-graph';


interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const track = await getTrack(params.slug);
    return {
      title: `${track.title} — Skill Map | BBT LearnOS`,
      description: `Explore the full prerequisite graph for the ${track.title} track.`,
    };
  } catch {
    return { title: 'Skill Map | BBT LearnOS' };
  }
}

export default async function SkillGraphPage({ params }: Props): Promise<React.JSX.Element> {
  let track;
  try {
    track = await getTrack(params.slug);
  } catch {
    notFound();
  }

  const token = cookies().get('access_token')?.value;

  const [graph, learnerData] = await Promise.all([
    getTrackSkillGraph(track.id),
    token ? getReadyToLearn(token) : Promise.resolve({ ready: [], earned: [] }),
  ]);

  const readyIds = learnerData.ready.map((c) => c.conceptId);
  const earnedIds = learnerData.earned;

  return (
    <div className="min-h-screen bbt-screen">
      {/* Header */}
      <div className="border-b border-navy-800 px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2 text-sm font-mono text-navy-400 mb-3">
            <Link href="/tracks" className="hover:text-navy-200 transition-colors">Tracks</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/tracks/${params.slug}`} className="hover:text-navy-200 transition-colors">
              {track.title}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-navy-200">Skill Map</span>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-4xl shrink-0" role="img" aria-label={track.title}>{track.icon}</span>
            <div>
              <h1 className="font-display text-3xl text-white">{track.title} — Skill Map</h1>
              <p className="mt-1 text-sm font-mono text-navy-400">
                {graph.nodes.length} concepts · {graph.edges.length} prerequisite relationships
                {earnedIds.length > 0 && (
                  <span className="ml-3 text-green-400">{earnedIds.length} earned</span>
                )}
                {readyIds.length > 0 && (
                  <span className="ml-3 text-orange-400">{readyIds.length} ready</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        {graph.nodes.length === 0 ? (
          <div className="rounded-xl border border-navy-700 bg-navy-900 p-10 text-center">
            <p className="font-mono text-sm text-navy-400">
              Skill graph unavailable — Neo4j may be offline or this track has no concept data yet.
            </p>
            <p className="mt-2 font-mono text-xs text-navy-600">
              An admin can trigger a sync at{' '}
              <code className="text-navy-500">POST /admin/skill-graph/sync</code>
            </p>
          </div>
        ) : (
          <SkillGraphViz
            graph={graph}
            earnedConceptIds={earnedIds}
            readyConceptIds={readyIds}
          />
        )}

        {!token && graph.nodes.length > 0 && (
          <p className="mt-6 text-center text-sm font-mono text-navy-500">
            <Link href="/auth/login" className="text-orange-400 hover:underline">Sign in</Link>
            {' '}to see your progress on this map.
          </p>
        )}
      </div>
    </div>
  );
}
