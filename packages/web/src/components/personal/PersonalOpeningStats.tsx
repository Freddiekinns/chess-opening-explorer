import React, { useEffect, useMemo, useRef, useState } from 'react'
import { buildOpeningsMap, lookupOpeningFromPGN, OpeningForLookup } from '../../../../shared/src'

type Platform = 'lichess'

type Side = 'white' | 'black'

type Result = 'win' | 'draw' | 'loss'

type OpeningAgg = {
  fen: string
  name: string
  eco: string
  games: number
  win: number
  draw: number
  loss: number
}

type DashboardData = {
  totalGames: number
  classifiedGames: number
  unclassifiedGames: number
  whiteGames: number
  whiteWin: number
  whiteDraw: number
  whiteLoss: number
  blackGames: number
  blackWin: number
  blackDraw: number
  blackLoss: number
  asWhite: OpeningAgg[]
  asBlack: OpeningAgg[]
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number.parseInt(String(value), 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function normalizeUsername(value: string) {
  return value.trim()
}

function parsePgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const lines = (pgn || '').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('[')) continue
    const m = trimmed.match(/^\[([^\s]+)\s+"(.*)"\]$/)
    if (!m) continue
    headers[m[1]] = m[2]
  }
  return headers
}

function getUserSide(headers: Record<string, string>, username: string): Side | null {
  const u = username.toLowerCase()
  const white = (headers.White || '').toLowerCase()
  const black = (headers.Black || '').toLowerCase()
  if (white === u) return 'white'
  if (black === u) return 'black'
  return null
}

function getUserResult(headers: Record<string, string>, side: Side): Result | null {
  const r = headers.Result
  if (!r) return null
  if (r === '1/2-1/2') return 'draw'
  if (r === '1-0') return side === 'white' ? 'win' : 'loss'
  if (r === '0-1') return side === 'black' ? 'win' : 'loss'
  return null
}

function sortAgg(list: OpeningAgg[]) {
  return [...list].sort((a, b) => {
    if (b.games !== a.games) return b.games - a.games
    if (b.win !== a.win) return b.win - a.win
    return (a.name || '').localeCompare(b.name || '')
  })
}

function upsertAgg(map: Map<string, OpeningAgg>, opening: { fen: string; name: string; eco: string }, result: Result) {
  const existing = map.get(opening.fen) || {
    fen: opening.fen,
    name: opening.name,
    eco: opening.eco,
    games: 0,
    win: 0,
    draw: 0,
    loss: 0
  }

  existing.games += 1
  existing[result] += 1
  map.set(opening.fen, existing)
}

