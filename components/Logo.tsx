import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'default'
  dark?: boolean           // true when on a dark background
  href?: string            // wraps in a link if provided
  className?: string
}

export function Logo({ size = 'default', dark = false, href, className }: LogoProps) {
  const markSize = size === 'sm' ? 26 : 32
  const textSize = size === 'sm' ? 13 : 15

  const markBg   = dark ? '#f0efe9' : '#1a1916'
  const stroke   = dark ? '#1a1916' : '#f7f6f3'
  const textColor = dark ? '#f0efe9' : '#1a1916'

  const content = (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      {/* Mark */}
      <span
        style={{
          width: markSize,
          height: markSize,
          borderRadius: 8,
          backgroundColor: markBg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: markSize * 0.56, height: markSize * 0.56 }}
        >
          <path d="M5 12l5 5L19 7" />
        </svg>
      </span>

      {/* Wordmark */}
      <span
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          fontSize: textSize,
          color: textColor,
          letterSpacing: '-0.01em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        TickTrack Pro
      </span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', display: 'inline-flex' }}>
        {content}
      </Link>
    )
  }

  return content
}
