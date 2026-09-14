import type { ReactNode } from 'react'

/*
  Tabla del portal. Reglas Transversales de UI §Tablas: el contenido ancho scrollea dentro
  de su propio contenedor, nunca empuja el ancho de la página.
*/

export function Tabla({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-collapse text-left text-sm">{children}</table>
    </div>
  )
}

export function EncabezadoTabla({ columnas }: { columnas: ReactNode[] }) {
  return (
    <thead>
      <tr className="border-b border-borde">
        {columnas.map((columna, i) => (
          <th
            key={i}
            scope="col"
            className="px-6 py-3 font-heading text-xs font-bold uppercase tracking-wide text-texto-suave"
          >
            {columna}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function FilaTabla({
  children,
  onClick,
  etiqueta,
}: {
  children: ReactNode
  onClick?: () => void
  etiqueta?: string
}) {
  if (!onClick) {
    return <tr className="border-b border-borde last:border-0">{children}</tr>
  }
  // Fila navegable: el manejador vive en la fila, pero el foco de teclado lo recibe una
  // celda-botón real dentro de ella (ver CeldaPrincipal) para que sea alcanzable sin ratón.
  return (
    <tr
      onClick={onClick}
      aria-label={etiqueta}
      className="cursor-pointer border-b border-borde transition-colors last:border-0 hover:bg-surface-sunken"
    >
      {children}
    </tr>
  )
}

export function Celda({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-6 py-4 align-middle text-grafito/90 ${className}`}>{children}</td>
}
