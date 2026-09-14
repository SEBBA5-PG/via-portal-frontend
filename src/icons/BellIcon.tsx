import type { AnimatedIconProps } from './types'

function BellIcon({
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
      <path d="M10 19a2 2 0 0 0 4 0" />
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5a1 1 0 0 1 -1 1.5h-14a1 1 0 0 1 -1 -1.5c0.5 -1 2 -2.5 2 -6.5" />
    </svg>
  )
}

BellIcon.displayName = 'BellIcon'
export default BellIcon
