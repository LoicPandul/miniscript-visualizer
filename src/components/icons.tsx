import type { SVGProps } from 'react'
import type { NodeType } from '../core/policy'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

/* ---- Condition types ---- */

export const IconKey = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="M10.85 12.15 19 4" />
    <path d="M18 5l2 2" />
    <path d="M15 8l2 2" />
  </Icon>
)

export const IconAnd = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 19 12 5l7 14" />
    <path d="M8.2 13.5h7.6" />
  </Icon>
)

export const IconOr = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5l7 14L19 5" />
  </Icon>
)

export const IconThresh = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 17a8 8 0 0 1 16 0" />
    <path d="M12 17 16 9.5" />
    <circle cx="12" cy="17" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconAfter = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2.5" />
    <path d="M8 3v4M16 3v4M4 10h16" />
    <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconOlder = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 3h10M7 21h10" />
    <path d="M8 3c0 6 8 6 8 9s-8 3-8 9" />
    <path d="M16 3c0 6-8 6-8 9s8 3 8 9" />
  </Icon>
)

export const IconHash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4 7 20M17 4l-2 16M4.5 9h16M3.5 15h16" />
  </Icon>
)

export const TYPE_ICONS: Record<NodeType, (p: IconProps) => ReturnType<typeof Icon>> = {
  key: IconKey,
  and: IconAnd,
  or: IconOr,
  thresh: IconThresh,
  after: IconAfter,
  older: IconOlder,
  hash: IconHash,
}

/* ---- UI ---- */

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const IconMinus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
)

export const IconX = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 20l1-13" />
    <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
  </Icon>
)

export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
  </Icon>
)

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12.5 9.5 18 20 6.5" />
  </Icon>
)

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
)

export const IconNote = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7L13.5 20h-7A2.5 2.5 0 0 1 4 17.5Z" />
    <path d="M14 20v-4.5a2 2 0 0 1 2-2H20" />
  </Icon>
)

export const IconFit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9V6.5A2.5 2.5 0 0 1 6.5 4H9M15 4h2.5A2.5 2.5 0 0 1 20 6.5V9M20 15v2.5a2.5 2.5 0 0 1-2.5 2.5H15M9 20H6.5A2.5 2.5 0 0 1 4 17.5V15" />
  </Icon>
)

export const IconLayout = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="5" r="2.2" />
    <circle cx="6" cy="18" r="2.2" />
    <circle cx="18" cy="18" r="2.2" />
    <path d="M11 7 7 16M13 7l4 9" />
  </Icon>
)

export const IconImport = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v11M8 10l4 4 4-4" />
    <path d="M4 17v1.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V17" />
  </Icon>
)

export const IconReset = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 5v5h5" />
    <path d="M4.6 13.5A8 8 0 1 0 6 7.3L4 10" />
  </Icon>
)

export const IconDownload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v11M8 10l4 4 4-4" />
    <path d="M5 21h14" />
  </Icon>
)

export const IconDice = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconAlert = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4 2.8 19.5h18.4Z" />
    <path d="M12 10v4.5" />
    <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconInfo = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconGitHub = (p: IconProps) => (
  <Icon {...p} stroke="none" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49l-.01-1.73c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.9-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.4 9.4 0 0 1 5.01 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9l-.01 2.81c0 .27.18.6.69.49A10.25 10.25 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
  </Icon>
)

export const IconSliders = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
    <circle cx="15.5" cy="8" r="2" />
    <circle cx="9.5" cy="16" r="2" />
  </Icon>
)

export const IconCode = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8.5 7 4 12l4.5 5M15.5 7 20 12l-4.5 5" />
  </Icon>
)

export const IconSpinner = (p: IconProps) => (
  <Icon {...p} className={`spin ${p.className ?? ''}`}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Icon>
)
