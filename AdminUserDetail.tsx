import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import {
  getUserDoc,
  getUserTransactions,
  getUserHoldings,
  getAllBalances,
  changeUserRole,
  adminApproveDeposit,
  adminRejectDeposit,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
  onAssets,
} from './firestore'
import { StatusBadge } from './StatusBadge'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'
import { Toast } from './Toast'
import type { UserDoc, Balance, Transaction, Holding, Asset } from './types'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AdminUserDetail() {
  const { uid } = useParams<{ uid: string }>()
  const [user, setUser] = useState<UserDoc | null>(null)
  const [balance, setBalance] = useState<Balance>({ available: 0, locked: 0, total: 0 })
  const [txs, setTxs] = useState<Transaction[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [priceMap, setPriceMap] = useState<Record<string, Asset>>({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [roleLoading, setRoleLoading] = useState(false)
  const [actionMap, setActionMap] = useState<Record<string, { type: 'approve' | 'reject'; note: string; loading: boolean }>>({})

  useEffect(() => {
    if (!uid) return
    const unsubAssets = onAssets((assets) => {
      const map: Record<string, Asset> = {}
      assets.forEach((a) => { map[a.symbol] = a })
      setPriceMap(map)
    })

    async function load() {
      const [u, balances, t, h] = await Promise.all([
        getUserDoc(uid!),
        getAllBalances(),
        getUserTransactions(uid!),
        getUserHoldings(uid!),
      ])
      setUser(u)
      setBalance(balances[uid!] || { available: 0, locked: 0, total: 0 })
      setTxs(t)
      setHoldings(h)
      setLoading(false)
    }
    load()
    return unsubAssets
  }, [uid])

  async function handleRoleChange() {
    if (!uid || !user) return
    setRoleLoading(true)
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    await changeUserRole(uid, newRole)
    setUser({ ...user, role: newRole })
    setRoleLoading(false)
    setToast(`Role changed to ${newRole}`)
  }

  async function handleAction(tx: Transaction, type: 'approve' | 'reject') {
    setActionMap((prev) => ({ ...prev, [tx.id]: { type, note: prev[tx.id]?.note || '', loading: true } }))
    const note = actionMap[tx.id]?.note || ''
    try {
      if (type === 'approve') {
        if (tx.type === 'deposit') await adminApproveDeposit(tx.id, tx.userId, tx.amount, note)
        else await adminApproveWithdrawal(tx.id, tx.userId, tx.amount, note)
      } else {
        if (tx.type === 'deposit') await adminRejectDeposit(tx.id, note)
        else await adminRejectWithdrawal(tx.id, tx.userId, tx.amount, note)
      }
      setTxs((prev) => prev.map((t) => t.id === tx.id ? { ...t, status: type === 'approve' ? 'approved' : 'rejected', adminNote: note } : t))
      setActionMap((prev) => { const n = { ...prev }; delete n[tx.id]; return n })
      setToast(`Transaction ${type === 'approve' ? 'approved' : 'rejected'}`)
    } catch (err) {
      setActionMap((prev) => ({ ...prev, [tx.id]: { ...prev[tx.id], loading: false } }))
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner size={32} className="text-accent" /></div>
  }

  if (!user) return <div className="text-white/40">User not found.</div>

  return (
    <div>
      {toast && <Toast message={toast} type="success" onClose={() => setToast('')} />}

      <Link to="/admin/users" className="flex items-center gap-1 text-white/40 text-sm hover:text-white mb-6 w-fit transition">
        <ChevronLeft className="w-4 h-4" />
        Back to Users
      </Link>

      {/* Profile card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-accent/20 text-accent text-xl font-medium flex items-center justify-center">
            {(user.name || user.email || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-xl font-medium text-white">{user.name || 'No name'}</p>
            <p className="text-white/50 text-sm">{user.email}</p>
            <p className="text-white/30 text-xs mt-0.5">{user.country || 'No country'} · Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-white/5 text-white/50'}`}>
              {user.role}
            </span>
            <button onClick={handleRoleChange} disabled={roleLoading} className="btn-ghost text-xs py-1.5 flex items-center gap-1.5 disabled:opacity-60">
              {roleLoading && <Spinner size={12} />}
              Change role
            </button>
          </div>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Available', value: balance.available, color: 'text-white' },
          { label: 'Locked', value: balance.locked, color: 'text-yellow-400' },
          { label: 'Total Deposited', value: balance.total, color: 'text-white' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-5">
            <p className="text-xs text-white/40">{label}</p>
            <p className={`text-2xl font-medium num mt-1 ${color}`}>${fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-medium text-white mb-4">Transaction History</h2>
        {txs.length === 0 ? (
          <EmptyState message="No transactions." />
        ) : (
          txs.map((tx) => (
            <div key={tx.id}>
              <div className="flex items-center gap-4 py-3 border-b border-white/[0.05]">
                <div className={`text-xs px-2 py-0.5 rounded capitalize ${tx.type === 'deposit' ? 'text-gain' : 'text-yellow-400'}`}>
                  {tx.type}
                </div>
                <span className="num text-sm text-white font-medium">${fmt(tx.amount)}</span>
                <StatusBadge status={tx.status} />
                <span className="text-xs text-white/40 flex-1">{tx.note || '—'}</span>
                {tx.adminNote && <span className="text-xs text-white/30 italic">{tx.adminNote}</span>}
                <span className="text-xs text-white/30">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—'}</span>
                {tx.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActionMap((p) => ({ ...p, [tx.id]: { type: 'approve', note: p[tx.id]?.note || '', loading: false } }))}
                      className="text-xs bg-gain/10 text-gain px-2.5 py-1 rounded-lg hover:bg-gain hover:text-white transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setActionMap((p) => ({ ...p, [tx.id]: { type: 'reject', note: p[tx.id]?.note || '', loading: false } }))}
                      className="text-xs bg-loss/10 text-loss px-2.5 py-1 rounded-lg hover:bg-loss hover:text-white transition"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
              {actionMap[tx.id] && (
                <div className="bg-navy-raised rounded-xl p-4 mt-2 mb-2">
                  <textarea
                    value={actionMap[tx.id].note}
                    onChange={(e) => setActionMap((p) => ({ ...p, [tx.id]: { ...p[tx.id], note: e.target.value } }))}
                    placeholder="Admin note (optional)"
                    className="text-sm text-white/70 bg-navy-base border border-white/[0.07] rounded-lg p-3 resize-none h-16 w-full focus:outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleAction(tx, actionMap[tx.id].type)}
                      disabled={actionMap[tx.id].loading}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 disabled:opacity-60 ${
                        actionMap[tx.id].type === 'approve'
                          ? 'bg-gain text-white hover:bg-gain/90'
                          : 'bg-loss text-white hover:bg-loss/90'
                      }`}
                    >
                      {actionMap[tx.id].loading && <Spinner size={12} />}
                      Confirm {actionMap[tx.id].type}
                    </button>
                    <button
                      onClick={() => setActionMap((p) => { const n = { ...p }; delete n[tx.id]; return n })}
                      className="btn-ghost text-xs py-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Holdings */}
      <div className="card p-6">
        <h2 className="text-sm font-medium text-white mb-4">Holdings</h2>
        {holdings.length === 0 ? (
          <EmptyState message="No positions." />
        ) : (
          holdings.map((h) => {
            const price = priceMap[h.symbol]?.currentPrice || h.avgBuyPrice
            const value = h.units * price
            const pnl = (price - h.avgBuyPrice) * h.units
            return (
              <div key={h.symbol} className="flex items-center gap-4 py-3 border-b border-white/[0.05]">
                <div className="w-8 h-8 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium">
                  {h.symbol[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{h.symbol}</p>
                  <p className="text-xs text-white/40">{h.units.toFixed(4)} units · avg ${fmt(h.avgBuyPrice)}</p>
                </div>
                <p className="num text-sm text-white">${fmt(value)}</p>
                <p className={`num text-xs ${pnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {pnl >= 0 ? '+' : ''}${fmt(Math.abs(pnl))}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}





