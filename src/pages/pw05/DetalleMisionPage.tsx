import { useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CategoriaLayout } from '../../components/CategoriaLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { BotonVolver } from '../../components/ui/BotonVolver'
import { Marcable } from '../../components/ui/Marcable'
import { Modal } from '../../components/ui/Modal'
import { SelectField } from '../../components/ui/SelectField'
import { SelectorFechaHora } from '../../components/ui/SelectorFechaHora'
import { CabeceraSuperficie, Superficie } from '../../components/ui/Superficie'
import { TextField } from '../../components/ui/TextField'
import { BadgeEstadoMision, TarjetaMision } from './MisionVisual'
import { useAdmin } from '../../state/adminStore'
import { useOperacion } from '../../state/operacionStore'
import { useCuentaActor } from '../../state/useCuentaActor'
import {
  FAMILIAS,
  MOTIVOS_CANCELACION,
  MOTIVOS_PAUSA,
  MOTIVOS_RECHAZO_MISION,
  RADIO_GEOCERCA_METROS,
  SUBTIPOS,
  TIPOS_EVIDENCIA,
} from '../../data/misiones'
import { ROLES_JUEGO, nombrePlaya } from '../../data/usuariosApp'
import { nombreDeCuenta } from '../../data/cuentas'
import { ETIQUETA_EVENTO, formatoFechaHora } from '../../data/auditoria'
import { TIPOS_SOLICITUD_OPERACION, type SolicitudOperacion, type TipoSolicitudOperacion } from '../../data/operacion'
import { describirAlcance } from '../../data/territorios'
import { tienePermiso } from '../../dominio/permisos'
import {
  estimarAudiencia,
  impactoCancelacion,
  misionesVisiblesPara,
  publicaDirecto,
  puedeAprobar,
  puedeCancelar,
  puedeEditar,
  puedePausar,
  puedeReanudar,
  puedeSolicitarPausaCancelacion,
} from '../../dominio/misiones'

/*
  PW-05 — detalle de misión, que es también la pantalla de aprobación (ESQ §Aprobación, cinco
  bloques: identificación, vista previa idéntica a la tarjeta, detalle técnico, contexto para
  decidir y botones) y el punto de entrada a pausar, reanudar y cancelar.
*/

type Dialogo = 'rechazar' | 'pausar' | 'cancelar' | 'solicitar' | null

