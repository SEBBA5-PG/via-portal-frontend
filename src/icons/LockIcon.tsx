import type { AnimatedIconProps } from './types'

function LockIcon({
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
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11v-3a4 4 0 0 1 8 0v3" />
      <path d="M12 15.5v1.5" />
    </svg>
  )
}

LockIcon.displayName = 'LockIcon'
export default LockIcon
