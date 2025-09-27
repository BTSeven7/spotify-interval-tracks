import { useCallback, useEffect, useMemo, useState } from 'react'

export type IntervalPlan = {
  totalMinutes: number
  includeThirtySeconds: boolean
  sliceLengthSeconds: number
}

export type TimelineSlice = {
  index: number
  durationMs: number
  startMs: number
  endMs: number
  isRemainder: boolean
  skipAfter: boolean
}

export type IntervalStats = {
  totalDurationMs: number
  baseSliceDurationMs: number
  fullSlices: number
  remainderMs: number
  timeline: TimelineSlice[]
  skipCount: number
}

const STORAGE_KEY = 'workout-spotify:interval-plan'
export const SLICE_OPTIONS_SECONDS = [30, 60, 90, 120, 150, 180, 210]
const DEFAULT_PLAN: IntervalPlan = {
  totalMinutes: 10,
  includeThirtySeconds: false,
  sliceLengthSeconds: 120
}

function clampMinutes(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

function sanitizeSliceSeconds(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_PLAN.sliceLengthSeconds
  }
  const normalized = Math.max(30, Math.min(210, Math.round(value / 30) * 30))
  return SLICE_OPTIONS_SECONDS.includes(normalized) ? normalized : DEFAULT_PLAN.sliceLengthSeconds
}

function totalMs(plan: IntervalPlan) {
  return (plan.totalMinutes * 60 + (plan.includeThirtySeconds ? 30 : 0)) * 1000
}

function computeTimeline(plan: IntervalPlan): IntervalStats {
  const totalDurationMs = totalMs(plan)
  const sliceMs = plan.sliceLengthSeconds * 1000

  if (totalDurationMs <= 0) {
    return {
      totalDurationMs: 0,
      baseSliceDurationMs: sliceMs,
      fullSlices: 0,
      remainderMs: 0,
      timeline: [],
      skipCount: 0
    }
  }

  const fullSlices = Math.floor(totalDurationMs / sliceMs)
  const remainderMs = totalDurationMs - fullSlices * sliceMs

  const timeline: TimelineSlice[] = []
  let currentStart = 0
  const slicesToCreate = fullSlices + (remainderMs > 0 || fullSlices === 0 ? 1 : 0)

  for (let index = 0; index < slicesToCreate; index++) {
    const isLast = index === slicesToCreate - 1
    const isRemainder = isLast && remainderMs > 0
    const durationMs = isRemainder ? remainderMs : sliceMs
    const startMs = currentStart
    const endMs = startMs + durationMs

    timeline.push({
      index,
      durationMs,
      startMs,
      endMs,
      isRemainder,
      skipAfter: !isLast
    })

    currentStart = endMs
  }

  return {
    totalDurationMs,
    baseSliceDurationMs: sliceMs,
    fullSlices,
    remainderMs,
    timeline,
    skipCount: Math.max(0, timeline.length - 1)
  }
}

function migrateLegacyPlan(raw: any): IntervalPlan | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  if (typeof raw.sliceLengthSeconds === 'number') {
    return {
      totalMinutes: clampMinutes(raw.totalMinutes ?? DEFAULT_PLAN.totalMinutes),
      includeThirtySeconds: Boolean(raw.includeThirtySeconds),
      sliceLengthSeconds: sanitizeSliceSeconds(raw.sliceLengthSeconds)
    }
  }

  if (Array.isArray(raw.slices) && raw.slices.length > 0) {
    const firstSlice = raw.slices[0]
    const totalMinutes = clampMinutes(raw.totalMinutes ?? 10)
    const totalSeconds = clampMinutes(raw.totalSeconds ?? 0)
    const totalHasThirty = totalSeconds >= 30
    const inferredSliceSeconds = sanitizeSliceSeconds((firstSlice?.minutes ?? 0) * 60 + (firstSlice?.seconds ?? 0))

    return {
      totalMinutes,
      includeThirtySeconds: totalHasThirty,
      sliceLengthSeconds: inferredSliceSeconds
    }
  }

  return null
}

function loadPlan(): IntervalPlan {
  if (typeof window === 'undefined') {
    return DEFAULT_PLAN
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_PLAN
    const parsed = JSON.parse(stored)
    const migrated = migrateLegacyPlan(parsed)
    if (migrated) {
      return migrated
    }
  } catch (error) {
    console.error('Failed to load interval plan from storage', error)
  }

  return DEFAULT_PLAN
}

export function useIntervalPlan() {
  const [plan, setPlan] = useState<IntervalPlan>(() => loadPlan())

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
    } catch (error) {
      console.error('Failed to persist interval plan', error)
    }
  }, [plan])

  const stats = useMemo(() => computeTimeline(plan), [plan])

  const incrementMinutes = useCallback(() => {
    setPlan(prev => ({
      ...prev,
      totalMinutes: clampMinutes(prev.totalMinutes + 1)
    }))
  }, [])

  const decrementMinutes = useCallback(() => {
    setPlan(prev => ({
      ...prev,
      totalMinutes: clampMinutes(Math.max(0, prev.totalMinutes - 1))
    }))
  }, [])

  const setIncludeThirtySeconds = useCallback((value: boolean) => {
    setPlan(prev => ({
      ...prev,
      includeThirtySeconds: value
    }))
  }, [])

  const selectSliceLength = useCallback((seconds: number) => {
    setPlan(prev => ({
      ...prev,
      sliceLengthSeconds: sanitizeSliceSeconds(seconds)
    }))
  }, [])

  const resetPlan = useCallback(() => {
    setPlan(DEFAULT_PLAN)
  }, [])

  return {
    plan,
    stats,
    incrementMinutes,
    decrementMinutes,
    setIncludeThirtySeconds,
    selectSliceLength,
    resetPlan
  }
}


export type IntervalPlanControls = ReturnType<typeof useIntervalPlan>


