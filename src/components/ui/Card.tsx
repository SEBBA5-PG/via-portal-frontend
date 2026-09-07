import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-panel bg-gradient-to-br from-card-from to-card-to shadow-sm ${className}`}
      {...props}
    />
  )
}