export const PersonalOpeningStats: React.FC<{ openingsData: OpeningForLookup[]; prefillUsername?: string }> = ({
  openingsData,
  prefillUsername
}) => {
  const [platform] = useState<Platform>('lichess')
  const [username, setUsername] = useState(prefillUsername || '')
  const [limit, setLimit] = useState(200)

  const [step, setStep] = useState<'idle' | 'fetching' | 'analysing' | 'done' | 'error'>('idle')
  const [stepText, setStepText] = useState('')
  const [progress, setProgress] = useState(0)
  const [processed, setProcessed] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const openingsMap = useMemo(() => buildOpeningsMap(openingsData), [openingsData])

  const canAnalyse = normalizeUsername(username).length > 0 && openingsMap.size > 0

  const cacheKey = useMemo(() => {
    const u = normalizeUsername(username).toLowerCase()
    return `personal-openings:v2:${platform}:${u}:limit=${limit}:rated=true:perf=rapid,blitz,classical`
  }, [platform, username, limit])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const loadFromCache = () => {
    try {
      const raw = sessionStorage.getItem(cacheKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { dashboard: DashboardData; cachedAt: number }
      if (!parsed || !parsed.dashboard) return null
      return parsed.dashboard
    } catch {
      return null
    }
  }

  const saveToCache = (data: DashboardData) => {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ dashboard: data, cachedAt: Date.now() }))
    } catch {
      // ignore storage errors
    }
  }

  const setLimitSafe = (value: number) => {
    setLimit(clampInt(value, 1, 200, 200))
  }

  const isBusy = step === 'fetching' || step === 'analysing'

  const handleAnalyse = async () => {
    if (!canAnalyse) return

    const cached = loadFromCache()
    if (cached) {
      setDashboard(cached)
      setError(null)
      setStep('done')
      setStepText('Loaded cached results')
      setProgress(100)
      setProcessed(cached.totalGames)
      setTotal(cached.totalGames)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setError(null)
    setDashboard(null)
    setStep('fetching')
    setStepText('Fetching rated rapid/blitz/classical games...')
    setProgress(5)
    setProcessed(0)
    setTotal(0)

    try {
      const clamped = clampInt(limit, 1, 200, 200)
      const u = normalizeUsername(username)
      const url = `/api/personal/games?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(u)}&limit=${clamped}`

      const response = await fetch(url, { signal: controller.signal })
      const json = await response.json()
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to fetch games')
      }

      const gamesPgn: string[] = json?.data?.gamesPgn || []
      setTotal(gamesPgn.length)
      setProgress(gamesPgn.length > 0 ? 15 : 100)

      setStep('analysing')
      setStepText('Analysing games...')

      const asWhite = new Map<string, OpeningAgg>()
      const asBlack = new Map<string, OpeningAgg>()
      let classified = 0
      let unclassified = 0

      let whiteGames = 0
      let whiteWin = 0
      let whiteDraw = 0
      let whiteLoss = 0
      let blackGames = 0
      let blackWin = 0
      let blackDraw = 0
      let blackLoss = 0

      for (let i = 0; i < gamesPgn.length; i++) {
        if (controller.signal.aborted) return
        const pgn = gamesPgn[i]
        const headers = parsePgnHeaders(pgn)
        const side = getUserSide(headers, u)
        if (!side) {
          unclassified += 1
          setProcessed(i + 1)
          setStepText(`Analysing games... (${i + 1}/${gamesPgn.length})`)
          setProgress(15 + Math.round(((i + 1) / Math.max(1, gamesPgn.length)) * 85))
          continue
        }

        const result = getUserResult(headers, side)
        if (!result) {
          unclassified += 1
          setProcessed(i + 1)
          setStepText(`Analysing games... (${i + 1}/${gamesPgn.length})`)
          setProgress(15 + Math.round(((i + 1) / Math.max(1, gamesPgn.length)) * 85))
          continue
        }

        const lookup = lookupOpeningFromPGN(pgn, openingsMap)
        if (!lookup.success || !lookup.bestMatch) {
          unclassified += 1
          setProcessed(i + 1)
          setStepText(`Analysing games... (${i + 1}/${gamesPgn.length})`)
          setProgress(15 + Math.round(((i + 1) / Math.max(1, gamesPgn.length)) * 85))
          continue
        }

        classified += 1
        if (side === 'white') {
          upsertAgg(asWhite, lookup.bestMatch, result)
          whiteGames += 1
          if (result === 'win') whiteWin += 1
          if (result === 'draw') whiteDraw += 1
          if (result === 'loss') whiteLoss += 1
        } else {
          upsertAgg(asBlack, lookup.bestMatch, result)
          blackGames += 1
          if (result === 'win') blackWin += 1
          if (result === 'draw') blackDraw += 1
          if (result === 'loss') blackLoss += 1
        }

        setProcessed(i + 1)
        setStepText(`Analysing games... (${i + 1}/${gamesPgn.length})`)
        setProgress(15 + Math.round(((i + 1) / Math.max(1, gamesPgn.length)) * 85))

        if ((i + 1) % 10 === 0) {
          await new Promise((r) => setTimeout(r, 0))
        }
      }

      const data: DashboardData = {
        totalGames: gamesPgn.length,
        classifiedGames: classified,
        unclassifiedGames: unclassified,
        whiteGames,
        whiteWin,
        whiteDraw,
        whiteLoss,
        blackGames,
        blackWin,
        blackDraw,
        blackLoss,
        asWhite: sortAgg(Array.from(asWhite.values())).slice(0, 10),
        asBlack: sortAgg(Array.from(asBlack.values())).slice(0, 10)
      }

      saveToCache(data)
      setDashboard(data)
      setStep('done')
      setStepText('Done')
      setProgress(100)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(msg)
      setStep('error')
      setStepText('')
      setProgress(0)
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    setStep('idle')
    setStepText('')
  }

  const handleEnterToAnalyse: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key !== 'Enter') return
    if (isBusy) {
      handleCancel()
      return
    }
    void handleAnalyse()
  }

  return (
    <div className="personal-card">
      <div className="card-header">
        <h2 className="card-header__title card-header__title--accent">Personal Opening Explorer</h2>
      </div>

      <div className="personal-controls">
        <div className="personal-controls__panel">
          <div className="personal-controls__row">
            <label className="personal-field">
              <span className="personal-field__label">Platform</span>
              <select className="personal-field__input" value={platform} disabled>
                <option value="lichess">Lichess (rated)</option>
              </select>
            </label>

            <label className="personal-field">
              <span className="personal-field__label">Username</span>
              <input
                className="personal-field__input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleEnterToAnalyse}
                placeholder="e.g. thibault"
                inputMode="text"
                autoComplete="off"
                disabled={isBusy}
              />
            </label>

            <label className="personal-field personal-field--small">
              <span className="personal-field__label">Games</span>
              <div className="personal-stepper" aria-label="Games to analyse">
                <button
                  type="button"
                  className="personal-stepper__btn"
                  onClick={(e) => setLimitSafe(limit - (e.shiftKey ? 10 : 1))}
                  disabled={isBusy || limit <= 1}
                  aria-label="Decrease games"
                  title="Hold Shift for -10"
                >
                  -
                </button>
                <input
                  className="personal-stepper__input"
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  value={limit}
                  onChange={(e) => setLimitSafe(Number(e.target.value))}
                  onKeyDown={handleEnterToAnalyse}
                  disabled={isBusy}
                />
                <button
                  type="button"
                  className="personal-stepper__btn"
                  onClick={(e) => setLimitSafe(limit + (e.shiftKey ? 10 : 1))}
                  disabled={isBusy || limit >= 200}
                  aria-label="Increase games"
                  title="Hold Shift for +10"
                >
                  +
                </button>
              </div>
            </label>
          </div>

          <div className="personal-controls__actions">
            <div className="personal-note">Rated rapid/blitz/classical only. Max 200 games. Bullet excluded.</div>
            <div className="personal-action">
              <button
                className="personal-btn personal-btn--primary personal-btn--analyse"
                onClick={isBusy ? handleCancel : handleAnalyse}
                disabled={!isBusy && !canAnalyse}
              >
                {isBusy ? 'Cancel' : 'Analyse'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {(step === 'fetching' || step === 'analysing' || step === 'done') && (
        <div className="personal-progress" aria-live="polite">
          <div className="personal-progress__bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="personal-progress__barFill" style={{ width: `${progress}%` }} />
          </div>
          <div className="personal-progress__meta">
            <span>{stepText}</span>
            {total > 0 && <span>{processed}/{total}</span>}
          </div>
        </div>
      )}

      {step === 'error' && error && (
        <div className="personal-error" role="alert">
          {error}
        </div>
      )}

      {dashboard && (
        <div className="personal-dashboard">
          <div className="personal-summary">
            <div className="personal-summary__item">
              <span className="personal-summary__label">Games analysed</span>
              <span className="personal-summary__value">{dashboard.totalGames}</span>
            </div>
            <div className="personal-summary__item">
              <span className="personal-summary__label">Matched openings</span>
              <span className="personal-summary__value">{dashboard.classifiedGames}</span>
            </div>
            <div className="personal-summary__item">
              <span className="personal-summary__label">Unclassified</span>
              <span className="personal-summary__value">{dashboard.unclassifiedGames}</span>
            </div>
          </div>

          <div className="personal-sides">
            <div className="personal-side">
              <div className="personal-side__header">
                <h3 className="personal-side__title">As White</h3>
                <div className="personal-side__meta" aria-label="White summary">
                  <span className="personal-pill personal-pill--games">{dashboard.whiteGames} games</span>
                  <span className="personal-pill personal-pill--win">W {dashboard.whiteWin}</span>
                  <span className="personal-pill personal-pill--draw">D {dashboard.whiteDraw}</span>
                  <span className="personal-pill personal-pill--loss">L {dashboard.whiteLoss}</span>
                </div>
              </div>
              {dashboard.asWhite.length === 0 ? (
                <div className="personal-empty">No classified openings.</div>
              ) : (
                <div className="personal-list">
                  {dashboard.asWhite.map((o) => (
                    <a
                      key={o.fen}
                      className="personal-row"
                      href={`/opening/${encodeURIComponent(o.fen)}?ref=personal&platform=${platform}&username=${encodeURIComponent(normalizeUsername(username))}`}
                    >
                      <div className="personal-row__main">
                        <span className="eco-pill">{o.eco}</span>
                        <span className="personal-row__name">{o.name}</span>
                      </div>
                      <div className="personal-row__stats">
                        <span className="personal-pill personal-pill--games">{o.games} games</span>
                        <span className="personal-pill personal-pill--win">W {o.win}</span>
                        <span className="personal-pill personal-pill--draw">D {o.draw}</span>
                        <span className="personal-pill personal-pill--loss">L {o.loss}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="personal-side">
              <div className="personal-side__header">
                <h3 className="personal-side__title">As Black</h3>
                <div className="personal-side__meta" aria-label="Black summary">
                  <span className="personal-pill personal-pill--games">{dashboard.blackGames} games</span>
                  <span className="personal-pill personal-pill--win">W {dashboard.blackWin}</span>
                  <span className="personal-pill personal-pill--draw">D {dashboard.blackDraw}</span>
                  <span className="personal-pill personal-pill--loss">L {dashboard.blackLoss}</span>
                </div>
              </div>
              {dashboard.asBlack.length === 0 ? (
                <div className="personal-empty">No classified openings.</div>
              ) : (
                <div className="personal-list">
                  {dashboard.asBlack.map((o) => (
                    <a
                      key={o.fen}
                      className="personal-row"
                      href={`/opening/${encodeURIComponent(o.fen)}?ref=personal&platform=${platform}&username=${encodeURIComponent(normalizeUsername(username))}`}
                    >
                      <div className="personal-row__main">
                        <span className="eco-pill">{o.eco}</span>
                        <span className="personal-row__name">{o.name}</span>
                      </div>
                      <div className="personal-row__stats">
                        <span className="personal-pill personal-pill--games">{o.games} games</span>
                        <span className="personal-pill personal-pill--win">W {o.win}</span>
                        <span className="personal-pill personal-pill--draw">D {o.draw}</span>
                        <span className="personal-pill personal-pill--loss">L {o.loss}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PersonalOpeningStats
