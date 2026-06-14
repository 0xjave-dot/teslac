interface AssetTypeBadgeProps {
  type: string
}

export function AssetTypeBadge({ type }: AssetTypeBadgeProps) {
  if (type === 'stock') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent capitalize">
        Stock
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 capitalize">
      Crypto
    </span>
  )
}





