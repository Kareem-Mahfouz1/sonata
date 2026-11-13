import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  planet: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  signal: <path d="M3 14h4l3-7 4 10 3-3h4" />,
  orbits: (
    <>
      <ellipse cx="12" cy="12" rx="9" ry="4" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" />
    </>
  ),
  headphones: <path d="M4 16v-4a8 8 0 0116 0v4M4 15h3v5H4zM17 15h3v5h-3z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  focus: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
  restart: <path d="M4 12a8 8 0 108-8M4 4v5h5" />,
  play: <path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <path d="M6 4h4v16H6z" fill="currentColor" stroke="none" />
      <path d="M14 4h4v16h-4z" fill="currentColor" stroke="none" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M16 9a4 4 0 010 6" />
    </>
  ),
  'volume-x': (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="m16 10 4 4M20 10l-4 4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" />
    </>
  ),
  drop: <path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z" />,
  thermometer: <path d="M10 4a2 2 0 014 0v9a4 4 0 11-4 0z" />,
  leaf: <path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l7-7" />,
  dust: (
    <>
      <circle cx="9" cy="10" r="2" />
      <circle cx="15" cy="13" r="2" />
      <circle cx="10" cy="16" r="1.5" />
    </>
  ),
}

export type IconName = keyof typeof paths

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
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
