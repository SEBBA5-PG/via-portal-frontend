import type { HTMLAttributes, ReactNode } from 'react'

/*
  La tarjeta de superficie del portal. Q-1250 (2026-09-12) había fijado el vidrio oscuro
  marino/ámbar como identidad visual única del portal; el reskin claro del 2026-09-13
  (revierte Q-1250 explícitamente — ver memoria/hilos/portal-web-reskin-claro.md) la
  reemplaza por superficies sólidas claras, sin vidrio ni blur: fondo blanco/gris muy
  claro sobre el fondo de página --color-fondo, con sombra suave en vez de negro pesado.

  Tres densidades, no una: el sidebar y las tablas necesitan menos relieve que una tarjeta
  suelta, o la pantalla entera se vuelve un campo de tarjetas flotando.
*/

type Tono = 'tarjeta' | 'panel' | 'sutil'

const TONOS: Record<Tono, string> = {
  tarjeta:
    'rounded-[18px] border border-borde bg-white shadow-[0_1px_2px_rgba(28,36,64,0.04),0_12px_32px_rgba(28,36,64,0.08)]',
  panel: 'rounded-[16px] border border-borde bg-white',
  sutil: 'rounded-[14px] border border-borde bg-surface-sunken',
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
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-borde px-6 py-5">
      <div className="min-w-0">
        <h2 className="font-heading text-lg font-extrabold tracking-tight text-grafito">{titulo}</h2>
        {descripcion && <p className="mt-1 text-sm leading-relaxed text-texto-suave">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}
