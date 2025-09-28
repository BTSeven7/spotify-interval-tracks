import type { AuthTokens } from '../context/AuthContext'
import type { CurrentTrack } from '../hooks/useCurrentlyPlaying'
import { useSongCounterSession } from '../hooks/useSongCounterSession'

function formatDuration(ms: number | null) {
  if (ms === null || Number.isNaN(ms)) {
    return '--:--'
  }

  const safeMs = Math.max(0, ms)
  const totalSeconds = Math.floor(safeMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

type SongCounterPanelProps = {
  tokens: AuthTokens | null
  track: CurrentTrack | null
  trackError: string | null
  isTrackLoading: boolean
}

export default function SongCounterPanel({ tokens, track, trackError, isTrackLoading }: SongCounterPanelProps) {
  const session = useSongCounterSession(tokens, track)

  const startLabel = session.status === 'running' ? 'Stop counter' : 'Start counter'
  const startAction = session.status === 'running' ? session.stop : session.start
  const startDisabled = session.isBusy ? true : session.status === 'running' ? false : !session.canStart

  const skipDisabled = session.status !== 'running' || session.isBusy

  const statusMessage = (() => {
    if (!tokens?.accessToken) {
      return 'Connect Spotify to use the song counter.'
    }

    if (trackError) {
      return trackError
    }

    if (session.status === 'idle' && !session.canStart) {
      if (isTrackLoading) {
        return 'Checking your Spotify playback...'
      }
      if (!track) {
        return 'Press play in Spotify to begin counting.'
      }
      if (track && !track.isPlaying) {
        return 'Start playback in Spotify to enable the counter.'
      }
    }

    if (session.isWaitingForPlayback) {
      return 'Waiting for Spotify to resume playback.'
    }

    return null
  })()

  return (
    <article className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Song counter</h2>
          {track && (
            <p className="text-xs text-slate-400">
              {track.trackName} - {track.artistNames}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={startAction}
          disabled={startDisabled}
          className={`w-full rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition sm:w-auto ${
            session.status === 'running'
              ? 'border-rose-400/60 bg-rose-500/15 text-rose-200 hover:border-rose-300 hover:bg-rose-500/25'
              : startDisabled
                ? 'border border-slate-800 bg-slate-900 text-slate-500'
                : 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:border-emerald-300 hover:bg-emerald-500/25'
          } ${session.isBusy ? 'cursor-wait opacity-80' : ''}`}
        >
          {startLabel}
        </button>
      </header>

      {session.error && (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {session.error}
        </p>
      )}

      {statusMessage && !session.error && (
        <p className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
          {statusMessage}
        </p>
      )}

      <div className="space-y-3 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
          <div>
            <p className="text-lg uppercase tracking-wide text-slate-500">Remaining (current)</p>
            <p className="text-2xl font-semibold text-white">{formatDuration(session.remainingMs)}</p>
          </div>
          <div>
            <p className="text-lg uppercase tracking-wide text-slate-500">After song</p>
            <p className="text-2xl font-semibold text-white">{formatDuration(session.afterSongMs)}</p>
          </div>
          <div>
            <p className="text-lg uppercase tracking-wide text-slate-500">Songs completed</p>
            <p className="text-2xl font-semibold text-white">{session.songsCompleted}</p>
          </div>
          <div>
            <p className="text-lg uppercase tracking-wide text-slate-500">Total time</p>
            <p className="text-2xl font-semibold text-white">{formatDuration(session.totalElapsedMs)}</p>
          </div>
        </div>
        {session.lastSong && (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
            <p className="font-semibold text-slate-200">Last song</p>
            <p>{session.lastSong.trackName}</p>
            <p>{formatDuration(session.lastSong.durationMs)}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => void session.skip()}
          disabled={skipDisabled}
          className={`w-full rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition sm:w-auto ${
            skipDisabled
              ? 'border border-slate-800 bg-slate-900 text-slate-500'
              : 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:border-emerald-300 hover:bg-emerald-500/25'
          } ${session.isBusy ? 'cursor-wait opacity-80' : ''}`}
        >
          Next track
        </button>
        {session.currentElapsedMs !== null && (
          <p className="text-xs text-slate-500">
            Current song time counted: {formatDuration(session.currentElapsedMs)}
          </p>
        )}
      </div>
    </article>
  )
}