export function DetalleMisionPage() {
  const { misionId } = useParams()
  const op = useOperacion()
  const admin = useAdmin()
  const actor = useCuentaActor()
  const navigate = useNavigate()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [motivo, setMotivo] = useState('')
  const [otro, setOtro] = useState('')
  const [nota, setNota] = useState('')
  const [hasta, setHasta] = useState('')
  const [programada, setProgramada] = useState(false)
  const [notificar, setNotificar] = useState(true)
  const [confirmado, setConfirmado] = useState(false)
  const [tipoSolicitud, setTipoSolicitud] = useState<TipoSolicitudOperacion>('pausa')
  const [rechazandoSolicitud, setRechazandoSolicitud] = useState<SolicitudOperacion | null>(null)
  const [ahora] = useState(() => Date.now())

  const mision = op.misiones.find((m) => m.id === misionId)

  if (!actor) return null
  if (!mision || misionesVisiblesPara(actor, [mision]).length === 0) return <Navigate to="/PW-05" replace />

  const solicitudesMision = op.solicitudes.filter((s) => s.objetivoId === mision.id && s.tipo !== 'bloqueo')
  const pendientes = solicitudesMision.filter((s) => s.estado === 'pendiente')
  const gobierna = tienePermiso(actor, 'missions:pause_cancel')
  const historial = admin.auditoria.filter((e) => e.misionId === mision.id)
  const impacto = impactoCancelacion(mision)
  const aprobable = puedeAprobar(actor, mision)
  const motivoFinal = motivo === 'Otro' ? otro.trim() : motivo
  const esCreador = mision.creadorId === actor.id

  const abrir = (d: Dialogo, catalogo?: string[]) => {
    setMotivo(catalogo?.[0] ?? '')
    setOtro('')
    setNota('')
    setHasta('')
    setProgramada(false)
    setNotificar(true)
    setConfirmado(false)
    setDialogo(d)
  }
  const cerrar = () => setDialogo(null)

  return (
    <CategoriaLayout
      titulo={mision.nombre || 'Misión sin nombre'}
      descripcion={
        <>
          {FAMILIAS[mision.familia]}
          {mision.subtipo && ` · ${SUBTIPOS[mision.subtipo]}`} ·{' '}
          {mision.ambito === 'global' ? 'Global' : describirAlcance(mision.territorioIds)} · creada por{' '}
          {nombreDeCuenta(mision.creadorId, admin.cuentas)} · versión {mision.version}
        </>
      }
      acciones={
        <>
          <BadgeEstadoMision estado={mision.estado} />
          <BotonVolver a="/PW-05" etiqueta="Volver a Misiones" />
        </>
      }
    >
      {/* Estado explicado en texto, no solo con el color del badge (ESQ §Reglas transversales). */}
      {mision.estado === 'pendiente_aprobacion' && (
        <Aviso tono="info">
          Pendiente de aprobación: ningún usuario la ve todavía. La publica un Administrador o Superadministrador.
        </Aviso>
      )}
      {mision.estado === 'borrador' && mision.motivoRechazo && (
        <Aviso tono="peligro">Rechazada y devuelta a borrador: {mision.motivoRechazo}</Aviso>
      )}
      {mision.estado === 'pausada' && mision.pausa && (
        <Aviso tono="alerta">
          Pausada desde {formatoFechaHora(mision.pausa.desde)} por "{mision.pausa.motivo}" ·{' '}
          {mision.pausa.hasta ? `hasta ${mision.pausa.hasta.replace('T', ' ')}` : 'indefinida, se reanuda a mano'}. La evidencia
          ya enviada sigue en la cola; no se acepta evidencia nueva.
        </Aviso>
      )}
      {mision.estado === 'cancelada' && <Aviso tono="peligro">Cancelada: {mision.motivoCancelacion}</Aviso>}
      {mision.familia === 'sistema' && (
        <Aviso tono="info">Misión de Sistema: se genera sola cada lunes, expira a los 7 días y paga x2. No se edita desde aquí.</Aviso>
      )}

      <div className="flex flex-wrap gap-2">
        {puedeEditar(actor, mision) && (
          <Button variante="ejecutivo-suave" onClick={() => navigate(`/PW-05/mision/${mision.id}/editar`)}>
            Editar
          </Button>
        )}
        {mision.estado === 'borrador' && esCreador && puedeEditar(actor, mision) && (
          <Button variante="ejecutivo" onClick={() => op.enviarMision(actor.id, mision.id, publicaDirecto(actor))}>
            {publicaDirecto(actor) ? 'Publicar' : 'Enviar a aprobación'}
          </Button>
        )}
        {puedePausar(actor, mision) && (
          <Button variante="ejecutivo-suave" onClick={() => abrir('pausar', MOTIVOS_PAUSA)}>
            Pausar
          </Button>
        )}
        {puedeReanudar(actor, mision) && (
          <Button variante="ejecutivo" onClick={() => op.reanudarMision(actor.id, mision.id)}>
            Reanudar
          </Button>
        )}
        {puedeCancelar(actor, mision) && (
          <Button variante="peligro" onClick={() => abrir('cancelar', MOTIVOS_CANCELACION)}>
            Cancelar misión
          </Button>
        )}
        {puedeSolicitarPausaCancelacion(actor, mision, pendientes.length > 0) && (
          <Button
            variante="ejecutivo-suave"
            onClick={() => {
              setTipoSolicitud('pausa')
              abrir('solicitar', MOTIVOS_PAUSA)
            }}
          >
            Solicitar pausa o cancelación
          </Button>
        )}
        {!gobierna && pendientes.length > 0 && <Badge tono="pendiente">Solicitud en revisión</Badge>}
      </div>

      {pendientes.length > 0 && gobierna && (
        <Superficie className="overflow-hidden">
          <CabeceraSuperficie
            titulo="Solicitudes del Coordinador"
            descripcion="Motivo del Coordinador e impacto, simétrico a la pantalla de cancelación."
          />
          <ul>
            {pendientes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-borde px-6 py-4 last:border-0">
                <div className="min-w-0">
                  <p className="font-heading text-sm font-extrabold text-grafito">
                    {TIPOS_SOLICITUD_OPERACION[s.tipo]} · {s.motivo}
                  </p>
                  <p className="mt-1 text-xs text-texto-suave">
                    {nombreDeCuenta(s.solicitanteId, admin.cuentas)} · {formatoFechaHora(s.timestamp)}
                    {s.tipo === 'cancelacion' &&
                      ` · afecta a ${impacto.inscritos} inscritos y ${impacto.enRevision} evidencias en revisión`}
                  </p>
                  {s.nota && <p className="mt-1 text-xs italic text-grafito/70">"{s.nota}"</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variante="ejecutivo-suave"
                    onClick={() => {
                      setRechazandoSolicitud(s)
                      setOtro('')
                    }}
                  >
                    Rechazar
                  </Button>
                  <Button
                    variante={s.tipo === 'cancelacion' ? 'peligro' : 'ejecutivo'}
                    onClick={() => op.resolverSolicitudOperacion(actor.id, s.id, true)}
                  >
                    Aprobar {s.tipo === 'cancelacion' ? 'cancelación' : 'pausa'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Superficie>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="flex flex-col gap-3">
          <p className="font-heading text-sm font-bold text-texto-suave">Vista del usuario en la app</p>
          <TarjetaMision mision={mision} ahora={ahora} />
          <Superficie tono="panel" className="px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-texto-suave">Actividad</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Metrica valor={mision.inscritos} etiqueta="Inscritos" />
              <Metrica valor={mision.evidenciasAprobadas} etiqueta="Aprobadas" />
              <Metrica valor={mision.evidenciasEnRevision} etiqueta="En revisión" />
            </div>
            {/* PW-06 no está construida, y Q-0598 no decide si la evidencia se revisa desde la
                misión, desde una cola propia, o desde ambas. */}
            <p className="mt-3 text-xs leading-relaxed text-texto-suave">
              La revisión de evidencias vive en PW-06, aún sin construir. Sigue abierto si se entra desde aquí o desde una cola
              propia (Q-0598).
            </p>
          </Superficie>
        </div>

        <Superficie>
          <CabeceraSuperficie titulo="Detalle técnico" />
          <dl className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-4 gap-y-2.5 px-6 py-5 text-sm">
            <Fila k="Recompensa" v={`${mision.recompensaAgatas} Ágatas${mision.familia === 'sistema' ? ' (x2)' : ''}`} />
            {mision.familia === 'territorial' && (
              <>
                <Fila k="Evidencia" v={mision.evidencia.map((e) => TIPOS_EVIDENCIA[e]).join(', ') || '—'} />
                <Fila k="Geocerca" v={`${RADIO_GEOCERCA_METROS} m (fija)`} />
                <Fila k="Cupo" v={mision.requiereCupo ? `${mision.cupoMaximo} personas` : 'Sin cupo'} />
              </>
            )}
            <Fila
              k="Segmentación"
              v={`${nombrePlaya(mision.playaMin)} → ${mision.playaMax ? nombrePlaya(mision.playaMax) : 'sin tope'} · ${mision.escudos
                .map((r) => ROLES_JUEGO[r])
                .join(', ')} · solo Usuario Activo`}
            />
            <Fila k="Vigencia" v={`${mision.inicio.replace('T', ' ') || '—'} → ${mision.expiracion.replace('T', ' ') || '—'}`} />
            <Fila k="Recordatorio" v={mision.recordatorio ? `${mision.recordatorioHoras} h antes` : 'No'} />
            {mision.encuestaVinculada && <Fila k="Encuesta" v="Vinculada — bloqueante Ley 1581 (M13 Q-0535)" />}
          </dl>
        </Superficie>
      </div>

      {aprobable && (
        <Superficie className="border-primario/25">
          <CabeceraSuperficie
            titulo="Decidir la aprobación"
            descripcion="Contexto para decidir: [DECISIÓN BORRADOR], se puede recortar en el MVP."
          />
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
            <p className="text-sm text-texto-suave">
              ≈ {estimarAudiencia(mision, op.usuarios)} usuarios del demo cumplen la segmentación ·{' '}
              {
                op.misiones.filter(
                  (m) =>
                    m.id !== mision.id &&
                    m.estado === 'publicada' &&
                    m.territorioIds.some((id) => mision.territorioIds.includes(id)),
                ).length
              }{' '}
              misiones publicadas más en el mismo territorio.
            </p>
            <div className="flex gap-2">
              <Button variante="ejecutivo-suave" onClick={() => abrir('rechazar', MOTIVOS_RECHAZO_MISION)}>
                Rechazar con motivo
              </Button>
              <Button variante="ejecutivo" onClick={() => op.aprobarMision(actor.id, mision.id)}>
                Aprobar y publicar
              </Button>
            </div>
          </div>
        </Superficie>
      )}

      {historial.length > 0 && tienePermiso(actor, 'audit:view') && (
        <Superficie>
          <CabeceraSuperficie titulo="Historial" descripcion="Todo cambio de estado queda en audit_logs." />
          <ul>
            {historial.map((e) => (
              <li key={e.id} className="border-b border-borde px-6 py-3 last:border-0 text-xs text-texto-suave">
                <Badge tono="neutro">{ETIQUETA_EVENTO[e.tipo]}</Badge> {formatoFechaHora(e.timestamp)} · {nombreDeCuenta(e.actorId, admin.cuentas)}
                {e.checkerId && ` · resuelto por ${nombreDeCuenta(e.checkerId, admin.cuentas)}`}
                {e.detalle && ` · ${e.detalle}`}
                {e.motivo && ` · "${e.motivo}"`}
              </li>
            ))}
          </ul>
        </Superficie>
      )}

      {/* ---------- Diálogos ---------- */}

      <Modal
        abierto={dialogo === 'rechazar'}
        titulo="Rechazar la misión"
        descripcion="Vuelve a borrador, editable, y el Coordinador ve el motivo."
        onCerrar={cerrar}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              variante="peligro"
              disabled={motivoFinal.length < 3}
              onClick={() => {
                op.rechazarMision(actor.id, mision.id, motivoFinal)
                cerrar()
              }}
            >
              Rechazar
            </Button>
          </>
        }
      >
        <SelectorMotivo catalogo={MOTIVOS_RECHAZO_MISION} motivo={motivo} setMotivo={setMotivo} otro={otro} setOtro={setOtro} />
      </Modal>

      <Modal
        abierto={dialogo === 'pausar'}
        titulo="Pausar la misión"
        descripcion="Congelar, no penalizar ([DECISIÓN BORRADOR]): la evidencia enviada sigue en la cola, pero no entra evidencia nueva."
        onCerrar={cerrar}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              variante="ejecutivo"
              disabled={motivoFinal.length < 3 || (programada && !hasta)}
              onClick={() => {
                op.pausarMision(actor.id, mision.id, { motivo: motivoFinal, hasta: programada ? hasta : null, notificar })
                cerrar()
              }}
            >
              Pausar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SelectorMotivo catalogo={MOTIVOS_PAUSA} motivo={motivo} setMotivo={setMotivo} otro={otro} setOtro={setOtro} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Marcable tipo="radio" nombre="duracion" marcado={!programada} onCambiar={() => setProgramada(false)} etiqueta="Indefinida" detalle="Se reanuda a mano." />
            <Marcable tipo="radio" nombre="duracion" marcado={programada} onCambiar={() => setProgramada(true)} etiqueta="Programada" />
          </div>
          {programada && <SelectorFechaHora etiqueta="Reanudar el" value={hasta} onChange={setHasta} />}
          <Marcable marcado={notificar} onCambiar={setNotificar} etiqueta={`Notificar a los ${mision.inscritos} inscritos`} />
        </div>
      </Modal>

      <Modal
        abierto={dialogo === 'cancelar'}
        ancho="amplio"
        titulo="Cancelar la misión"
        descripcion="Es terminal: una misión cancelada no se reanuda."
        onCerrar={cerrar}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={cerrar}>
              Volver
            </Button>
            <Button
              variante="peligro"
              disabled={!confirmado || motivoFinal.length < 3}
              onClick={() => {
                op.cancelarMision(actor.id, mision.id, motivoFinal)
                cerrar()
              }}
            >
              Cancelar misión
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SelectorMotivo catalogo={MOTIVOS_CANCELACION} motivo={motivo} setMotivo={setMotivo} otro={otro} setOtro={setOtro} />
          {/* ESQ §Cancelación: separar lo que se revierte de lo que no. */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Impacto valor={impacto.inscritos} etiqueta="Inscritos afectados" tono="text-grafito" />
            <Impacto valor={impacto.enRevision} etiqueta="En revisión → cancelada_sin_revisar, sin recompensa" tono="text-peligro" />
            <Impacto valor={impacto.aprobadas} etiqueta="Aprobadas: no se revierten, el ledger no se toca" tono="text-exito" />
          </div>
          <Marcable
            marcado={confirmado}
            onCambiar={setConfirmado}
            etiqueta={`Entiendo que ${impacto.enRevision} evidencias en revisión se cierran sin recompensa`}
          />
        </div>
      </Modal>

      <Modal
        abierto={dialogo === 'solicitar'}
        titulo="Solicitar pausa o cancelación"
        descripcion="Tu rol no pausa ni cancela misiones, ni siquiera las tuyas. La decide un Administrador o Superadministrador."
        onCerrar={cerrar}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              variante="ejecutivo"
              disabled={motivoFinal.length < 3 || nota.trim().length < 5}
              onClick={() => {
                op.solicitarOperacionMision(actor.id, mision.id, tipoSolicitud, motivoFinal, nota.trim())
                cerrar()
              }}
            >
              Enviar solicitud
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Marcable
              tipo="radio"
              nombre="tipo"
              marcado={tipoSolicitud === 'pausa'}
              onCambiar={() => {
                setTipoSolicitud('pausa')
                setMotivo(MOTIVOS_PAUSA[0])
              }}
              etiqueta="Pausa"
            />
            <Marcable
              tipo="radio"
              nombre="tipo"
              marcado={tipoSolicitud === 'cancelacion'}
              onCambiar={() => {
                setTipoSolicitud('cancelacion')
                setMotivo(MOTIVOS_CANCELACION[0])
              }}
              etiqueta="Cancelación"
            />
          </div>
          <SelectorMotivo
            catalogo={tipoSolicitud === 'pausa' ? MOTIVOS_PAUSA : MOTIVOS_CANCELACION}
            motivo={motivo}
            setMotivo={setMotivo}
            otro={otro}
            setOtro={setOtro}
          />
          <TextField etiqueta="Qué está pasando (obligatorio)" value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
      </Modal>

      <Modal
        abierto={rechazandoSolicitud !== null}
        titulo="Rechazar la solicitud"
        descripcion="El Coordinador verá el motivo."
        onCerrar={() => setRechazandoSolicitud(null)}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={() => setRechazandoSolicitud(null)}>
              Cancelar
            </Button>
            <Button
              variante="peligro"
              disabled={otro.trim().length < 5}
              onClick={() => {
                if (rechazandoSolicitud) op.resolverSolicitudOperacion(actor.id, rechazandoSolicitud.id, false, otro.trim())
                setRechazandoSolicitud(null)
              }}
            >
              Rechazar
            </Button>
          </>
        }
      >
        <TextField etiqueta="Motivo (obligatorio)" value={otro} onChange={(e) => setOtro(e.target.value)} />
      </Modal>
    </CategoriaLayout>
  )
}

function SelectorMotivo({
  catalogo,
  motivo,
  setMotivo,
  otro,
  setOtro,
}: {
  catalogo: string[]
  motivo: string
  setMotivo: (m: string) => void
  otro: string
  setOtro: (m: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <SelectField
        etiqueta="Motivo tipificado"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        opciones={catalogo.map((m) => ({ valor: m, etiqueta: m }))}
      />
      {motivo === 'Otro' && <TextField etiqueta="Describe el motivo (obligatorio)" value={otro} onChange={(e) => setOtro(e.target.value)} />}
    </div>
  )
}

function Aviso({ tono, children }: { tono: 'info' | 'alerta' | 'peligro'; children: ReactNode }) {
  const clases = {
    info: 'border-primario/25 bg-primario/[0.07] text-primario',
    alerta: 'border-ambar/25 bg-ambar/[0.07] text-ambar',
    peligro: 'border-peligro/25 bg-peligro/[0.07] text-peligro',
  }
  return (
    <div role="status" className={`rounded-[16px] border px-5 py-3.5 text-sm leading-relaxed ${clases[tono]}`}>
      {children}
    </div>
  )
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-texto-suave">{k}</dt>
      <dd className="text-grafito/90">{v}</dd>
    </>
  )
}

function Metrica({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div>
      <p className="font-heading text-xl font-extrabold text-grafito">{valor.toLocaleString('es-CO')}</p>
      <p className="text-[0.7rem] text-texto-suave">{etiqueta}</p>
    </div>
  )
}

function Impacto({ valor, etiqueta, tono }: { valor: number; etiqueta: string; tono: string }) {
  return (
    <div className="rounded-[14px] border border-borde bg-surface-sunken px-4 py-3">
      <p className={`font-heading text-2xl font-extrabold ${tono}`}>{valor.toLocaleString('es-CO')}</p>
      <p className="mt-1 text-xs leading-snug text-texto-suave">{etiqueta}</p>
    </div>
  )
}
