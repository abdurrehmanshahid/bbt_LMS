'use client';

import Link from 'next/link';

interface Props {
  params: { courseId: string };
}

const BUILDER_SECTIONS = [
  {
    title: 'Modules',
    body: 'Plan the sequence learners will unlock. Admin-published modules stay enrollment gated.',
  },
  {
    title: 'Concepts',
    body: 'Break modules into teachable concepts for search, recommendations, and skill badges.',
  },
  {
    title: 'Assessments',
    body: 'Attach checks that must hit the 60% pass threshold before deeper modules unlock.',
  },
  {
    title: 'Resources',
    body: 'Add articles, files, notebooks, links, and project references for hands-on work.',
  },
  {
    title: 'Videos',
    body: 'Upload lectures, reels, recordings, and resources through the moderated content pipeline.',
  },
  {
    title: 'Review',
    body: 'Submit the draft for admin approval before learners can see it in the catalog.',
  },
];

export default function CreatorCourseBuilderPage({ params }: Props): React.JSX.Element {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <Link href="/creator/courses" className="font-mono text-xs uppercase tracking-[0.12em] text-white/40 hover:text-white">
          Back to courses
        </Link>
        <p className="bbt-kicker mt-4">Course Builder</p>
        <h1 className="font-display text-3xl text-white">Draft workspace</h1>
        <p className="mt-1 max-w-2xl text-sm text-navy-400">
          Course ID {params.courseId}. This is the visible builder shell for modules, concepts, assessments, resources, assignments, and videos.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {BUILDER_SECTIONS.map((section, index) => (
          <section key={section.title} className="bbt-card p-4">
            <div className="bbt-logo-mark h-8 w-8 text-xs font-mono">
              {index + 1}
            </div>
            <h2 className="mt-4 text-sm font-semibold text-white">{section.title}</h2>
            <p className="mt-2 text-sm text-navy-400">{section.body}</p>
          </section>
        ))}
      </div>

      <div className="bbt-panel p-5">
        <p className="text-sm font-semibold text-orange-200">Next slice queued</p>
        <p className="mt-1 text-sm text-orange-100/80">
          The next backend pass should add real module, concept, assignment, assessment, and resource mutations behind this builder.
        </p>
      </div>
    </div>
  );
}
