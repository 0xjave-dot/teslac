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

  // Poll backend /prices to get live prices (falls back to Firestore if available)
  useEffect(() => {
    let mounted = true
    async function fetchPrices() {
      try {
        const host = window.location.hostname
        const res = await fetch(`http://${host}:3001/prices`)
        if (!res.ok) return
        const data = await res.json() as Record<string, { currentPrice: number; change24h: number }>
        if (!mounted) return
        setAssets((prev) => {
          // If we have Firestore-provided assets, merge prices in
          if (prev && prev.length > 0) {
            return prev.map((a) => {
              const p = data[a.symbol]
              return p ? { ...a, currentPrice: p.currentPrice, change24h: p.change24h } : a
            })
          }
          // Otherwise seed defaults and apply prices where available
          const seeded = DEFAULT_ASSETS.map((a) => {
            const p = data[a.symbol]
            return p ? { ...a, currentPrice: p.currentPrice, change24h: p.change24h } : a
          })
          return seeded
        })
      } catch (e) {
        // ignore network errors — server may be down
      }
    }

    // Initial fetch + interval
    fetchPrices()
    const id = setInterval(fetchPrices, 5000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

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





