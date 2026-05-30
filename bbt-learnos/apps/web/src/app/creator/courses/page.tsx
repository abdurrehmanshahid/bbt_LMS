'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { creatorApi } from '@/lib/creator';
import { useAuthStore } from '@/lib/store';

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export default function CreatorCoursesPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [message, setMessage] = useState('');

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['creator-courses'],
    queryFn: () => creatorApi.getCourses(accessToken!),
    enabled: !!accessToken,
  });

  const createMutation = useMutation({
    mutationFn: () => creatorApi.createCourse(accessToken!, {
      title,
      slug: slug || slugify(title),
      description,
      icon: 'BBT',
    }),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setSlug('');
      setMessage('Draft course created. Add structure in Builder, then submit content for admin review.');
      void qc.invalidateQueries({ queryKey: ['creator-courses'] });
    },
    onError: () => setMessage('Could not create course. Use a unique slug and try again.'),
  });

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (title.trim().length < 3 || description.trim().length < 8) {
      setMessage('Course title and outcome description are required.');
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="bbt-kicker">Creator Studio</p>
          <h1 className="font-display text-3xl text-white">Courses</h1>
          <p className="mt-1 text-sm text-navy-400">Create draft courses, attach lessons, and move work into admin review.</p>
        </div>
        <Link href="/creator/upload" className="bbt-button-secondary px-4 py-2 text-sm">
          Add Video
        </Link>
      </div>

      <form onSubmit={submit} className="bbt-card p-4 space-y-4" noValidate>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="creator-course-title" className="mb-1 block text-xs font-mono text-navy-400">Draft title</label>
            <input
              id="creator-course-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slug) setSlug(slugify(event.target.value));
              }}
              className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
              placeholder="Kubernetes Helm for AI Apps"
            />
          </div>
          <div>
            <label htmlFor="creator-course-slug" className="mb-1 block text-xs font-mono text-navy-400">Slug</label>
            <input
              id="creator-course-slug"
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
              className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
              placeholder="kubernetes-helm-ai-apps"
            />
          </div>
        </div>
        <div>
          <label htmlFor="creator-course-description" className="mb-1 block text-xs font-mono text-navy-400">Learner outcome</label>
          <textarea
            id="creator-course-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
            placeholder="Describe the project learners will complete and the skills they prove."
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-navy-400">{message}</p>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bbt-button-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            Create Draft Course
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-xl bg-navy-800" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {courses.map((course) => (
            <article key={course.id} className="bbt-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-orange-300">{course.status}</p>
                  <h2 className="mt-1 truncate text-base font-semibold text-white">{course.title}</h2>
                </div>
                <span className="bbt-logo-mark h-8 min-w-8 px-2 text-xs font-mono">{course.icon}</span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-navy-300">{course.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-navy-400">
                <span>{course.moduleCount} modules</span>
                <span>{course.contentCount} of your posts</span>
                <span>{course.enrollmentCount} learners</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/creator/courses/${course.id}/builder`}
                  className="bbt-button-primary px-3 py-2 text-xs"
                >
                  Builder
                </Link>
                <Link
                  href={`/creator/upload?trackId=${course.id}`}
                  className="bbt-button-secondary px-3 py-2 text-xs"
                >
                  Add Content
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
