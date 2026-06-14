import { useMatch, useNavigate, Link } from 'react-router-dom'
import { LayoutDashboard, BarChart2, Wallet, PieChart, UserCircle, LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import { useAuth } from './AuthContext'
import { Logo } from './Logo'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/markets', icon: BarChart2, label: 'Markets' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/portfolio', icon: PieChart, label: 'Portfolio' },
  { to: '/profile', icon: UserCircle, label: 'Profile' },
]

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.FC<{ className?: string }>; label: string }) {
  const match = useMatch(to)
  const active = !!match
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mx-3 text-sm transition ${
        active
          ? 'bg-accent/10 text-accent font-medium'
          : 'text-white/50 hover:text-white hover:bg-navy-raised'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  )
}

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const { currentUser, userDoc } = useAuth()
  const navigate = useNavigate()

  const initials = (userDoc?.name || currentUser?.displayName || currentUser?.email || 'U')
    .slice(0, 2)
    .toUpperCase()

  async function handleLogout() {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-navy-sidebar border-r border-white/[0.07] flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:inset-auto lg:w-56`}
      >
        <div className="px-5 py-5 border-b border-white/[0.07]">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.07]">
          <div className="flex items-center gap-3 mb-3">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate">{userDoc?.name || currentUser?.displayName || 'User'}</p>
              <p className="text-xs text-white/40 truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-white/70 transition w-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>

      {open && (
        <button
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Close navigation"
        />
      )}
    </>
  )
}





