import { EditorPermisos } from '../EditorPermisos'
import { Superficie, CabeceraSuperficie } from '../../../components/ui/Superficie'
import { Badge } from '../../../components/ui/Badge'
import { ROLES, type Rol } from '../../../data/roles'
import type { CuentaAdmin } from '../../../data/cuentas'

/*
  Paso 3 del asistente de alta — Permisos. Envuelve EditorPermisos.tsx tal cual: ya trae el
  contador "N de M permisos activos" y el contador por categoría, no hay que tocarlos.
*/

export function PasoPermisos({
  rol,
  borrador,
  valores,
  personalizados,
  ampliaciones,
  reducciones,
  onCambiar,
}: {
  rol: Rol
  borrador: CuentaAdmin
  valores: Record<string, boolean>
  personalizados: [string, boolean][]
  ampliaciones: [string, boolean][]
  reducciones: [string, boolean][]
  onCambiar: (clave: string, valor: boolean) => void
}) {
  return (
    <Superficie>
      <CabeceraSuperficie
        titulo="3 · Permisos"
        descripcion={`Precargado con la plantilla de ${ROLES[rol]}. Cada permiso que amplíes por encima de ese default se enviará a la firma de un segundo Superadministrador; los que reduzcas entran con la cuenta.`}
        acciones={
          personalizados.length > 0 ? (
            <span className="flex gap-2">
              {ampliaciones.length > 0 && <Badge tono="peligro">{ampliaciones.length} a firma</Badge>}
              {reducciones.length > 0 && <Badge tono="exito">{reducciones.length} inmediatas</Badge>}
            </span>
          ) : (
            <Badge tono="neutro">Plantilla sin cambios</Badge>
          )
        }
      />
      <div className="px-6 py-6">
        <EditorPermisos cuenta={borrador} valores={valores} solicitudes={[]} onCambiar={onCambiar} />
      </div>
    </Superficie>
  )
}
