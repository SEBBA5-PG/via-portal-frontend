import type { ReactNode } from 'react'
import { motion } from 'motion/react'

// Mismo lenguaje de movimiento que la transición entre pasos dentro de AuthLayout (opacidad +
// desplazamiento vertical sutil, 0.55s, ease-in-out simétrico) — para que cambiar de RUTA
// (login → recuperar, → bloqueado, → sesión expirada, → sin permiso) se sienta igual de
// pausado que cambiar de paso dentro de una misma pantalla, y no como un corte instantáneo
// de React Router (feedback 2026-09-12: "no debe ser un cambio brusco" en ningún flujo).
export function TransicionPagina({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}
