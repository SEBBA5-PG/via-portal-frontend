import { forwardRef, useImperativeHandle, useCallback } from 'react'
import type { AnimatedIconHandle, AnimatedIconProps } from './types'
import { motion, useAnimate } from 'motion/react'

// Vía itshover.com (registro shadcn de terceros, revisado antes de instalar: código
// limpio, solo depende de motion) — usado en el campo de "Número de cédula" del login
// y la recuperación de PIN (2026-09-12, prototipado antes en el chat).
const UsersIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = 'currentColor', strokeWidth = 2, className = '' }, ref) => {
    const [scope, animate] = useAnimate()

    // Si el paso del formulario cambia (cédula → PIN) mientras el cursor sigue sobre el
    // ícono, React desmonta este SVG a mitad de la animación de hover: motion sigue su
    // loop de frames sobre un scope que ya quedó en null y termina lanzando un
    // querySelectorAll sobre null como rechazo de promesa no capturado (visto en consola
    // al probar el flujo real). El guard evita el disparo si ya no hay scope, y el
    // .catch silencioso cubre el caso en que la animación truena a mitad de vuelo.
    const start = useCallback(() => {
      if (!scope.current) return
      Promise.resolve(animate('.user-primary', { y: -2, scale: 1.05 }, { duration: 0.3, ease: 'easeOut' })).catch(() => {})
      Promise.resolve(animate('.user-secondary', { x: 1, opacity: 0.8 }, { duration: 0.3, ease: 'easeOut' })).catch(() => {})
    }, [animate, scope])

    const stop = useCallback(() => {
      if (!scope.current) return
      Promise.resolve(animate('.user-primary', { y: 0, scale: 1 }, { duration: 0.25, ease: 'easeInOut' })).catch(() => {})
      Promise.resolve(animate('.user-secondary', { x: 0, opacity: 1 }, { duration: 0.25, ease: 'easeInOut' })).catch(() => {})
    }, [animate, scope])

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }))

    return (
      <motion.svg
        ref={scope}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`cursor-pointer ${className}`}
        onHoverStart={start}
        onHoverEnd={stop}
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <motion.g className="user-primary">
          <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
          <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
        </motion.g>
        <motion.g className="user-secondary">
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
        </motion.g>
      </motion.svg>
    )
  },
)

UsersIcon.displayName = 'UsersIcon'
export default UsersIcon
