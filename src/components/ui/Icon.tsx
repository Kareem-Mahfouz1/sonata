import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  orbit: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <ellipse cx="12" cy="12" rx="10.5" ry="4" transform="rotate(-32 12 12)" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  activity: <path d="M2.5 12.5h4L9.5 5l4 14 3-8.5h5" />,
  headphones: (
    <>
      <path d="M3.5 14v-1.5a8.5 8.5 0 0 1 17 0V14" />
      <path d="M6.5 14.5h1.2a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19v-3a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M17.5 14.5h-1.2a1.5 1.5 0 0 0-1.5 1.5v3a1.5 1.5 0 0 0 1.5 1.5h1.2a1.5 1.5 0 0 0 1.5-1.5v-3a1.5 1.5 0 0 0-1.5-1.5Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h15" />
      <path d="m14 7 5 5-5 5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  restart: (
    <>
      <path d="M4 5v5h5" />
      <path d="M4.8 14a7.5 7.5 0 1 0 1.2-7.8L4 10" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4Z" />
      <path d="M15 9a4.5 4.5 0 0 1 0 6" />
      <path d="M17.8 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  'volume-x': (
    <>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4Z" />
      <path d="m15.5 9.5 4 5M19.5 9.5l-4 5" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  maximize: (
    <>
      <path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M9 20H5a1 1 0 0 1-1-1v-4M15 20h4a1 1 0 0 0 1-1v-4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </>
  ),
  waveform: (
    <>
      <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
    </>
  ),
  'chevron-left': <path d="m14 6-6 6 6 6" />,
  sparkle: (
    <>
      <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
}

export type IconName = keyof typeof paths

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}
