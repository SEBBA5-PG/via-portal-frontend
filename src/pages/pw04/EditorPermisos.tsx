import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { ChecklistPermisos, type ItemChecklistPermiso } from '../../components/ui/ChecklistPermisos'
import { Interruptor } from '../../components/ui/Interruptor'
import { Superficie } from '../../components/ui/Superficie'
import { CATEGORIAS_PERMISO, plantillaDe, type Permiso } from '../../data/permisos'
import type { CuentaAdmin } from '../../data/cuentas'
import type { SolicitudPermiso } from '../../data/solicitudes'
import {
  clasificarCambio,
  permisosEditables,
  requiereDobleFirma,
  solicitudPendienteDe,
  techosDe,
} from '../../dominio/permisos'

/*
  El editor de permisos de PW-04. Lo comparten el alta de una cuenta nueva y la ficha de una
  existente — PW-04 pide explícitamente que sea "el mismo editor de permisos que se usa para
  personalizar una cuenta ya existente", y que reutilizarlo "no relaja ni endurece la regla".

  Tres reglas duras que se ven en el código de abajo:

  1. Vista principal = permisos EFECTIVOS, con un toggle secundario "ver diferencias
     respecto al rol base" (propuesta de PW-04, marcada allí como no validada por el equipo).
  2. Los techos fijos no se renderizan como control, ni deshabilitado (Matriz de Acceso).
     Se listan aparte como texto, para explicar por qué no están arriba.
  3. Un permiso con solicitud pendiente no se puede volver a proponer, y muestra qué valor
     rige mientras tanto — el anterior (Reglas Transversales §Doble Firma, regla 2).

  Presentación: un riel vertical de categorías (una columna fija) a la izquierda, con solo
  una seleccionada a la vez, y un panel de contenido a la derecha con los permisos de esa
  categoría — no un acordeón multi-expandible. El panel activo lleva relleno tintado
  (Superficie tono="sutil") para distinguirse de las filas planas del riel.
*/

export interface EstadoEditor {
  valores: Record<string, boolean>
  ampliaciones: string[]
  reducciones: string[]
}

interface Props {
  cuenta: CuentaAdmin
  valores: Record<string, boolean>
  onCambiar: (clave: string, valor: boolean) => void
  solicitudes: SolicitudPermiso[]
  soloLectura?: boolean
}

// Primera categoría de CATEGORIAS_PERMISO que tiene al menos un permiso en `lista`.
function primeraCategoriaCon(lista: Permiso[]): number | undefined {
  return CATEGORIAS_PERMISO.find((c) => lista.some((p) => p.categoria === c.numero))?.numero
}

