import { useCallback, useState, type ReactNode } from 'react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'

/*
  Confirmación "a mano" para salir sin guardar. El portal usa BrowserRouter/Routes en modo
  declarativo (ver App.tsx), así que useBlocker/unstable_usePrompt de react-router-dom no
  están disponibles — este hook guarda la acción de navegación pendiente y solo la ejecuta si
  el usuario confirma en el modal.

  Nota de extensión: el archivo es .tsx (no .ts) porque `modal` se arma con JSX real
  (<Modal>/<Button>), y TypeScript solo reconoce sintaxis JSX en archivos .tsx — el resto de
  la firma (nombre, parámetros, forma del objeto devuelto) es la pedida. Mismo criterio que
  ya separa adminStore.tsx/operacionStore.tsx (devuelven JSX) de useCuentaActor.ts (no).
*/
export function useConfirmarSalida(hayCambiosSinGuardar: boolean): {
  pedirConfirmacion: (accion: () => void) => void
  modal: ReactNode
} {
  const [accionPendiente, setAccionPendiente] = useState<(() => void) | null>(null)

  const pedirConfirmacion = useCallback(
    (accion: () => void) => {
      if (!hayCambiosSinGuardar) {
        accion()
        return
      }
      // Envuelta en función: setState con una función la ejecutaría como updater si se
      // guardara directo — así queda almacenada como valor.
      setAccionPendiente(() => accion)
    },
    [hayCambiosSinGuardar],
  )

  const cerrar = useCallback(() => setAccionPendiente(null), [])

  const confirmarSalida = useCallback(() => {
    setAccionPendiente((accion) => {
      accion?.()
      return null
    })
  }, [])

  const modal = (
    <Modal
      abierto={accionPendiente !== null}
      titulo="¿Salir sin guardar?"
      descripcion="Los cambios sin guardar se perderán."
      onCerrar={cerrar}
      acciones={
        <>
          <Button variante="secundario" onClick={cerrar}>
            Seguir aquí
          </Button>
          <Button variante="peligro" onClick={confirmarSalida}>
            Sí, salir
          </Button>
        </>
      }
    />
  )

  return { pedirConfirmacion, modal }
}
