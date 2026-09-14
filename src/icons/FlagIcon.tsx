import type { AnimatedIconProps } from './types'

function FlagIcon({
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
      <path d="M6 4v16" />
      <path d="M6 5c2 -1 4 -1 6 0c2 1 4 1 6 0v9c-2 1 -4 1 -6 0c-2 -1 -4 -1 -6 0z" />
    </svg>
  )
}

FlagIcon.displayName = 'FlagIcon'
export default FlagIcon
