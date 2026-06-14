import { createContext, useContext, useMemo, useState, useCallback, ReactNode } from 'react'

type NotificationType = 'success' | 'error' | 'info'

export interface NotificationEntry {
  id: string
  message: string
  type: NotificationType
  timestamp: Date
}

interface NotificationContextValue {
  notifications: NotificationEntry[]
  notify: (message: string, type?: NotificationType) => void
  clearNotifications: () => void
  currentToast: NotificationEntry | null
  closeToast: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([])
  const [currentToast, setCurrentToast] = useState<NotificationEntry | null>(null)

  const notify = useCallback((message: string, type: NotificationType = 'success') => {
    const entry: NotificationEntry = {
      id: randomId(),
      message,
      type,
      timestamp: new Date(),
    }
    setNotifications((previous) => [entry, ...previous].slice(0, 50))
    setCurrentToast(entry)
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const closeToast = useCallback(() => {
    setCurrentToast(null)
  }, [])

  const value = useMemo(
    () => ({ notifications, notify, clearNotifications, currentToast, closeToast }),
    [notifications, notify, clearNotifications, currentToast, closeToast]
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}





