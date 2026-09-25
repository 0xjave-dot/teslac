interface LogoProps { size?: 'sm' | 'md' | 'lg'; textColor?: string }
export function Logo({ size = 'sm', textColor = 'text-white' }: LogoProps) {
  const markSize = size === 'lg' ? 'logo-mark-lg' : size === 'md' ? 'logo-mark-md' : 'logo-mark-sm'
  return <img className={`logo-mark ${markSize} ${textColor}`} src="/favicon.svg" alt="Tesla Invest" />
}
