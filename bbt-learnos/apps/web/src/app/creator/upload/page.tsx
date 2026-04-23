'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/lib/store';
import { creatorApi } from '@/lib/creator';
import type { ContentType } from '@/lib/creator';

const MAX_BYTES = 3 * 1024 * 1024 * 1024; // 3 GB

const metaSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title too long'),
  trackId: z.string().min(1, 'Select a track'),
  type: z.enum(['REEL', 'LECTURE', 'LIVE_RECORDING', 'RESOURCE']),
  moduleId: z.string().optional(),
  description: z.string().max(1000, 'Max 1000 characters'),
});

type MetaFormData = z.infer<typeof metaSchema>;

type Phase = 'drop' | 'uploading' | 'metadata' | 'success';

const TRACKS = [
  { id: 't1', title: 'GenAI + Agentic AI' },
  { id: 't2', title: 'Cloud + MLOps' },
  { id: 't3', title: 'Odoo ERP Development' },
  { id: 't4', title: 'AI-Integrated Full Stack' },
  { id: 't5', title: 'Cybersecurity' },
  { id: 't6', title: 'UI/UX + Brand Design' },
  { id: 't7', title: 'AI Marketing + Sales' },
];

const TYPES: Array<{ value: ContentType; label: string; hint: string }> = [
  { value: 'REEL', label: 'Reel', hint: '≤ 3 min' },
  { value: 'LECTURE', label: 'Lecture', hint: '≤ 120 min' },
  { value: 'LIVE_RECORDING', label: 'Live Recording', hint: 'any length' },
  { value: 'RESOURCE', label: 'Resource', hint: 'non-video' },
];

function formatBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(0)} MB`;
  return `${(b / 1e3).toFixed(0)} KB`;
}

export default function UploadPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const [phase, setPhase] = useState<Phase>('drop');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [contentId, setContentId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isDragging = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MetaFormData>({
    resolver: zodResolver(metaSchema),
    defaultValues: { type: 'LECTURE', description: '' },
  });

  const descLen = watch('description')?.length ?? 0;

  function validateFile(f: File): string | null {
    if (!f.type.startsWith('video/')) return 'Only video files are accepted.';
    if (f.size > MAX_BYTES) return `File too large (max 3 GB). Yours: ${formatBytes(f.size)}`;
    return null;
  }

  const startUpload = useCallback(async (f: File): Promise<void> => {
    if (!accessToken) return;
    setFileError(null);
    const err = validateFile(f);
    if (err) { setFileError(err); return; }

    setFile(f);
    setPhase('uploading');
    setUploadProgress(0);

    try {
      const { contentId: cid, uploadUrl } = await creatorApi.initUpload(accessToken, f.name, f.size);
      setContentId(cid);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', f.type);
        xhr.send(f);
      });

      setUploadProgress(100);
      setPhase('metadata');
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'Upload failed');
      setPhase('drop');
    }
  }, [accessToken]);

  function onDrop(e: React.DragEvent): void {
    e.preventDefault();
    setDragOver(false);
    isDragging.current = false;
    const f = e.dataTransfer.files[0];
    if (f) void startUpload(f);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0];
    if (f) void startUpload(f);
  }

  async function onMetaSubmit(data: MetaFormData): Promise<void> {
    if (!accessToken || !contentId) return;
    setSubmitError(null);
    try {
      await creatorApi.submitMetadata(accessToken, contentId, {
        title: data.title,
        trackId: data.trackId,
        type: data.type as ContentType,
        ...(data.moduleId ? { moduleId: data.moduleId } : {}),
        conceptTags: [],
        description: data.description,
      });
      setPhase('success');
    } catch {
      setSubmitError('Could not submit content. Please try again.');
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <h1 className="font-display text-2xl text-white mb-6">Upload Content</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['drop', 'uploading', 'metadata', 'success'] as Phase[]).map((p, i) => {
          const labels = ['Select file', 'Uploading', 'Add details', 'Done'];
          const done = ['drop', 'uploading', 'metadata', 'success'].indexOf(phase) > i;
          const active = phase === p;
          return (
            <div key={p} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono transition-colors ${
                done ? 'bg-green-500 text-white' : active ? 'bg-orange-500 text-white' : 'bg-navy-700 text-navy-400'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-mono ${active ? 'text-white' : 'text-navy-500'}`}>{labels[i]}</span>
              {i < 3 && <div className="w-6 h-px bg-navy-700" />}
            </div>
          );
        })}
      </div>

      {/* Phase: drop */}
      {phase === 'drop' && (
        <div>
          {fileError && (
            <div role="alert" className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">{fileError}</div>
          )}
          <div
            className={`rounded-2xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-orange-500 bg-orange-500/5' : 'border-navy-600 hover:border-navy-500'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            aria-label="Upload video file"
          >
            <svg className="mx-auto h-12 w-12 text-navy-500 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-white font-semibold mb-1">Drop your video here</p>
            <p className="text-xs text-navy-400">or click to browse — max 3 GB, video files only</p>
            <input ref={fileInputRef} type="file" accept="video/*" className="sr-only" onChange={onFileChange} />
          </div>
        </div>
      )}

      {/* Phase: uploading */}
      {phase === 'uploading' && file && (
        <div className="rounded-2xl border border-navy-700 bg-navy-800 p-8 space-y-5">
          <div className="flex items-center gap-4">
            <svg className="h-10 w-10 text-orange-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{file.name}</p>
              <p className="text-xs text-navy-400 font-mono">{formatBytes(file.size)}</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-mono text-navy-400 mb-1.5">
              <span>Uploading to Mux…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-navy-700 overflow-hidden" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
          <p className="text-xs text-navy-500">Do not close this tab while uploading.</p>
        </div>
      )}

      {/* Phase: metadata */}
      {phase === 'metadata' && (
        <form onSubmit={handleSubmit(onMetaSubmit)} noValidate className="space-y-5">
          <div className="rounded-lg bg-green-900/20 border border-green-800 px-4 py-3 text-sm text-green-300">
            ✓ Video uploaded successfully — Mux is processing it. Add details below.
          </div>

          {submitError && (
            <div role="alert" className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">{submitError}</div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-xs font-mono text-navy-300 mb-1.5">Title <span className="text-red-400">*</span></label>
            <input
              id="title"
              type="text"
              className={`w-full rounded-lg border bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${errors.title ? 'border-red-500' : 'border-navy-600'}`}
              placeholder="Introduction to Neural Networks"
              {...register('title')}
            />
            {errors.title && <p role="alert" className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
          </div>

          {/* Track */}
          <div>
            <label htmlFor="trackId" className="block text-xs font-mono text-navy-300 mb-1.5">Track <span className="text-red-400">*</span></label>
            <select
              id="trackId"
              className={`w-full rounded-lg border bg-navy-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${errors.trackId ? 'border-red-500' : 'border-navy-600'}`}
              {...register('trackId')}
            >
              <option value="">Select track…</option>
              {TRACKS.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            {errors.trackId && <p role="alert" className="mt-1 text-xs text-red-400">{errors.trackId.message}</p>}
          </div>

          {/* Type */}
          <div>
            <p className="text-xs font-mono text-navy-300 mb-2">Content type <span className="text-red-400">*</span></p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TYPES.map((t) => (
                <label key={t.value} className="relative">
                  <input type="radio" value={t.value} className="sr-only peer" {...register('type')} />
                  <div className="peer-checked:border-orange-500 peer-checked:bg-orange-500/10 rounded-lg border border-navy-700 p-3 text-center cursor-pointer hover:border-navy-500 transition-colors">
                    <p className="text-sm font-semibold text-white">{t.label}</p>
                    <p className="text-xs text-navy-400 mt-0.5">{t.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs font-mono text-navy-300 mb-1.5">
              Description <span className="text-navy-500">({descLen}/1000)</span>
            </label>
            <textarea
              id="description"
              rows={4}
              className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y"
              placeholder="What will learners gain from this video?"
              {...register('description')}
            />
            {errors.description && <p role="alert" className="mt-1 text-xs text-red-400">{errors.description.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isSubmitting ? 'Submitting for review…' : 'Submit for moderation →'}
          </button>
        </form>
      )}

      {/* Phase: success */}
      {phase === 'success' && (
        <div className="rounded-2xl border border-navy-700 bg-navy-800 p-10 text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center">
            <svg className="h-8 w-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-2xl text-white">Content submitted!</h2>
            <p className="mt-2 text-sm text-navy-400">
              Your content is in the moderation queue. Tier 2/3 creators are typically reviewed within 24 hours.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/creator/dashboard" className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">
              Back to dashboard
            </Link>
            <button
              type="button"
              onClick={() => { setPhase('drop'); setFile(null); setContentId(null); setUploadProgress(0); }}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-navy-600 px-5 text-sm font-semibold text-white hover:border-navy-400 transition-colors"
            >
              Upload another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
