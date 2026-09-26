import { Link } from 'react-router-dom'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { useAuth } from './AuthContext'
import { useBalance } from './useBalance'
import { useAssets } from './useAssets'
import { useHoldings } from './useHoldings'
import { useTransactions } from './useTransactions'
import { PriceChange } from './PriceChange'
import { StatusBadge } from './StatusBadge'
import { EmptyState } from './EmptyState'
import { StockPriceChart } from './StockPriceChart'
import { isTslaPriceFresh } from './priceUtils'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function Dashboard() {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid
  const balance = useBalance(uid)
  const { assets, priceMap, now } = useAssets()
  const holdings = useHoldings(uid)
  const txs = useTransactions(uid, 5)

  const tslaAsset = priceMap['TSLA']
  const tslaLive = isTslaPriceFresh(tslaAsset, now)
  const tslaPrice = tslaLive ? tslaAsset!.currentPrice : null
  const hasUnavailableHolding = holdings.some((holding) => holding.symbol === 'TSLA' && !tslaLive)

  const investedValue = holdings.reduce((sum, h) => {
    if (h.symbol === 'TSLA' && !tslaLive) return sum
    const price = priceMap[h.symbol]?.currentPrice || 0
    return sum + h.units * price
  }, 0)

  const costBasis = holdings.reduce((sum, h) => sum + h.units * h.avgBuyPrice, 0)
  const pnl = investedValue - costBasis
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
  const totalValue = hasUnavailableHolding ? null : balance.available + investedValue

  return (
    <div className="space-y-6">
      {/* Portfolio hero */}
      <div className="card p-5 sm:p-8">
        <div className="flex items-start justify-between flex-wrap gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-white/50 text-xs tracking-widest uppercase mb-2">Total Portfolio Value</p>
            <p className="text-4xl font-medium tracking-tight num text-white">
              {totalValue === null ? 'Unavailable' : `$${fmt(totalValue)}`}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {hasUnavailableHolding
                ? <span className="text-xs text-white/40">Live TSLA price unavailable; portfolio value is not current.</span>
                : <span className={`text-sm num ${pnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {pnl >= 0 ? '+' : ''}${fmt(Math.abs(pnl))} ({pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                  </span>
              }
              <span className="text-white/30 text-xs">all-time P&L</span>
            </div>
          </div>
          <div className="flex gap-6 sm:gap-8 flex-wrap">
            <div>
              <p className="text-xs text-white/50">Available</p>
              <p className="text-sm font-medium text-white num mt-1">${fmt(balance.available)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Invested</p>
              <p className="text-sm font-medium text-white num mt-1">
                {hasUnavailableHolding ? 'Unavailable' : `$${fmt(investedValue)}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-w-0">
        {/* Balance cards */}
        <div className="space-y-4">
          {[
            { label: 'Available Balance', value: balance.available, color: 'bg-gain', textColor: 'text-white' },
            { label: 'Locked (Pending)', value: balance.locked, color: 'bg-yellow-400', textColor: 'text-yellow-400' },
            { label: 'Total Deposited', value: balance.total, color: 'bg-white/30', textColor: 'text-white' },
          ].map(({ label, value, color, textColor }) => (
            <div key={label} className="card p-5 flex items-center gap-4">
              <div className={`w-1 h-8 rounded-full ${color} flex-shrink-0`} />
              <div className="flex-1">
                <p className="text-white/50 text-xs">{label}</p>
                <p className={`text-xl font-medium num mt-0.5 ${textColor}`}>${fmt(value)}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <Link to="/wallet" className="btn-primary flex-1 text-center text-xs py-2">Deposit</Link>
            <Link to="/wallet" className="btn-ghost flex-1 text-center text-xs py-2">Withdraw</Link>
          </div>
        </div>

        {/* Chart */}
        <div className="xl:col-span-2 card p-4 sm:p-6 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="font-medium text-white text-sm">TSLA</span>
              <span className="text-white/40 text-xs ml-2">Tesla Inc.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white font-medium num">{tslaPrice === null ? 'Unavailable' : `$${fmt(tslaPrice)}`}</span>
              {tslaLive && tslaAsset && <PriceChange value={tslaAsset.change24h} showIcon className="text-xs" />}
              <Link to="/markets/TSLA" className="text-accent text-xs hover:underline">View →</Link>
            </div>
          </div>
          <StockPriceChart symbol="TSLA" range="1D" asset={tslaAsset || null} now={now} height={160} showAxes={false} />
        </div>
      </div>

      {/* Top assets */}
      <div>
        <p className="text-sm font-medium text-white mb-3">Top Assets</p>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {assets.map((asset) => (
            <Link
              key={asset.symbol}
              to={`/markets/${asset.symbol}`}
              className="bg-navy-raised border border-white/[0.07] rounded-xl p-4 flex-shrink-0 w-44 hover:border-white/20 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{asset.symbol}</span>
                <span className="text-xs text-white/50">{asset.name.split(' ')[0]}</span>
              </div>
              <p className="text-base num text-white">
                {asset.symbol === 'TSLA' && !tslaLive ? 'Unavailable' : `$${fmt(asset.currentPrice)}`}
              </p>
              {asset.symbol === 'TSLA' && !tslaLive
                ? <p className="text-xs text-loss mt-1">{asset.priceError || 'Stale or unavailable'}</p>
                : <PriceChange value={asset.change24h} className="text-xs mt-1" />
              }
              <div className={`mt-3 h-0.5 rounded-full ${asset.change24h >= 0 ? 'bg-gain' : 'bg-loss'} opacity-60`} />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm font-medium text-white">Recent Activity</p>
          <Link to="/wallet" className="text-accent text-xs hover:underline">View all →</Link>
        </div>
        {txs.length === 0 ? (
          <EmptyState message="No transactions yet. Make your first deposit." />
        ) : (
          <div>
            {txs.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 flex-wrap py-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-3 min-w-0">
                  {tx.type === 'deposit'
                    ? <ArrowDownCircle className="w-5 h-5 text-gain" />
                    : <ArrowUpCircle className="w-5 h-5 text-white/30" />
                  }
                  <div>
                    <p className="text-sm text-white capitalize">{tx.type}</p>
                    <p className="text-xs text-white/40">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <span className="num text-sm text-white">${fmt(tx.amount)}</span>
                  <StatusBadge status={tx.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}