export function EditorPermisos({ cuenta, valores, onCambiar, solicitudes, soloLectura }: Props) {
  const [vista, setVista] = useState<'efectivos' | 'diferencias'>('efectivos')

  const editables = useMemo(() => permisosEditables(cuenta), [cuenta])
  const plantilla = useMemo(() => plantillaDe(cuenta.rol), [cuenta.rol])
  const techos = useMemo(() => techosDe(cuenta), [cuenta])

  // Un permiso está "en diferencia" si su valor en el borrador se aparta de la plantilla del
  // rol. Es distinto de "cambiado en esta edición", que se mide contra el valor efectivo.
  const enDiferencia = (permiso: Permiso) => valores[permiso.clave] !== plantilla[permiso.clave]

  const visibles = vista === 'diferencias' ? editables.filter(enDiferencia) : editables

  // Al montar: la primera categoría con permisos visibles bajo la vista inicial (efectivos).
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number>(
    () => primeraCategoriaCon(editables) ?? CATEGORIAS_PERMISO[0].numero,
  )

  // Si la categoría activa se queda sin ningún permiso visible bajo la vista actual (por
  // ejemplo, al alternar a "diferencias"), salta a la primera que sí tenga.
  useEffect(() => {
    const sigueVisible = visibles.some((p) => p.categoria === categoriaSeleccionada)
    if (sigueVisible) return
    const siguiente = primeraCategoriaCon(visibles)
    if (siguiente !== undefined) setCategoriaSeleccionada(siguiente)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, visibles, categoriaSeleccionada])

  const categoriaActual = CATEGORIAS_PERMISO.find((c) => c.numero === categoriaSeleccionada)
  const permisosCategoriaActual = categoriaActual
    ? visibles.filter((p) => p.categoria === categoriaActual.numero)
    : []

  // Datos derivados de un permiso individual, compartidos entre la fila-Interruptor (editable)
  // y el ítem-ChecklistPermisos (soloLectura): mismas badges, misma descripción, mismo cálculo
  // de dirección de cambio. Solo cambia el control que envuelve a esto.
  const datosFila = (permiso: Permiso) => {
    const pendiente = solicitudPendienteDe(solicitudes, cuenta.id, permiso.clave)
    const valor = valores[permiso.clave] === true
    const direccion = clasificarCambio(cuenta, permiso.clave, valor)
    const porEncima = valor && !plantilla[permiso.clave]
    const porDebajo = !valor && plantilla[permiso.clave]

    const marca = (
      <>
        {pendiente && <Badge tono="pendiente">Pendiente de firma</Badge>}
        {!pendiente && porEncima && <Badge tono="alerta">Ampliado</Badge>}
        {!pendiente && porDebajo && <Badge tono="neutro">Reducido</Badge>}
        {!pendiente && direccion !== 'sin-cambio' && (
          <Badge tono={requiereDobleFirma(cuenta, permiso.clave, valor) ? 'peligro' : 'exito'}>
            {requiereDobleFirma(cuenta, permiso.clave, valor)
              ? 'Requiere Doble Firma'
              : 'Se aplica al guardar'}
          </Badge>
        )}
      </>
    )

    const descripcion = (
      <>
        {permiso.nota?.[cuenta.rol] && <>Alcance del rol: {permiso.nota[cuenta.rol]}. </>}
        {permiso.cesionIndividual && (
          <>No pertenece a la plantilla de ningún rol; solo se obtiene por cesión. </>
        )}
        {permiso.dobleFirmaSiempre && (
          <>Otorgarlo o quitarlo exige Doble Firma siempre, en las dos direcciones. </>
        )}
        {permiso.dobleFirmaAlEjercer && <>Ejercerlo exige Doble Firma. </>}
        {permiso.bloqueoLegal && (
          <span className="text-red-300">
            Bloqueado por Ley 1581: el backend lo deniega aunque figure activo.
          </span>
        )}
        {permiso.sinConfirmar && !permiso.bloqueoLegal && (
          <span className="text-ambar/80">Rol ejecutor sin confirmar en la fuente.</span>
        )}
      </>
    )

    return { pendiente, valor, marca, descripcion }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-borde bg-surface-sunken p-1">
          <BotonVista activo={vista === 'efectivos'} onClick={() => setVista('efectivos')}>
            Permisos efectivos
          </BotonVista>
          <BotonVista activo={vista === 'diferencias'} onClick={() => setVista('diferencias')}>
            Ver diferencias con el rol
          </BotonVista>
        </div>
        <p className="text-xs text-texto-suave">
          {editables.filter((p) => valores[p.clave]).length} de {editables.length} permisos activos
        </p>
      </div>

      {visibles.length === 0 && vista === 'diferencias' && (
        <Superficie tono="panel" className="px-6 py-10 text-center">
          <p className="font-heading text-sm font-extrabold text-grafito">
            Esta cuenta usa la plantilla de su rol sin cambios
          </p>
          <p className="mt-2 text-sm text-texto-suave">
            No tiene ningún permiso por encima ni por debajo del default de {cuenta.rol === 'S' ? 'Superadministrador' : cuenta.rol === 'A' ? 'Administrador' : 'Coordinador Territorial'}.
          </p>
        </Superficie>
      )}

      {visibles.length > 0 && (
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <Superficie tono="panel" className="w-full shrink-0 overflow-hidden p-1.5 md:w-72">
            <div className="flex flex-col gap-1">
              {CATEGORIAS_PERMISO.map((categoria) => {
                const permisosCategoria = visibles.filter((p) => p.categoria === categoria.numero)
                if (permisosCategoria.length === 0) return null
                const activos = permisosCategoria.filter((p) => valores[p.clave]).length
                const seleccionada = categoria.numero === categoriaSeleccionada

                return (
                  <button
                    key={categoria.numero}
                    type="button"
                    onClick={() => setCategoriaSeleccionada(categoria.numero)}
                    aria-pressed={seleccionada}
                    className={`flex w-full items-center justify-between gap-3 rounded-control px-3.5 py-2.5 text-left outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ambar/40 ${
                      seleccionada
                        ? 'bg-[var(--side-activo-bg)] text-[var(--side-activo-fg)]'
                        : 'text-texto-suave hover:bg-surface-sunken hover:text-grafito'
                    }`}
                  >
                    <span className="font-heading text-sm font-extrabold leading-snug">
                      <span className={seleccionada ? 'opacity-70' : 'text-texto-tenue'}>
                        {categoria.numero}.
                      </span>{' '}
                      {categoria.nombre}
                    </span>
                    <span className={`shrink-0 text-xs ${seleccionada ? 'opacity-80' : 'text-texto-suave'}`}>
                      {activos}/{permisosCategoria.length}
                    </span>
                  </button>
                )
              })}
            </div>
          </Superficie>

          {categoriaActual && (
            <Superficie tono="sutil" className="min-w-0 flex-1 overflow-hidden">
              <div className="border-b border-borde/60 px-6 py-4">
                <span className="font-heading text-sm font-extrabold text-grafito">
                  <span className="text-texto-suave">{categoriaActual.numero}.</span> {categoriaActual.nombre}
                </span>
              </div>

              <div className="divide-y divide-borde/40">
                {soloLectura
                  ? (() => {
                      const items: ItemChecklistPermiso[] = permisosCategoriaActual.map((permiso) => {
                        const { valor, marca, descripcion } = datosFila(permiso)
                        return {
                          clave: permiso.clave,
                          etiqueta: permiso.etiqueta,
                          activo: valor,
                          marca,
                          descripcion,
                        }
                      })
                      return <ChecklistPermisos items={items} />
                    })()
                  : permisosCategoriaActual.map((permiso) => {
                      const { pendiente, valor, marca, descripcion } = datosFila(permiso)
                      return (
                        <Interruptor
                          key={permiso.clave}
                          activo={valor}
                          bloqueado={Boolean(pendiente)}
                          razonBloqueo={
                            pendiente
                              ? `Pendiente de un segundo Superadministrador. Mientras tanto rige: ${pendiente.valorVigente ? 'concedido' : 'no concedido'}.`
                              : undefined
                          }
                          onCambiar={(nuevo) => onCambiar(permiso.clave, nuevo)}
                          etiqueta={
                            <>
                              {permiso.etiqueta}
                              <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-body text-[0.7rem] text-texto-suave">
                                {permiso.clave}
                              </code>
                            </>
                          }
                          marca={marca}
                          descripcion={descripcion}
                        />
                      )
                    })}
              </div>
            </Superficie>
          )}
        </div>
      )}

      {/* Techos de seguridad: texto, nunca controles. "Un control deshabilitado comunica
          «esto se podría activar»; un techo fijo no se puede activar nunca." */}
      <Superficie tono="sutil" className="px-6 py-5">
        <p className="font-heading text-sm font-extrabold text-grafito">Techos de seguridad</p>
        <p className="mt-1 text-xs leading-relaxed text-texto-suave">
          No son ajustables por nadie, tampoco por un Superadministrador, así que no aparecen
          arriba como interruptor. Se determinan por el rol de la cuenta.
        </p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {techos.map(({ permiso, concedido }) => (
            <li key={permiso.clave} className="flex flex-wrap items-center gap-2 text-xs text-texto-suave">
              <Badge tono={concedido ? 'exito' : 'neutro'}>{concedido ? 'Sí' : 'No'}</Badge>
              <span className="text-grafito/80">{permiso.etiqueta}</span>
              <code className="text-[0.7rem]">{permiso.clave}</code>
            </li>
          ))}
        </ul>
      </Superficie>
    </div>
  )
}

function BotonVista({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-full px-4 py-1.5 font-heading text-xs font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 ${
        activo ? 'bg-primario/20 text-primario' : 'text-texto-suave hover:text-grafito'
      }`}
    >
      {children}
    </button>
  )
}
