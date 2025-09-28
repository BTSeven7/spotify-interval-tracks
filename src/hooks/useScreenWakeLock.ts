import { useCallback, useEffect, useRef, useState } from 'react'

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>
  }
}

type WakeLockSentinel = {
  released: boolean
  release(): Promise<void>
  onrelease: (() => void) | null
}

type ScreenWakeLockState = {
  isSupported: boolean
  isActive: boolean
  isRequesting: boolean
  error: string | null
  enable: () => Promise<void>
  disable: () => Promise<void>
  toggle: () => Promise<void>
}

export function useScreenWakeLock(): ScreenWakeLockState {
  const [isSupported, setIsSupported] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const shouldHoldRef = useRef(false)

  const getNavigator = () => (typeof navigator !== 'undefined' ? (navigator as WakeLockNavigator) : undefined)

  const releaseLock = useCallback(async () => {
    const sentinel = sentinelRef.current
    if (!sentinel) {
      return
    }

    try {
      await sentinel.release()
    } catch (err) {
      console.error('Failed to release wake lock', err)
    } finally {
      sentinelRef.current = null
      setIsActive(false)
    }
  }, [])

  const requestLock = useCallback(async () => {
    const nav = getNavigator()
    if (!nav?.wakeLock || sentinelRef.current || typeof document === 'undefined') {
      return
    }

    setIsRequesting(true)
    setError(null)
    try {
      const sentinel = await nav.wakeLock.request('screen')
      sentinel.onrelease = () => {
        sentinelRef.current = null
        setIsActive(false)
      }
      sentinelRef.current = sentinel
      setIsActive(true)
    } catch (err) {
      console.error('Wake lock request failed', err)
      setError(err instanceof Error ? err.message : 'Screen wake lock failed. Try again when the page is active.')
      shouldHoldRef.current = false
      await releaseLock()
    } finally {
      setIsRequesting(false)
    }
  }, [releaseLock])

  const enable = useCallback(async () => {
    if (!isSupported) {
      setError('Screen wake lock is not supported on this device.')
      return
    }

    shouldHoldRef.current = true
    await requestLock()
  }, [isSupported, requestLock])

  const disable = useCallback(async () => {
    shouldHoldRef.current = false
    await releaseLock()
    setError(null)
  }, [releaseLock])

  const toggle = useCallback(async () => {
    if (isActive || sentinelRef.current) {
      await disable()
    } else {
      await enable()
    }
  }, [disable, enable, isActive])

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && 'wakeLock' in (navigator as WakeLockNavigator))
  }, [])

  useEffect(() => {
    if (!isSupported || typeof document === 'undefined') {
      return
    }

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        if (shouldHoldRef.current && !sentinelRef.current) {
          await requestLock()
        }
      } else {
        if (sentinelRef.current) {
          await releaseLock()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isSupported, releaseLock, requestLock])

  useEffect(() => {
    return () => {
      shouldHoldRef.current = false
      void releaseLock()
    }
  }, [releaseLock])

  return {
    isSupported,
    isActive,
    isRequesting,
    error,
    enable,
    disable,
    toggle
  }
}

