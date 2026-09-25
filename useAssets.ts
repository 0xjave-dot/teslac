import { useState, useEffect } from 'react'
import { onAssets } from './firestore'
import type { Asset, PriceMap } from './types'

const DEFAULT_ASSETS: Asset[] = [
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', priceSource: 'finnhub', currentPrice: 0, change24h: 0, priceStatus: 'error', priceError: 'Waiting for the live quote feed.' },
  { symbol: 'SPACEX', name: 'SpaceX', type: 'stock', priceSource: 'seeded', currentPrice: 185.4, change24h: 0 },
  { symbol: 'GDAWN', name: 'Golden Dawn', type: 'stock', priceSource: 'seeded', currentPrice: 42.75, change24h: 0 },
  { symbol: 'APG', name: 'APG', type: 'stock', priceSource: 'seeded', currentPrice: 67.2, change24h: 0 },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', priceSource: 'finnhub', currentPrice: 64083, change24h: 0 },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', priceSource: 'finnhub', currentPrice: 1793.13, change24h: 0 },
  { symbol: 'SOL', name: 'Solana', type: 'crypto', priceSource: 'finnhub', currentPrice: 78.04, change24h: 0 },
  { symbol: 'BNB', name: 'BNB', type: 'crypto', priceSource: 'finnhub', currentPrice: 300, change24h: 0 },
  { symbol: 'USDT', name: 'Tether', type: 'crypto', priceSource: 'seeded', currentPrice: 1.0, change24h: 0 },
]

export function useAssets(): { assets: Asset[]; priceMap: PriceMap; error: string | null; now: number } {
  const [assets, setAssets] = useState<Asset[]>([])
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const unsub = onAssets((nextAssets) => {
      setAssets(nextAssets)
      setError(null)
    }, (snapshotError) => {
      setError(snapshotError.message || 'Could not load live asset prices.')
    })

    const t = setTimeout(() => {
      setAssets((prev) => (prev && prev.length > 0 ? prev : DEFAULT_ASSETS))
    }, 500)

    const clock = setInterval(() => setNow(Date.now()), 5000)
    return () => {
      clearTimeout(t)
      clearInterval(clock)
      if (typeof unsub === 'function') unsub()
    }
  }, [])

  const priceMap: PriceMap = {}
  assets.forEach((a) => { priceMap[a.symbol] = a })

  return { assets, priceMap, error, now }
}





