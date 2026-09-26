import { useEffect, useId, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Asset } from './types'
import type { PriceRange } from './usePriceChart'
import { usePriceChart } from './usePriceChart'

function fmt(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-raised border border-white/[0.13] rounded-lg p-3 text-sm text-white num">
      ${fmt(payload[0].value)}
    </div>
  )
}

function CandlestickChart({ data, height }: { data: ReturnType<typeof usePriceChart>['data']; height: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: 'rgba(255,255,255,0.65)' },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: true, secondsVisible: false },
    })
    const series = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })
    chartRef.current = chart
    seriesRef.current = series

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current) return
    seriesRef.current.setData(data.map((candle) => ({
      time: Math.floor(candle.time / 1000) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    })))
    chartRef.current?.timeScale().fitContent()
  }, [data])

  return <div ref={containerRef} role="img" aria-label={`${data.length} ${'price'} candlesticks`} style={{ width: '100%', height }} />
}

export function StockPriceChart({
  symbol,
  range,
  asset,
  now,
  height = 280,
  showAxes = true,
  chartType = 'line',
}: {
  symbol: string
  range: PriceRange
  asset: Asset | null
  now?: number
  height?: number
  showAxes?: boolean
  chartType?: 'line' | 'candlestick'
}) {
  const { data, loading, error, warning } = usePriceChart(symbol, range, asset, now)
  const gradientId = `price-gradient-${useId().replace(/:/g, '')}`

  if (loading && data.length === 0) {
    return <div role="status" className="flex items-center justify-center text-xs text-white/45" style={{ height }}>Loading real market history…</div>
  }

  if (data.length === 0) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-2 px-4 text-center text-xs text-white/50" style={{ height }}>
        <span>{error || 'Historical market prices are not available yet.'}</span>
        {symbol === 'TSLA' && (
          <span className="text-white/35">Live quotes and chart history require a working Finnhub API key on the price server.</span>
        )}
      </div>
    )
  }

  return (
    <div>
      {warning && <p role="status" className="mb-2 text-xs text-amber-300/80">{warning} Showing available historical candles.</p>}
      {chartType === 'candlestick' ? (
        <CandlestickChart data={data} height={height} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            {showAxes && (
              <>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                  width={60}
                />
                <Tooltip content={<ChartTooltip />} />
              </>
            )}
            <Area
              type="monotone"
              dataKey="close"
              stroke="#06b6d4"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}