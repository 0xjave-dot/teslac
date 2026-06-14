import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="w-10 h-10 text-white/20 mb-3" />
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  )
}





