import { Superficie, CabeceraSuperficie } from '../../../components/ui/Superficie'
import { SelectorTerritorio } from '../SelectorTerritorio'
import { ROLES, type Rol } from '../../../data/roles'

/*
  Paso 2 del asistente de alta — Rol y alcance. Reemplaza el <SelectField> de rol de la
  versión de una sola pantalla por 3 tarjetas seleccionables (fidelidad a las capturas de
  referencia). Las descripciones cortas son el estándar del proyecto (literal, no las
  reinventes en otra pantalla).
*/

const DESCRIPCION_ROL: Record<Rol, string> = {
  S: 'Acceso completo. Otorga/revoca roles y edita permisos con Doble Firma.',
  A: 'Operación diaria completa, sin gobierno de roles ni permisos.',
  C: 'Alcance fijo a su territorio; crea local y solicita el resto.',
}

export function PasoRolYAlcance({
  rol,
  setRol,
  rolesDisponibles,
  territorioIds,
  setTerritorioIds,
  errorTerritorio,
  ayudaRol,
}: {
  rol: Rol
  setRol: (r: Rol) => void
  rolesDisponibles: Rol[]
  territorioIds: string[]
  setTerritorioIds: (ids: string[]) => void
  errorTerritorio?: string
  ayudaRol?: string
}) {
  return (
    <Superficie>
      <CabeceraSuperficie
        titulo="2 · Rol y alcance"
        descripcion="El rol define la plantilla de permisos por defecto. El territorio va por cuenta, no por permiso: marcar Huila es el alcance global."
      />
      <div className="flex flex-col gap-6 px-6 py-6">
        <div>
          <p className="mb-2 font-heading text-sm font-bold text-grafito">Rol administrativo</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {rolesDisponibles.map((r) => {
              const seleccionado = r === rol
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={seleccionado}
                  onClick={() => setRol(r)}
                  className={`flex flex-col gap-1.5 rounded-[16px] border px-4 py-4 text-left outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ambar/40 ${
                    seleccionado
                      ? 'border-transparent bg-[var(--color-primario)] text-white'
                      : 'border-borde bg-white text-grafito hover:bg-surface-sunken'
                  }`}
                >
                  <span className="font-heading text-sm font-extrabold">{ROLES[r]}</span>
                  <span className={`text-xs leading-relaxed ${seleccionado ? 'text-white/85' : 'text-texto-suave'}`}>
                    {DESCRIPCION_ROL[r]}
                  </span>
                </button>
              )
            })}
          </div>
          {ayudaRol && <p className="mt-2 text-xs text-texto-suave">{ayudaRol}</p>}
        </div>
        <div>
          <p className="mb-2 font-heading text-sm font-bold text-grafito">Alcance territorial</p>
          <SelectorTerritorio seleccionados={territorioIds} onCambiar={setTerritorioIds} />
          {errorTerritorio && (
            <p role="alert" className="mt-2 text-sm text-red-400">
              {errorTerritorio}
            </p>
          )}
        </div>
      </div>
    </Superficie>
  )
}
