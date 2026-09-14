import type { AnimatedIconProps } from './types'

function ChartBarIcon({
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
      <path d="M4 20v-6" />
      <path d="M10 20v-10" />
      <path d="M16 20v-14" />
      <path d="M4 20h16" />
    </svg>
  )
}

ChartBarIcon.displayName = 'ChartBarIcon'
export default ChartBarIcon
