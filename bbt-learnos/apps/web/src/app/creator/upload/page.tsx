'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { getHashtagSuggestions, getTracks, getTrackModules, getModuleConcepts } from '@/lib/api';
import { creatorApi, type ContentType } from '@/lib/creator';
import { useAuthStore } from '@/lib/store';

const MAX_LONG_BYTES = 3 * 1024 * 1024 * 1024;
const MAX_REEL_BYTES = 250 * 1024 * 1024;
const MAX_REEL_SECONDS = 60;

const uploadSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  trackId: z.string().min(1, 'Select a track'),
  description: z.string().max(1000, 'Max 1000 characters').optional(),
  type: z.enum(['REEL', 'LECTURE', 'LIVE_RECORDING', 'RESOURCE']),
  tags: z.string().max(160, 'Too many hashtags').optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;
type UploadMode = 'quick' | 'full';
type Phase = 'form' | 'uploading' | 'success';

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function parseTags(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[,\s]+/)
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 8);
}

function fallbackTagsForTitle(title: string | undefined): string[] {
  const text = (title ?? '').toLowerCase();
  if (text.includes('genai') || text.includes('agent')) return ['GenAI', 'AgenticAI', 'PromptEngineering'];
  if (text.includes('cloud') || text.includes('mlops')) return ['Cloud', 'MLOps', 'AWS'];
  if (text.includes('cyber')) return ['CyberSecurity', 'SOC', 'EthicalHacking'];
  if (text.includes('design')) return ['UIUX', 'DesignSystems', 'BrandDesign'];
  return ['BBTLearnOS', 'CareerOS', 'SkillReel'];
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video duration'));
    };
    video.src = url;
  });
}

