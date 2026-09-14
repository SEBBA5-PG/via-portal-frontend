import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoriaLayout } from '../../components/CategoriaLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { BotonCircularExpansible } from '../../components/ui/BotonCircularExpansible'
import { BotonFiltroMultiple } from '../../components/ui/BotonFiltroMultiple'
import { EstadoVacio } from '../../components/ui/EstadoVacio'
import { CabeceraSuperficie, Superficie } from '../../components/ui/Superficie'
import { Celda, EncabezadoTabla, FilaTabla, Tabla } from '../../components/ui/Tabla'
import { BadgeEstadoMision } from './MisionVisual'
import { useAdmin } from '../../state/adminStore'
import { useOperacion } from '../../state/operacionStore'
import { useCuentaActor } from '../../state/useCuentaActor'
import {
  CATEGORIAS_LISTADO,
  ESTADOS_MISION,
  categoriaDeMision,
  type EstadoMision,
} from '../../data/misiones'
import { ROLES_JUEGO, nombrePlaya, type RolJuego } from '../../data/usuariosApp'
import { nombreDeCuenta } from '../../data/cuentas'
import { TIPOS_SOLICITUD_OPERACION } from '../../data/operacion'
import { describirAlcance } from '../../data/territorios'
import { esAlcanceGlobal } from '../../dominio/alcance'
import { tienePermiso } from '../../dominio/permisos'
import { misionesVisiblesPara, puedeAprobar, puedeCrearMisiones } from '../../dominio/misiones'

function IconoMas() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <path d="M10 4v12" />
      <path d="M4 10h12" />
    </svg>
  )
}

// Un ícono distinto por filtro (observación 8), reconocible en reposo antes de leer la
// etiqueta: etiqueta con hilo para Categoría, círculo con check para Estado, globo para
// Ámbito, ondas para Playa, escudo para Rol de juego.
function IconoCategoria() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.5 3.5h4.5a1.5 1.5 0 0 1 1.5 1.5v4.5a1.5 1.5 0 0 1-.44 1.06l-6.5 6.5a1.5 1.5 0 0 1-2.12 0l-4.5-4.5a1.5 1.5 0 0 1 0-2.12l6.5-6.5a1.5 1.5 0 0 1 1.06-.44Z" />
      <circle cx="13.25" cy="6.75" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconoEstado() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10.2l2.1 2.1L13.2 8" />
    </svg>
  )
}

function IconoAmbito() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10h14" />
      <path d="M10 3c2.2 2 2.2 12 0 14M10 3c-2.2 2-2.2 12 0 14" />
    </svg>
  )
}

function IconoPlaya() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M2.5 8c1 1.2 2.2 1.2 3.2 0s2.2-1.2 3.2 0 2.2 1.2 3.2 0 2.2-1.2 3.2 0" />
      <path d="M2.5 12.5c1 1.2 2.2 1.2 3.2 0s2.2-1.2 3.2 0 2.2 1.2 3.2 0 2.2-1.2 3.2 0" />
    </svg>
  )
}

function IconoRol() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2.5l6 2.2v4.3c0 4-2.6 6.9-6 8.5-3.4-1.6-6-4.5-6-8.5V4.7l6-2.2Z" />
    </svg>
  )
}

/*
  PW-05 — listado de misiones. ESQ §Listado ([DECISIÓN BORRADOR]): chips de filtro por
  categoría (un solo nivel), estado (multiselección), ámbito, Playa y rol objetivo.

  Corrección deliberada al borrador: su filtro de estado mezcla `disponible` (estado del lado
  del usuario) y omite `borrador` y `agotada`. Aquí se usan los siete estados administrativos.
*/

type Panel = 'misiones' | 'aprobacion' | 'solicitudes'

