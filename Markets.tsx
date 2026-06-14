import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAssets } from './useAssets'
import { PriceChange } from './PriceChange'
import { AssetTypeBadge } from './AssetTypeBadge'
import { EmptyState } from './EmptyState'
import type { Asset } from './types'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function AssetIcon({ asset }: { asset: Asset }) {
  const isStock = asset.type === 'stock'
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
      isStock ? 'bg-accent/20 text-accent' : 'bg-purple-500/20 text-purple-400'
    }`}>
      {asset.name[0]}
    </div>
  )
}

export function Markets() {
  const navigate = useNavigate()
  const { assets } = useAssets()
  const [tab, setTab] = useState<'all' | 'stock' | 'crypto'>('all')
  const [search, setSearch] = useState('')
  const prevPrices = useRef<Record<string, number>>({})
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | null>>({})

  useEffect(() => {
    const newFlash: Record<string, 'up' | 'down' | null> = {}
    assets.forEach((a) => {
      const prev = prevPrices.current[a.symbol]
      if (prev !== undefined && prev !== a.currentPrice) {
        newFlash[a.symbol] = a.currentPrice > prev ? 'up' : 'down'
      }
      prevPrices.current[a.symbol] = a.currentPrice
    })
    if (Object.keys(newFlash).length > 0) {
      setFlashMap(newFlash)
      setTimeout(() => setFlashMap({}), 900)
    }
  }, [assets])

  const filtered = assets
    .filter((a) => tab === 'all' || a.type === tab)
    .filter((a) =>
      a.symbol.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
    )

  const loading = assets.length === 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight text-white">Markets</h1>
        <p className="text-white/40 text-sm mt-1">Live prices updated every 10 seconds</p>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="bg-navy-raised rounded-xl p-1 flex gap-1">
          {(['all', 'stock', 'crypto'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm rounded-lg transition capitalize ${
                tab === t ? 'bg-accent text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {t === 'all' ? 'All' : t === 'stock' ? 'Stocks' : 'Crypto'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets…"
            className="bg-navy-raised border border-white/[0.07] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent/50 w-56"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center px-6 py-3 border-b border-white/[0.07] text-xs text-white/40 uppercase tracking-wider">
          <span>Asset</span>
          <span>Price</span>
          <span>24h Change</span>
          <span>Type</span>
          <span>Trade</span>
        </div>

        {loading ? (
          Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center px-6 py-4 border-b border-white/[0.05] gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-navy-raised animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-3 w-12 bg-navy-raised animate-pulse rounded" />
                  <div className="h-2.5 w-20 bg-navy-raised animate-pulse rounded" />
                </div>
              </div>
              {[1,2,3].map((k) => <div key={k} className="h-3 bg-navy-raised animate-pulse rounded" />)}
              <div className="h-6 w-12 bg-navy-raised animate-pulse rounded-lg" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState message="No assets match your search." />
        ) : (
          filtered.map((asset) => (
            <div
              key={asset.symbol}
              onClick={() => navigate(`/markets/${asset.symbol}`)}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center px-6 py-4 border-b border-white/[0.05] hover:bg-navy-raised/50 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <AssetIcon asset={asset} />
                <div>
                  <p className="text-sm font-medium text-white">{asset.symbol}</p>
                  <p className="text-xs text-white/40">{asset.name}</p>
                </div>
              </div>
              <span className={`num text-sm text-white ${
                flashMap[asset.symbol] === 'up' ? 'price-flash-up' :
                flashMap[asset.symbol] === 'down' ? 'price-flash-down' : ''
              }`}>
                ${fmt(asset.currentPrice)}
              </span>
              <PriceChange value={asset.change24h} showIcon />
              <AssetTypeBadge type={asset.type} />
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/markets/${asset.symbol}`) }}
                className="bg-accent/10 text-accent text-xs px-3 py-1.5 rounded-lg hover:bg-accent hover:text-white transition"
              >
                Trade
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}





