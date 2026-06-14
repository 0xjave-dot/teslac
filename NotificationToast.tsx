import { Toast } from './Toast'
import { useNotification } from './NotificationContext'

export function NotificationToast() {
  const { currentToast, closeToast } = useNotification()

  if (!currentToast) return null

  return (
    <Toast
      message={currentToast.message}
      type={currentToast.type}
      onClose={closeToast}
    />
  )
}





