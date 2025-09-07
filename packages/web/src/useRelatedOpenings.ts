import { useEffect, useState, useCallback } from 'react'

interface RelatedOpeningLite {
  fen: string
  name: string
  eco: string
  moves: string
  isEcoRoot: boolean
  games_analyzed: number
}

interface RelatedOpeningsResponse {
  current: RelatedOpeningLite
  ecoCode: string | null
  mainline: RelatedOpeningLite | null
  siblings: RelatedOpeningLite[]
  counts: { siblings: number }
}

interface HookState {
  data: RelatedOpeningsResponse | null
  loading: boolean
  error: string | null
}

export function useRelatedOpenings(fen: string | undefined) {
  const [state, setState] = useState<HookState>({ data: null, loading: !!fen, error: null })

  const fetchData = useCallback(async () => {
    if (!fen) return
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const encoded = encodeURIComponent(fen)
      const res = await fetch(`/api/openings/fen/${encoded}/related`)
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Failed to load related openings (${res.status})`)
      }
      const json = await res.json()
      const payload = json.data as RelatedOpeningsResponse
      setState({ data: payload, loading: false, error: null })
    } catch (e: any) {
      setState({ data: null, loading: false, error: e.message || 'Unknown error' })
    }
  }, [fen])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchData
  }
}

export type { RelatedOpeningsResponse, RelatedOpeningLite }
