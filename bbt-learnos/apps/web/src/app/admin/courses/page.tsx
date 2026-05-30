'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { adminApi, type AdminCourse, type AdminModule, type AdminConcept } from '@/lib/admin';
import { useAuthStore } from '@/lib/store';

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// ─── Concept row ──────────────────────────────────────────────────────────────

function ConceptRow({ concept, token, trackId, moduleId }: {
  concept: AdminConcept; token: string; trackId: string; moduleId: string;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(concept.title);
  const [description, setDescription] = useState(concept.description ?? '');

  const update = useMutation({
    mutationFn: () => adminApi.updateConcept(token, trackId, moduleId, concept.id, {
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
    }),
    onSuccess: () => { setEditing(false); void qc.invalidateQueries({ queryKey: ['admin-concepts', moduleId] }); },
  });

  const del = useMutation({
    mutationFn: () => adminApi.deleteConcept(token, trackId, moduleId, concept.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-concepts', moduleId] }),
  });

  if (editing) {
    return (
      <div className="rounded-lg border border-indigo-600/40 bg-navy-800/70 p-3 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-navy-600 bg-navy-900 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full rounded border border-navy-600 bg-navy-900 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => update.mutate()}
            disabled={update.isPending || !title.trim()}
            className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { setTitle(concept.title); setDescription(concept.description ?? ''); setEditing(false); }}
            className="rounded border border-navy-600 px-3 py-1 text-xs font-mono text-navy-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-navy-700 bg-navy-800/50 px-3 py-2">
      <div className="min-w-0">
        <span className="text-xs font-mono text-orange-400 mr-2">#{concept.order}</span>
        <span className="text-sm text-white">{concept.title}</span>
        {concept.description && <p className="text-xs text-navy-400 mt-0.5 truncate">{concept.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-mono text-indigo-400 hover:text-indigo-200"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => del.mutate()}
          disabled={del.isPending}
          className="text-xs font-mono text-red-500 hover:text-red-300 disabled:opacity-40"
          aria-label="Delete concept"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Concept panel ────────────────────────────────────────────────────────────

function ConceptPanel({ token, trackId, module: mod }: { token: string; trackId: string; module: AdminModule }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');

  const { data: concepts = [], isLoading } = useQuery({
    queryKey: ['admin-concepts', mod.id],
    queryFn: () => adminApi.getConcepts(token, trackId, mod.id),
  });

  const create = useMutation({
    mutationFn: () => adminApi.createConcept(token, trackId, mod.id, { title: title.trim(), ...(description.trim() ? { description: description.trim() } : {}) }),
    onSuccess: () => { setTitle(''); setDescription(''); setErr(''); void qc.invalidateQueries({ queryKey: ['admin-concepts', mod.id] }); },
    onError: () => setErr('Could not create concept.'),
  });

  return (
    <div className="mt-3 ml-4 space-y-2 border-l-2 border-navy-700 pl-4">
      <p className="text-xs font-mono uppercase tracking-wider text-navy-500">Concepts</p>
      {isLoading ? (
        <p className="text-xs text-navy-500 font-mono">Loading…</p>
      ) : concepts.length === 0 ? (
        <p className="text-xs text-navy-600 italic">No concepts yet.</p>
      ) : (
        <div className="space-y-1">
          {concepts.map((c) => (
            <ConceptRow key={c.id} concept={c} token={token} trackId={trackId} moduleId={mod.id} />
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); if (!title.trim() || title.trim().length < 3) { setErr('Concept title required (min 3 chars).'); return; } create.mutate(); }}
        className="flex gap-2 pt-1"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Concept title"
          className="flex-1 rounded border border-navy-600 bg-navy-900 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)"
          className="flex-1 rounded border border-navy-600 bg-navy-900 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="shrink-0 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          + Add
        </button>
      </form>
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}

// ─── Module row ───────────────────────────────────────────────────────────────

function ModuleRow({ mod, token, trackId, totalModules }: {
  mod: AdminModule; token: string; trackId: string; totalModules: number;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(mod.title);
  const [editDesc, setEditDesc] = useState(mod.description);
  const [editMinutes, setEditMinutes] = useState(String(mod.estimatedMinutes));
  const [editPassing, setEditPassing] = useState(String(mod.passingScore));

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-modules', trackId] });
    void qc.invalidateQueries({ queryKey: ['admin-courses'] });
  };

  const save = useMutation({
    mutationFn: () => adminApi.updateModule(token, trackId, mod.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      estimatedMinutes: Number(editMinutes),
      passingScore: Number(editPassing),
    }),
    onSuccess: () => { setEditing(false); invalidate(); },
  });

  const toggle = useMutation({
    mutationFn: () => adminApi.updateModule(token, trackId, mod.id, { isActive: !mod.isActive }),
    onSuccess: () => invalidate(),
  });

  const moveUp = useMutation({
    mutationFn: () => adminApi.updateModule(token, trackId, mod.id, { order: mod.order - 1 }),
    onSuccess: () => invalidate(),
  });

  const moveDown = useMutation({
    mutationFn: () => adminApi.updateModule(token, trackId, mod.id, { order: mod.order + 1 }),
    onSuccess: () => invalidate(),
  });

  const del = useMutation({
    mutationFn: () => adminApi.deleteModule(token, trackId, mod.id),
    onSuccess: () => invalidate(),
  });

  if (editing) {
    return (
      <div className="rounded-xl border border-indigo-600/50 bg-navy-800/60 p-4 space-y-3">
        <p className="text-xs font-mono uppercase tracking-wider text-indigo-400">Editing module {mod.order}</p>
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Module title"
          className="w-full rounded border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        />
        <textarea
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          placeholder="Description"
          rows={3}
          className="w-full rounded border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex gap-3">
          <div>
            <label className="mb-1 block text-xs font-mono text-navy-400">Duration (min)</label>
            <input
              type="number" min="1" max="600"
              value={editMinutes}
              onChange={(e) => setEditMinutes(e.target.value)}
              className="w-24 rounded border border-navy-600 bg-navy-900 px-2 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-mono text-navy-400">Pass score (%)</label>
            <input
              type="number" min="1" max="100"
              value={editPassing}
              onChange={(e) => setEditPassing(e.target.value)}
              className="w-24 rounded border border-navy-600 bg-navy-900 px-2 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !editTitle.trim()}
            className="rounded bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => { setEditTitle(mod.title); setEditDesc(mod.description); setEditMinutes(String(mod.estimatedMinutes)); setEditPassing(String(mod.passingScore)); setEditing(false); }}
            className="rounded border border-navy-600 px-4 py-2 text-xs font-mono text-navy-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800/40 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Order badge + reorder buttons */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => moveUp.mutate()}
            disabled={mod.order <= 1 || moveUp.isPending}
            className="text-navy-500 hover:text-navy-200 disabled:opacity-20 leading-none"
            aria-label="Move module up"
            title="Move up"
          >
            ▲
          </button>
          <span className="w-6 text-center font-mono text-xs text-orange-400">{mod.order}</span>
          <button
            type="button"
            onClick={() => moveDown.mutate()}
            disabled={mod.order >= totalModules || moveDown.isPending}
            className="text-navy-500 hover:text-navy-200 disabled:opacity-20 leading-none"
            aria-label="Move module down"
            title="Move down"
          >
            ▼
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{mod.title}</p>
          <p className="text-xs text-navy-400 truncate mt-0.5">{mod.description}</p>
          <p className="text-xs text-navy-500 font-mono mt-1">{mod.estimatedMinutes} min · {mod.passingScore}% pass · {mod._count.concepts} concepts · {mod._count.content} content</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`text-xs font-mono ${mod.isActive ? 'text-green-400' : 'text-navy-500'}`}>
            {mod.isActive ? 'Active' : 'Hidden'}
          </span>
          <button
            type="button"
            onClick={() => toggle.mutate()}
            disabled={toggle.isPending}
            className="text-xs font-mono text-navy-400 hover:text-white disabled:opacity-40"
          >
            {mod.isActive ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-mono text-indigo-400 hover:text-indigo-200"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-mono text-navy-400 hover:text-white"
          >
            {expanded ? '▴ Collapse' : '▾ Concepts'}
          </button>
          <button
            type="button"
            onClick={() => { if (confirm(`Delete module "${mod.title}"?`)) del.mutate(); }}
            disabled={del.isPending}
            className="text-xs font-mono text-red-500 hover:text-red-300 disabled:opacity-40"
          >
            Del
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4">
          <ConceptPanel token={token} trackId={trackId} module={mod} />
        </div>
      )}
    </div>
  );
}

// ─── Module panel ─────────────────────────────────────────────────────────────

function ModulePanel({ token, course }: { token: string; course: AdminCourse }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [passing, setPassing] = useState('60');
  const [err, setErr] = useState('');

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['admin-modules', course.id],
    queryFn: () => adminApi.getModules(token, course.id),
  });

  const create = useMutation({
    mutationFn: () => adminApi.createModule(token, course.id, {
      title: title.trim(),
      description: description.trim(),
      estimatedMinutes: Number(minutes),
      passingScore: Number(passing),
    }),
    onSuccess: () => {
      setTitle(''); setDescription(''); setMinutes('30'); setPassing('60'); setErr('');
      void qc.invalidateQueries({ queryKey: ['admin-modules', course.id] });
      void qc.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: () => setErr('Could not create module. Check all fields.'),
  });

  function submit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (title.trim().length < 3) { setErr('Module title required (min 3 chars).'); return; }
    if (description.trim().length < 10) { setErr('Description required (min 10 chars).'); return; }
    if (!Number(minutes) || Number(minutes) < 1) { setErr('Duration must be at least 1 minute.'); return; }
    create.mutate();
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-mono uppercase tracking-wider text-orange-400">Modules</p>
        <span className="text-xs font-mono text-navy-500">({modules.length})</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-navy-700 animate-pulse" />)}</div>
      ) : modules.length === 0 ? (
        <p className="text-xs text-navy-500 italic">No modules yet. Add the first one below.</p>
      ) : (
        <div className="space-y-2">
          {modules.map((m) => (
            <ModuleRow key={m.id} mod={m} token={token} trackId={course.id} totalModules={modules.length} />
          ))}
        </div>
      )}

      <form onSubmit={submit} className="rounded-xl border border-navy-700 bg-navy-800/30 p-4 space-y-3">
        <p className="text-xs font-mono text-navy-400 uppercase tracking-wider">Add module</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Module title *"
            className="rounded border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <input
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              type="number" min="1" max="600"
              placeholder="Minutes"
              className="w-24 rounded border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
            />
            <input
              value={passing}
              onChange={(e) => setPassing(e.target.value)}
              type="number" min="1" max="100"
              placeholder="Pass %"
              className="w-24 rounded border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What learners will learn in this module *"
          rows={2}
          className="w-full rounded border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
        />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button
          type="submit"
          disabled={create.isPending}
          className="bbt-button-primary px-4 py-2 text-xs disabled:opacity-50"
        >
          {create.isPending ? 'Adding…' : '+ Add Module'}
        </button>
      </form>
    </div>
  );
}

// ─── Course row ───────────────────────────────────────────────────────────────

function CourseRow({ course, token }: { course: AdminCourse; token: string }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editingTrack, setEditingTrack] = useState(false);
  const [editTitle, setEditTitle] = useState(course.title);
  const [editDesc, setEditDesc] = useState(course.description);
  const [editIcon, setEditIcon] = useState(course.icon);

  const publishMutation = useMutation({
    mutationFn: () => adminApi.updateCourse(token, course.id, { isActive: course.status !== 'PUBLISHED' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-courses'] }),
  });

  const saveMutation = useMutation({
    mutationFn: () => adminApi.updateCourse(token, course.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      icon: editIcon.trim(),
    }),
    onSuccess: () => { setEditingTrack(false); void qc.invalidateQueries({ queryKey: ['admin-courses'] }); },
  });

  return (
    <div className="bbt-card overflow-hidden">
      <div className="p-4">
        {editingTrack ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_80px]">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Track title"
                className="rounded border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
              <input
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                placeholder="Icon"
                className="rounded border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              placeholder="Description"
              className="w-full rounded border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="rounded bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving…' : 'Save Track'}
              </button>
              <button
                type="button"
                onClick={() => { setEditTitle(course.title); setEditDesc(course.description); setEditIcon(course.icon); setEditingTrack(false); }}
                className="rounded border border-navy-600 px-4 py-2 text-xs font-mono text-navy-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-700 text-base">
                  {course.icon}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-white">
                    <span className="text-navy-500 font-mono mr-1">T{course.trackNumber}</span>
                    {course.title}
                  </h2>
                  <p className="truncate text-xs font-mono text-navy-500">/{course.slug}</p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-navy-300">{course.description}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-mono text-navy-400">
                <span>{course.moduleCount} modules</span>
                <span>{course.contentCount} content</span>
                <span>{course.activeEnrollmentCount} enrolled</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`bbt-chip px-2.5 py-1 text-xs ${
                course.status === 'PUBLISHED' ? 'bg-green-900/40 text-green-300' : 'bg-yellow-900/40 text-yellow-300'
              }`}>
                {course.status}
              </span>
              <button
                type="button"
                onClick={() => setEditingTrack(true)}
                className="bbt-button-secondary px-3 py-2 text-xs"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="bbt-button-secondary px-3 py-2 text-xs"
              >
                {expanded ? 'Collapse' : 'Modules'}
              </button>
              <button
                type="button"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="bbt-button-secondary px-3 py-2 text-xs disabled:opacity-50"
              >
                {course.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          </div>
        )}
      </div>

      {expanded && !editingTrack && (
        <div className="border-t border-navy-700 px-4 pb-4">
          <ModulePanel token={token} course={course} />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCoursesPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📚');
  const [formError, setFormError] = useState('');

  const { data: courses = [], isLoading, isError } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => adminApi.getCourses(accessToken!),
    enabled: !!accessToken,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createCourse(accessToken!, {
      title,
      slug: slug || slugify(title),
      description,
      icon,
      isActive: false,
    }),
    onSuccess: () => {
      setTitle(''); setSlug(''); setDescription(''); setIcon('📚'); setFormError('');
      void qc.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: () => setFormError('Could not create track. Check the slug is unique.'),
  });

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (title.trim().length < 3 || description.trim().length < 8) {
      setFormError('Track title (3+ chars) and description (8+ chars) are required.');
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <p className="bbt-kicker">Admin LMS</p>
        <h1 className="font-display text-2xl text-white">Tracks &amp; Modules</h1>
        <p className="mt-1 text-sm text-navy-400">
          Create tracks, add and reorder modules, manage concepts, then publish when ready.
          Use <span className="font-mono text-orange-400">▲▼</span> on any module to reorder. Click <span className="font-mono text-indigo-400">Edit</span> to update titles and descriptions.
        </p>
      </div>

      {/* Create track form */}
      <form onSubmit={submit} className="bbt-card p-4 space-y-4" noValidate>
        <p className="text-xs font-mono uppercase tracking-wider text-orange-400">New Track</p>
        <div className="grid gap-3 md:grid-cols-[1fr_200px_80px]">
          <div>
            <label htmlFor="course-title" className="mb-1 block text-xs font-mono text-navy-400">Title *</label>
            <input
              id="course-title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
              className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
              placeholder="AI Product Engineering"
            />
          </div>
          <div>
            <label htmlFor="course-slug" className="mb-1 block text-xs font-mono text-navy-400">Slug (URL)</label>
            <input
              id="course-slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
              placeholder="ai-product-engineering"
            />
          </div>
          <div>
            <label htmlFor="course-icon" className="mb-1 block text-xs font-mono text-navy-400">Icon</label>
            <input
              id="course-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
              placeholder="🤖"
            />
          </div>
        </div>
        <div>
          <label htmlFor="course-description" className="mb-1 block text-xs font-mono text-navy-400">Description *</label>
          <textarea
            id="course-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
            placeholder="What learners will build and the outcomes this track unlocks."
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-red-400">{formError}</p>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bbt-button-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Draft Track'}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-navy-800 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-red-400">Could not load tracks. Is the API running?</p>
      ) : courses.length === 0 ? (
        <div className="bbt-card p-8 text-center">
          <p className="text-navy-400 text-sm">No tracks yet. Create the first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.sort((a, b) => a.trackNumber - b.trackNumber).map((c) => (
            <CourseRow key={c.id} course={c} token={accessToken!} />
          ))}
        </div>
      )}
    </div>
  );
}
