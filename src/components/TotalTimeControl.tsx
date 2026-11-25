type TotalTimeControlProps = {
  totalMinutes: number
  includeThirtySeconds: boolean
  incrementMinutes: () => void
  decrementMinutes: () => void
  setIncludeThirtySeconds: (value: boolean) => void
}

export default function TotalTimeControl({
  totalMinutes,
  includeThirtySeconds,
  incrementMinutes,
  decrementMinutes,
  setIncludeThirtySeconds
}: TotalTimeControlProps) {
  return (
    <>
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
          <span className="text-5xl font-semibold text-white">{totalMinutes}</span>
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
            !includeThirtySeconds
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
            includeThirtySeconds
              ? 'border border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
              : 'border border-slate-700 bg-slate-950/70 text-slate-300 hover:border-emerald-400/50'
          }`}
        >
          +30s
        </button>
      </div>
    </>
  )
}
