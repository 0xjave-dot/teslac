import { TrendingUp, TrendingDown } from 'lucide-react'

interface PriceChangeProps {
  value: number
  showIcon?: boolean
  className?: string
}

export function PriceChange({ value, showIcon = false, className = '' }: PriceChangeProps) {
  const safeValue = Number.isFinite(value) ? value : 0
  const positive = safeValue >= 0
  const color = positive ? 'text-gain' : 'text-loss'
  const sign = positive ? '+' : ''

  return (
    <span className={`flex items-center gap-1 ${color} ${className}`}>
      {showIcon && (positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />)}
      <span className="num">{sign}{safeValue.toFixed(2)}%</span>
    </span>
  )
}





