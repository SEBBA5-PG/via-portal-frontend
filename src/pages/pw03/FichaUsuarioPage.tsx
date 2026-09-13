import { useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CategoriaLayout } from '../../components/CategoriaLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EstadoVacio } from '../../components/ui/EstadoVacio'
import { Marcable } from '../../components/ui/Marcable'
import { Modal } from '../../components/ui/Modal'
import { SelectField } from '../../components/ui/SelectField'
import { CabeceraSuperficie, Superficie } from '../../components/ui/Superficie'
import { TextField } from '../../components/ui/TextField'
import { BadgeEstadoUsuario } from './BadgeEstadoUsuario'
import { useAdmin } from '../../state/adminStore'
import { useOperacion } from '../../state/operacionStore'
import { useCuentaActor } from '../../state/useCuentaActor'
import {
  CANALES,
  MOTIVOS_BLOQUEO,
  ROLES_JUEGO,
  nombrePlaya,
  type MotivoBloqueo,
} from '../../data/usuariosApp'
import { nombreDeCuenta } from '../../data/cuentas'
import { ETIQUETA_EVENTO, formatoFechaHora } from '../../data/auditoria'
import { territorioPorId } from '../../data/territorios'
import { alcanza } from '../../dominio/alcance'
import { tienePermiso } from '../../dominio/permisos'
import {
  IMPACTO_ELIMINACION,
  accionesDisponibles,
  enmascararCedulaApp,
  enmascararCelularApp,
  posiblesDuplicados,
  primariaSugerida,
  puedeFirmarAjuste,
  puedeVerPII,
} from '../../dominio/usuarios'

/*
  PW-03 — ficha de un usuario de la app.

  Q-0592 (qué campos edita un administrador sobre OTRO usuario) sigue ABIERTA. Por eso esta
  ficha no tiene campos de identidad editables: las únicas modificaciones son las que la wiki
  sí describe como acciones administrativas — bloqueo, moderación de alias, eliminación,
  fusión y ajuste de balance.
*/

type Pestana = 'perfil' | 'juego' | 'historial'
type Dialogo = 'bloquear' | 'solicitar' | 'desbloquear' | 'moderar' | 'eliminar' | 'fusionar' | 'ajuste' | null

// El bloqueo por OTP es automático: no se ofrece como motivo manual.
const MOTIVOS_MANUALES = (Object.keys(MOTIVOS_BLOQUEO) as MotivoBloqueo[]).filter((m) => m !== 'otp')

