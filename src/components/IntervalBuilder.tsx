import type { IntervalPlanControls } from '../hooks/useIntervalPlan'
import { SLICE_OPTIONS_SECONDS } from '../hooks/useIntervalPlan'

function formatClock(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatSliceOption(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  if (minutes === 0) {
    return `${remainder}s`
  }
  if (remainder === 0) {
    return `${minutes}m`
  }
  return `${minutes}m ${remainder}s`
}

export default function IntervalBuilder({
  plan,
  stats,
  incrementMinutes,
  decrementMinutes,
  setIncludeThirtySeconds,
  selectSliceLength,
  resetPlan
}: IntervalPlanControls) {
  const remainderText = stats.remainderMs > 0 ? formatClock(stats.remainderMs) : 'n/a'

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <header className="flex justify-end">
          <button
            type="button"
            onClick={resetPlan}
            className="text-xl font-semibold uppercase tracking-wide text-emerald-300 transition hover:text-emerald-200"
          >
            Reset
          </button>
        </header>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={decrementMinutes}
            className="h-16 w-16 rounded-2xl border border-slate-700 bg-slate-950/80 text-2xl text-white transition hover:border-emerald-400 hover:text-emerald-300"
            aria-label="Decrease minutes"
          >
            -
          </button>
          <div className="flex flex-col items-center">
            <span className="text-5xl font-semibold text-white">{plan.totalMinutes}</span>
            <span className="text-sm uppercase tracking-wide text-slate-400">minutes</span>
          </div>
          <button
            type="button"
            onClick={incrementMinutes}
            className="h-16 w-16 rounded-2xl border border-slate-700 bg-slate-950/80 text-2xl text-white transition hover:border-emerald-400 hover:text-emerald-300"
            aria-label="Increase minutes"
          >
            +
          </button>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setIncludeThirtySeconds(false)}
            className={`rounded-full px-4 py-2 text-xl font-semibold uppercase tracking-wide transition ${
              !plan.includeThirtySeconds
                ? 'border border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                : 'border border-slate-700 bg-slate-950/70 text-slate-300 hover:border-emerald-400/50'
            }`}
          >
            +0s
          </button>
          <button
            type="button"
            onClick={() => setIncludeThirtySeconds(true)}
            className={`rounded-full px-4 py-2 text-xl font-semibold uppercase tracking-wide transition ${
              plan.includeThirtySeconds
                ? 'border border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                : 'border border-slate-700 bg-slate-950/70 text-slate-300 hover:border-emerald-400/50'
            }`}
          >
            +30s
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {SLICE_OPTIONS_SECONDS.map(option => {
            const isActive = plan.sliceLengthSeconds === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => selectSliceLength(option)}
                className={`rounded-full px-4 py-2 text-2xl font-semibold uppercase tracking-wide transition ${
                  isActive
                    ? 'border border-emerald-400/60 bg-emerald-500/10 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                    : 'border border-slate-700 bg-slate-950/70 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-200'
                }`}
              >
                {formatSliceOption(option)}
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-2 text-xl text-slate-300">
        <div className="flex items-center justify-between">
          <span>Full slices</span>
          <span>{stats.fullSlices}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Final slice</span>
          <span>{remainderText}</span>
        </div>
      </section>
    </div>
  )
}
