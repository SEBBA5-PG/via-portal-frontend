import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { PW04Layout } from './PW04Layout'
import { Badge, type TonoBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { TextField } from '../../components/ui/TextField'
import { EstadoVacio } from '../../components/ui/EstadoVacio'
import { Superficie, CabeceraSuperficie } from '../../components/ui/Superficie'
import { useAuth } from '../../state/authStore'
import { useAdmin } from '../../state/adminStore'
import { nombreDeCuenta } from '../../data/cuentas'
import { permisoPorClave } from '../../data/permisos'
import { formatoFechaHora } from '../../data/auditoria'
import type { EstadoSolicitud, SolicitudPermiso } from '../../data/solicitudes'
import { puedeSerChecker, razonNoPuedeFirmar, tienePermiso } from '../../dominio/permisos'

/*
  Bandeja de Doble Firma (Maker-Checker / 4 Ojos) para las ampliaciones de permisos.

  Las cinco reglas duras de Reglas Transversales de UI §Doble Firma se ven aquí:
  1. El Maker envía "a aprobación", no "guarda" — eso vive en la ficha, no en esta pantalla.
  2. Estado intermedio explícito, diciendo qué valor rige mientras tanto: el anterior.
  3. El Checker ve antes/después lado a lado, quién lo pidió y cuándo. Motivo obligatorio al
     rechazar.
  4. El Maker no puede ser el Checker, y "la UI debe impedirlo, no solo el backend".
  5. Toda transición queda en audit_logs.

  Q-1255 es lo que hace que exista una fila por PERMISO y no por edición: la aprobación dejó
  de ser todo-o-nada por acción.
*/

const TONO_SOLICITUD: Record<EstadoSolicitud, TonoBadge> = {
  pendiente: 'pendiente',
  aprobada: 'exito',
  rechazada: 'peligro',
}

export function SolicitudesPage() {
  const auth = useAuth()
  const admin = useAdmin()
  const [rechazando, setRechazando] = useState<SolicitudPermiso | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  const user = auth.usuarioActual
  const cuentaActor = user ? admin.cuentaPorId(user.id) : undefined

  const { pendientes, resueltas } = useMemo(() => {
    const ordenadas = [...admin.solicitudes].sort((a, b) => b.timestamp - a.timestamp)
    return {
      pendientes: ordenadas.filter((s) => s.estado === 'pendiente'),
      resueltas: ordenadas.filter((s) => s.estado !== 'pendiente'),
    }
  }, [admin.solicitudes])

  if (!user || !cuentaActor) return null
  // La bandeja no existe para quien no edita permisos: ocultar no es autorizar, así que la
  // ruta se niega igual que se oculta la solapa.
  if (!tienePermiso(cuentaActor, 'permissions:edit')) return <Navigate to="/PW-04" replace />

  return (
    <PW04Layout
      titulo="Doble Firma"
      descripcion="Solo las ampliaciones de permiso llegan aquí. Reducir un permiso se aplica de inmediato y nunca genera una solicitud: restringir acceso no es la acción sensible (Q-1255)."
    >
      <Superficie>
        <CabeceraSuperficie
          titulo="Pendientes"
          descripcion="Mientras una solicitud esté pendiente, la cuenta afectada sigue operando con su valor actual."
          acciones={<Badge tono="pendiente">{pendientes.length}</Badge>}
        />
        {pendientes.length === 0 ? (
          <EstadoVacio
            motivo="sin-datos"
            titulo="No hay nada esperando firma"
            descripcion="Cuando alguien amplíe un permiso por encima del default de un rol, la solicitud aparecerá aquí para que un segundo Superadministrador la revise."
          />
        ) : (
          <ul className="flex flex-col">
            {pendientes.map((solicitud) => (
              <TarjetaSolicitud
                key={solicitud.id}
                solicitud={solicitud}
                puedeFirmar={puedeSerChecker(cuentaActor, solicitud)}
                razon={razonNoPuedeFirmar(cuentaActor, solicitud)}
                onAprobar={() => admin.resolverSolicitud(cuentaActor.id, solicitud.id, true)}
                onRechazar={() => {
                  setRechazando(solicitud)
                  setMotivoRechazo('')
                }}
              />
            ))}
          </ul>
        )}
      </Superficie>

      {resueltas.length > 0 && (
        <Superficie>
          <CabeceraSuperficie
            titulo="Historial"
            descripcion="Solicitudes ya resueltas. Cada transición dejó su entrada en audit_logs."
          />
          <ul className="flex flex-col">
            {resueltas.map((solicitud) => (
              <TarjetaSolicitud key={solicitud.id} solicitud={solicitud} puedeFirmar={false} razon={null} />
            ))}
          </ul>
        </Superficie>
      )}

      <Modal
        abierto={rechazando !== null}
        titulo="Rechazar la ampliación"
        descripcion="El motivo es obligatorio: quien la propuso tiene que entender por qué no procede."
        onCerrar={() => setRechazando(null)}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={() => setRechazando(null)}>
              Cancelar
            </Button>
            <Button
              variante="peligro"
              disabled={motivoRechazo.trim().length < 5}
              onClick={() => {
                if (rechazando) {
                  admin.resolverSolicitud(cuentaActor.id, rechazando.id, false, motivoRechazo.trim())
                }
                setRechazando(null)
                setMotivoRechazo('')
              }}
            >
              Rechazar
            </Button>
          </>
        }
      >
        <TextField
          etiqueta="Motivo del rechazo"
          value={motivoRechazo}
          onChange={(e) => setMotivoRechazo(e.target.value)}
        />
      </Modal>
    </PW04Layout>
  )
}

