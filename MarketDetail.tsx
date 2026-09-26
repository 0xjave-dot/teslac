import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ResponsiveContainer } from 'recharts'
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
import { ChevronLeft, Info } from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './AuthContext'
import { useAssets } from './useAssets'
import { useBalance } from './useBalance'
import { onHoldings, onOrders, placeBuyOrder, placeSellOrder } from './firestore'
import type { AdvancedOrderOptions } from './firestore'
import { PriceChange } from './PriceChange'
import { getPriceApiBase } from './priceUtils'
import { AssetLogo } from './AssetLogo'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'
import { Toast } from './Toast'
import type { Asset, Holding, Order, OrderType } from './types'

type TimeTab = '1H' | '1D' | '1W' | '1M'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

const CandlestickShape = (props: any) => {
  const { x, y, width, height, yAxis } = props
  const { open, close, high, low } = props.payload || {}
  if (!yAxis || open === undefined || close === undefined || high === undefined || low === undefined) return null

  const yScale = yAxis.scale
  const yOpen = yScale(open)
  const yClose = yScale(close)
  const yHigh = yScale(high)
  const yLow = yScale(low)

  const isUp = close >= open
  const color = isUp ? '#10b981' : '#ef4444'
  const centerX = x + width / 2

  return (
    <g>
      <line
        x1={centerX}
        y1={yHigh}
        x2={centerX}
        y2={yLow}
        stroke={color}
        strokeWidth={1.5}
      />
      <rect
        x={x}
        y={Math.min(yOpen, yClose)}
        width={width}
        height={Math.max(1, Math.abs(yOpen - yClose))}
        fill={isUp ? 'transparent' : color}
        stroke={color}
        strokeWidth={1.5}
      />
    </g>
  )
}

const CandlestickTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-navy-raised border border-white/[0.13] rounded-lg p-3 text-xs text-white num space-y-1">
        <p className="font-medium text-white/50 text-[10px] uppercase tracking-wider mb-1">{data.time}</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span className="text-white/40">Open:</span> <span className="text-white font-medium">${fmt(data.open)}</span>
          <span className="text-white/40 font-medium">High:</span> <span className="text-gain font-medium">${fmt(data.high)}</span>
          <span className="text-white/40 font-medium">Low:</span> <span className="text-loss font-medium">${fmt(data.low)}</span>
          <span className="text-white/40">Close:</span> <span className="text-white font-medium">${fmt(data.close)}</span>
        </div>
      </div>
    )
  }
  return null
}

