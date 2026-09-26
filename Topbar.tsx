import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Wallet, Bell, Menu } from 'lucide-react'
import { useAuth } from './AuthContext'
import { useBalance } from './useBalance'
import { useNotification } from './NotificationContext'
import { NotificationPanel } from './NotificationPanel'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/markets': 'Markets',
  '/wallet': 'Wallet',
  '/portfolio': 'Portfolio',
  '/profile': 'Profile',
  '/admin': 'Admin Overview',
  '/admin/users': 'Users',
  '/admin/transactions': 'Transactions',
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { currentUser, userDoc } = useAuth()
  const location = useLocation()
  const balance = useBalance(currentUser?.uid)
  const { notifications, clearNotifications } = useNotification()
  const [panelOpen, setPanelOpen] = useState(false)

  const title = pageTitles[location.pathname] ||
    (location.pathname.startsWith('/markets/') ? 'Market Detail' : '') ||
    (location.pathname.startsWith('/admin/users/') ? 'User Detail' : 'Dashboard')

  const initials = (userDoc?.name || currentUser?.displayName || currentUser?.email || 'U')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="app-topbar h-16 bg-navy-card/80 backdrop-blur-md border-b border-white/[0.07] flex items-center justify-between gap-2 px-3 sm:px-6 lg:px-8 sticky top-0 z-20 min-w-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 rounded-2xl bg-navy-raised border border-white/[0.08] text-white/70 hover:text-white transition"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="app-topbar-title text-white font-medium text-sm tracking-tight truncate">{title}</h1>
      </div>

      <div className="app-topbar-actions flex items-center gap-2 sm:gap-3 relative flex-shrink-0 min-w-0">
        <button
          onClick={() => setPanelOpen((open) => !open)}
          className="relative w-10 h-10 rounded-2xl bg-navy-raised border border-white/[0.08] text-white/70 hover:text-white transition"
          aria-label="Notification history"
        >
          <Bell className="w-5 h-5" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gain text-[10px] text-navy-base font-semibold px-1.5">
              {notifications.length}
            </span>
          )}
        </button>

        <NotificationPanel
          open={panelOpen}
          notifications={notifications}
          onClose={() => setPanelOpen(false)}
          onClear={clearNotifications}
        />

        <div className="app-topbar-balance bg-navy-raised border border-white/[0.07] rounded-full px-2 sm:px-4 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
          <Wallet className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
          <span className="text-white num whitespace-nowrap">
            ${balance.available.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {currentUser?.photoURL ? (
          <img src={currentUser.photoURL} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium">
            {initials}
          </div>
        )}
      </div>
    </header>
  )
}





