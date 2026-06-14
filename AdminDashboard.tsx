import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Clock, DollarSign, Activity } from 'lucide-react'
import {
  getAllUsers,
  getAllBalances,
  getRecentSignups,
  getTodayOrderVolume,
  onPendingTransactions,
} from './firestore'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'
import type { Transaction, UserDoc } from './types'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalAUM, setTotalAUM] = useState(0)
  const [todayVolume, setTodayVolume] = useState(0)
  const [pendingTxs, setPendingTxs] = useState<Transaction[]>([])
  const [recentUsers, setRecentUsers] = useState<UserDoc[]>([])

  useEffect(() => {
    const unsubPending = onPendingTransactions(setPendingTxs)
    async function load() {
      const [users, balances, signups, volume] = await Promise.all([
        getAllUsers(),
        getAllBalances(),
        getRecentSignups(8),
        getTodayOrderVolume(),
      ])
      setTotalUsers(users.length)
      setTotalAUM(Object.values(balances).reduce((s, b) => s + b.total, 0))
      setTodayVolume(volume)
      setRecentUsers(signups)
      setLoading(false)
    }
    load()
    return unsubPending
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} className="text-accent" />
      </div>
    )
  }

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, iconColor: 'text-accent', sub: 'Registered accounts' },
    { label: 'Pending Transactions', value: pendingTxs.length, icon: Clock, iconColor: 'text-yellow-400', sub: 'Awaiting review' },
    { label: 'Total AUM', value: `$${fmt(totalAUM)}`, icon: DollarSign, iconColor: 'text-gain', sub: 'Total deposits approved' },
    { label: "Today's Volume", value: `$${fmt(todayVolume)}`, icon: Activity, iconColor: 'text-purple-400', sub: 'Order volume' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, iconColor, sub }) => (
          <div key={label} className="card p-6">
            <div className={`w-10 h-10 rounded-xl bg-navy-raised flex items-center justify-center mb-4`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-medium num text-white mt-2">{value}</p>
            <p className="text-xs text-white/30 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Pending transactions */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-medium text-white">Needs Action</h2>
            {pendingTxs.length > 0 && (
              <span className="bg-yellow-400/10 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
                {pendingTxs.length}
              </span>
            )}
          </div>
          {pendingTxs.length === 0 ? (
            <EmptyState message="No pending transactions." />
          ) : (
            <>
              {pendingTxs.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      tx.type === 'deposit' ? 'bg-gain/10 text-gain' : 'bg-yellow-400/10 text-yellow-400'
                    }`}>
                      {tx.type === 'deposit' ? '↓' : '↑'}
                    </div>
                    <div>
                      <p className="text-sm text-white">{tx.userName}</p>
                      <p className="text-xs text-white/50 num">${tx.amount.toFixed(2)} · {tx.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-pending">Pending</span>
                    <Link to="/admin/transactions" className="text-accent text-xs hover:underline">Review →</Link>
                  </div>
                </div>
              ))}
              {pendingTxs.length > 5 && (
                <Link to="/admin/transactions" className="text-accent text-xs mt-4 block hover:underline">
                  View all {pendingTxs.length} pending →
                </Link>
              )}
            </>
          )}
        </div>

        {/* Recent signups */}
        <div className="card p-6">
          <h2 className="text-sm font-medium text-white mb-4">Recent Signups</h2>
          {recentUsers.length === 0 ? (
            <EmptyState message="No users yet." />
          ) : (
            recentUsers.map((user) => (
              <Link
                key={user.uid}
                to={`/admin/users/${user.uid}`}
                className="flex items-center gap-3 py-3 border-b border-white/[0.05] hover:bg-navy-raised/30 -mx-6 px-6 transition"
              >
                <div className="w-8 h-8 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium flex-shrink-0">
                  {(user.name || user.email || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{user.name || 'No name'}</p>
                  <p className="text-xs text-white/40 truncate">{user.email}</p>
                </div>
                <p className="text-xs text-white/30 flex-shrink-0">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}





