import { useState, useEffect } from 'react'
import { onAssets } from './firestore'
import type { Asset, PriceMap } from './types'

const DEFAULT_ASSETS: Asset[] = [
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', priceSource: 'finnhub', currentPrice: 407.11, change24h: 0 },
  { symbol: 'SPACEX', name: 'SpaceX', type: 'stock', priceSource: 'seeded', currentPrice: 185.4, change24h: 0 },
  { symbol: 'GDAWN', name: 'Golden Dawn', type: 'stock', priceSource: 'seeded', currentPrice: 42.75, change24h: 0 },
  { symbol: 'APG', name: 'APG', type: 'stock', priceSource: 'seeded', currentPrice: 67.2, change24h: 0 },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', priceSource: 'finnhub', currentPrice: 64083, change24h: 0 },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', priceSource: 'finnhub', currentPrice: 1793.13, change24h: 0 },
  { symbol: 'SOL', name: 'Solana', type: 'crypto', priceSource: 'finnhub', currentPrice: 78.04, change24h: 0 },
  { symbol: 'BNB', name: 'BNB', type: 'crypto', priceSource: 'finnhub', currentPrice: 300, change24h: 0 },
  { symbol: 'USDT', name: 'Tether', type: 'crypto', priceSource: 'seeded', currentPrice: 1.0, change24h: 0 },
]

export function useAssets(): { assets: Asset[]; priceMap: PriceMap } {
  const [assets, setAssets] = useState<Asset[]>([])

  useEffect(() => {
    const unsub = onAssets(setAssets)

    // If Firestore doesn't have assets (local dev without service account),
    // fall back to a default seeded list after a short delay so UI shows data.
    const t = setTimeout(() => {
      setAssets((prev) => (prev && prev.length > 0 ? prev : DEFAULT_ASSETS))
    }, 500)

    return () => {
      clearTimeout(t)
      if (typeof unsub === 'function') unsub()
    }
  }, [])

  const priceMap: PriceMap = {}
  assets.forEach((a) => { priceMap[a.symbol] = a })

  return { assets, priceMap }
}





