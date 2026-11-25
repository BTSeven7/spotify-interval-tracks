import { useEffect, useMemo, useState } from 'react'

import type { AuthTokens } from '../context/AuthContext'
import type { IntervalPlanControls } from '../hooks/useIntervalPlan'
import { type CueStyle, useCountdownSession } from '../hooks/useCountdownSession'
import { buildCountdownPlan, CLIP_LABELS } from '../lib/countdownPlan'
import TotalTimeControl from './TotalTimeControl'

const CUE_STYLE_KEY = 'workout-spotify:countdown-cue-style'

const cueStyleOptions: Array<{ id: CueStyle; label: string; hint: string }> = [
  { id: 'voice', label: 'Voice', hint: 'Coach calls each chunk, music keeps playing' },
  { id: 'skip', label: 'Track skips', hint: 'A new song marks each chunk' }
]

function loadCueStyle(): CueStyle {
  try {
    return window.localStorage.getItem(CUE_STYLE_KEY) === 'skip' ? 'skip' : 'voice'
  } catch {
    return 'voice'
  }
}

function formatClock(ms: number | null) {
  if (ms === null) return '--:--'
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

type CountdownSlicerPanelProps = {
  tokens: AuthTokens | null
  intervalPlan: IntervalPlanControls
}

export default function CountdownSlicerPanel({ tokens, intervalPlan }: CountdownSlicerPanelProps) {
  const { plan: timePlan } = intervalPlan
  const [cueStyle, setCueStyle] = useState<CueStyle>(() => loadCueStyle())

  useEffect(() => {
    try {
      window.localStorage.setItem(CUE_STYLE_KEY, cueStyle)
    } catch {
      // Storage unavailable (private mode); the choice just won't be remembered.
    }
  }, [cueStyle])

  const totalSec = timePlan.totalMinutes * 60 + (timePlan.includeThirtySeconds ? 30 : 0)
  const chunks = useMemo(() => buildCountdownPlan(totalSec), [totalSec])
  const session = useCountdownSession(tokens, chunks, cueStyle)

  const isConnected = Boolean(tokens?.accessToken)
  const isActive = session.phase === 'loading' || session.phase === 'countdown' || session.phase === 'running'
  const canStart = isConnected && chunks.length > 0

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Interval length</h2>
        <TotalTimeControl
          totalMinutes={timePlan.totalMinutes}
          includeThirtySeconds={timePlan.includeThirtySeconds}
          incrementMinutes={intervalPlan.incrementMinutes}
          decrementMinutes={intervalPlan.decrementMinutes}
          setIncludeThirtySeconds={intervalPlan.setIncludeThirtySeconds}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Cues</h2>
        <div className="grid grid-cols-2 gap-2">
          {cueStyleOptions.map(option => {
            const selected = cueStyle === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setCueStyle(option.id)}
                disabled={isActive}
                aria-pressed={selected}
                className={`rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? 'border-emerald-400/80 bg-emerald-500/10 text-white'
                    : 'border-slate-800/70 bg-slate-900/70 text-slate-300 hover:border-emerald-400/60'
                }`}
              >
                <span className="block text-xl font-semibold">{option.label}</span>
                <span className="block text-xs text-slate-400">{option.hint}</span>
              </button>
            )
          })}
        </div>
      </section>

      {isActive ? (
        <button
          type="button"
          onClick={session.stop}
          className="h-12 w-full rounded-full border border-rose-400/60 bg-rose-500/15 text-2xl font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-300 hover:bg-rose-500/25"
        >
          Stop
        </button>
      ) : (
        <button
          type="button"
          onClick={session.start}
          disabled={!canStart}
          className={`h-12 w-full rounded-full border text-2xl font-semibold uppercase tracking-wide transition ${
            canStart
              ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:border-emerald-300 hover:bg-emerald-500/25'
              : 'border-slate-800 bg-slate-900 text-slate-500'
          }`}
        >
          {session.phase === 'completed' ? 'Start again' : 'Start'}
        </button>
      )}

      {session.error && (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{session.error}</p>
      )}

      {session.soundBlocked && (
        <button
          type="button"
          onClick={session.restoreSound}
          className="w-full rounded-2xl border border-amber-400/60 bg-amber-500/15 px-4 py-3 text-xl font-semibold text-amber-200"
        >
          Sound paused by iPhone. Tap to turn cues back on.
        </button>
      )}

      {session.phase === 'loading' && <p className="text-center text-xl text-slate-400">Loading cues...</p>}

      {session.phase === 'countdown' && (
        <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/5 p-6 text-center">
          <p className="text-sm uppercase tracking-wide text-emerald-200">Get ready</p>
          <p className="text-8xl font-semibold tabular-nums text-white">{session.leadInSecondsLeft}</p>
        </div>
      )}

      {session.phase === 'running' && session.currentChunkIndex !== null && (
        <div className="grid grid-cols-2 gap-3 rounded-3xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="col-span-2 text-center">
            <p className="text-sm uppercase tracking-wide text-slate-400">
              Chunk {session.currentChunkIndex + 1} of {chunks.length}
            </p>
            <p className="text-7xl font-semibold tabular-nums text-white">{formatClock(session.chunkMsLeft)}</p>
          </div>
          <div className="col-span-2 flex items-center justify-between text-xl text-slate-300">
            <span>Interval left</span>
            <span className="tabular-nums">{formatClock(session.totalMsLeft)}</span>
          </div>
        </div>
      )}

      {session.phase === 'completed' && (
        <p className="text-center text-3xl font-semibold text-emerald-200">Done. Recover.</p>
      )}

      {!isConnected && <p className="text-sm text-slate-500">Connect Spotify to start a countdown.</p>}

      {chunks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Chunks</h2>
          <ol className="space-y-1 text-lg text-slate-300">
            {chunks.map(chunk => {
              const isCurrent = session.phase === 'running' && session.currentChunkIndex === chunk.index
              return (
                <li
                  key={chunk.index}
                  className={`flex items-center justify-between rounded-xl px-3 py-1 ${isCurrent ? 'bg-emerald-500/10 text-white' : ''}`}
                >
                  <span className="tabular-nums">{formatClock(chunk.durationSec * 1000)}</span>
                  <span className="text-sm text-slate-400">
                    {cueStyle === 'voice' ? CLIP_LABELS[chunk.endClip] : 'Skip'}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}
