import { useEffect, useState } from 'react'

export interface EstadoPlaya {
  /** Índice de la playa que se está mostrando. */
  indice: number
  /** Índice de la que va saliendo, o null mientras no ha habido ningún cambio todavía. */
  previo: number | null
}

/**
 * Avanza el recorrido de playas en loop. Devuelve también el índice previo para que la
 * escena pueda animar la salida sin tener que recordarlo por su cuenta: como el recorrido
 * siempre avanza de a uno, el previo es siempre el anterior exacto.
 *
 * Se queda quieto en dos casos:
 *
 * - **`prefers-reduced-motion: reduce`** — el recorrido no arranca y se queda en Achira. El
 *   timer es JS, así que la regla CSS `animation: none` del stylesheet NO lo detendría; hay
 *   que gatearlo aquí. Un fondo que cambia de playa cada 6 s sigue siendo movimiento no
 *   solicitado aunque el deslizamiento esté desactivado.
 * - **Pestaña oculta** — no gastar CPU ni descargar ilustraciones que nadie está viendo.
 */
export function usePlayaActiva(total: number, intervaloMs: number): EstadoPlaya {
  const [estado, setEstado] = useState<EstadoPlaya>({ indice: 0, previo: null })

  useEffect(() => {
    if (total < 2) return

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)')
    let id: number | undefined

    const parar = () => {
      if (id !== undefined) {
        window.clearInterval(id)
        id = undefined
      }
    }

    const evaluar = () => {
      parar()
      if (sinMovimiento.matches || document.visibilityState === 'hidden') return
      id = window.setInterval(() => {
        setEstado((previo) => ({ indice: (previo.indice + 1) % total, previo: previo.indice }))
      }, intervaloMs)
    }

    evaluar()
    sinMovimiento.addEventListener('change', evaluar)
    document.addEventListener('visibilitychange', evaluar)

    return () => {
      parar()
      sinMovimiento.removeEventListener('change', evaluar)
      document.removeEventListener('visibilitychange', evaluar)
    }
  }, [total, intervaloMs])

  return estado
}