export function MarketDetail() {
  const params = useParams<{ symbol: string }>()
  const symbol = params.symbol?.toUpperCase() || ''
  const { currentUser, userDoc } = useAuth()
  const uid = currentUser?.uid
  const balance = useBalance(uid)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<TimeTab>('1D')
  const [chartType, setChartType] = useState<'line' | 'bar' | 'candlestick'>('line')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [units, setUnits] = useState('')
  const [orderType, setOrderType] = useState<OrderType>('market')
  const [leverage, setLeverage] = useState(1)
  const [limitPrice, setLimitPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [expiry, setExpiry] = useState('')
  const [tradeLoading, setTradeLoading] = useState(false)
  const [tradeError, setTradeError] = useState('')
  const [toast, setToast] = useState('')
  const prevPrice = useRef<number | null>(null)
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null)

  const [chartData, setChartData] = useState<Array<{ time: string; price?: number; open?: number; high?: number; low?: number; close?: number }>>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)
  const [chartReloadKey, setChartReloadKey] = useState(0)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const chartContainerRef = useRef<HTMLDivElement | null>(null)

  const { assets, priceMap } = useAssets()
  const assetsRef = useRef(assets)
  assetsRef.current = assets

  useEffect(() => {
    if (!symbol) return
    let active = true

    const updateAsset = (nextAsset: Asset) => {
      if (!active) return
      const newPrice = nextAsset.currentPrice
      if (prevPrice.current !== null && newPrice !== prevPrice.current) {
        setPriceFlash(newPrice > prevPrice.current ? 'up' : 'down')
        setTimeout(() => setPriceFlash(null), 900)
      }
      prevPrice.current = newPrice
      setAsset(nextAsset)
    }

    const unsubscribe = onSnapshot(doc(db, 'assets', symbol), (snap) => {
      if (!active) return
      if (snap.exists()) {
        const data = snap.data() as Asset
        updateAsset({
          ...data,
          symbol,
          name: data.name || symbol,
          type: data.type || 'stock',
          priceSource: data.priceSource || 'finnhub',
        })
      } else {
        const fallback = assetsRef.current.find((a) => a.symbol === symbol)
        if (fallback) {
          updateAsset(fallback)
        }
      }
    }, (error) => {
      console.error('Asset listener error:', error)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [symbol])

  useEffect(() => {
    if (!symbol) return
    const p = priceMap[symbol]
    if (!p) return
    const newPrice = p.currentPrice
    if (prevPrice.current !== null && newPrice !== prevPrice.current) {
      setPriceFlash(newPrice > prevPrice.current ? 'up' : 'down')
      setTimeout(() => setPriceFlash(null), 900)
    }
    prevPrice.current = newPrice
    setAsset((a) => a ? { ...a, currentPrice: newPrice, change24h: p.change24h } : { symbol, name: symbol, currentPrice: newPrice, change24h: p.change24h, type: 'stock', priceSource: 'finnhub' })
  }, [priceMap, symbol])

  useEffect(() => {
    if (!uid) return
    const unsub1 = onHoldings(uid, setHoldings)
    const unsub2 = onOrders(uid, symbol!, setOrders)
    return () => { unsub1(); unsub2() }
  }, [uid, symbol])

  useEffect(() => {
    if (!symbol) return
    let active = true
    async function loadChart() {
      setChartLoading(true)
      setChartError(null)
      try {
        const apiBase = getPriceApiBase()
        const res = await fetch(`${apiBase}/historical/${symbol}?timeframe=${tab}`)
        if (!active) return
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          setChartError(`Price server returned ${res.status}` + (text ? `: ${text}` : ''))
          return
        }
        const data = await res.json()
        setChartData(data)
      } catch (err: unknown) {
        console.error('Error loading chart:', err)
        setChartError(String(err))
      } finally {
        if (active) setChartLoading(false)
      }
    }
    loadChart()
    return () => { active = false }
  }, [symbol, tab, chartReloadKey])


  const holding = holdings.find((h) => h.symbol === symbol)
  const currentPrice = asset?.currentPrice || 0

  const displayChartData = useMemo(() => {
    if (chartData.length === 0) return []
    const copy = [...chartData]
    if (currentPrice > 0) {
      const last = copy[copy.length - 1] || {}
      copy[copy.length - 1] = {
        ...last,
        price: currentPrice,
        close: currentPrice,
      }
    }
    return copy
  }, [chartData, currentPrice])

  // Map displayChartData to lightweight-charts datasets with approximate timestamps
  const lwcSeries = useMemo(() => {
    if (displayChartData.length === 0) return { candles: [], line: [] }
    const now = Date.now()
    let intervalMs = 5 * 60 * 1000
    if (tab === '1H') intervalMs = 2 * 60 * 1000
    else if (tab === '1D') intervalMs = 5 * 60 * 1000
    else if (tab === '1W') intervalMs = 60 * 60 * 1000
    else if (tab === '1M') intervalMs = 24 * 60 * 60 * 1000

    const n = displayChartData.length
    const candles: Array<{ time: UTCTimestamp; open: number; high: number; low: number; close: number }> = []
    const line: Array<{ time: UTCTimestamp; value: number }> = []
    for (let i = 0; i < n; i++) {
      const pt = displayChartData[i]
      const ts = Math.floor((now - (n - 1 - i) * intervalMs) / 1000)
      const open = (pt.open ?? pt.price ?? pt.close ?? 0)
      const close = (pt.close ?? pt.price ?? open)
      const high = pt.high ?? Math.max(open, close)
      const low = pt.low ?? Math.min(open, close)
      candles.push({ time: ts as UTCTimestamp, open, high, low, close })
      line.push({ time: ts as UTCTimestamp, value: pt.price ?? close })
    }
    return { candles, line }
  }, [displayChartData, tab])

  // Create chart once when container mounts
  useEffect(() => {
    if (!chartContainerRef.current) return
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: 'rgba(255,255,255,0.9)' },
      rightPriceScale: { visible: true },
      timeScale: { timeVisible: true, secondsVisible: false },
    })
    chartRef.current = chart
    candleSeriesRef.current = chart.addCandlestickSeries({ upColor: '#10b981', downColor: '#ef4444', borderVisible: true, wickVisible: true })
    lineSeriesRef.current = chart.addLineSeries({ color: '#06b6d4', lineWidth: 2 })

    return () => {
      try { chart.remove() } catch (e) { /* ignore */ }
      chartRef.current = null
      candleSeriesRef.current = null
      lineSeriesRef.current = null
    }
  }, [])

  // Update series data and visibility
  useEffect(() => {
    if (!chartRef.current) return
    try {
      if (candleSeriesRef.current) candleSeriesRef.current.setData(lwcSeries.candles)
      if (lineSeriesRef.current) lineSeriesRef.current.setData(lwcSeries.line)

      if (chartType === 'candlestick') {
        candleSeriesRef.current?.applyOptions({ visible: true })
        lineSeriesRef.current?.applyOptions({ visible: false })
      } else if (chartType === 'line') {
        candleSeriesRef.current?.applyOptions({ visible: false })
        lineSeriesRef.current?.applyOptions({ visible: true })
      } else {
        // bar: use line series for now
        candleSeriesRef.current?.applyOptions({ visible: false })
        lineSeriesRef.current?.applyOptions({ visible: true })
      }
      chartRef.current.timeScale().fitContent()
    } catch (e) {
      // ignore chart update errors
    }
  }, [lwcSeries, chartType])

  const effectivePrice = orderType === 'market' ? currentPrice : (parseFloat(limitPrice) || currentPrice)
  const unitsNum = parseFloat(units) || 0
  const marginRequired = unitsNum * effectivePrice
  const total = marginRequired * leverage

  async function handleTrade() {
    if (!uid || !symbol || !asset) return
    setTradeError('')
    if (unitsNum <= 0) { setTradeError('Enter a valid number of units'); return }
    if ((orderType === 'limit' || orderType === 'stop-limit') && !limitPrice) {
      setTradeError('Enter a limit price for this order type'); return
    }
    if ((orderType === 'stop' || orderType === 'stop-limit') && !stopPrice) {
      setTradeError('Enter a stop price for this order type'); return
    }

    if (side === 'buy' && balance.available < marginRequired) {
      setTradeError('Insufficient balance (margin required: $' + marginRequired.toFixed(2) + ')')
      return
    }
    if (side === 'sell' && (!holding || holding.units < unitsNum)) {
      setTradeError('Not enough units to sell')
      return
    }

    const opts: AdvancedOrderOptions = {
      orderType,
      leverage,
      limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
      stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
      expiresAt: expiry ? new Date(expiry) : null,
    }

    setTradeLoading(true)
    try {
      const name = userDoc?.name || currentUser?.displayName || 'User'
      if (side === 'buy') {
        await placeBuyOrder(uid, name, symbol, asset.name, unitsNum, currentPrice, opts)
      } else {
        await placeSellOrder(uid, name, symbol, asset.name, unitsNum, currentPrice, opts)
      }
      setToast(`${side === 'buy' ? 'Bought' : 'Sold'} ${unitsNum} ${symbol} @ $${effectivePrice.toFixed(2)}`)
      setUnits('')
      setLimitPrice('')
      setStopPrice('')
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-w-0">
        <div className="xl:col-span-2 min-w-0">
          {/* Asset header */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <AssetLogo symbol={symbol} name={asset.name} size={40} />
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
                  {asset.priceSource === 'finnhub' ? 'Finnhub' : 'Live'}
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="card p-4 sm:p-6 mt-6 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex gap-4">
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
              <div className="bg-navy-raised rounded-lg p-0.5 flex gap-0.5 border border-white/[0.05]">
                {(['line', 'bar', 'candlestick'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-2.5 py-1 text-xs rounded-md capitalize transition ${
                      chartType === type
                        ? 'bg-accent text-white font-medium shadow-sm'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            {chartError && (
              <div className="mb-4 text-center text-sm text-white/60">
                <div>Price server unavailable: {chartError}</div>
                <div className="mt-2">
                  <button onClick={() => setChartReloadKey(k => k + 1)} className="px-3 py-1 rounded bg-accent text-white text-xs">Retry</button>
                </div>
              </div>
            )}
            <div className="w-full" style={{ height: 280 }}>
              <div ref={(el) => chartContainerRef.current = el} className="w-full h-full" />
              {chartLoading && chartData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner size={24} className="text-accent" />
                </div>
              )}
            </div>
          </div>

          {/* Order history */}
          <div className="card mt-6 p-6">
            <p className="text-sm font-medium text-white mb-4">Your Orders — {symbol}</p>
            {orders.length === 0 ? (
              <EmptyState message="No orders for this asset yet." />
            ) : (
              <div className="space-y-0">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center gap-3 py-3 border-b border-white/[0.05] text-sm flex-wrap">
                    <span className="text-white/30 text-xs w-20 flex-shrink-0">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      order.side === 'buy' ? 'bg-gain/15 text-gain' : 'bg-loss/15 text-loss'
                    }`}>
                      {order.side.toUpperCase()}
                    </span>
                    {order.orderType && order.orderType !== 'market' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-navy-raised text-white/40 border border-white/[0.06] capitalize">
                        {order.orderType}
                      </span>
                    )}
                    {order.leverage > 1 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 font-bold">
                        {order.leverage}x
                      </span>
                    )}
                    <span className="text-white/60 num">{order.units} units</span>
                    <span className="text-white/60 num">@ ${fmt(order.priceAtOrder)}</span>
                    <span className="text-white font-medium num ml-auto">${fmt(order.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trade panel */}
        <div className="card p-4 sm:p-6 self-start xl:sticky xl:top-24 min-w-0">
          {holding && (
            <div className="bg-navy-raised rounded-xl p-3 mb-4 flex items-center gap-3">
              <AssetLogo symbol={symbol} name={asset.name} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/50">Your position</p>
                <p className="text-white font-medium text-sm">{holding.units.toFixed(4)} units</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/30">Avg buy</p>
                <p className="text-xs text-white num">${fmt(holding.avgBuyPrice)}</p>
              </div>
            </div>
          )}

          {/* Buy / Sell toggle */}
          <div className="bg-navy-base rounded-xl p-1 flex mb-4">
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                side === 'buy' ? 'bg-gain text-white shadow' : 'text-white/50 hover:text-white'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                side === 'sell' ? 'bg-loss text-white shadow' : 'text-white/50 hover:text-white'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Order type */}
          <div className="mb-4">
            <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Order Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['market', 'limit', 'stop', 'stop-limit'] as OrderType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={`py-1.5 text-xs rounded-lg capitalize transition font-medium ${
                    orderType === t
                      ? 'bg-accent/20 border border-accent text-accent'
                      : 'bg-navy-raised text-white/40 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-3">
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Quantity (units)</label>
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              placeholder="0.0000"
              className="bg-navy-raised border border-white/[0.1] rounded-lg px-4 py-2.5 text-white num text-sm w-full focus:outline-none focus:border-accent/50"
            />
          </div>

          {/* Limit price — shown for limit / stop-limit */}
          {(orderType === 'limit' || orderType === 'stop-limit') && (
            <div className="mb-3">
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                Limit Price
                <span className="text-white/20 text-[10px] normal-case">— execute at this price or better</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={currentPrice.toFixed(2)}
                  className="bg-navy-raised border border-white/[0.1] rounded-lg pl-7 pr-4 py-2.5 text-white num text-sm w-full focus:outline-none focus:border-accent/50"
                />
              </div>
            </div>
          )}

          {/* Stop price — shown for stop / stop-limit */}
          {(orderType === 'stop' || orderType === 'stop-limit') && (
            <div className="mb-3">
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                Stop Trigger
                <span className="text-white/20 text-[10px] normal-case">— activates order</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                <input
                  type="number"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  placeholder={(currentPrice * (side === 'buy' ? 1.02 : 0.98)).toFixed(2)}
                  className="bg-navy-raised border border-white/[0.1] rounded-lg pl-7 pr-4 py-2.5 text-white num text-sm w-full focus:outline-none focus:border-accent/50"
                />
              </div>
            </div>
          )}

          {/* Leverage */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/40 uppercase tracking-wider">Leverage</label>
              <span className="text-accent text-xs font-bold num">{leverage}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-white/20 mt-0.5">
              <span>1x</span><span>5x</span><span>10x</span>
            </div>
          </div>

          {/* Expiration */}
          <div className="mb-4">
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Expiry (optional)</label>
            <input
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="bg-navy-raised border border-white/[0.1] rounded-lg px-3 py-2.5 text-white/70 text-xs w-full focus:outline-none focus:border-accent/50 [color-scheme:dark]"
            />
          </div>

          {/* Order summary */}
          <div className="bg-navy-raised rounded-xl p-3 mb-4 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-white/40">Market price</span>
              <span className="text-white num">${fmt(currentPrice)}</span>
            </div>
            {orderType !== 'market' && limitPrice && (
              <div className="flex justify-between">
                <span className="text-white/40">Limit price</span>
                <span className="text-accent num">${fmt(parseFloat(limitPrice) || 0)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/40">Units</span>
              <span className="text-white num">{unitsNum.toFixed(4)}</span>
            </div>
            {leverage > 1 && (
              <div className="flex justify-between">
                <span className="text-white/40">Leverage</span>
                <span className="text-yellow-400 font-bold">{leverage}x</span>
              </div>
            )}
            <div className="border-t border-white/[0.07] pt-1.5 flex justify-between">
              <span className="text-white/40">Margin needed</span>
              <span className="text-white font-medium num">${fmt(marginRequired)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Notional value</span>
              <span className="text-white font-semibold num">${fmt(total)}</span>
            </div>
          </div>

          {leverage > 1 && (
            <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-2.5 mb-3 flex gap-2 items-start">
              <Info className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-400/80 leading-relaxed">
                Leveraged trades amplify both gains and losses. You may lose more than your initial margin.
              </p>
            </div>
          )}

          <p className="text-xs text-white/30 mb-3">Available: <span className="text-white/60">${fmt(balance.available)}</span></p>

          {tradeError && <p className="text-loss text-xs mb-3 bg-loss/5 border border-loss/20 rounded-lg px-3 py-2">{tradeError}</p>}

          <button
            onClick={handleTrade}
            disabled={tradeLoading}
            className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60 ${
              side === 'buy'
                ? 'bg-gain text-white hover:bg-gain/90 shadow-lg shadow-gain/20'
                : 'bg-loss text-white hover:bg-loss/90 shadow-lg shadow-loss/20'
            }`}
          >
            {tradeLoading && <Spinner size={14} />}
            {side === 'buy' ? `Buy ${symbol}` : `Sell ${symbol}`}
            {leverage > 1 && <span className="text-[10px] opacity-70 font-normal">({leverage}x)</span>}
          </button>
        </div>
      </div>
    </div>
  )
}





