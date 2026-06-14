interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}





