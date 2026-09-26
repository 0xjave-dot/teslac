import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { useNotification } from './NotificationContext'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  const { notify } = useNotification()

  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  useEffect(() => {
    notify(message, type)
  }, [message, type, notify])

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-[calc(100vw-2rem)] bg-navy-raised border border-white/[0.13] rounded-xl px-5 py-3 text-sm text-white flex items-center gap-3 shadow-2xl animate-toast-in">
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 text-gain flex-shrink-0" />
        : <X className="w-4 h-4 text-loss flex-shrink-0" />
      }
      <span className="break-words">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/30 hover:text-white/70">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}