function TarjetaSolicitud({
  solicitud,
  puedeFirmar,
  razon,
  onAprobar,
  onRechazar,
}: {
  solicitud: SolicitudPermiso
  puedeFirmar: boolean
  razon: string | null
  onAprobar?: () => void
  onRechazar?: () => void
}) {
  const admin = useAdmin()
  const permiso = permisoPorClave(solicitud.permisoClave)
  const objetivo = admin.cuentaPorId(solicitud.cuentaObjetivoId)

  return (
    <li className="border-b border-white/[0.05] px-6 py-5 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tono={TONO_SOLICITUD[solicitud.estado]}>
              {solicitud.estado === 'pendiente'
                ? 'Pendiente'
                : solicitud.estado === 'aprobada'
                  ? 'Aprobada'
                  : 'Rechazada'}
            </Badge>
            {permiso?.dobleFirmaSiempre && <Badge tono="alerta">Doble Firma en ambas direcciones</Badge>}
            <span className="text-xs text-texto-suave">{formatoFechaHora(solicitud.timestamp)}</span>
          </div>

          <p className="mt-2.5 font-heading text-base font-extrabold text-grafito">
            {permiso?.etiqueta ?? solicitud.permisoClave}
          </p>
          <p className="mt-0.5 text-xs text-texto-suave">
            <code>{solicitud.permisoClave}</code> · sobre{' '}
            {objetivo ? (
              <Link
                to={`/PW-04/cuenta/${objetivo.id}`}
                className="text-primario underline-offset-2 hover:underline"
              >
                {objetivo.nombre}
              </Link>
            ) : (
              solicitud.cuentaObjetivoId
            )}
          </p>

          {/* Regla 3: antes y después, lado a lado. */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ValorEstado etiqueta="Rige hoy" concedido={solicitud.valorVigente} />
            <span aria-hidden="true" className="text-texto-suave">
              →
            </span>
            <ValorEstado etiqueta="Si se aprueba" concedido={solicitud.valorNuevo} destacado />
          </div>

          <p className="mt-4 text-xs text-texto-suave">
            Propuesto por{' '}
            <strong className="text-grafito/85">{nombreDeCuenta(solicitud.makerId, admin.cuentas)}</strong>
            {solicitud.checkerId && (
              <> · firmado por {nombreDeCuenta(solicitud.checkerId, admin.cuentas)}</>
            )}
          </p>
          <p className="mt-1 text-xs italic text-grafito/70">"{solicitud.motivo}"</p>
          {solicitud.motivoRechazo && (
            <p className="mt-2 rounded-[12px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              Rechazada: {solicitud.motivoRechazo}
            </p>
          )}
        </div>

        {solicitud.estado === 'pendiente' && (
          <div className="flex shrink-0 flex-col items-end gap-2">
            {puedeFirmar ? (
              <div className="flex gap-2">
                <Button variante="ejecutivo-suave" onClick={onRechazar}>
                  Rechazar
                </Button>
                <Button variante="ejecutivo" onClick={onAprobar}>
                  Aprobar
                </Button>
              </div>
            ) : (
              /* Regla 4: la UI impide que el Maker firme lo suyo. No es un botón que falla
                 al pulsarlo — no hay botón. */
              <p className="max-w-[15rem] text-right text-xs leading-relaxed text-ambar">{razon}</p>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function ValorEstado({
  etiqueta,
  concedido,
  destacado,
}: {
  etiqueta: string
  concedido: boolean
  destacado?: boolean
}) {
  return (
    <div
      className={`rounded-[14px] border px-4 py-2.5 ${
        destacado ? 'border-primario/35 bg-primario/[0.09]' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <p className="text-[0.7rem] font-bold uppercase tracking-wide text-texto-suave">{etiqueta}</p>
      <p className={`mt-0.5 font-heading text-sm font-extrabold ${concedido ? 'text-[#8fd382]' : 'text-grafito/60'}`}>
        {concedido ? 'Concedido' : 'No concedido'}
      </p>
    </div>
  )
}
