import { Bell, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { NotificationEntry } from './NotificationContext'

interface NotificationPanelProps {
  open: boolean
  notifications: NotificationEntry[]
  onClose: () => void
  onClear: () => void
}

export function NotificationPanel({ open, notifications, onClose, onClear }: NotificationPanelProps) {
  return (
    <div className={`absolute right-0 top-full mt-2 w-[min(100vw-1rem,26rem)] rounded-3xl bg-navy-card border border-white/[0.08] shadow-2xl overflow-hidden transition-all duration-200 ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 text-sm text-white">
          <Bell className="w-4 h-4 text-accent" />
          <span>Notification history</span>
        </div>
        <button onClick={onClear} className="text-xs text-white/40 hover:text-white transition">Clear all</button>
      </div>

      <div className="max-h-80 overflow-y-auto scrollbar-none">
        {notifications.length === 0 ? (
          <div className="p-6 text-sm text-white/40">No alerts yet. Actions and messages will appear here.</div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className="px-4 py-4 border-b border-white/[0.05] last:border-none">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-accent">
                  {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : notification.type === 'error' ? <XCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-white break-words">{notification.message}</p>
                  <p className="text-xs text-white/40 mt-1">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(notification.timestamp)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-3 text-right border-t border-white/[0.07]">
        <button onClick={onClose} className="text-xs text-white/40 hover:text-white transition">Close</button>
      </div>
    </div>
  )
}





