import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CategoriaLayout } from '../../components/CategoriaLayout'
import { AreaTexto } from '../../components/ui/AreaTexto'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { BotonVolver } from '../../components/ui/BotonVolver'
import { Marcable } from '../../components/ui/Marcable'
import { SelectField } from '../../components/ui/SelectField'
import { SelectorFechaHora } from '../../components/ui/SelectorFechaHora'
import { CabeceraSuperficie, Superficie } from '../../components/ui/Superficie'
import { TextField } from '../../components/ui/TextField'
import { TarjetaMision } from './MisionVisual'
import { EditorPreguntas, preguntaVacia } from './EditorPreguntas'
import { SelectorTerritorioMision } from './SelectorTerritorioMision'
import { Stepper } from '../pw04/crear/Stepper'
import { useConfirmarSalida } from '../../state/useConfirmarSalida'
import { useNavegacionGuardia } from '../../state/navegacionGuardiaStore'
import { useOperacion } from '../../state/operacionStore'
import { useCuentaActor } from '../../state/useCuentaActor'
import {
  EVIDENCIA_SUGERIDA,
  FAMILIAS,
  RADIO_GEOCERCA_METROS,
  SUBTIPOS,
  SUBTIPOS_POR_FAMILIA,
  TIPOS_EVIDENCIA,
  categoriaDeMision,
  type Familia,
  type Mision,
  type Subtipo,
  type TipoEvidencia,
} from '../../data/misiones'
import { ROLES_JUEGO, nombrePlaya, type RolJuego } from '../../data/usuariosApp'
import { describirAlcance } from '../../data/territorios'
import { esAlcanceGlobal } from '../../dominio/alcance'
import {
  ambitosPermitidos,
  erroresDePaso,
  estimarAudiencia,
  misionVacia,
  nivelEdicion,
  publicaDirecto,
  puedeCrearMisiones,
  puedeEditar,
} from '../../dominio/misiones'

/*
  PW-05 — asistente de creación y edición de misiones (ESQ §Wizard, 5 pasos).

  "Guarda automáticamente desde el paso 1 y persiste como borrador": al avanzar de paso, una
  misión en borrador se guarda. Una misión ya publicada NO se autoguarda — cambiaría en vivo lo
  que ven los usuarios a mitad de edición — y solo se escribe al confirmar el último paso.
*/

const PASOS = ['Clasificación', 'Detalle', 'Segmentación', 'Vigencia', 'Vista previa']