export function FichaUsuarioPage() {
  const { usuarioId } = useParams()
  const op = useOperacion()
  const admin = useAdmin()
  const actor = useCuentaActor()
  const navigate = useNavigate()
  const [pestana, setPestana] = useState<Pestana>('perfil')
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [motivo, setMotivo] = useState<MotivoBloqueo>('fraude_gps')
  const [nota, setNota] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const [delta, setDelta] = useState('')
  const [secundariaId, setSecundariaId] = useState<string | null>(null)
  const [primariaElegida, setPrimariaElegida] = useState<string | null>(null)

  const usuario = op.usuarios.find((u) => u.id === usuarioId)

  if (!actor) return null
  if (!usuario || !alcanza(actor, usuario.municipioId)) return <Navigate to="/PW-03" replace />

  const bloqueoSolicitado = op.solicitudes.some(
    (s) => s.tipo === 'bloqueo' && s.objetivoId === usuario.id && s.estado === 'pendiente',
  )
  const acciones = accionesDisponibles(actor, usuario, bloqueoSolicitado)
  const vePII = puedeVerPII(actor)
  const duplicados = posiblesDuplicados(usuario, op.usuarios)
  const ajustes = op.ajustes.filter((a) => a.usuarioId === usuario.id)
  const historial = admin.auditoria.filter((e) => e.usuarioAppId === usuario.id)
  const impersonandoEste = op.impersonacion?.usuarioId === usuario.id && op.impersonacion.actorId === actor.id

  const abrir = (d: Dialogo) => {
    setNota('')
    setConfirmado(false)
    setDelta('')
    if (d === 'fusionar' && duplicados[0]) {
      setSecundariaId(duplicados[0].id)
      setPrimariaElegida(primariaSugerida(usuario, duplicados[0]).id)
    }
    setDialogo(d)
  }
  const cerrar = () => setDialogo(null)

  const secundaria = op.usuarios.find((u) => u.id === secundariaId)
  const primaria = primariaElegida ? op.usuarios.find((u) => u.id === primariaElegida) : undefined
  const otraDeFusion = primaria && secundaria ? (primaria.id === usuario.id ? secundaria : usuario) : undefined

  return (
    <CategoriaLayout
      categoria="PW-03 · Usuarios y ciclo de vida"
      titulo={usuario.alias}
      descripcion={
        <>
          {CANALES[usuario.canal]} · {territorioPorId(usuario.municipioId)?.nombre} · registrado el {usuario.fechaRegistro}
        </>
      }
      acciones={
        <>
          <BadgeEstadoUsuario estado={usuario.estado} />
          <Button variante="ejecutivo-suave" onClick={() => navigate('/PW-03')}>
            Volver al listado
          </Button>
        </>
      }
    >
      {usuario.estado === 'bloqueada' && usuario.motivoBloqueo && (
        <Aviso tono="peligro">
          Bloqueada: {MOTIVOS_BLOQUEO[usuario.motivoBloqueo]}.
          {acciones.desbloqueoAutomatico && ' Se levanta sola al cumplirse la hora; nadie la desbloquea a mano.'}
        </Aviso>
      )}
      {usuario.estado === 'bajo_auditoria' && (
        <Aviso tono="alerta">
          Cuenta bajo auditoría por alertas de fraude o GPS inconsistente. Solo un Administrador o Superadministrador la
          reactiva.
        </Aviso>
      )}
      {usuario.fusionadoCon && (
        <Aviso tono="alerta">Eliminada por fusión: fusionada_con_{usuario.fusionadoCon}.</Aviso>
      )}
      {duplicados.length > 0 && (
        <Aviso tono="alerta">
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Posible duplicado: comparte dispositivo con {duplicados.map((d) => d.alias).join(', ')}.
            </span>
            {acciones.fusionar && (
              <Button variante="ejecutivo-suave" onClick={() => abrir('fusionar')}>
                Revisar fusión
              </Button>
            )}
          </span>
        </Aviso>
      )}

      {/* Barra de acciones: solo lo que la cuenta puede ejecutar. Nada deshabilitado. */}
      <div className="flex flex-wrap gap-2">
        {acciones.bloquear && (
          <Button variante="peligro" onClick={() => abrir('bloquear')}>
            Bloquear
          </Button>
        )}
        {acciones.solicitarBloqueo && (
          <Button variante="ejecutivo-suave" onClick={() => abrir('solicitar')}>
            Solicitar bloqueo
          </Button>
        )}
        {bloqueoSolicitado && !acciones.bloquear && (
          <Badge tono="pendiente">Bloqueo solicitado, pendiente de revisión</Badge>
        )}
        {acciones.desbloquear && (
          <Button variante="ejecutivo" onClick={() => abrir('desbloquear')}>
            Reactivar cuenta
          </Button>
        )}
        {acciones.moderarAlias && (
          <Button variante="ejecutivo-suave" onClick={() => abrir('moderar')}>
            Forzar alias por defecto
          </Button>
        )}
        {acciones.impersonar && !impersonandoEste && (
          <Button variante="ejecutivo-suave" onClick={() => op.iniciarImpersonacion(actor.id, usuario.id)}>
            Impersonar
          </Button>
        )}
        {acciones.eliminar && (
          <Button variante="ejecutivo-suave" onClick={() => abrir('eliminar')}>
            Eliminar cuenta
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['perfil', 'juego', 'historial'] as Pestana[]).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={pestana === p}
            onClick={() => setPestana(p)}
            className={`rounded-full border px-4 py-2 font-heading text-sm font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 ${
              pestana === p
                ? 'border-primario/40 bg-primario/[0.14] text-primario'
                : 'border-white/10 bg-white/[0.03] text-texto-suave hover:text-grafito'
            }`}
          >
            {p === 'perfil' ? 'Perfil' : p === 'juego' ? 'Juego y Ágatas' : 'Historial'}
          </button>
        ))}
      </div>

      {pestana === 'perfil' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Superficie>
            <CabeceraSuperficie
              titulo="Perfil público"
              descripcion="Lo que ven otros usuarios. Cédula, celular, saldo y dirección están estrictamente excluidos."
            />
            <Datos
              filas={[
                ['Alias', usuario.alias],
                ['Playa actual', nombrePlaya(usuario.playa)],
                ['Rol de juego', ROLES_JUEGO[usuario.rolJuego]],
                ['Avatar', 'Del catálogo del juego'],
              ]}
            />
          </Superficie>
          <Superficie>
            <CabeceraSuperficie
              titulo="Datos privados"
              descripcion={
                vePII
                  ? 'Visibles porque tu cuenta tiene users:view_pii.'
                  : 'Enmascarados: tu cuenta no tiene users:view_pii. En producción el servidor no envía el dato completo.'
              }
            />
            <Datos
              filas={[
                ['Nombre legal', usuario.estado === 'eliminada' ? '—' : usuario.nombreLegal],
                ['Cédula', vePII ? usuario.cedula : enmascararCedulaApp(usuario.cedula)],
                ['Celular', !usuario.celular ? '—' : vePII ? usuario.celular : enmascararCelularApp(usuario.celular)],
                ['Municipio', territorioPorId(usuario.municipioId)?.nombre ?? usuario.municipioId],
                ['Barrio', usuario.barrio || '—'],
                ['Última actividad', usuario.ultimaActividad],
              ]}
            />
          </Superficie>
        </div>
      )}

      {pestana === 'juego' && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi etiqueta="Playa" valor={nombrePlaya(usuario.playa)} />
            <Kpi etiqueta="Rol de juego" valor={ROLES_JUEGO[usuario.rolJuego]} />
            <Kpi etiqueta="Saldo" valor={`${usuario.agatas.toLocaleString('es-CO')} Ágatas`} />
          </div>
          <Superficie>
            <CabeceraSuperficie
              titulo="Ajustes manuales de balance"
              descripcion="Techo de seguridad: solo un Superadministrador lo propone, y otro distinto lo firma."
              acciones={
                acciones.ajustarBalance ? (
                  <Button variante="ejecutivo-suave" onClick={() => abrir('ajuste')}>
                    Proponer ajuste
                  </Button>
                ) : undefined
              }
            />
            {ajustes.length === 0 ? (
              <p className="px-6 py-5 text-sm text-texto-suave">Este usuario no tiene ajustes manuales.</p>
            ) : (
              <ul>
                {ajustes.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] px-6 py-4 last:border-0">
                    <div>
                      <p className="font-heading text-sm font-extrabold text-grafito">
                        {a.delta > 0 ? '+' : ''}
                        {a.delta} Ágatas{' '}
                        <Badge tono={a.estado === 'pendiente' ? 'pendiente' : a.estado === 'aprobado' ? 'exito' : 'peligro'}>
                          {a.estado}
                        </Badge>
                      </p>
                      <p className="mt-1 text-xs text-texto-suave">
                        Propuesto por {nombreDeCuenta(a.makerId, admin.cuentas)}
                        {a.checkerId && ` · firmado por ${nombreDeCuenta(a.checkerId, admin.cuentas)}`} · "{a.motivo}"
                      </p>
                    </div>
                    {a.estado === 'pendiente' &&
                      (puedeFirmarAjuste(actor, a) ? (
                        <div className="flex gap-2">
                          <Button variante="ejecutivo-suave" onClick={() => op.resolverAjuste(actor.id, a.id, false)}>
                            Rechazar
                          </Button>
                          <Button variante="ejecutivo" onClick={() => op.resolverAjuste(actor.id, a.id, true)}>
                            Aprobar
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-ambar">
                          {a.makerId === actor.id ? 'No puedes firmar un ajuste que tú propusiste.' : 'Espera la firma de un Superadministrador.'}
                        </p>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </Superficie>
        </>
      )}

      {pestana === 'historial' &&
        (tienePermiso(actor, 'audit:view') ? (
          historial.length === 0 ? (
            <Superficie>
              <EstadoVacio motivo="sin-datos" titulo="Sin acciones administrativas" descripcion="Nadie del portal ha actuado sobre esta cuenta desde este demo." />
            </Superficie>
          ) : (
            <Superficie>
              <CabeceraSuperficie titulo="Historial administrativo" descripcion="Registro inmutable en audit_logs." />
              <ul>
                {historial.map((e) => (
                  <li key={e.id} className="border-b border-white/[0.04] px-6 py-4 last:border-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tono={e.severidad === 'alta' ? 'peligro' : e.conDobleFirma ? 'alerta' : 'neutro'}>
                        {ETIQUETA_EVENTO[e.tipo]}
                      </Badge>
                      {e.severidad === 'alta' && <Badge tono="peligro">Severidad alta</Badge>}
                      <span className="text-xs text-texto-suave">{formatoFechaHora(e.timestamp)}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-texto-suave">
                      Por {nombreDeCuenta(e.actorId, admin.cuentas)}
                      {e.checkerId && ` · firmado por ${nombreDeCuenta(e.checkerId, admin.cuentas)}`}
                      {e.detalle && ` · ${e.detalle}`}
                    </p>
                    {e.motivo && <p className="mt-1 text-xs italic text-grafito/70">"{e.motivo}"</p>}
                  </li>
                ))}
              </ul>
            </Superficie>
          )
        ) : (
          <Superficie>
            <EstadoVacio
              motivo="sin-datos"
              titulo="No puedes ver el historial de esta cuenta"
              descripcion="La trazabilidad exige audit:view, exclusivo de Superadministrador. Pídeselo a quien administre los permisos del portal."
            />
          </Superficie>
        ))}

      {/* ---------- Diálogos ---------- */}

      <Modal
        abierto={dialogo === 'bloquear' || dialogo === 'solicitar'}
        titulo={dialogo === 'bloquear' ? `Bloquear a ${usuario.alias}` : `Solicitar bloqueo de ${usuario.alias}`}
        descripcion={
          dialogo === 'bloquear'
            ? 'La cuenta deja de operar de inmediato y el usuario recibe aviso in-app y por WhatsApp.'
            : 'Tu rol no bloquea directamente. La solicitud llega a un Administrador o Superadministrador, que decide.'
        }
        onCerrar={cerrar}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              variante={dialogo === 'bloquear' ? 'peligro' : 'ejecutivo'}
              disabled={nota.trim().length < 5}
              onClick={() => {
                if (dialogo === 'bloquear') op.bloquearUsuario(actor.id, usuario.id, motivo, nota.trim())
                else op.solicitarBloqueo(actor.id, usuario.id, MOTIVOS_BLOQUEO[motivo], nota.trim())
                cerrar()
              }}
            >
              {dialogo === 'bloquear' ? 'Bloquear' : 'Enviar solicitud'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SelectField
            etiqueta="Motivo tipificado"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoBloqueo)}
            opciones={MOTIVOS_MANUALES.map((m) => ({ valor: m, etiqueta: MOTIVOS_BLOQUEO[m] }))}
          />
          <TextField etiqueta="Detalle (obligatorio)" value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
      </Modal>

      <Modal
        abierto={dialogo === 'desbloquear'}
        titulo={`Reactivar a ${usuario.alias}`}
        descripcion="La cuenta vuelve a estado activa. El usuario recibe aviso in-app y por WhatsApp."
        onCerrar={cerrar}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              variante="ejecutivo"
              disabled={nota.trim().length < 5}
              onClick={() => {
                op.desbloquearUsuario(actor.id, usuario.id, nota.trim())
                cerrar()
              }}
            >
              Reactivar
            </Button>
          </>
        }
      >
        <TextField etiqueta="Motivo de la reactivación (obligatorio)" value={nota} onChange={(e) => setNota(e.target.value)} />
      </Modal>

      <Modal
        abierto={dialogo === 'moderar'}
        titulo="Forzar alias por defecto"
        descripcion={`"${usuario.alias}" se reemplaza por un alias genérico. El usuario podrá elegir otro que pase el filtro de palabras.`}
        onCerrar={cerrar}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              variante="ejecutivo"
              onClick={() => {
                op.moderarAlias(actor.id, usuario.id)
                cerrar()
              }}
            >
              Forzar alias
            </Button>
          </>
        }
      />

      {/* Confirmación con impacto (Reglas Transversales §Confirmaciones): separa lo que se
          pierde de lo que se conserva, y exige confirmar el alcance explícitamente. */}
      <Modal
        abierto={dialogo === 'eliminar'}
        ancho="amplio"
        titulo={`Eliminar la cuenta de ${usuario.alias}`}
        descripcion="Eliminación lógica (soft delete): nunca hay borrado físico, está prohibido por auditoría electoral."
        onCerrar={cerrar}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              variante="peligro"
              disabled={!confirmado || nota.trim().length < 5}
              onClick={() => {
                op.eliminarUsuario(actor.id, usuario.id, nota.trim())
                cerrar()
              }}
            >
              Eliminar cuenta
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Lista titulo="Se borra" items={IMPACTO_ELIMINACION.seBorra} tono="text-red-300" />
          <Lista titulo="Se conserva" items={IMPACTO_ELIMINACION.seConserva} tono="text-[#8fd382]" />
        </div>
        <Lista titulo="Además" items={IMPACTO_ELIMINACION.efectos} tono="text-ambar" />
        <div className="mt-4 flex flex-col gap-3">
          <TextField etiqueta="Motivo (obligatorio)" value={nota} onChange={(e) => setNota(e.target.value)} />
          <Marcable
            marcado={confirmado}
            onCambiar={setConfirmado}
            etiqueta="Entiendo que el saldo de Ágatas se extingue y las recompensas pendientes se cancelan sin reembolso"
          />
        </div>
      </Modal>

      <Modal
        abierto={dialogo === 'fusionar'}
        ancho="amplio"
        titulo="Fusionar cuentas duplicadas"
        descripcion="La primaria conserva su identidad; recibe las Ágatas y la red de la secundaria, que pasa a eliminada."
        onCerrar={cerrar}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              variante="peligro"
              disabled={!confirmado || !primaria || !otraDeFusion}
              onClick={() => {
                if (primaria && otraDeFusion) op.fusionarUsuarios(actor.id, primaria.id, otraDeFusion.id)
                cerrar()
              }}
            >
              Fusionar
            </Button>
          </>
        }
      >
        {secundaria && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-texto-suave">
              Elige la cuenta primaria. La wiki pide la que tenga cédula verificada; el demo sugiere la de Usuario Activo con
              más saldo porque no modela la verificación.
            </p>
            {[usuario, secundaria].map((u) => (
              <Marcable
                key={u.id}
                tipo="radio"
                nombre="primaria"
                marcado={primariaElegida === u.id}
                onCambiar={() => setPrimariaElegida(u.id)}
                etiqueta={`${u.alias} — ${CANALES[u.canal]}`}
                detalle={`${u.agatas.toLocaleString('es-CO')} Ágatas · registrado ${u.fechaRegistro}`}
              />
            ))}
            {primaria && otraDeFusion && (
              <p className="rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-grafito/85">
                {primaria.alias} recibe {otraDeFusion.agatas.toLocaleString('es-CO')} Ágatas y la red de {otraDeFusion.alias}.{' '}
                {otraDeFusion.alias} queda eliminada con la nota fusionada_con_{primaria.id}.
              </p>
            )}
            <Marcable marcado={confirmado} onCambiar={setConfirmado} etiqueta="Confirmo que ambas cuentas son de la misma persona" />
          </div>
        )}
      </Modal>

      <Modal
        abierto={dialogo === 'ajuste'}
        titulo="Proponer ajuste de balance"
        descripcion="No se aplica al guardar: queda pendiente hasta que otro Superadministrador lo firme."
        onCerrar={cerrar}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              variante="ejecutivo"
              disabled={!Number(delta) || nota.trim().length < 5}
              onClick={() => {
                op.proponerAjuste(actor.id, usuario.id, Math.trunc(Number(delta)), nota.trim())
                cerrar()
              }}
            >
              Enviar a aprobación
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField
            etiqueta="Ágatas (positivo suma, negativo resta)"
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
          />
          <TextField etiqueta="Motivo (obligatorio)" value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
      </Modal>
    </CategoriaLayout>
  )
}

function Aviso({ tono, children }: { tono: 'alerta' | 'peligro'; children: ReactNode }) {
  return (
    <div
      role="status"
      className={`rounded-[16px] border px-5 py-3.5 text-sm leading-relaxed ${
        tono === 'peligro' ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-ambar/25 bg-ambar/[0.07] text-ambar'
      }`}
    >
      {children}
    </div>
  )
}

function Datos({ filas }: { filas: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-4 gap-y-3 px-6 py-5 text-sm">
      {filas.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-texto-suave">{k}</dt>
          <dd className="text-grafito/90">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Kpi({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Superficie className="px-6 py-5">
      <p className="text-xs font-bold uppercase tracking-wide text-texto-suave">{etiqueta}</p>
      <p className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-grafito">{valor}</p>
    </Superficie>
  )
}

function Lista({ titulo, items, tono }: { titulo: string; items: string[]; tono: string }) {
  return (
    <div className="mt-3">
      <p className={`font-heading text-sm font-extrabold ${tono}`}>{titulo}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map((i) => (
          <li key={i} className="text-xs text-grafito/80">
            · {i}
          </li>
        ))}
      </ul>
    </div>
  )
}
