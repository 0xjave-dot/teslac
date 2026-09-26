import {
  siApple,
  siBinance,
  siBitcoin,
  siEthereum,
  siNvidia,
  siSolana,
  siSpacex,
  siTesla,
  siTether,
  type SimpleIcon,
} from 'simple-icons'

const ICONS: Record<string, SimpleIcon> = {
  TSLA: siTesla,
  SPACEX: siSpacex,
  BTC: siBitcoin,
  ETH: siEthereum,
  SOL: siSolana,
  BNB: siBinance,
  USDT: siTether,
  AAPL: siApple,
  NVDA: siNvidia,
}

export function AssetLogo({ symbol, name, size = 36, className = '' }: { symbol: string; name?: string; size?: number; className?: string }) {
  const icon = ICONS[symbol.toUpperCase()]
  if (!icon) {
    return (
      <span
        aria-label={name || symbol}
        className={`inline-flex flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/70 ${className}`}
        style={{ width: size, height: size }}
      >
        {symbol.slice(0, 2)}
      </span>
    )
  }

  return (
    <span
      role="img"
      aria-label={name || icon.title}
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.64)} height={Math.round(size * 0.64)} aria-hidden="true">
        <path d={icon.path} fill={`#${icon.hex}`} transform="scale(1 1)" />
      </svg>
    </span>
  )
}
