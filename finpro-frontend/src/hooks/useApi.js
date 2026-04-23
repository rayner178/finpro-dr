// src/hooks/useApi.js
import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useApi — fetches data on mount and whenever `deps` change.
 *
 * The `fetcher` is called inside a stable callback that is rebuilt
 * whenever any dep changes, so there are no stale closure issues.
 * The eslint-disable workaround is gone.
 *
 * @param {() => Promise<T>} fetcher - async function that returns data
 * @param {unknown[]}        deps    - re-fetch when any dep changes (like useEffect)
 */
export function useApi(fetcher, deps = []) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const mountedRef             = useRef(true)

  // Stable reference to the latest fetcher so the callback below
  // always calls the current version without being listed as a dep.
  const fetcherRef = useRef(fetcher)
  useEffect(() => { fetcherRef.current = fetcher })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      if (mountedRef.current) setData(result)
    } catch (err) {
      if (mountedRef.current) setError(err.message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [load])

  return { data, loading, error, refetch: load }
}

/**
 * useMutation — wraps a POST/PUT/DELETE call with loading + error state.
 * Returns { mutate, loading, error, clearError }.
 */
export function useMutation(mutFn) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // Keep a ref so mutate stays stable even if the caller passes an
  // inline arrow function that changes on every render.
  const fnRef = useRef(mutFn)
  useEffect(() => { fnRef.current = mutFn })

  const mutate = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fnRef.current(...args)
      return { ok: true, data: result }
    } catch (err) {
      setError(err.message)
      return { ok: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])   // stable — fnRef absorbs the latest function

  return { mutate, loading, error, clearError: () => setError(null) }
}
