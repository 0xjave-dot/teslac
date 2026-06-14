import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { ChevronLeft } from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './AuthContext'
import { useBalance } from './useBalance'
import { onHoldings, onOrders, placeBuyOrder, placeSellOrder } from './firestore'
import { PriceChange } from './PriceChange'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'
import { Toast } from './Toast'
import type { Asset, Holding, Order } from './types'

type TimeTab = '1H' | '1D' | '1W' | '1M'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function generateChart(seed: number, points: number, volatility: number) {
  const data = []
  let price = seed
  const now = Date.now()
  const interval = (points === 60 ? 60000 : points === 144 ? 600000 : points === 168 ? 3600000 : 86400000)
  for (let i = points; i >= 0; i--) {
    price = price * (1 + (Math.random() - 0.5) * volatility)
    data.push({ time: new Date(now - i * interval).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), price: +price.toFixed(2) })
  }
  return data
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number }[] }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-navy-raised border border-white/[0.13] rounded-lg p-3 text-sm text-white num">
        ${fmt(payload[0].value)}
      </div>
    )
  }
  return null
}

export function MarketDetail() {
  const { symbol } = useParams<{ symbol: string }>()
  const { currentUser, userDoc } = useAuth()
  const uid = currentUser?.uid
  const balance = useBalance(uid)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<TimeTab>('1D')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [units, setUnits] = useState('')
  const [tradeLoading, setTradeLoading] = useState(false)
  const [tradeError, setTradeError] = useState('')
  const [toast, setToast] = useState('')
  const prevPrice = useRef<number | null>(null)
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (!symbol) return
    return onSnapshot(doc(db, 'assets', symbol), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Asset
        const newPrice = data.currentPrice
        if (prevPrice.current !== null && newPrice !== prevPrice.current) {
          setPriceFlash(newPrice > prevPrice.current ? 'up' : 'down')
          setTimeout(() => setPriceFlash(null), 900)
        }
        prevPrice.current = newPrice
        setAsset({ ...data, symbol })
      }
    })
  }, [symbol])

  useEffect(() => {
    if (!uid) return
    const unsub1 = onHoldings(uid, setHoldings)
    const unsub2 = onOrders(uid, symbol!, setOrders)
    return () => { unsub1(); unsub2() }
  }, [uid, symbol])

  const holding = holdings.find((h) => h.symbol === symbol)
  const currentPrice = asset?.currentPrice || 0
  const unitsNum = parseFloat(units) || 0
  const total = unitsNum * currentPrice

  const tabConfig: Record<TimeTab, { points: number; vol: number }> = {
    '1H': { points: 60, vol: 0.001 },
    '1D': { points: 144, vol: 0.003 },
    '1W': { points: 168, vol: 0.006 },
    '1M': { points: 90, vol: 0.012 },
  }

  const chartData = useMemo(
    () => generateChart(currentPrice, tabConfig[tab].points, tabConfig[tab].vol),
    [symbol, tab, Math.floor(currentPrice)]
  )

  async function handleTrade() {
    if (!uid || !symbol || !asset) return
    setTradeError('')
    if (unitsNum <= 0) { setTradeError('Enter a valid number of units'); return }

    if (side === 'buy' && balance.available < total) {
      setTradeError('Insufficient balance')
      return
    }
    if (side === 'sell' && (!holding || holding.units < unitsNum)) {
      setTradeError('Not enough units to sell')
      return
    }

    setTradeLoading(true)
    try {
      const name = userDoc?.name || currentUser?.displayName || 'User'
      if (side === 'buy') {
        await placeBuyOrder(uid, name, symbol, asset.name, unitsNum, currentPrice)
      } else {
        await placeSellOrder(uid, name, symbol, asset.name, unitsNum, currentPrice)
      }
      setToast(`${side === 'buy' ? 'Bought' : 'Sold'} ${unitsNum} ${symbol} successfully!`)
      setUnits('')
    } catch (err: unknown) {
      setTradeError((err as Error).message || 'Trade failed')
    } finally {
      setTradeLoading(false)
    }
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} className="text-accent" />
      </div>
    )
  }

  return (
    <div>
      {toast && <Toast message={toast} type="success" onClose={() => setToast('')} />}

      <Link to="/markets" className="flex items-center gap-1 text-white/40 text-sm hover:text-white mb-6 w-fit transition">
        <ChevronLeft className="w-4 h-4" />
        Markets
      </Link>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {/* Asset header */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  asset.type === 'stock' ? 'bg-accent/20 text-accent' : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {asset.name[0]}
                </div>
                <div>
                  <h1 className="text-2xl font-medium tracking-tight text-white">{symbol}</h1>
                  <p className="text-white/50 text-sm">{asset.name}</p>
                </div>
              </div>
              <div className="flex items-end gap-3 mt-2">
                <span className={`text-4xl font-medium num tracking-tight text-white ${
                  priceFlash === 'up' ? 'price-flash-up' : priceFlash === 'down' ? 'price-flash-down' : ''
                }`}>
                  ${fmt(currentPrice)}
                </span>
                <PriceChange value={asset.change24h} className="text-lg" showIcon />
                <span className="text-white/30 text-sm">24h</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gain animate-pulse inline-block" />
                  <span className="text-xs text-white/40">Live</span>
                </div>
                <span className="text-xs bg-navy-raised px-2 py-0.5 rounded text-white/40 capitalize">
                  {asset.type}
                </span>
                <span className="text-xs bg-navy-raised px-2 py-0.5 rounded text-white/40">
                  {asset.priceSource === 'finnhub' ? 'Finnhub' : 'Simulated'}
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="card p-6 mt-6">
            <div className="flex gap-4 mb-4">
              {(['1H', '1D', '1W', '1M'] as TimeTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-sm pb-1 transition ${
                    tab === t ? 'text-accent border-b border-accent' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cg3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="price" stroke="#06b6d4" strokeWidth={2} fill="url(#cg3)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Order history */}
          <div className="card mt-6 p-6">
            <p className="text-sm font-medium text-white mb-4">Your Orders — {symbol}</p>
            {orders.length === 0 ? (
              <EmptyState message="No orders for this asset yet." />
            ) : (
              <div>
                {orders.map((order) => (
                  <div key={order.id} className="flex gap-6 py-3 border-b border-white/[0.05] text-sm">
                    <span className="text-white/40 text-xs w-24 flex-shrink-0">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.side === 'buy' ? 'bg-buy/10 text-buy' : 'bg-loss/10 text-loss'
                    }`}>
                      {order.side.toUpperCase()}
                    </span>
                    <span className="text-white/60 num">{order.units} units</span>
                    <span className="text-white/60 num">${fmt(order.priceAtOrder)}</span>
                    <span className="text-white font-medium num ml-auto">${fmt(order.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trade panel */}
        <div className="card p-6 self-start sticky top-24">
          {holding && (
            <div className="bg-navy-raised rounded-xl p-4 mb-5">
              <p className="text-xs text-white/50">You own</p>
              <p className="text-white font-medium mt-0.5">{holding.units.toFixed(4)} units</p>
              <p className="text-xs text-white/40 mt-0.5">Avg buy: ${fmt(holding.avgBuyPrice)}</p>
            </div>
          )}

          <div className="bg-navy-base rounded-xl p-1 flex mb-5">
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                side === 'buy' ? 'bg-buy text-navy-base' : 'text-white/50 hover:text-white'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                side === 'sell' ? 'bg-loss text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              Sell
            </button>
          </div>

          <label className="text-xs text-white/50 mb-2 block">Number of units</label>
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            placeholder="0.00"
            className="bg-navy-raised border border-white/[0.13] rounded-lg px-4 py-3 text-white num text-sm w-full focus:outline-none focus:border-accent/50"
          />

          <div className="bg-navy-raised rounded-xl p-4 my-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Price per unit</span>
              <span className="text-white num">${fmt(currentPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">{side === 'buy' ? 'Total cost' : "You'll receive"}</span>
              <span className="text-white font-medium num">${fmt(total)}</span>
            </div>
          </div>

          <p className="text-xs text-white/40 mb-4">
            Available: ${fmt(balance.available)}
          </p>

          {tradeError && <p className="text-loss text-xs mb-3">{tradeError}</p>}

          <button
            onClick={handleTrade}
            disabled={tradeLoading}
            className={`w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-60 ${
              side === 'buy'
                ? 'bg-buy text-navy-base hover:bg-buy/90'
                : 'bg-loss text-white hover:bg-loss/90'
            }`}
          >
            {tradeLoading && <Spinner size={14} />}
            {side === 'buy' ? `Buy ${symbol}` : `Sell ${symbol}`}
          </button>
        </div>
      </div>
    </div>
  )
}





