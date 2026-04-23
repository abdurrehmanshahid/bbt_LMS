'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export interface VideoPlayerProps {
  /** Mux playback ID */
  playbackId: string;
  /** Signed token for protected content (undefined for public previews) */
  signedToken?: string;
  /** Called when the video completes 90% of its duration */
  onComplete?: () => void;
  /** Called on play/pause/seek/speed/quality/completed for analytics */
  onEvent?: (event: string, payload?: Record<string, unknown>) => void;
  title?: string;
  autoPlay?: boolean;
}

type PlayerState = 'idle' | 'playing' | 'paused' | 'ended';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

export function VideoPlayer({
  playbackId,
  signedToken,
  onComplete,
  onEvent,
  title,
  autoPlay = false,
}: VideoPlayerProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setPlayerState] = useState<PlayerState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [completedFired, setCompletedFired] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hlsRef = useRef<unknown>(null);

  const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8${signedToken ? `?token=${signedToken}` : ''}`;

  useEffect(() => {
    if (!videoRef.current) return;

    let destroyed = false;

    async function initHls(): Promise<void> {
      const el = videoRef.current;
      if (!el) return;
      const { default: Hls } = await import('hls.js' as string) as { default: { isSupported(): boolean; new(): { loadSource(u: string): void; attachMedia(v: HTMLVideoElement): void; destroy(): void } } };
      if (destroyed) return;

      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(el);
        if (autoPlay) void el.play();
      } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = hlsUrl;
        if (autoPlay) void el.play();
      }
    }

    void initHls();

    return () => {
      destroyed = true;
      if (hlsRef.current) {
        (hlsRef.current as { destroy(): void }).destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, autoPlay]);

  const emit = useCallback((event: string, payload?: Record<string, unknown>): void => {
    onEvent?.(event, payload);
  }, [onEvent]);

  const handleTimeUpdate = useCallback((): void => {
    const video = videoRef.current;
    if (!video) return;
    const ct = video.currentTime;
    const dur = video.duration;
    setCurrentTime(ct);
    if (dur > 0 && ct / dur >= 0.9 && !completedFired) {
      setCompletedFired(true);
      onComplete?.();
      emit('completed', { percent: 90 });
    }
  }, [completedFired, onComplete, emit]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => { setPlayerState('playing'); emit('play', { currentTime: video.currentTime }); };
    const onPause = () => { setPlayerState('paused'); emit('pause', { currentTime: video.currentTime }); };
    const onEnded = () => { setPlayerState('ended'); emit('completed', { percent: 100 }); };
    const onDuration = () => { setDuration(video.duration); };
    const onSeeked = () => emit('seek', { currentTime: video.currentTime });

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [handleTimeUpdate, emit]);

  function togglePlay(): void {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  function seek(value: number): void {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  }

  function changeVolume(value: number): void {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    setVolume(value);
    setMuted(value === 0);
  }

  function toggleMute(): void {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function changeSpeed(s: typeof SPEEDS[number]): void {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = s;
    setSpeed(s);
    emit('speed_change', { speed: s });
  }

  function toggleFullscreen(): void {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) void container.requestFullscreen();
    else void document.exitFullscreen();
  }

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function resetControlsTimer(): void {
    clearTimeout(controlsTimerRef.current);
    setShowControls(true);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full max-w-3xl mx-auto bg-black rounded-2xl overflow-hidden group select-none"
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={resetControlsTimer}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        playsInline
        aria-label={title ?? 'Video player'}
        onClick={togglePlay}
      />

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showControls || state !== 'playing' ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden={state === 'playing' && !showControls}
      >
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* Bottom controls */}
        <div className="relative p-3 space-y-2">
          {/* Progress scrubber */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/20 accent-orange-500 cursor-pointer"
            aria-label="Video progress"
          />

          <div className="flex items-center gap-3">
            {/* Play/pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="text-white hover:text-orange-400 transition-colors shrink-0"
              aria-label={state === 'playing' ? 'Pause' : 'Play'}
            >
              {state === 'playing' ? (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <button
              type="button"
              onClick={toggleMute}
              className="text-white hover:text-orange-400 transition-colors shrink-0"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted || volume === 0 ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                  <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="w-16 h-1 rounded-full appearance-none bg-white/20 accent-orange-500 cursor-pointer"
              aria-label="Volume"
            />

            {/* Time */}
            <span className="text-xs font-mono text-white/80 shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Progress percent */}
            <span className="text-xs font-mono text-orange-400 shrink-0">
              {Math.round(progressPercent)}%
            </span>

            {/* Speed */}
            <div className="relative ml-auto group/speed">
              <button
                type="button"
                className="text-xs font-mono text-white/80 hover:text-white px-2 py-0.5 rounded border border-white/20 hover:border-white/40 transition-colors"
                aria-label="Playback speed"
              >
                {speed}×
              </button>
              <div className="absolute bottom-8 right-0 hidden group-focus-within/speed:flex group-hover/speed:flex flex-col bg-navy-900 border border-navy-700 rounded-lg overflow-hidden shadow-xl z-10">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeSpeed(s)}
                    className={`px-4 py-1.5 text-xs font-mono text-left hover:bg-navy-700 transition-colors ${s === speed ? 'text-orange-400' : 'text-white'}`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-white hover:text-orange-400 transition-colors shrink-0"
              aria-label="Toggle fullscreen"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* BBT badge — no competitor branding */}
      <div className="absolute top-3 right-3 opacity-60 pointer-events-none" aria-hidden="true">
        <span className="text-xs font-mono text-white/60 bg-black/40 px-2 py-0.5 rounded">BBT</span>
      </div>
    </div>
  );
}