export function MisionFormPage() {
  const { misionId } = useParams()
  const op = useOperacion()
  const actor = useCuentaActor()
  const navigate = useNavigate()
  const existente = misionId ? op.misiones.find((m) => m.id === misionId) : undefined
  const [draft, setDraft] = useState<Mision | null>(() => existente ?? (actor ? misionVacia(actor) : null))
  const [paso, setPaso] = useState(1)
  const [errores, setErrores] = useState<string[]>([])
  const [nuevaVersion, setNuevaVersion] = useState(false)
  const [guardadoEn, setGuardadoEn] = useState<number | null>(null)
  const [ahora] = useState(() => Date.now())
  const [borradorInicial] = useState(() => JSON.stringify(draft))

  const audiencia = useMemo(() => (draft ? estimarAudiencia(draft, op.usuarios) : 0), [draft, op.usuarios])

  // Item 8: confirmar antes de salir y perder progreso — igual que el asistente de alta de
  // cuentas de PW-04. Se compara contra la foto del borrador al montar: cualquier campo
  // tocado (o solo haber avanzado de paso, que ya persiste en `draft` vía `avanzar`) cuenta.
  const hayCambiosSinGuardar = draft !== null && JSON.stringify(draft) !== borradorInicial
  const { pedirConfirmacion, modal: modalSalir } = useConfirmarSalida(hayCambiosSinGuardar)
  const { setDirty } = useNavegacionGuardia()

  useEffect(() => {
    setDirty(hayCambiosSinGuardar)
    return () => setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayCambiosSinGuardar])

  if (!actor || !draft) return null
  if (!puedeCrearMisiones(actor)) return <Navigate to="/PW-05" replace />
  if (misionId && !existente) return <Navigate to="/PW-05" replace />
  if (existente && !puedeEditar(actor, existente)) return <Navigate to={`/PW-05/mision/${existente.id}`} replace />

  const nivel = existente ? nivelEdicion(existente) : 'todo'
  // ESQ §Edición: con actividad, los campos de regla se bloquean salvo que se cree versión nueva.
  const reglasBloqueadas = nivel === 'cosmetico' && !nuevaVersion
  const clasificacionBloqueada = Boolean(existente && existente.estado !== 'borrador' && existente.estado !== 'pendiente_aprobacion')
  const ambitos = ambitosPermitidos(actor)
  const global = esAlcanceGlobal(actor)

  const actualizar = (cambios: Partial<Mision>) => setDraft((d) => (d ? { ...d, ...cambios } : d))

  const avanzar = () => {
    const errs = erroresDePaso(draft, paso)
    setErrores(errs)
    if (errs.length > 0) return
    if (draft.estado === 'borrador') {
      const id = op.guardarMision(actor.id, draft)
      if (!draft.id) setDraft({ ...draft, id })
      setGuardadoEn(Date.now())
    }
    setPaso(paso + 1)
  }

  const finalizar = (accion: 'publicar' | 'enviar' | 'guardar' | 'version') => {
    for (let p = 1; p <= 4; p++) {
      const errs = erroresDePaso(draft, p)
      if (errs.length > 0) {
        setPaso(p)
        setErrores(errs)
        return
      }
    }
    if (accion === 'version') {
      op.crearNuevaVersion(actor.id, draft)
      navigate(`/PW-05/mision/${draft.id}`)
      return
    }
    const id = op.guardarMision(actor.id, draft)
    if (accion === 'publicar') op.enviarMision(actor.id, id, true)
    if (accion === 'enviar') op.enviarMision(actor.id, id, false)
    navigate(`/PW-05/mision/${id}`)
  }

  const destinoSalida = existente ? `/PW-05/mision/${existente.id}` : '/PW-05'

  return (
    <CategoriaLayout
      titulo={existente ? `Editar: ${existente.nombre}` : 'Crear misión'}
      descripcion={
        guardadoEn
          ? `Borrador guardado automáticamente a las ${new Date(guardadoEn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}.`
          : 'Se guarda como borrador al avanzar de paso.'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <BotonVolver a={destinoSalida} etiqueta="Salir sin guardar" interceptar={pedirConfirmacion} />
      </div>

      <Stepper pasos={PASOS} pasoActual={paso - 1} />

      {existente && nivel === 'cosmetico' && (
        <div role="status" className="rounded-[16px] border border-ambar/25 bg-ambar/[0.07] px-5 py-4 text-sm text-ambar">
          {nuevaVersion ? (
            <>
              Estás creando la versión {existente.version + 1}. La evidencia ya enviada se sigue evaluando contra la v
              {existente.version}; la nueva regla aplica solo a lo que llegue después.
            </>
          ) : (
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span>
                Esta misión ya tiene {existente.inscritos} inscritos. Nombre y descripción se editan en el sitio; recompensa,
                evidencia, cupo, segmentación y vigencia están bloqueados.
              </span>
              <Button variante="ejecutivo-suave" onClick={() => setNuevaVersion(true)}>
                Crear nueva versión
              </Button>
            </span>
          )}
        </div>
      )}

      {errores.length > 0 && (
        <div role="alert" className="rounded-[16px] border border-peligro/25 bg-peligro/[0.07] px-5 py-3 text-sm text-peligro">
          {errores.map((e) => (
            <p key={e}>· {e}</p>
          ))}
        </div>
      )}

      {paso === 1 && (
        <Superficie>
          <CabeceraSuperficie titulo="1 · Clasificación" descripcion="Familia de la misión y dónde aplica." />
          <div className="flex flex-col gap-6 px-6 py-6">
            <Campo etiqueta="Familia">
              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.keys(FAMILIAS) as Familia[]).map((f) => (
                  <Marcable
                    key={f}
                    tipo="radio"
                    nombre="familia"
                    marcado={draft.familia === f}
                    deshabilitado={f === 'sistema' || clasificacionBloqueada}
                    onCambiar={() => actualizar({ familia: f, subtipo: null, evidencia: [], encuestaVinculada: false })}
                    etiqueta={FAMILIAS[f]}
                    detalle={
                      f === 'digital'
                        ? 'Remota y auto-validada: trivias, encuestas, rachas.'
                        : f === 'territorial'
                          ? 'Presencial, con evidencia y GPS.'
                          : 'Se genera sola cada lunes; tiene formulario aparte, no este asistente.'
                    }
                  />
                ))}
              </div>
            </Campo>
            <Campo etiqueta="Ámbito">
              <div className="grid gap-3 sm:grid-cols-2">
                {(['global', 'local'] as const).map((a) => (
                  <Marcable
                    key={a}
                    tipo="radio"
                    nombre="ambito"
                    marcado={draft.ambito === a}
                    deshabilitado={!ambitos.includes(a) || clasificacionBloqueada}
                    onCambiar={() =>
                      actualizar({ ambito: a, territorioIds: a === 'global' ? [] : global ? [] : actor.territorioIds })
                    }
                    etiqueta={a === 'global' ? 'Global' : 'Local'}
                    detalle={a === 'global' ? 'Visible en todo el país.' : 'Uno o más territorios.'}
                  />
                ))}
              </div>
            </Campo>
            {draft.ambito === 'local' &&
              (global ? (
                <Campo etiqueta="Territorio">
                  <SelectorTerritorioMision
                    valores={draft.territorioIds}
                    onCambiar={(ids) => actualizar({ territorioIds: ids })}
                    disabled={clasificacionBloqueada}
                  />
                </Campo>
              ) : (
                // ESQ Paso 1: para el Coordinador, bloqueado a su propio alcance.
                <Badge tono="info">Territorio fijo: {describirAlcance(draft.territorioIds)}</Badge>
              ))}
          </div>
        </Superficie>
      )}

      {paso === 2 && (
        <Superficie>
          <CabeceraSuperficie titulo={`2 · Detalle ${FAMILIAS[draft.familia].toLowerCase()}`} />
          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <SelectField
              etiqueta="Subtipo"
              value={draft.subtipo ?? ''}
              disabled={reglasBloqueadas}
              onChange={(e) => {
                const subtipo = (e.target.value || null) as Subtipo | null
                // ESQ: el subtipo territorial pre-marca la evidencia por defecto. Trivia/Encuesta
                // parten con una pregunta en blanco en vez de arrastrar preguntas de otro subtipo.
                actualizar({
                  subtipo,
                  evidencia: subtipo && EVIDENCIA_SUGERIDA[subtipo] ? [...(EVIDENCIA_SUGERIDA[subtipo] ?? [])] : draft.evidencia,
                  encuestaVinculada: subtipo === 'encuesta',
                  preguntas: subtipo === 'trivia' || subtipo === 'encuesta' ? [preguntaVacia()] : [],
                })
              }}
              opciones={[
                { valor: '', etiqueta: 'Elige un subtipo' },
                ...SUBTIPOS_POR_FAMILIA[draft.familia].map((s) => ({ valor: s, etiqueta: SUBTIPOS[s] })),
              ]}
            />
            <TextField
              etiqueta="Recompensa en Ágatas"
              type="number"
              min={1}
              value={draft.recompensaAgatas}
              disabled={reglasBloqueadas}
              onChange={(e) => actualizar({ recompensaAgatas: Number(e.target.value) })}
            />
            <div className="sm:col-span-2">
              <TextField etiqueta="Nombre" value={draft.nombre} onChange={(e) => actualizar({ nombre: e.target.value })} />
            </div>
            {draft.subtipo === 'trivia' || draft.subtipo === 'encuesta' ? (
              <div className="sm:col-span-2">
                <p className="mb-2 font-heading text-sm font-bold text-grafito">
                  {draft.subtipo === 'trivia' ? 'Preguntas de la trivia' : 'Preguntas de la encuesta'}
                </p>
                <EditorPreguntas
                  subtipo={draft.subtipo}
                  preguntas={draft.preguntas}
                  disabled={reglasBloqueadas}
                  onCambiar={(preguntas) => actualizar({ preguntas })}
                />
              </div>
            ) : (
              <div className="sm:col-span-2">
                <AreaTexto etiqueta="Descripción" value={draft.descripcion} onChange={(e) => actualizar({ descripcion: e.target.value })} />
              </div>
            )}

            {draft.familia === 'digital' && draft.subtipo === 'encuesta' && (
              <div className="rounded-[16px] border border-peligro/25 bg-peligro/[0.07] px-5 py-4 text-sm text-peligro sm:col-span-2">
                Vincular una encuesta arrastra el BLOQUEANTE legal de M13 Q-0535 (Ley 1581, dato sensible de opinión
                política): los resultados no se podrán consultar hasta que se asigne responsable y se resuelva.
              </div>
            )}

            {draft.familia === 'territorial' && (
              <>
                <div className="sm:col-span-2">
                  <Campo etiqueta="Tipo de evidencia">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(Object.keys(TIPOS_EVIDENCIA) as TipoEvidencia[]).map((t) => (
                        <Marcable
                          key={t}
                          marcado={draft.evidencia.includes(t)}
                          deshabilitado={reglasBloqueadas}
                          onCambiar={(marcado) =>
                            actualizar({ evidencia: marcado ? [...draft.evidencia, t] : draft.evidencia.filter((x) => x !== t) })
                          }
                          etiqueta={TIPOS_EVIDENCIA[t]}
                        />
                      ))}
                    </div>
                  </Campo>
                </div>
                <div className="rounded-[16px] border border-borde bg-surface-sunken px-5 py-4 text-sm text-texto-suave sm:col-span-2">
                  <p className="font-heading font-extrabold text-grafito">Geocerca: {RADIO_GEOCERCA_METROS} m, fija</p>
                  <p className="mt-1 text-xs">
                    Radio no editable por misión: es constante del sistema ([DECISIÓN BORRADOR] en el esquema de misiones). El
                    mapa para ubicar el centro llega con el backend.
                  </p>
                </div>
                <Marcable
                  marcado={draft.requiereCupo}
                  deshabilitado={reglasBloqueadas}
                  onCambiar={(marcado) => actualizar({ requiereCupo: marcado, cupoMaximo: marcado ? (draft.cupoMaximo ?? 50) : null })}
                  etiqueta="Requiere cupo"
                  detalle="El usuario se inscribe antes de empezar."
                />
                {draft.requiereCupo && (
                  <TextField
                    etiqueta="Cupo máximo"
                    type="number"
                    min={1}
                    value={draft.cupoMaximo ?? ''}
                    disabled={reglasBloqueadas}
                    onChange={(e) => actualizar({ cupoMaximo: Number(e.target.value) || null })}
                  />
                )}
              </>
            )}
          </div>
        </Superficie>
      )}

      {paso === 3 && (
        <Superficie>
          <CabeceraSuperficie
            titulo="3 · Segmentación"
            descripcion="A quién le llega la misión: rango de Playa, rol de juego y el canal por el que se entrega."
          />
          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <SelectField
              etiqueta="Playa mínima"
              value={String(draft.playaMin)}
              disabled={reglasBloqueadas}
              onChange={(e) => actualizar({ playaMin: Number(e.target.value) })}
              opciones={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ valor: String(n), etiqueta: nombrePlaya(n) }))}
            />
            <SelectField
              etiqueta="Playa máxima"
              value={draft.playaMax === null ? '' : String(draft.playaMax)}
              disabled={reglasBloqueadas}
              onChange={(e) => actualizar({ playaMax: e.target.value ? Number(e.target.value) : null })}
              opciones={[{ valor: '', etiqueta: 'Sin tope' }, ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ valor: String(n), etiqueta: nombrePlaya(n) }))]}
            />
            <div className="sm:col-span-2">
              <Campo etiqueta="Rol de juego objetivo">
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(ROLES_JUEGO) as RolJuego[]).map((r) => (
                    <Marcable
                      key={r}
                      marcado={draft.escudos.includes(r)}
                      deshabilitado={reglasBloqueadas}
                      onCambiar={(marcado) =>
                        actualizar({ escudos: marcado ? [...draft.escudos, r] : draft.escudos.filter((x) => x !== r) })
                      }
                      etiqueta={ROLES_JUEGO[r]}
                    />
                  ))}
                </div>
              </Campo>
            </div>
            <div
              className={`sm:col-span-2 rounded-[16px] border px-5 py-4 text-sm ${
                audiencia === 0 ? 'border-ambar/30 bg-ambar/[0.08] text-ambar' : 'border-primario/25 bg-primario/[0.07] text-primario'
              }`}
            >
              <p className="font-heading text-base font-extrabold">Alcance estimado: {audiencia} usuarios</p>
              <p className="mt-1 text-xs leading-relaxed opacity-85">
                {audiencia === 0
                  ? 'Con la Playa, el rol y el territorio que elegiste, ningún usuario del demo califica: la misión no le llegaría a nadie. Amplía alguno de los tres antes de publicar.'
                  : `Con esta segmentación (Playa, rol y territorio), así de muchos usuarios del demo verían la misión.`}
              </p>
            </div>
            <div className="sm:col-span-2 rounded-[16px] border border-borde bg-surface-sunken px-5 py-3 text-xs text-texto-suave">
              Canal: solo <strong className="font-heading font-bold text-grafito/80">Usuario Activo</strong> — las
              misiones requieren la app, así que Inscrito Activo siempre queda fuera.
            </div>
          </div>
        </Superficie>
      )}

      {paso === 4 && (
        <Superficie>
          <CabeceraSuperficie titulo="4 · Vigencia" descripcion="Cuándo empieza a verse la misión y cuándo deja de estar disponible." />
          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <SelectorFechaHora
              etiqueta="Inicio"
              value={draft.inicio}
              disabled={reglasBloqueadas}
              onChange={(v) => actualizar({ inicio: v })}
            />
            <SelectorFechaHora
              etiqueta="Expiración"
              value={draft.expiracion}
              disabled={reglasBloqueadas}
              onChange={(v) => actualizar({ expiracion: v })}
              ayuda="Obligatoria: toda misión expira."
            />
            <Marcable
              marcado={draft.recordatorio}
              onCambiar={(marcado) => actualizar({ recordatorio: marcado })}
              etiqueta="Recordatorio push antes de expirar"
            />
            {draft.recordatorio && (
              <TextField
                etiqueta="Horas antes"
                type="number"
                min={1}
                value={draft.recordatorioHoras}
                onChange={(e) => actualizar({ recordatorioHoras: Number(e.target.value) })}
              />
            )}
          </div>
        </Superficie>
      )}

      {paso === 5 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="flex flex-col gap-3">
            <p className="font-heading text-sm font-bold text-texto-suave">Así la verá el usuario en la app</p>
            <TarjetaMision mision={draft} ahora={ahora} />
          </div>

          <div className="flex flex-col gap-4">
            <TarjetaResumenPaso numero={1} titulo="Clasificación" onEditar={() => setPaso(1)}>
              <Fila k="Familia" v={FAMILIAS[draft.familia]} />
              <Fila k="Ámbito" v={draft.ambito === 'global' ? 'Global' : describirAlcance(draft.territorioIds)} />
            </TarjetaResumenPaso>

            <TarjetaResumenPaso numero={2} titulo="Detalle" onEditar={() => setPaso(2)}>
              <Fila k="Subtipo" v={draft.subtipo ? SUBTIPOS[draft.subtipo] : '—'} />
              <Fila k="Nombre" v={draft.nombre || '—'} />
              <Fila k="Recompensa" v={`${draft.recompensaAgatas} Ágatas`} />
              {/* Cada familia/subtipo trae sus propios campos del paso 2 — el resumen solo
                  muestra los que aplican a lo elegido, igual que el formulario. */}
              {draft.familia === 'territorial' && (
                <>
                  <Fila k="Evidencia" v={draft.evidencia.map((e) => TIPOS_EVIDENCIA[e]).join(', ') || '—'} />
                  <Fila k="Geocerca" v={`${RADIO_GEOCERCA_METROS} m (fija)`} />
                  <Fila k="Cupo" v={draft.requiereCupo ? `${draft.cupoMaximo ?? '—'} personas` : 'Sin cupo'} />
                </>
              )}
              {(draft.subtipo === 'trivia' || draft.subtipo === 'encuesta') && (
                <Fila k="Preguntas" v={`${draft.preguntas.length} pregunta${draft.preguntas.length === 1 ? '' : 's'}`} />
              )}
              {draft.subtipo === 'encuesta' && (
                <Fila k="Aviso legal" v="Bloqueante Ley 1581 — resultados no consultables hasta asignar responsable" destacada />
              )}
            </TarjetaResumenPaso>

            <TarjetaResumenPaso numero={3} titulo="Segmentación" onEditar={() => setPaso(3)}>
              <Fila k="Playa" v={`${nombrePlaya(draft.playaMin)} → ${draft.playaMax ? nombrePlaya(draft.playaMax) : 'sin tope'}`} />
              <Fila k="Roles" v={draft.escudos.map((r) => ROLES_JUEGO[r]).join(', ') || '—'} />
              <Fila
                k="Audiencia"
                v={`≈ ${audiencia} usuarios`}
                destacada={audiencia === 0}
              />
            </TarjetaResumenPaso>

            <TarjetaResumenPaso numero={4} titulo="Vigencia" onEditar={() => setPaso(4)}>
              <Fila k="Inicio" v={draft.inicio ? draft.inicio.replace('T', ' ') : '—'} />
              <Fila k="Expiración" v={draft.expiracion ? draft.expiracion.replace('T', ' ') : '—'} />
              <Fila k="Recordatorio" v={draft.recordatorio ? `${draft.recordatorioHoras} h antes de expirar` : 'No'} />
            </TarjetaResumenPaso>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pb-4">
        <Button variante="secundario" className="mr-auto" onClick={() => pedirConfirmacion(() => navigate(destinoSalida))}>
          Cancelar
        </Button>
        {paso > 1 && (
          <Button variante="ejecutivo-suave" onClick={() => setPaso(paso - 1)}>
            Atrás
          </Button>
        )}
        {paso < 5 && (
          <Button variante="ejecutivo" onClick={avanzar}>
            Siguiente
          </Button>
        )}
        {paso === 5 && draft.estado === 'borrador' && (
          <>
            <Button variante="ejecutivo-suave" onClick={() => finalizar('guardar')}>
              Guardar borrador
            </Button>
            {/* ESQ Paso 5: el botón depende de quién publica. */}
            {publicaDirecto(actor) ? (
              <Button variante="ejecutivo" onClick={() => finalizar('publicar')}>
                Publicar
              </Button>
            ) : (
              <Button variante="ejecutivo" onClick={() => finalizar('enviar')}>
                Enviar a aprobación
              </Button>
            )}
          </>
        )}
        {paso === 5 && draft.estado === 'pendiente_aprobacion' && (
          <Button variante="ejecutivo" onClick={() => finalizar('guardar')}>
            Guardar cambios (reinicia la revisión)
          </Button>
        )}
        {paso === 5 && draft.estado === 'publicada' && (
          <Button variante="ejecutivo" onClick={() => finalizar(nuevaVersion ? 'version' : 'guardar')}>
            {nuevaVersion ? `Publicar versión ${draft.version + 1}` : 'Guardar cambios'}
          </Button>
        )}
      </div>

      {modalSalir}
    </CategoriaLayout>
  )
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-heading text-sm font-bold text-grafito">{etiqueta}</p>
      {children}
    </div>
  )
}

