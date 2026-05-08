type LogoProps = { size?: number }

export default function Logo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 16 A12 12 0 0 1 28 16" stroke="#F2724F" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 16 A12 12 0 0 0 28 16" stroke="rgba(232,224,213,0.15)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 16 A8 8 0 0 1 24 16" stroke="#F2724F" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M11 16 L12.5 16 L14 11 L16 21 L17.5 16 L19 16 L21 16" stroke="#F2724F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="16" cy="16" r="2" fill="#F2724F"/>
    </svg>
  )
}
