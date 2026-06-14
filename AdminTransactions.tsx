import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { onAllTransactions, adminApproveDeposit, adminRejectDeposit, adminApproveWithdrawal, adminRejectWithdrawal } from './firestore'
import { StatusBadge } from './StatusBadge'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'
import { Toast } from './Toast'
import type { Transaction } from './types'

type FilterTab = 'all' | 'pending' | 'deposit' | 'withdrawal' | 'approved' | 'rejected'
type SortMode = 'newest' | 'oldest' | 'highest' | 'lowest'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}

export function AdminTransactions() {
  const [txs, setTxs] = useState<Transaction[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [sort, setSort] = useState<SortMode>('newest')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [actionMap, setActionMap] = useState<Record<string, { type: 'approve' | 'reject'; note: string; loading: boolean }>>({})

  useEffect(() => {
    return onAllTransactions(setTxs)
  }, [])

  const filtered = txs
    .filter((tx) => {
      if (filter === 'pending') return tx.status === 'pending'
      if (filter === 'approved') return tx.status === 'approved'
      if (filter === 'rejected') return tx.status === 'rejected'
      if (filter === 'deposit') return tx.type === 'deposit'
      if (filter === 'withdrawal') return tx.type === 'withdrawal'
      return true
    })
    .filter((tx) => !search || tx.userName?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'newest') return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      if (sort === 'oldest') return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      if (sort === 'highest') return b.amount - a.amount
      return a.amount - b.amount
    })

  async function handleAction(tx: Transaction, type: 'approve' | 'reject') {
    const note = actionMap[tx.id]?.note || ''
    setActionMap((p) => ({ ...p, [tx.id]: { ...p[tx.id], loading: true } }))
    try {
      if (type === 'approve') {
        if (tx.type === 'deposit') await adminApproveDeposit(tx.id, tx.userId, tx.amount, note)
        else await adminApproveWithdrawal(tx.id, tx.userId, tx.amount, note)
      } else {
        if (tx.type === 'deposit') await adminRejectDeposit(tx.id, note)
        else await adminRejectWithdrawal(tx.id, tx.userId, tx.amount, note)
      }
      setActionMap((p) => { const n = { ...p }; delete n[tx.id]; return n })
      setToast(`Transaction ${type === 'approve' ? 'approved' : 'rejected'}`)
    } catch {
      setActionMap((p) => ({ ...p, [tx.id]: { ...p[tx.id], loading: false } }))
    }
  }

  const filterTabs: FilterTab[] = ['all', 'pending', 'deposit', 'withdrawal', 'approved', 'rejected']
  const sortOptions: { value: SortMode; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'highest', label: 'Highest Amount' },
    { value: 'lowest', label: 'Lowest Amount' },
  ]

  return (
    <div>
      {toast && <Toast message={toast} type="success" onClose={() => setToast('')} />}

      <h1 className="text-2xl font-medium tracking-tight text-white mb-6">Transactions</h1>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="bg-navy-raised rounded-xl p-1 flex gap-1">
          {filterTabs.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize transition ${
                filter === t ? 'bg-accent text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user…"
          className="bg-navy-raised border border-white/[0.07] rounded-lg px-4 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent/50 w-44"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="bg-navy-raised border border-white/[0.07] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none ml-auto"
        >
          {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] items-center px-6 py-3 border-b border-white/[0.07] text-xs text-white/40 uppercase tracking-wider">
          <span>User</span>
          <span>Type</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Note</span>
          <span>Actions</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState message="No transactions match your filters." />
        ) : (
          filtered.map((tx) => (
            <div key={tx.id}>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] items-center px-6 py-4 border-b border-white/[0.05] hover:bg-navy-raised/30 transition gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium flex-shrink-0">
                    {(tx.userName || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{tx.userName}</p>
                    <p className="text-xs text-white/30">{formatDate(tx.createdAt)}</p>
                  </div>
                  <Link to={`/admin/users/${tx.userId}`} className="text-accent/60 hover:text-accent ml-1 flex-shrink-0">
                    <span className="text-xs">↗</span>
                  </Link>
                </div>
                <span className={`text-xs capitalize font-medium ${tx.type === 'deposit' ? 'text-gain' : 'text-yellow-400'}`}>
                  {tx.type}
                </span>
                <span className="num text-white font-medium text-sm">${fmt(tx.amount)}</span>
                <StatusBadge status={tx.status} />
                <span className="text-xs text-white/40 truncate">{tx.note || '—'}</span>

                <div className="flex gap-1.5">
                  {tx.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => setActionMap((p) => ({ ...p, [tx.id]: { type: 'approve', note: p[tx.id]?.note || '', loading: false } }))}
                        className="text-xs bg-gain/10 text-gain px-2 py-1 rounded-lg hover:bg-gain hover:text-white transition whitespace-nowrap"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => setActionMap((p) => ({ ...p, [tx.id]: { type: 'reject', note: p[tx.id]?.note || '', loading: false } }))}
                        className="text-xs bg-loss/10 text-loss px-2 py-1 rounded-lg hover:bg-loss hover:text-white transition whitespace-nowrap"
                      >
                        ✗ Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-white/30 italic">{tx.adminNote || '—'}</span>
                  )}
                </div>
              </div>

              {actionMap[tx.id] && (
                <div className="bg-navy-raised mx-4 rounded-xl p-4 mb-3">
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
                      Confirm {actionMap[tx.id].type === 'approve' ? 'Approve' : 'Reject'}
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
    </div>
  )
}





