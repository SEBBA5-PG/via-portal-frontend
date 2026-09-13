import type { HTMLAttributes, ReactNode } from 'react'

/*
  La tarjeta de vidrio del portal, extraída del tratamiento que AuthLayout estrenó en el
  flujo de acceso (Q-1253). Q-1250 fijó la paleta marino/ámbar como identidad visual única
  del portal para las 18 categorías, así que la zona autenticada usa el mismo lenguaje que
  el login en vez de la paleta café/institucional anterior.

  Tres densidades, no una: el sidebar y las tablas necesitan menos brillo y menos radio que
  una tarjeta suelta, o la pantalla entera se vuelve un campo de cristales flotando.
*/

type Tono = 'tarjeta' | 'panel' | 'sutil'

const TONOS: Record<Tono, string> = {
  tarjeta:
    'rounded-[24px] border border-white/10 bg-gradient-to-b from-[#faf6ee]/[0.08] to-[#faf6ee]/[0.03] shadow-[0_24px_60px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.12)_inset] backdrop-blur-[18px] backdrop-saturate-[1.2]',
  panel:
    'rounded-[20px] border border-white/[0.07] bg-[#faf6ee]/[0.04] backdrop-blur-[12px]',
  sutil: 'rounded-[16px] border border-white/[0.06] bg-[#faf6ee]/[0.025]',
}

interface Props extends HTMLAttributes<HTMLDivElement> {
  tono?: Tono
  children?: ReactNode
}

export function Superficie({ tono = 'tarjeta', className = '', ...props }: Props) {
  return <div className={`${TONOS[tono]} ${className}`} {...props} />
}

// Cabecera estándar de una superficie: título, línea de apoyo y acciones a la derecha.
export function CabeceraSuperficie({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5">
      <div className="min-w-0">
        <h2 className="font-heading text-lg font-extrabold tracking-tight text-grafito">{titulo}</h2>
        {descripcion && <p className="mt-1 text-sm leading-relaxed text-texto-suave">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}
