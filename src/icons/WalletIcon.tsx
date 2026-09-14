import type { AnimatedIconProps } from './types'

function WalletIcon({
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
      <path d="M4 7a2 2 0 0 1 2 -2h11a1 1 0 0 1 1 1v2" />
      <path d="M4 7v11a2 2 0 0 0 2 2h13a1 1 0 0 0 1 -1v-4" />
      <path d="M18 12h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a2 2 0 0 1 0 -4z" />
    </svg>
  )
}

WalletIcon.displayName = 'WalletIcon'
export default WalletIcon
