interface LogoProps { size?: 'sm' | 'md' | 'lg'; textColor?: string }
const BRAND_LOGO_URL = 'https://i.ibb.co/hJwqLK96/tesla-logo-evolution-stockcake-removebg-preview.png'

export function Logo({ size = 'sm', textColor = 'text-white' }: LogoProps) {
  const markSize = size === 'lg' ? 'logo-mark-lg' : size === 'md' ? 'logo-mark-md' : 'logo-mark-sm'
  return <img className={`logo-mark ${markSize} ${textColor}`} src={BRAND_LOGO_URL} alt="Brand logo" />
}
