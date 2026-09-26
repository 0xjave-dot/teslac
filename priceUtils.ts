import type { Asset } from './types'

export const LIVE_PRICE_MAX_AGE_MS = 30_000

export function getPriceApiBase(): string {
  const configuredApi = import.meta.env.VITE_PRICE_API_URL?.trim()
  if (configuredApi) return configuredApi.replace(/\/$/, '')
  if (import.meta.env.DEV) return `http://${window.location.hostname}:3001`
  return 'https://teslacback.onrender.com'
}

export function isTslaPriceFresh(asset: Asset | undefined, now = Date.now()): boolean {
  if (
    !asset ||
    asset.symbol !== 'TSLA' ||
    (asset.priceSource !== 'finnhub' && asset.priceSource !== 'nasdaq') ||
    asset.priceStatus !== 'live' ||
    !Number.isFinite(asset.currentPrice) ||
    asset.currentPrice <= 0 ||
    typeof asset.priceUpdatedAt !== 'number'
  ) {
    return false
  }

  const age = now - asset.priceUpdatedAt
  return age >= 0 && age <= LIVE_PRICE_MAX_AGE_MS
}