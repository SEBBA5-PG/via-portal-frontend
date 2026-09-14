import type { AnimatedIconProps } from './types'

function GiftIcon({
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
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1 -1v-7" />
      <path d="M12 8c-1.5 -3 -5 -4 -5 -1.5s2.5 1.5 5 1.5" />
      <path d="M12 8c1.5 -3 5 -4 5 -1.5s-2.5 1.5 -5 1.5" />
    </svg>
  )
}

GiftIcon.displayName = 'GiftIcon'
export default GiftIcon
