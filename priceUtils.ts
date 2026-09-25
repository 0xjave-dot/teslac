import type { Asset } from './types'

export const LIVE_PRICE_MAX_AGE_MS = 30_000

export function isTslaPriceFresh(asset: Asset | undefined, now = Date.now()): boolean {
  if (
    !asset ||
    asset.symbol !== 'TSLA' ||
    asset.priceSource !== 'finnhub' ||
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