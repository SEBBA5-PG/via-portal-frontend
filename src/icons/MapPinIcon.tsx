import type { AnimatedIconProps } from './types'

function MapPinIcon({
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
      <path d="M12 21c-4 -4.5 -7 -8.4 -7 -11.5a7 7 0 0 1 14 0c0 3.1 -3 7 -7 11.5z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}

MapPinIcon.displayName = 'MapPinIcon'
export default MapPinIcon
