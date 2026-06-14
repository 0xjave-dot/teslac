interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  textColor?: string
}

export function Logo({ size = 'sm', textColor = 'text-white' }: LogoProps) {
  const circleSize = size === 'lg' ? 'w-10 h-10 text-base' : size === 'md' ? 'w-8 h-8 text-sm' : 'w-7 h-7 text-xs'
  const textSize = size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm'

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${circleSize} rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center font-medium text-accent flex-shrink-0`}>
        T
      </div>
      <span className={`${textSize} font-medium tracking-tight ${textColor}`}>Tesla Invest</span>
    </div>
  )
}





