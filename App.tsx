import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './AuthContext'
import { DashboardLayout } from './DashboardLayout'
import { AdminLayout } from './AdminLayout'
import { Landing } from './Landing'
import { Login } from './Login'
import { Register } from './Register'
import { Dashboard } from './Dashboard'
import { Markets } from './Markets'
import { MarketDetail } from './MarketDetail'
import { Wallet } from './Wallet'
import { Portfolio } from './Portfolio'
import { Profile } from './Profile'
import { AdminDashboard } from './AdminDashboard'
import { AdminUsers } from './AdminUsers'
import { AdminUserDetail } from './AdminUserDetail'
import { AdminTransactions } from './AdminTransactions'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-base flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
      </div>
    )
  }
  if (!currentUser) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, role } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-base flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
      </div>
    )
  }
  if (!currentUser) return <Navigate to="/login" replace />
  if (role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
      </div>
    )
  }
  if (currentUser) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      <Route
        path="/dashboard"
        element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<Dashboard />} />
        <Route path="markets" element={<Markets />} />
        <Route path="markets/:symbol" element={<MarketDetail />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/markets" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Markets />} />
        <Route path=":symbol" element={<MarketDetail />} />
      </Route>

      <Route path="/wallet" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Wallet />} />
      </Route>

      <Route path="/portfolio" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Portfolio />} />
      </Route>

      <Route path="/profile" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Profile />} />
      </Route>

      <Route
        path="/admin"
        element={<AdminRoute><AdminLayout /></AdminRoute>}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:uid" element={<AdminUserDetail />} />
        <Route path="transactions" element={<AdminTransactions />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}





