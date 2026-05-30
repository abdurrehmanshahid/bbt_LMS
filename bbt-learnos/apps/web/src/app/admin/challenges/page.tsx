'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { adminApi, type ChallengeLaunchResult } from '@/lib/admin';
import { useAuthStore } from '@/lib/store';

export default function AdminChallengesPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const [title, setTitle] = useState('');
  const [hashtag, setHashtag] = useState('');
  const [description, setDescription] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [result, setResult] = useState<ChallengeLaunchResult | null>(null);

  const launchMutation = useMutation({
    mutationFn: () => adminApi.launchChallenge(accessToken!, {
      title,
      hashtag,
      description,
      ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
      isPinned: true,
    }),
    onSuccess: (created) => {
      setResult(created);
      setTitle('');
      setHashtag('');
      setDescription('');
      setEndsAt('');
    },
  });

  return (
    <div className="max-w-3xl p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-mono uppercase tracking-wider text-orange-400">Hashtags</p>
        <h1 className="font-display text-3xl text-white">Launch Challenge</h1>
        <p className="mt-2 text-sm text-navy-300">
          Pin one active hashtag challenge to the top of the shorts feed.
        </p>
      </div>

      <form
        className="space-y-5 rounded-lg border border-navy-700 bg-navy-900 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (accessToken) launchMutation.mutate();
        }}
      >
        {launchMutation.error ? (
          <div role="alert" className="rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-300">
            {launchMutation.error instanceof Error ? launchMutation.error.message : 'Could not launch challenge.'}
          </div>
        ) : null}

        {result ? (
          <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
            Pinned #{result.tag.name} to shorts as "{result.title}".
          </div>
        ) : null}

        <div>
          <label htmlFor="title" className="mb-1.5 block text-xs font-mono text-navy-300">Challenge title</label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Build an AI helper in 60 seconds"
            required
            minLength={3}
          />
        </div>

        <div>
          <label htmlFor="hashtag" className="mb-1.5 block text-xs font-mono text-navy-300">Hashtag</label>
          <input
            id="hashtag"
            value={hashtag}
            onChange={(event) => setHashtag(event.target.value)}
            className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="#AIHelperChallenge"
            required
            minLength={2}
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-xs font-mono text-navy-300">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Prompt creators to post a short, practical skill reel around this challenge."
          />
        </div>

        <div>
          <label htmlFor="endsAt" className="mb-1.5 block text-xs font-mono text-navy-300">End date</label>
          <input
            id="endsAt"
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <button
          type="submit"
          disabled={!accessToken || launchMutation.isPending}
          className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {launchMutation.isPending ? 'Launching...' : 'Launch and pin challenge'}
        </button>
      </form>
    </div>
  );
}
