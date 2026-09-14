import type { AnimatedIconProps } from './types'

function SettingsIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
  className = '',
  ...props
}: AnimatedIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.5" />
      <path d="M12 19.5v2.5" />
      <path d="M4.2 4.2l1.8 1.8" />
      <path d="M18 18l1.8 1.8" />
      <path d="M2 12h2.5" />
      <path d="M19.5 12h2.5" />
      <path d="M4.2 19.8l1.8 -1.8" />
      <path d="M18 6l1.8 -1.8" />
    </svg>
  )
}

SettingsIcon.displayName = 'SettingsIcon'
export default SettingsIcon