export function MisionesPage() {
  const op = useOperacion()
  const admin = useAdmin()
  const actor = useCuentaActor()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<Panel>('misiones')
  const [categorias, setCategorias] = useState<string[]>([])
  const [estados, setEstados] = useState<EstadoMision[]>([])
  const [ambito, setAmbito] = useState('todos')
  const [playa, setPlaya] = useState('todas')
  const [escudo, setEscudo] = useState('todos')

  const visibles = useMemo(() => (actor ? misionesVisiblesPara(actor, op.misiones) : []), [actor, op.misiones])

  const filtradas = useMemo(
    () =>
      visibles.filter((m) => {
        if (categorias.length > 0 && !categorias.includes(categoriaDeMision(m))) return false
        if (estados.length > 0 && !estados.includes(m.estado)) return false
        if (ambito !== 'todos' && m.ambito !== ambito) return false
        if (playa !== 'todas') {
          const n = Number(playa)
          if (n < m.playaMin || (m.playaMax !== null && n > m.playaMax)) return false
        }
        if (escudo !== 'todos' && !m.escudos.includes(escudo as RolJuego)) return false
        return true
      }),
    [visibles, categorias, estados, ambito, playa, escudo],
  )

  if (!actor) return null

  const porAprobar = visibles.filter((m) => puedeAprobar(actor, m))
  const gobierna = tienePermiso(actor, 'missions:pause_cancel')
  const solicitudes = op.solicitudes.filter(
    (s) => s.tipo !== 'bloqueo' && visibles.some((m) => m.id === s.objetivoId),
  )
  const solicitudesVisibles = gobierna
    ? solicitudes.filter((s) => s.estado === 'pendiente')
    : solicitudes.filter((s) => s.solicitanteId === actor.id)
  const nombreMision = (id: string) => op.misiones.find((m) => m.id === id)?.nombre ?? id
  const hayFiltros =
    categorias.length > 0 || estados.length > 0 || ambito !== 'todos' || playa !== 'todas' || escudo !== 'todos'

  return (
    <CategoriaLayout
      titulo="Misiones"
      descripcion="Misiones globales y locales del juego. Los Retos Propios del usuario no se crean desde aquí, y las misiones de Sistema se generan solas cada lunes."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Menu bar de secciones (misma pista sólida que PW-04 Cuentas/Doble Firma): son
            paneles de la misma pantalla, no rutas, así que el activo se guarda en estado local
            en vez de con NavLink. Ordena y limpia lo que antes eran 2-3 Superficies apiladas
            siempre visibles. */}
        <nav className="inline-flex w-fit flex-wrap gap-1 rounded-full bg-surface-sunken p-1.5">
          <PestanaPanel activa={panel === 'misiones'} onClick={() => setPanel('misiones')}>
            Misiones
          </PestanaPanel>
          <PestanaPanel activa={panel === 'aprobacion'} onClick={() => setPanel('aprobacion')} contador={porAprobar.length}>
            Pendientes de aprobación
          </PestanaPanel>
          <PestanaPanel activa={panel === 'solicitudes'} onClick={() => setPanel('solicitudes')} contador={solicitudesVisibles.length}>
            {gobierna ? 'Solicitudes de pausa y cancelación' : 'Mis solicitudes'}
          </PestanaPanel>
        </nav>
        {puedeCrearMisiones(actor) && panel === 'misiones' && (
          <BotonCircularExpansible solido icono={<IconoMas />} etiqueta="Crear misión" onClick={() => navigate('/PW-05/nueva')} />
        )}
      </div>

      {panel === 'aprobacion' && (
        <Superficie className="overflow-hidden">
          <CabeceraSuperficie
            titulo="Pendientes de tu aprobación"
            descripcion="Misiones locales que crearon Coordinadores Territoriales. No las ve ningún usuario hasta que se aprueben."
          />
          {porAprobar.length === 0 ? (
            <EstadoVacio motivo="sin-datos" titulo="Nada pendiente" descripcion="No hay misiones locales esperando tu aprobación." />
          ) : (
            <ul>
              {porAprobar.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-borde px-6 py-4 last:border-0">
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-extrabold text-grafito">{m.nombre}</p>
                    <p className="mt-1 text-xs text-texto-suave">
                      {categoriaDeMision(m)} · {m.territorioIds.length > 0 ? describirAlcance(m.territorioIds) : 'Global'} · creada por{' '}
                      {nombreDeCuenta(m.creadorId, admin.cuentas)}
                    </p>
                  </div>
                  <Button variante="ejecutivo" onClick={() => navigate(`/PW-05/mision/${m.id}`)}>
                    Revisar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Superficie>
      )}

      {panel === 'solicitudes' && (
        <Superficie className="overflow-hidden">
          <CabeceraSuperficie
            titulo={gobierna ? 'Solicitudes de pausa y cancelación' : 'Mis solicitudes'}
            descripcion={
              gobierna
                ? 'El Coordinador no pausa ni cancela ninguna misión por sí mismo: lo pide aquí.'
                : 'Pausar o cancelar lo decide un Administrador o Superadministrador.'
            }
          />
          {solicitudesVisibles.length === 0 ? (
            <EstadoVacio motivo="sin-datos" titulo="Sin solicitudes" descripcion="No hay solicitudes de pausa o cancelación por revisar." />
          ) : (
            <ul>
              {solicitudesVisibles.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-borde px-6 py-4 last:border-0">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-heading text-sm font-extrabold text-grafito">
                      {TIPOS_SOLICITUD_OPERACION[s.tipo]} · {nombreMision(s.objetivoId)}
                      {!gobierna && (
                        <Badge tono={s.estado === 'pendiente' ? 'pendiente' : s.estado === 'aprobada' ? 'exito' : 'peligro'}>
                          {s.estado}
                        </Badge>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-texto-suave">
                      {s.motivo} · pedido por {nombreDeCuenta(s.solicitanteId, admin.cuentas)}
                      {s.motivoRechazo && ` · rechazada: ${s.motivoRechazo}`}
                    </p>
                  </div>
                  <Button variante="ejecutivo-suave" onClick={() => navigate(`/PW-05/mision/${s.objetivoId}`)}>
                    Ver misión
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Superficie>
      )}

      {panel === 'misiones' && (
        <Superficie className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-borde px-6 py-4">
            <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-surface-sunken p-1.5">
              <BotonFiltroMultiple
                etiqueta="Categoría"
                icono={<IconoCategoria />}
                seleccionados={categorias}
                onCambiar={(v) => setCategorias(v)}
                opciones={CATEGORIAS_LISTADO.map((c) => ({ valor: c, etiqueta: c }))}
              />
              <BotonFiltroMultiple
                etiqueta="Estado"
                icono={<IconoEstado />}
                seleccionados={estados}
                onCambiar={(v) => setEstados(v as EstadoMision[])}
                opciones={(Object.keys(ESTADOS_MISION) as EstadoMision[]).map((e) => ({ valor: e, etiqueta: ESTADOS_MISION[e] }))}
              />
              {esAlcanceGlobal(actor) ? (
                <BotonCircularExpansible
                  etiqueta="Ámbito"
                  icono={<IconoAmbito />}
                  valorActual={ambito}
                  onSeleccionar={setAmbito}
                  opciones={[
                    { valor: 'todos', etiqueta: 'Todos' },
                    { valor: 'global', etiqueta: 'Global' },
                    { valor: 'local', etiqueta: 'Local' },
                  ]}
                />
              ) : (
                // ESQ: para el Coordinador el ámbito viene prefiltrado y no es editable.
                <Badge tono="info">Globales + {describirAlcance(actor.territorioIds)}</Badge>
              )}
              <BotonCircularExpansible
                etiqueta="Playa objetivo"
                icono={<IconoPlaya />}
                valorActual={playa}
                onSeleccionar={setPlaya}
                opciones={[{ valor: 'todas', etiqueta: 'Todas' }, ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ valor: String(n), etiqueta: nombrePlaya(n) }))]}
              />
              <BotonCircularExpansible
                etiqueta="Rol objetivo"
                icono={<IconoRol />}
                valorActual={escudo}
                onSeleccionar={setEscudo}
                opciones={[{ valor: 'todos', etiqueta: 'Todos' }, ...Object.entries(ROLES_JUEGO).map(([valor, etiqueta]) => ({ valor, etiqueta }))]}
              />
            </div>
            <p className="ml-auto text-xs text-texto-suave">
              {filtradas.length} de {visibles.length} misiones
            </p>
          </div>

          {filtradas.length === 0 ? (
            <EstadoVacio
              motivo={hayFiltros ? 'sin-resultados' : 'sin-datos'}
              titulo={hayFiltros ? 'Ninguna misión coincide con tu filtro' : 'Todavía no hay misiones'}
              descripcion={hayFiltros ? 'Quita alguno de los chips o cambia la Playa objetivo.' : 'Crea la primera misión para tu territorio.'}
              accion={
                hayFiltros ? (
                  <Button
                    variante="ejecutivo-suave"
                    onClick={() => {
                      setCategorias([])
                      setEstados([])
                      setAmbito('todos')
                      setPlaya('todas')
                      setEscudo('todos')
                    }}
                  >
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Tabla>
              <EncabezadoTabla columnas={['Misión', 'Ámbito', 'Estado', 'Recompensa', 'Inscritos', 'Vigencia']} />
              <tbody>
                {filtradas.map((m) => (
                  <FilaTabla key={m.id} etiqueta={`Abrir ${m.nombre}`} onClick={() => navigate(`/PW-05/mision/${m.id}`)}>
                    <Celda>
                      <button type="button" className="text-left outline-none focus-visible:ring-4 focus-visible:ring-ambar/40">
                        <span className="block font-heading font-bold text-grafito">{m.nombre || 'Sin nombre'}</span>
                        <span className="mt-0.5 block text-xs text-texto-suave">
                          {categoriaDeMision(m)}
                          {m.version > 1 && ` · v${m.version}`}
                        </span>
                      </button>
                    </Celda>
                    <Celda className="text-texto-suave">
                      {m.ambito === 'global' ? 'Global' : describirAlcance(m.territorioIds)}
                    </Celda>
                    <Celda>
                      <BadgeEstadoMision estado={m.estado} />
                    </Celda>
                    <Celda>{m.recompensaAgatas} Ágatas</Celda>
                    <Celda className="text-texto-suave">
                      {m.inscritos.toLocaleString('es-CO')}
                      {m.requiereCupo && m.cupoMaximo !== null && ` / ${m.cupoMaximo}`}
                    </Celda>
                    <Celda className="text-xs text-texto-suave">
                      {m.inicio ? m.inicio.slice(0, 10) : '—'} → {m.expiracion ? m.expiracion.slice(0, 10) : '—'}
                    </Celda>
                  </FilaTabla>
                ))}
              </tbody>
            </Tabla>
          )}
        </Superficie>
      )}
    </CategoriaLayout>
  )
}

function PestanaPanel({
  activa,
  onClick,
  contador,
  children,
}: {
  activa: boolean
  onClick: () => void
  contador?: number
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activa ? 'page' : undefined}
      className={`flex items-center gap-2 rounded-full px-4 py-2 font-heading text-sm font-bold outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ambar/40 ${
        activa ? 'bg-primario text-white shadow-sm' : 'text-texto-suave hover:text-grafito'
      }`}
    >
      {children}
      {Boolean(contador) && (
        <Badge tono={activa ? 'neutro' : 'alerta'} sinIcono className={activa ? 'border-white/30 bg-white/20 text-white' : ''}>
          {contador}
        </Badge>
      )}
    </button>
  )
}
