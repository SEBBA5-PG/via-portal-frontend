import { Superficie, CabeceraSuperficie } from '../../../components/ui/Superficie'
import { ROLES, type Rol } from '../../../data/roles'
import { describirAlcance } from '../../../data/territorios'
import type { Permiso } from '../../../data/permisos'

/*
  Paso 4 del asistente de alta — Preview. No existía antes de este corte: cierra el vacío que
  describen las capturas de referencia. Dos tarjetas lado a lado con identidad y rol/alcance,
  y debajo el listado completo de permisos que quedarán activos.
*/

function FilaEtiquetaValor({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-texto-suave">{etiqueta}</span>
      <span className="text-right text-sm font-bold text-grafito">{valor}</span>
    </div>
  )
}

export function PasoPreview({
  nombre,
  cedula,
  telefonoWhatsapp,
  email,
  rol,
  territorioIds,
  permisosEditables,
  valores,
}: {
  nombre: string
  cedula: string
  telefonoWhatsapp: string
  email: string
  rol: Rol
  territorioIds: string[]
  permisosEditables: Permiso[]
  valores: Record<string, boolean>
}) {
  const activos = permisosEditables.filter((p) => valores[p.clave] === true)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Superficie>
          <CabeceraSuperficie titulo="Identidad" />
          <div className="divide-y divide-borde/60 px-6 py-2">
            <FilaEtiquetaValor etiqueta="Nombre" valor={nombre} />
            <FilaEtiquetaValor etiqueta="Cédula" valor={cedula} />
            <FilaEtiquetaValor etiqueta="Celular" valor={telefonoWhatsapp} />
            <FilaEtiquetaValor etiqueta="Correo" valor={email} />
          </div>
        </Superficie>
        <Superficie>
          <CabeceraSuperficie titulo="Rol y alcance" />
          <div className="divide-y divide-borde/60 px-6 py-2">
            <FilaEtiquetaValor etiqueta="Rol" valor={ROLES[rol]} />
            <FilaEtiquetaValor etiqueta="Alcance" valor={describirAlcance(territorioIds)} />
            <FilaEtiquetaValor
              etiqueta="Permisos activos"
              valor={`${activos.length} de ${permisosEditables.length}`}
            />
            <FilaEtiquetaValor etiqueta="Estado inicial" valor="Provisional" />
          </div>
        </Superficie>
      </div>

      <Superficie>
        <CabeceraSuperficie
          titulo="Permisos que quedarán activos"
          descripcion="Vigentes desde la creación de la cuenta. Las ampliaciones enviadas a Doble Firma no aparecen aquí hasta que un segundo Superadministrador las apruebe."
        />
        <ul className="grid gap-x-6 gap-y-2 px-6 py-5 sm:grid-cols-2">
          {activos.length === 0 && (
            <li className="text-sm text-texto-suave">Ningún permiso queda activo con esta configuración.</li>
          )}
          {activos.map((permiso) => (
            <li key={permiso.clave} className="flex items-center gap-2 text-sm text-grafito/90">
              <svg
                width="15"
                height="15"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-exito"
                aria-hidden="true"
              >
                <path d="M4 10.5l4 4 8-9" />
              </svg>
              {permiso.etiqueta}
            </li>
          ))}
        </ul>
      </Superficie>
    </div>
  )
}
