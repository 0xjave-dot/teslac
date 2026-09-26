import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, ChevronRight, Search } from 'lucide-react'
import { getAllUsers, getAllBalances } from './firestore'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'
import type { UserDoc, Balance } from './types'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AdminUsers() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserDoc[]>([])
  const [balances, setBalances] = useState<Record<string, Balance>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const [u, b] = await Promise.all([getAllUsers(), getAllBalances()])
    setUsers(u)
    setBalances(b)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-medium tracking-tight text-white">Users</h1>
          <span className="text-white/40 text-sm">{users.length} total</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto sm:flex-nowrap">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="bg-navy-raised border border-white/[0.07] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent/50 w-full sm:w-48"
            />
          </div>
          <button onClick={load} disabled={loading} className="btn-ghost flex items-center gap-2 py-2 text-xs disabled:opacity-60">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="min-w-[760px] grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] items-center px-6 py-3 border-b border-white/[0.07] text-xs text-white/40 uppercase tracking-wider">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Balance</span>
          <span>Joined</span>
          <span></span>
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="min-w-[760px] grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] px-6 py-4 border-b border-white/[0.05] gap-4">
              {[1,2,3,4,5].map((k) => <div key={k} className="h-4 bg-navy-raised animate-pulse rounded" />)}
              <div className="w-4 h-4 bg-navy-raised animate-pulse rounded" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState message="No users found." />
        ) : (
          filtered.map((user) => (
            <div
              key={user.uid}
              onClick={() => navigate(`/admin/users/${user.uid}`)}
              className="min-w-[760px] grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] items-center px-6 py-4 border-b border-white/[0.05] hover:bg-navy-raised/50 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium flex-shrink-0">
                  {(user.name || user.email || 'U').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm text-white truncate">{user.name || '—'}</span>
              </div>
              <span className="text-sm text-white/60 truncate">{user.email}</span>
              <span>
                {user.role === 'admin'
                  ? <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full">Admin</span>
                  : <span className="bg-white/5 text-white/50 text-xs px-2 py-0.5 rounded-full">User</span>
                }
              </span>
              <span className="num text-sm text-white">
                ${fmt(balances[user.uid]?.total || 0)}
              </span>
              <span className="text-xs text-white/40">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </span>
              <ChevronRight className="w-4 h-4 text-white/20" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}





