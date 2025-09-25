import { useState } from 'react'

type Mode = 'interval-slicer' | 'song-counter'

const modes: Record<Mode, { title: string; description: string }> = {
  'interval-slicer': {
    title: 'Interval Slicer',
    description:
      'Define sub-intervals within a long effort and automatically skip to the next track when each slice finishes.'
  },
  'song-counter': {
    title: 'Song Counter',
    description:
      'Stay in the groove of your playlist and get a clear count of songs completed with total elapsed time markers.'
  }
}

function App() {
  const [activeMode, setActiveMode] = useState<Mode>('interval-slicer')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-emerald-400">
            Workout Spotify Companion
          </p>
          <h1 className="text-4xl font-semibold sm:text-5xl">
            Ride your intervals song by song without staring at a clock.
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Pair your playlist with coaching cues tailored for tough efforts. Pick a mode, press play in Spotify, and let
            the music mark your progress.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {Object.entries(modes).map(([mode, meta]) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode as Mode)}
              className={group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-left transition hover:border-emerald-400/60 hover:bg-slate-900 }
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium uppercase tracking-wide text-emerald-300">Mode</span>
                <span
                  className={	ext-xs font-semibold }
                >
                  {activeMode === mode ? 'Selected' : 'Tap to select'}
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-white">{meta.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{meta.description}</p>
            </button>
          ))}
        </section>

        <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">{modes[activeMode].title}</h3>
              <p className="text-sm text-slate-400">Configuration panel</p>
            </div>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
              Coming soon
            </span>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/60 p-8 text-center">
            <p className="text-sm text-slate-400">
              This is where we will collect interval lengths, bucket them into song slices, and preview upcoming markers.
              Spotify authentication and playback controls will appear above once wired up.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Next step</h4>
              <p className="text-sm text-slate-300">
                Connect your Spotify account using OAuth PKCE so we can observe and steer playback from the browser.
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Tailwind UI ready</h4>
              <p className="text-sm text-slate-300">
                Tailwind CSS is configured, so we can drop in Tailwind UI patterns for polished panels and dialogs as we
                flesh out the experience.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
