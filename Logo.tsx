interface LogoProps { size?: 'sm' | 'md' | 'lg'; textColor?: string }
export function Logo({ size = 'sm', textColor = 'text-white' }: LogoProps) {
  const textSize = size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm'
  const markSize = size === 'lg' ? 'logo-mark-lg' : size === 'md' ? 'logo-mark-md' : 'logo-mark-sm'
  return <span className={`logo-lockup ${textColor}`}><img className={`logo-mark ${markSize}`} src="/favicon.svg" alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} /><span className={`logo-wordmark ${textSize}`}>Tesla <b>Invest</b></span></span>
}
