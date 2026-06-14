import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { useAuth } from './AuthContext'
import { useBalance } from './useBalance'
import { useHoldings } from './useHoldings'
import { useAssets } from './useAssets'
import { PriceChange } from './PriceChange'
import { EmptyState } from './EmptyState'

const COLORS = ['#3b7bff', '#06b6d4', '#a855f7', '#f5a623', '#22c55e', '#f43f5e', '#84cc16', '#fb923c']

function fmt(n: number, d = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function Portfolio() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const uid = currentUser?.uid
  const balance = useBalance(uid)
  const holdings = useHoldings(uid)
  const { priceMap } = useAssets()

  const enriched = holdings.map((h) => {
    const price = priceMap[h.symbol]?.currentPrice || h.avgBuyPrice
    const value = h.units * price
    const pnl = (price - h.avgBuyPrice) * h.units
    const pnlPct = h.avgBuyPrice > 0 ? ((price - h.avgBuyPrice) / h.avgBuyPrice) * 100 : 0
    return { ...h, currentPrice: price, value, pnl, pnlPct }
  })

  const totalValue = enriched.reduce((s, h) => s + h.value, 0)
  const totalCost = enriched.reduce((s, h) => s + h.units * h.avgBuyPrice, 0)
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  const pieData = enriched.map((h) => ({ name: h.symbol, value: h.value }))

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="card p-6 flex gap-8 flex-wrap">
        {[
          { label: 'Portfolio Value', value: `$${fmt(totalValue)}`, textColor: 'text-white' },
          {
            label: 'Total P&L',
            value: `${totalPnl >= 0 ? '+' : ''}$${fmt(Math.abs(totalPnl))} (${totalPnlPct >= 0 ? '+' : ''}${fmt(Math.abs(totalPnlPct))}%)`,
            textColor: totalPnl >= 0 ? 'text-gain' : 'text-loss',
          },
          { label: 'Cash Available', value: `$${fmt(balance.available)}`, textColor: 'text-white' },
          { label: 'Holdings', value: `${holdings.length} assets`, textColor: 'text-white' },
        ].map(({ label, value, textColor }) => (
          <div key={label} className="flex-1 min-w-[120px]">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-medium num ${textColor}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Donut chart */}
        <div className="card p-6">
          <p className="text-sm font-medium text-white mb-4">Allocation</p>
          {enriched.length === 0 ? (
            <EmptyState message="No positions yet. Go to Markets to start trading." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={2}
                    label={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {enriched.map((h, i) => (
                  <div key={h.symbol} className="flex items-center gap-2 text-xs text-white/60">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="font-medium text-white">{h.symbol}</span>
                    <span className="ml-auto">{totalValue > 0 ? ((h.value / totalValue) * 100).toFixed(1) : 0}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Holdings table */}
        <div className="col-span-2 card overflow-hidden">
          {enriched.length === 0 ? (
            <EmptyState message="No positions yet." />
          ) : (
            <>
              <div className="grid grid-cols-6 items-center px-6 py-3 border-b border-white/[0.07] text-xs text-white/40 uppercase tracking-wider">
                <span className="col-span-2">Asset</span>
                <span>Units</span>
                <span>Avg Buy</span>
                <span>Current</span>
                <span>P&L</span>
              </div>
              {enriched.map((h) => (
                <div
                  key={h.symbol}
                  onClick={() => navigate(`/markets/${h.symbol}`)}
                  className="grid grid-cols-6 items-center px-6 py-4 border-b border-white/[0.05] hover:bg-navy-raised/40 cursor-pointer"
                >
                  <div className="col-span-2 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      h.type === 'stock' ? 'bg-accent/20 text-accent' : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {h.symbol[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{h.symbol}</p>
                      <p className="text-xs text-white/40">{h.name}</p>
                    </div>
                  </div>
                  <span className="num text-sm text-white">{h.units.toFixed(4)}</span>
                  <span className="num text-sm text-white/60">${fmt(h.avgBuyPrice)}</span>
                  <span className="num text-sm text-white">${fmt(h.currentPrice)}</span>
                  <div>
                    <p className={`text-xs font-medium num ${h.pnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                      {h.pnl >= 0 ? '+' : ''}${fmt(Math.abs(h.pnl))}
                    </p>
                    <p className={`text-xs num ${h.pnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                      {h.pnlPct >= 0 ? '+' : ''}{fmt(Math.abs(h.pnlPct))}%
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}





