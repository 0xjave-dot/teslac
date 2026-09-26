interface LogoProps { size?: 'sm' | 'md' | 'lg'; textColor?: string }
const BRAND_LOGO_URL = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsAVGUkiPKwdAuj5NxLDW9q5ZTPmAeLjiOyQM3OSpMDrtsHhsEJULq0bU&s=10'

export function Logo({ size = 'sm', textColor = 'text-white' }: LogoProps) {
  const markSize = size === 'lg' ? 'logo-mark-lg' : size === 'md' ? 'logo-mark-md' : 'logo-mark-sm'
  return <img className={`logo-mark ${markSize} ${textColor}`} src={BRAND_LOGO_URL} alt="Brand logo" />
}
