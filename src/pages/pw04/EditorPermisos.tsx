import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
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

export function EditorPermisos({ cuenta, valores, onCambiar, solicitudes, soloLectura }: Props) {
  const [vista, setVista] = useState<'efectivos' | 'diferencias'>('efectivos')
  const [abiertas, setAbiertas] = useState<number[]>([1, 2])

  const editables = useMemo(() => permisosEditables(cuenta), [cuenta])
  const plantilla = useMemo(() => plantillaDe(cuenta.rol), [cuenta.rol])
  const techos = useMemo(() => techosDe(cuenta), [cuenta])

  // Un permiso está "en diferencia" si su valor en el borrador se aparta de la plantilla del
  // rol. Es distinto de "cambiado en esta edición", que se mide contra el valor efectivo.
  const enDiferencia = (permiso: Permiso) => valores[permiso.clave] !== plantilla[permiso.clave]

  const visibles = vista === 'diferencias' ? editables.filter(enDiferencia) : editables

  const alternarCategoria = (numero: number) =>
    setAbiertas((previas) =>
      previas.includes(numero) ? previas.filter((n) => n !== numero) : [...previas, numero],
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
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

      {CATEGORIAS_PERMISO.map((categoria) => {
        const permisos = visibles.filter((p) => p.categoria === categoria.numero)
        if (permisos.length === 0) return null
        const abierta = abiertas.includes(categoria.numero) || vista === 'diferencias'
        const activos = permisos.filter((p) => valores[p.clave]).length

        return (
          <Superficie key={categoria.numero} tono="panel" className="overflow-hidden">
            <button
              type="button"
              onClick={() => alternarCategoria(categoria.numero)}
              aria-expanded={abierta}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left outline-none transition-colors hover:bg-white/[0.03] focus-visible:ring-4 focus-visible:ring-ambar/40"
            >
              <span className="font-heading text-sm font-extrabold text-grafito">
                <span className="text-texto-suave">{categoria.numero}.</span> {categoria.nombre}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-texto-suave">
                  {activos}/{permisos.length}
                </span>
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-texto-suave transition-transform ${abierta ? 'rotate-180' : ''}`}
                >
                  <path d="M3 5l4 4 4-4" />
                </svg>
              </span>
            </button>

            {abierta && (
              <div className="border-t border-white/[0.06]">
                {permisos.map((permiso) => {
                  const pendiente = solicitudPendienteDe(solicitudes, cuenta.id, permiso.clave)
                  const valor = valores[permiso.clave] === true
                  const direccion = clasificarCambio(cuenta, permiso.clave, valor)
                  const porEncima = valor && !plantilla[permiso.clave]
                  const porDebajo = !valor && plantilla[permiso.clave]

                  return (
                    <Interruptor
                      key={permiso.clave}
                      activo={valor}
                      bloqueado={soloLectura || Boolean(pendiente)}
                      razonBloqueo={
                        pendiente
                          ? `Pendiente de un segundo Superadministrador. Mientras tanto rige: ${pendiente.valorVigente ? 'concedido' : 'no concedido'}.`
                          : undefined
                      }
                      onCambiar={(nuevo) => onCambiar(permiso.clave, nuevo)}
                      etiqueta={
                        <>
                          {permiso.etiqueta}
                          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-body text-[0.7rem] text-texto-suave">
                            {permiso.clave}
                          </code>
                        </>
                      }
                      marca={
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
                      }
                      descripcion={
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
                              Bloqueado por Ley 1581 (M13 Q-0535): el backend lo deniega aunque figure activo.
                            </span>
                          )}
                          {permiso.sinConfirmar && !permiso.bloqueoLegal && (
                            <span className="text-ambar/80">Rol ejecutor sin confirmar en la fuente.</span>
                          )}
                        </>
                      }
                    />
                  )
                })}
              </div>
            )}
          </Superficie>
        )
      })}

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
