import { useMemo, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CategoriaLayout } from '../../components/CategoriaLayout'
import { AreaTexto } from '../../components/ui/AreaTexto'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Marcable } from '../../components/ui/Marcable'
import { SelectField } from '../../components/ui/SelectField'
import { CabeceraSuperficie, Superficie } from '../../components/ui/Superficie'
import { TextField } from '../../components/ui/TextField'
import { TarjetaMision } from './MisionVisual'
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
import { TERRITORIOS, territorioPorId } from '../../data/territorios'
import { alcanza, esAlcanceGlobal } from '../../dominio/alcance'
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

  const audiencia = useMemo(() => (draft ? estimarAudiencia(draft, op.usuarios) : 0), [draft, op.usuarios])

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

  const territoriosElegibles = TERRITORIOS.filter((t) => t.tipo !== 'pais' && alcanza(actor, t.id))

  return (
    <CategoriaLayout
      categoria="PW-05 · Misiones"
      titulo={existente ? `Editar: ${existente.nombre}` : 'Crear misión'}
      descripcion={
        guardadoEn
          ? `Borrador guardado automáticamente a las ${new Date(guardadoEn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}.`
          : 'Se guarda como borrador al avanzar de paso.'
      }
      acciones={
        <Button variante="ejecutivo-suave" onClick={() => navigate(existente ? `/PW-05/mision/${existente.id}` : '/PW-05')}>
          Salir
        </Button>
      }
    >
      <ol className="flex flex-wrap gap-2">
        {PASOS.map((nombre, i) => (
          <li key={nombre}>
            <button
              type="button"
              onClick={() => i + 1 < paso && setPaso(i + 1)}
              aria-current={paso === i + 1 ? 'step' : undefined}
              className={`rounded-full border px-4 py-2 font-heading text-xs font-bold outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ambar/40 ${
                paso === i + 1
                  ? 'border-primario/45 bg-primario/[0.16] text-primario'
                  : i + 1 < paso
                    ? 'border-white/15 bg-white/[0.05] text-grafito/80'
                    : 'border-white/[0.07] text-texto-suave/70'
              }`}
            >
              {i + 1}. {nombre}
            </button>
          </li>
        ))}
      </ol>

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
        <div role="alert" className="rounded-[16px] border border-red-400/25 bg-red-500/10 px-5 py-3 text-sm text-red-200">
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
                      actualizar({ ambito: a, territorioId: a === 'global' ? null : global ? null : (actor.territorioIds[0] ?? null) })
                    }
                    etiqueta={a === 'global' ? 'Global' : 'Local'}
                    detalle={a === 'global' ? 'Visible en todo el país.' : 'Solo para un territorio.'}
                  />
                ))}
              </div>
            </Campo>
            {draft.ambito === 'local' &&
              (global ? (
                <div className="max-w-sm">
                  <SelectField
                    etiqueta="Territorio"
                    value={draft.territorioId ?? ''}
                    disabled={clasificacionBloqueada}
                    onChange={(e) => actualizar({ territorioId: e.target.value || null })}
                    opciones={[
                      { valor: '', etiqueta: 'Elige un territorio' },
                      ...territoriosElegibles.map((t) => ({ valor: t.id, etiqueta: t.nombre })),
                    ]}
                  />
                </div>
              ) : (
                // ESQ Paso 1: para el Coordinador, bloqueado a su propio territorio.
                <Badge tono="info">Territorio fijo: {territorioPorId(draft.territorioId ?? '')?.nombre}</Badge>
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
                // ESQ: el subtipo territorial pre-marca la evidencia por defecto.
                actualizar({
                  subtipo,
                  evidencia: subtipo && EVIDENCIA_SUGERIDA[subtipo] ? [...(EVIDENCIA_SUGERIDA[subtipo] ?? [])] : draft.evidencia,
                  encuestaVinculada: subtipo === 'encuesta',
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
            <div className="sm:col-span-2">
              <AreaTexto etiqueta="Descripción" value={draft.descripcion} onChange={(e) => actualizar({ descripcion: e.target.value })} />
            </div>

            {draft.familia === 'digital' && draft.subtipo === 'encuesta' && (
              <div className="rounded-[16px] border border-red-400/25 bg-red-500/10 px-5 py-4 text-sm text-red-200 sm:col-span-2">
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
                <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-texto-suave sm:col-span-2">
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
            descripcion="[DECISIÓN BORRADOR] — la regla de segmentación por Playa y rol de juego no está cerrada en la bóveda."
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
            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-texto-suave">
              <p className="font-heading font-extrabold text-grafito">Canal: solo Usuario Activo</p>
              <p className="mt-1 text-xs">Las misiones requieren la app; Inscrito Activo queda siempre fuera.</p>
            </div>
            <div
              className={`rounded-[16px] border px-5 py-4 text-sm ${
                audiencia === 0 ? 'border-ambar/30 bg-ambar/[0.08] text-ambar' : 'border-primario/25 bg-primario/[0.07] text-primario'
              }`}
            >
              <p className="font-heading font-extrabold">≈ {audiencia} usuarios cumplen estos criterios</p>
              <p className="mt-1 text-xs opacity-85">
                {audiencia === 0
                  ? 'Ningún usuario cruza esta Playa, rol y territorio. Revisa la segmentación antes de publicar.'
                  : 'Calculado sobre los usuarios del demo.'}
              </p>
            </div>
          </div>
        </Superficie>
      )}

      {paso === 4 && (
        <Superficie>
          <CabeceraSuperficie titulo="4 · Vigencia" descripcion="La expiración es obligatoria ([DECISIÓN BORRADOR])." />
          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <TextField
              etiqueta="Inicio"
              type="datetime-local"
              value={draft.inicio}
              disabled={reglasBloqueadas}
              onChange={(e) => actualizar({ inicio: e.target.value })}
            />
            <TextField
              etiqueta="Expiración"
              type="datetime-local"
              value={draft.expiracion}
              disabled={reglasBloqueadas}
              onChange={(e) => actualizar({ expiracion: e.target.value })}
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
          <Superficie>
            <CabeceraSuperficie titulo="5 · Resumen" />
            <dl className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-4 gap-y-2.5 px-6 py-5 text-sm">
              <Fila k="Categoría" v={categoriaDeMision(draft)} />
              <Fila k="Ámbito" v={draft.ambito === 'global' ? 'Global' : (territorioPorId(draft.territorioId ?? '')?.nombre ?? '—')} />
              <Fila k="Recompensa" v={`${draft.recompensaAgatas} Ágatas`} />
              {draft.familia === 'territorial' && (
                <Fila k="Evidencia" v={draft.evidencia.map((e) => TIPOS_EVIDENCIA[e]).join(', ') || '—'} />
              )}
              <Fila k="Segmentación" v={`${nombrePlaya(draft.playaMin)} → ${draft.playaMax ? nombrePlaya(draft.playaMax) : 'sin tope'} · ${draft.escudos.map((r) => ROLES_JUEGO[r]).join(', ')}`} />
              <Fila k="Audiencia" v={`≈ ${audiencia} usuarios`} />
              <Fila k="Vigencia" v={`${draft.inicio.replace('T', ' ')} → ${draft.expiracion.replace('T', ' ')}`} />
            </dl>
          </Superficie>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pb-4">
        {paso > 1 && (
          <Button variante="ejecutivo-suave" className="mr-auto" onClick={() => setPaso(paso - 1)}>
            Anterior
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

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-texto-suave">{k}</dt>
      <dd className="text-grafito/90">{v}</dd>
    </>
  )
}
