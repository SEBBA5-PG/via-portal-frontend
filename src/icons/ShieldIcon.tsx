import type { AnimatedIconProps } from './types'

function ShieldIcon({
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
      <path d="M12 3l8 4v5c0 5 -3.5 8.5 -8 9c-4.5 -0.5 -8 -4 -8 -9v-5l8 -4z" />
      <path d="M9.5 12l1.75 1.75l3.25 -3.25" />
    </svg>
  )
}

ShieldIcon.displayName = 'ShieldIcon'
export default ShieldIcon
