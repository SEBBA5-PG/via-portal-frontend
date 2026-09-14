import type { AnimatedIconProps } from './types'

function HistoryIcon({
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
      <path d="M4.5 9a8 8 0 1 0 1.8 -4.7" />
      <path d="M4 4v4h4" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}

HistoryIcon.displayName = 'HistoryIcon'
export default HistoryIcon
