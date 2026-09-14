import type { AnimatedIconProps } from './types'

function TrophyIcon({
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
      <path d="M8 4h8v4a4 4 0 0 1 -8 0v-4z" />
      <path d="M8 5h-2.5a1.5 1.5 0 0 0 -1.5 1.5v0.5a3 3 0 0 0 3 3h1" />
      <path d="M16 5h2.5a1.5 1.5 0 0 1 1.5 1.5v0.5a3 3 0 0 1 -3 3h-1" />
      <path d="M12 12v4" />
      <path d="M9 21h6" />
      <path d="M10 18h4v3h-4z" />
    </svg>
  )
}

TrophyIcon.displayName = 'TrophyIcon'
export default TrophyIcon
