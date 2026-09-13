import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'

/*
  Diálogo del portal, sobre <dialog> nativo para heredar gratis el foco atrapado, el cierre
  con Escape y el rol de accesibilidad correcto — Reglas Transversales §Accesibilidad exige
  navegación por teclado completa.

  Los tres niveles de confirmación de §Confirmaciones se expresan con `tono` y con lo que
  cada pantalla le pase dentro; este componente solo aporta la caja.
*/

interface Props {
  abierto: boolean
  titulo: string
  descripcion?: ReactNode
  children?: ReactNode
  onCerrar: () => void
  acciones?: ReactNode
  ancho?: 'normal' | 'amplio'
}

export function Modal({ abierto, titulo, descripcion, children, onCerrar, acciones, ancho = 'normal' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
      onClick={(e) => {
        // Clic en el backdrop (el propio <dialog>, fuera del panel interior) cierra.
        if (e.target === ref.current) onCerrar()
      }}
      className={`m-auto w-[calc(100vw-2rem)] bg-transparent p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm ${
        ancho === 'amplio' ? 'max-w-3xl' : 'max-w-lg'
      }`}
    >
      {abierto && (
        <div className="rounded-[24px] border border-white/10 bg-gradient-to-b from-[#1b2432] to-[#0d131c] p-7 shadow-[0_40px_90px_rgba(0,0,0,0.65)]">
          <h2 className="font-heading text-xl font-extrabold tracking-tight text-grafito">{titulo}</h2>
          {descripcion && (
            <div className="mt-2 text-sm leading-relaxed text-texto-suave">{descripcion}</div>
          )}
          {children && <div className="mt-5">{children}</div>}
          <div className="mt-7 flex flex-wrap justify-end gap-3">
            {acciones ?? (
              <Button variante="ejecutivo" onClick={onCerrar}>
                Entendido
              </Button>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
