import { useEffect, useMemo, useState } from 'react'
import type { Asset, PriceCandle } from './types'

export type PriceRange = '1H' | '1D' | '1W' | '1M'

const RANGE_CONFIG: Record<PriceRange, { intervalMs: number }> = {
  '1H': { intervalMs: 2 * 60 * 1000 },
  '1D': { intervalMs: 5 * 60 * 1000 },
  '1W': { intervalMs: 60 * 60 * 1000 },
  '1M': { intervalMs: 24 * 60 * 60 * 1000 },
}

const PRICE_API_URL = import.meta.env.VITE_PRICE_API_URL?.replace(/\/$/, '') || ''

export interface PriceChartPoint extends PriceCandle {
  label: string
}

export function usePriceChart(
  symbol: string,
  range: PriceRange,
  asset: Asset | null,
  now = Date.now()
): { data: PriceChartPoint[]; loading: boolean; error: string | null; warning: string | null } {
  const [candles, setCandles] = useState<PriceCandle[]>([])
  const [loading, setLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const config = RANGE_CONFIG[range]

  useEffect(() => {
    setCandles([])
    setHistoryError(null)

    if (symbol !== 'TSLA') {
      setLoading(false)
      return
    }

    if (!PRICE_API_URL) {
      setHistoryError('VITE_PRICE_API_URL is not configured for this deployment.')
      setLoading(false)
      return
    }

    let active = true
    let loadingInitial = true
    const loadHistory = async () => {
      try {
        const response = await fetch(`${PRICE_API_URL}/historical/${symbol}?timeframe=${range}`)
        if (!response.ok) throw new Error(`Price server returned ${response.status}.`)
        const points = await response.json() as Array<{ price?: number; open?: number; high?: number; low?: number; close?: number }>
        if (!Array.isArray(points)) throw new Error('Price server returned invalid historical data.')
        const sampledAt = Date.now()
        const nextCandles = points.flatMap((point, index) => {
          const close = point.close ?? point.price
          const open = point.open ?? close
          const high = point.high ?? (open !== undefined && close !== undefined ? Math.max(open, close) : undefined)
          const low = point.low ?? (open !== undefined && close !== undefined ? Math.min(open, close) : undefined)
          if (![open, high, low, close].every(Number.isFinite)) return []
          return [{
            time: sampledAt - (points.length - index - 1) * config.intervalMs,
            open: open as number,
            high: high as number,
            low: low as number,
            close: close as number,
            volume: 0,
          }]
        })
        if (!active) return
        setCandles(nextCandles)
        setHistoryError(null)
      } catch (error) {
        if (!active) return
        setHistoryError(error instanceof Error ? error.message : 'Could not load historical market prices.')
      } finally {
        if (active && loadingInitial) {
          loadingInitial = false
          setLoading(false)
        }
      }
    }

    setLoading(true)
    void loadHistory()
    const intervalId = window.setInterval(() => { void loadHistory() }, 60_000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [symbol, range, config.intervalMs])

  const data = useMemo(() => {
    const source = candles.map((candle) => ({ ...candle }))
    const isFresh = asset?.symbol === 'TSLA'
      && asset.priceStatus === 'live'
      && Number.isFinite(asset.currentPrice)
      && asset.currentPrice > 0
      && typeof asset.priceUpdatedAt === 'number'
      && now - asset.priceUpdatedAt >= 0
      && now - asset.priceUpdatedAt <= 30_000

    if (isFresh && source.length > 0) {
      const time = Math.floor(now / config.intervalMs) * config.intervalMs
      const last = source[source.length - 1]
      if (Math.floor(last.time / config.intervalMs) === Math.floor(time / config.intervalMs)) {
        last.high = Math.max(last.high, asset.currentPrice)
        last.low = Math.min(last.low, asset.currentPrice)
        last.close = asset.currentPrice
      } else if (time > last.time) {
        source.push({
          time,
          open: asset.currentPrice,
          high: asset.currentPrice,
          low: asset.currentPrice,
          close: asset.currentPrice,
          volume: 0,
        })
      }
    }

    return source.map((candle) => ({
      ...candle,
      label: range === '1W' || range === '1M'
        ? new Date(candle.time).toLocaleDateString([], { month: 'short', day: 'numeric' })
        : new Date(candle.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }))
  }, [candles, asset, now, range, config.intervalMs])

  const quoteAge = typeof asset?.priceUpdatedAt === 'number' ? now - asset.priceUpdatedAt : Number.POSITIVE_INFINITY
  const quoteWarning = symbol === 'TSLA'
    ? asset?.priceStatus === 'error'
      ? asset.priceError || 'The live TSLA quote is unavailable.'
      : asset?.priceStatus !== 'live' || quoteAge > 30_000 || quoteAge < 0
        ? 'The live TSLA quote is missing or stale.'
        : null
    : null
  const error = historyError || (data.length === 0 ? quoteWarning : null)
  const warning = data.length > 0 ? historyError || quoteWarning : null

  return { data, loading, error, warning }
}