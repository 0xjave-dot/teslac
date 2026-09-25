import { useEffect, useMemo, useState } from 'react'
import { onPriceHistory } from './firestore'
import type { Asset, PriceCandle, PriceResolution } from './types'

export type PriceRange = '1H' | '1D' | '1W' | '1M'

const RANGE_CONFIG: Record<PriceRange, { resolution: PriceResolution; durationMs: number; intervalMs: number }> = {
  '1H': { resolution: '1m', durationMs: 60 * 60 * 1000, intervalMs: 60 * 1000 },
  '1D': { resolution: '1m', durationMs: 24 * 60 * 60 * 1000, intervalMs: 60 * 1000 },
  '1W': { resolution: '5m', durationMs: 7 * 24 * 60 * 60 * 1000, intervalMs: 5 * 60 * 1000 },
  '1M': { resolution: '15m', durationMs: 30 * 24 * 60 * 60 * 1000, intervalMs: 15 * 60 * 1000 },
}

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
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const config = RANGE_CONFIG[range]
  const fromTime = useMemo(() => Date.now() - config.durationMs, [config.durationMs, symbol, range])

  useEffect(() => {
    setCandles([])
    setSubscriptionError(null)

    if (symbol !== 'TSLA') {
      setLoading(false)
      return
    }

    setLoading(true)
    return onPriceHistory(
      symbol,
      config.resolution,
      fromTime,
      (nextCandles) => {
        setCandles(nextCandles)
        setLoading(false)
      },
      (error) => {
        setSubscriptionError(error.message || 'Could not load historical market prices.')
        setLoading(false)
      }
    )
  }, [symbol, range, config.resolution, fromTime])

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

  const historyError = asset?.historyStatus === 'error' ? asset.historyError || 'Historical prices could not be refreshed.' : null
  const quoteAge = typeof asset?.priceUpdatedAt === 'number' ? now - asset.priceUpdatedAt : Number.POSITIVE_INFINITY
  const quoteWarning = symbol === 'TSLA'
    ? asset?.priceStatus === 'error'
      ? asset.priceError || 'The live TSLA quote is unavailable.'
      : asset?.priceStatus !== 'live' || quoteAge > 30_000 || quoteAge < 0
        ? 'The live TSLA quote is missing or stale.'
        : null
    : null
  const error = subscriptionError || (data.length === 0 ? historyError || quoteWarning : null)
  const warning = data.length > 0 ? subscriptionError || historyError || quoteWarning : null

  return { data, loading, error, warning }
}