export default function UploadPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<UploadMode>('quick');
  const [phase, setPhase] = useState<Phase>('form');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { type: 'REEL', description: '', tags: '' },
  });

  const selectedTrackId = watch('trackId');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedConceptId, setSelectedConceptId] = useState<string>('');

  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ['creator-upload-tracks'],
    queryFn: getTracks,
    staleTime: 5 * 60_000,
  });

  const { data: trackModules = [] } = useQuery({
    queryKey: ['creator-track-modules', selectedTrackId],
    queryFn: () => getTrackModules(selectedTrackId),
    enabled: !!selectedTrackId,
    staleTime: 2 * 60_000,
  });

  const { data: moduleConcepts = [] } = useQuery({
    queryKey: ['creator-module-concepts', selectedTrackId, selectedModuleId],
    queryFn: () => getModuleConcepts(selectedTrackId, selectedModuleId),
    enabled: !!selectedTrackId && !!selectedModuleId,
    staleTime: 2 * 60_000,
  });

  const fallbackSuggestedTags = useMemo(
    () => fallbackTagsForTitle(tracks.find((track) => track.id === selectedTrackId)?.title),
    [selectedTrackId, tracks],
  );
  const { data: apiSuggestions } = useQuery({
    queryKey: ['creator-hashtag-suggestions', selectedTrackId],
    queryFn: () => getHashtagSuggestions(selectedTrackId, accessToken!),
    enabled: !!accessToken && !!selectedTrackId,
    staleTime: 5 * 60_000,
  });
  const suggestedTags = apiSuggestions?.tags.length ? apiSuggestions.tags : fallbackSuggestedTags;

  function setUploadMode(nextMode: UploadMode): void {
    setMode(nextMode);
    setValue('type', nextMode === 'quick' ? 'REEL' : 'LECTURE');
    setError(null);
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null);
    setError(null);
  }

  async function uploadToMux(uploadUrl: string, selectedFile: File): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      });
      xhr.addEventListener('error', () => reject(new Error('Network error while uploading')));
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', selectedFile.type);
      xhr.send(selectedFile);
    });
  }

  async function onSubmit(data: UploadFormData): Promise<void> {
    if (!accessToken) {
      setError('You need to sign in as a creator before uploading.');
      return;
    }
    if (!file) {
      setError('Choose a video file first.');
      return;
    }
    if (!file.type.startsWith('video/')) {
      setError('Only video files are accepted.');
      return;
    }

    setError(null);

    try {
      const duration = Math.ceil(await getVideoDuration(file));
      const maxBytes = mode === 'quick' ? MAX_REEL_BYTES : MAX_LONG_BYTES;

      if (file.size > maxBytes) {
        setError(`File too large. Max ${formatBytes(maxBytes)}. Yours: ${formatBytes(file.size)}.`);
        return;
      }
      if (mode === 'quick' && duration > MAX_REEL_SECONDS) {
        setError(`Quick Reels must be ${MAX_REEL_SECONDS} seconds or shorter. Yours is ${duration} seconds.`);
        return;
      }

      setPhase('uploading');
      setProgress(0);

      const response = await creatorApi.createUpload(accessToken, {
        title: data.title,
        ...(data.description ? { description: data.description } : {}),
        trackId: data.trackId,
        ...(selectedModuleId ? { moduleId: selectedModuleId } : {}),
        ...(selectedConceptId ? { conceptId: selectedConceptId } : {}),
        type: (mode === 'quick' ? 'REEL' : data.type) as ContentType,
        tags: parseTags(data.tags),
        quickReel: mode === 'quick',
        durationSeconds: duration,
      });

      await uploadToMux(response.uploadUrl, file);
      setProgress(100);
      setPhase('success');
    } catch (err) {
      setPhase('form');
      setError(err instanceof Error ? err.message : 'Could not upload content. Please try again.');
    }
  }

  return (
    <div className="max-w-3xl p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-orange-400">Creator Studio</p>
          <h1 className="font-display text-3xl text-white">Post Content</h1>
        </div>
        <Link href="/creator/dashboard" className="text-sm font-mono text-navy-300 hover:text-white">
          Dashboard
        </Link>
      </div>

      {phase === 'form' ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-navy-700 bg-navy-900 p-1">
            <button
              type="button"
              onClick={() => setUploadMode('quick')}
              className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${mode === 'quick' ? 'bg-orange-500 text-white' : 'text-navy-300 hover:bg-navy-800'}`}
            >
              Quick Reel
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('full')}
              className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${mode === 'full' ? 'bg-orange-500 text-white' : 'text-navy-300 hover:bg-navy-800'}`}
            >
              Full Upload
            </button>
          </div>

          {error ? (
            <div role="alert" className="rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <div
            className="rounded-2xl border-2 border-dashed border-navy-600 bg-navy-900 p-8 text-center hover:border-orange-500"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
            }}
            aria-label="Choose video file"
          >
            <input ref={fileInputRef} type="file" accept="video/*" className="sr-only" onChange={onFileChange} />
            <p className="font-semibold text-white">{file ? file.name : mode === 'quick' ? 'Tap to record or upload a reel' : 'Drop in a lecture or recording'}</p>
            <p className="mt-1 text-xs text-navy-400">
              {file ? formatBytes(file.size) : mode === 'quick' ? 'Video only, 60 seconds max' : 'Video only, up to 3 GB'}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="title" className="mb-1.5 block text-xs font-mono text-navy-300">Title</label>
              <input
                id="title"
                className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={mode === 'quick' ? '60-sec lesson hook' : 'Introduction to Neural Networks'}
                {...register('title')}
              />
              {errors.title ? <p className="mt-1 text-xs text-red-400">{errors.title.message}</p> : null}
            </div>

            <div>
              <label htmlFor="trackId" className="mb-1.5 block text-xs font-mono text-navy-300">Track</label>
              <select
                id="trackId"
                className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                {...register('trackId', { onChange: () => { setSelectedModuleId(''); setSelectedConceptId(''); } })}
              >
                <option value="">Select track</option>
                {tracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}
              </select>
              {tracksLoading ? <p className="mt-1 text-xs text-navy-500">Loading tracks...</p> : null}
              {errors.trackId ? <p className="mt-1 text-xs text-red-400">{errors.trackId.message}</p> : null}
            </div>

            {selectedTrackId && trackModules.length > 0 ? (
              <div>
                <label htmlFor="moduleId" className="mb-1.5 block text-xs font-mono text-navy-300">
                  Module <span className="text-navy-500">(optional)</span>
                </label>
                <select
                  id="moduleId"
                  value={selectedModuleId}
                  onChange={(e) => { setSelectedModuleId(e.target.value); setSelectedConceptId(''); }}
                  className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All modules</option>
                  {trackModules.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {selectedModuleId && moduleConcepts.length > 0 ? (
              <div>
                <label htmlFor="conceptId" className="mb-1.5 block text-xs font-mono text-navy-300">
                  Concept <span className="text-navy-500">(optional)</span>
                </label>
                <select
                  id="conceptId"
                  value={selectedConceptId}
                  onChange={(e) => setSelectedConceptId(e.target.value)}
                  className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All concepts</option>
                  {moduleConcepts.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {mode === 'full' ? (
              <div>
                <label htmlFor="type" className="mb-1.5 block text-xs font-mono text-navy-300">Type</label>
                <select
                  id="type"
                  className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  {...register('type')}
                >
                  <option value="LECTURE">Lecture</option>
                  <option value="LIVE_RECORDING">Live Recording</option>
                  <option value="RESOURCE">Resource</option>
                  <option value="REEL">Reel</option>
                </select>
              </div>
            ) : null}

            <div className="sm:col-span-2">
              <label htmlFor="tags" className="mb-1.5 block text-xs font-mono text-navy-300">Hashtags</label>
              <input
                id="tags"
                className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={suggestedTags.map((tag) => `#${tag}`).join(' ')}
                {...register('tags')}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setValue('tags', suggestedTags.map((item) => `#${item}`).join(' '))}
                    className="rounded-full bg-navy-800 px-3 py-1 text-xs font-mono text-orange-300 hover:bg-navy-700"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="description" className="mb-1.5 block text-xs font-mono text-navy-300">Caption</label>
              <textarea
                id="description"
                rows={4}
                className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={mode === 'quick' ? 'One sentence that tells learners what they will unlock.' : 'What will learners gain from this video?'}
                {...register('description')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Preparing upload...' : mode === 'quick' ? 'Post Reel' : 'Submit for Moderation'}
          </button>
        </form>
      ) : null}

      {phase === 'uploading' ? (
        <div className="rounded-2xl border border-navy-700 bg-navy-800 p-8">
          <p className="font-semibold text-white">Uploading to Mux</p>
          <p className="mt-1 text-xs text-navy-400">Keep this tab open until the upload finishes.</p>
          <div className="mt-5 flex justify-between text-xs font-mono text-navy-400">
            <span>{file?.name}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-700" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {phase === 'success' ? (
        <div className="rounded-2xl border border-navy-700 bg-navy-800 p-10 text-center">
          <h2 className="font-display text-3xl text-white">Uploaded</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-navy-300">
            Mux is processing the video. It will enter moderation as soon as the asset is ready.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/creator/dashboard" className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setPhase('form');
                setFile(null);
                setProgress(0);
              }}
              className="rounded-lg border border-navy-600 px-5 py-2.5 text-sm font-semibold text-white hover:border-navy-400"
            >
              Post another
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
