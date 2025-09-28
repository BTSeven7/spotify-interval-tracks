import { useCallback, useEffect, useState } from 'react'

import IntervalBuilder from './components/IntervalBuilder'
import { useAuth } from './context/AuthContext'
import { useCurrentlyPlaying } from './hooks/useCurrentlyPlaying'
import { useIntervalPlan } from './hooks/useIntervalPlan'
import { useIntervalSession } from './hooks/useIntervalSession'
import { useScreenWakeLock } from './hooks/useScreenWakeLock'
import { beginSpotifyAuth } from './lib/spotifyAuth'

type Mode = 'interval-slicer' | 'song-counter'

const modeOptions: Array<{ id: Mode; label: string }> = [
  { id: 'song-counter', label: 'Song Counter' },
  { id: 'interval-slicer', label: 'Interval Slicer' }
]

function App() {
  const { tokens, isReady } = useAuth()
  const { track, error: trackError, isLoading: isTrackLoading } = useCurrentlyPlaying(tokens)
  const [activeMode, setActiveMode] = useState<Mode>('interval-slicer')
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const intervalPlan = useIntervalPlan()
  const intervalSession = useIntervalSession(tokens, intervalPlan.stats)
  const wakeLock = useScreenWakeLock()

  const isConnected = Boolean(tokens)

  useEffect(() => {
    if (isConnected) {
      setIsAuthorizing(false)
      setAuthError(null)
    }
  }, [isConnected])

  const handleConnect = useCallback(async () => {
    if (isConnected) {
      return
    }

    try {
      setAuthError(null)
      setIsAuthorizing(true)
      await beginSpotifyAuth()
    } catch (error) {
      console.error(error)
      setIsAuthorizing(false)
      setAuthError(error instanceof Error ? error.message : 'Failed to start Spotify login. Please try again.')
    }
  }, [isConnected])

  const connectIndicatorClass = isConnected
    ? 'bg-emerald-400'
    : isAuthorizing
      ? 'animate-pulse bg-emerald-200'
      : 'bg-emerald-400/80'

  const connectLabel = isConnected
    ? 'Spotify Connected'
    : isAuthorizing
      ? 'Opening Spotify...'
      : 'Connect Spotify'

  const wakeLockButtonLabel = !wakeLock.isSupported
    ? 'Unavailable'
    : wakeLock.isActive
      ? wakeLock.isRequesting
        ? 'Refreshing...'
        : 'Screen on'
      : wakeLock.isRequesting
        ? 'Activating...'
        : 'Keep screen on'

  // const wakeLockHelperText = !wakeLock.isSupported
  //   ? 'Use display settings to keep the screen awake.'
  //   : wakeLock.isActive
  //     ? 'Screen stay-awake is active for this session.'
  //     : 'Prevent auto-lock while you ride.'

  const sessionStatusLabel = {
    idle: 'Ready',
    running: 'In progress',
    completed: 'Completed'
  }[intervalSession.state.status]

  const totalSlices = intervalPlan.stats.timeline.length
  const currentSliceNumber = totalSlices === 0
    ? 0
    : Math.min(intervalSession.currentSliceIndex + 1, totalSlices)
  const sliceDisplay = currentSliceNumber === 0 ? '-' : `${currentSliceNumber}`
  const canStartSession = intervalSession.canStart && isConnected
  const canShowStats = isConnected && totalSlices > 0

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="text-sm text-slate-400">Resuming your Spotify session, hang tight...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-10">
        <header className="flex flex-col gap-3 rounded-3xl border border-slate-800/70 bg-slate-950/60 p-4 shadow-[0_0_60px_rgba(16,185,129,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <h1 className="text-2xl font-semibold sm:text-3xl">Spotify Interval Tracks</h1>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={handleConnect}
              disabled={isAuthorizing || isConnected}
              className="group relative inline-flex items-center gap-2 self-start rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                className={`h-2 w-2 rounded-full transition ${connectIndicatorClass}`}
                aria-hidden
              />
              {connectLabel}
            </button>
            {authError && <p className="text-xs text-rose-300">{authError}</p>}
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <article className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Choose mode</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {modeOptions.map((mode) => {
                  const selected = activeMode === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setActiveMode(mode.id)}
                      aria-pressed={selected}
                      className={`rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${selected ? 'border-emerald-400/80 bg-emerald-500/10 text-white' : 'border-slate-800/70 bg-slate-900/70 text-slate-200 hover:border-emerald-400/60 hover:text-white'}`}
                    >
                      <h3 className="text-xl font-semibold">{mode.label}</h3>
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 space-y-2 rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {/* <div>
                    <p className="text-sm font-semibold text-white">Keep screen awake</p>
                    <p className="text-xs text-slate-400">{wakeLockHelperText}</p>
                  </div> */}
                  <button
                    type="button"
                    onClick={() => void wakeLock.toggle()}
                    disabled={!wakeLock.isSupported || wakeLock.isRequesting}
                    className={`w-full rounded-full border px-4 py-2 text-lg font-semibold uppercase tracking-wide transition sm:w-auto ${wakeLock.isActive ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-200'} ${(!wakeLock.isSupported || wakeLock.isRequesting) ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    {wakeLockButtonLabel}
                  </button>
                </div>
                {wakeLock.error && (
                  <p className="text-xs text-rose-300">{wakeLock.error}</p>
                )}
              </div>
            </article>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Interval plan</h2>
              <IntervalBuilder {...intervalPlan} />
            </section>

            <article className="space-y-4 rounded-3xl p-0">
              {intervalSession.state.status === 'running' ? (
                <button
                  type="button"
                  onClick={intervalSession.stopSession}
                  className="h-12 w-full rounded-full border border-rose-400/60 bg-rose-500/15 text-2xl font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-300 hover:bg-rose-500/25"
                >
                  Stop session
                </button>
              ) : (
                <button
                  type="button"
                  onClick={intervalSession.startSession}
                  disabled={!canStartSession}
                  className={`h-12 w-full rounded-full border text-2xl font-semibold uppercase tracking-wide transition ${canStartSession ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:border-emerald-300 hover:bg-emerald-500/25' : 'border-slate-800 bg-slate-900 text-slate-500'}`}
                >
                  Start session
                </button>
              )}

              {canShowStats ? (
                <ul className="space-y-3 text-xl text-slate-300">
                  <li className="flex items-center justify-between">
                    <span>Status</span>
                    <span>{sessionStatusLabel}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Slice</span>
                    <span>{sliceDisplay}</span>
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Connect Spotify and set an interval to enable playback cues.</p>
              )}
            </article>
          </div>

          <aside className="space-y-6">
            <article className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-7">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Now playing</h2>
                <span className="text-xs uppercase tracking-wide text-slate-500">Live beta</span>
              </div>
              {!isConnected ? (
                <p className="text-sm text-slate-400">Connect Spotify to surface the current track from your active device.</p>
              ) : trackError ? (
                <p className="text-sm text-rose-300">{trackError}</p>
              ) : track ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {track.albumArtUrl ? (
                      <img
                        src={track.albumArtUrl}
                        alt="Album artwork"
                        className="h-16 w-16 rounded-xl object-cover shadow-lg shadow-emerald-500/10"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl border border-slate-700 bg-slate-900/80" />
                    )}
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-white">{track.trackName}</p>
                      <p className="text-sm text-slate-300">{track.artistNames}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{track.albumName}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-slate-400">
                    <p>{track.isPlaying ? 'Playing now' : 'Paused'}</p>
                    <p>
                      {formatProgress(track.progressMs)} / {formatProgress(track.durationMs)}
                    </p>
                    <p className="text-slate-600">Last updated {timeAgo(track.updatedAt)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No track detected right now. Press play in Spotify on any device linked to this account.
                </p>
              )}
              {isConnected && isTrackLoading && !track && !trackError && (
                <p className="text-xs text-slate-500">Checking your playback state.</p>
              )}
            </article>
          </aside>
        </main>
      </div>
    </div>
  )
}

function formatProgress(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function timeAgo(timestamp: number) {
  const delta = Date.now() - timestamp

  if (delta < 15_000) {
    return 'just now'
  }

  if (delta < 60_000) {
    const seconds = Math.round(delta / 1000)
    return `${seconds}s ago`
  }

  const minutes = Math.round(delta / 60000)
  return `${minutes}m ago`
}

export default App