function Fila({ k, v, destacada }: { k: string; v: string; destacada?: boolean }) {
  return (
    <>
      <dt className="text-texto-suave">{k}</dt>
      <dd className={destacada ? 'font-semibold text-ambar' : 'text-grafito/90'}>{v}</dd>
    </>
  )
}

// Tarjeta compacta de resumen, una por paso del asistente — el paso 5 antes era una sola
// lista plana de 7-8 filas sin relación visible con los 4 pasos que las produjeron; agruparlas
// así deja claro de dónde sale cada dato y da un atajo directo ("Editar") para corregirlo sin
// tener que recorrer el Stepper a mano.
function TarjetaResumenPaso({
  numero,
  titulo,
  onEditar,
  children,
}: {
  numero: number
  titulo: string
  onEditar: () => void
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-borde bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-borde bg-surface-sunken/60 px-5 py-3">
        <span className="flex items-center gap-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primario/15 font-heading text-xs font-extrabold text-primario">
            {numero}
          </span>
          <span className="font-heading text-sm font-extrabold text-grafito">{titulo}</span>
        </span>
        <button
          type="button"
          onClick={onEditar}
          className="rounded-full px-3 py-1 text-xs font-bold text-primario outline-none transition-colors hover:bg-primario/10 focus-visible:ring-4 focus-visible:ring-ambar/40"
        >
          Editar
        </button>
      </div>
      <dl className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-4 gap-y-2 px-5 py-4 text-sm">{children}</dl>
    </div>
  )
}
