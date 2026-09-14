import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoriaLayout } from '../../components/CategoriaLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EstadoVacio } from '../../components/ui/EstadoVacio'
import { FiltroSelect } from '../../components/ui/FiltroSelect'
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
import { describirAlcance, territorioPorId } from '../../data/territorios'
import { esAlcanceGlobal } from '../../dominio/alcance'
import { tienePermiso } from '../../dominio/permisos'
import { misionesVisiblesPara, puedeAprobar, puedeCrearMisiones } from '../../dominio/misiones'

/*
  PW-05 — listado de misiones. ESQ §Listado ([DECISIÓN BORRADOR]): chips de filtro por
  categoría (un solo nivel), estado (multiselección), ámbito, Playa y rol objetivo.

  Corrección deliberada al borrador: su filtro de estado mezcla `disponible` (estado del lado
  del usuario) y omite `borrador` y `agotada`. Aquí se usan los siete estados administrativos.
*/

export function MisionesPage() {
  const op = useOperacion()
  const admin = useAdmin()
  const actor = useCuentaActor()
  const navigate = useNavigate()
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

  const alternar = <T,>(lista: T[], valor: T) =>
    lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]

  return (
    <CategoriaLayout
      categoria="PW-05 · Misiones"
      titulo="Misiones"
      descripcion="Misiones globales y locales del juego. Los Retos Propios del usuario no se crean desde aquí, y las misiones de Sistema se generan solas cada lunes."
      acciones={
        puedeCrearMisiones(actor) ? (
          <Button variante="ejecutivo" onClick={() => navigate('/PW-05/nueva')}>
            Crear misión
          </Button>
        ) : undefined
      }
    >
      {porAprobar.length > 0 && (
        <Superficie className="overflow-hidden">
          <CabeceraSuperficie
            titulo="Pendientes de tu aprobación"
            descripcion="Misiones locales que crearon Coordinadores Territoriales. No las ve ningún usuario hasta que se aprueben."
            acciones={<Badge tono="pendiente">{porAprobar.length}</Badge>}
          />
          <ul>
            {porAprobar.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-borde px-6 py-4 last:border-0">
                <div className="min-w-0">
                  <p className="font-heading text-sm font-extrabold text-grafito">{m.nombre}</p>
                  <p className="mt-1 text-xs text-texto-suave">
                    {categoriaDeMision(m)} · {m.territorioId ? territorioPorId(m.territorioId)?.nombre : 'Global'} · creada por{' '}
                    {nombreDeCuenta(m.creadorId, admin.cuentas)}
                  </p>
                </div>
                <Button variante="ejecutivo" onClick={() => navigate(`/PW-05/mision/${m.id}`)}>
                  Revisar
                </Button>
              </li>
            ))}
          </ul>
        </Superficie>
      )}

      {solicitudesVisibles.length > 0 && (
        <Superficie className="overflow-hidden">
          <CabeceraSuperficie
            titulo={gobierna ? 'Solicitudes de pausa y cancelación' : 'Mis solicitudes'}
            descripcion={
              gobierna
                ? 'El Coordinador no pausa ni cancela ninguna misión por sí mismo: lo pide aquí.'
                : 'Pausar o cancelar lo decide un Administrador o Superadministrador.'
            }
          />
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
        </Superficie>
      )}

      <Superficie className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-borde px-6 py-4">
          <GrupoChips etiqueta="Categoría">
            {CATEGORIAS_LISTADO.map((c) => (
              <Chip key={c} activo={categorias.includes(c)} onClick={() => setCategorias(alternar(categorias, c))}>
                {c}
              </Chip>
            ))}
          </GrupoChips>
          <GrupoChips etiqueta="Estado">
            {(Object.keys(ESTADOS_MISION) as EstadoMision[]).map((e) => (
              <Chip key={e} activo={estados.includes(e)} onClick={() => setEstados(alternar(estados, e))}>
                {ESTADOS_MISION[e]}
              </Chip>
            ))}
          </GrupoChips>
          <div className="flex flex-wrap items-end gap-3">
            {esAlcanceGlobal(actor) ? (
              <FiltroSelect
                etiqueta="Ámbito"
                valor={ambito}
                onCambiar={setAmbito}
                opciones={[
                  ['todos', 'Todos'],
                  ['global', 'Global'],
                  ['local', 'Local'],
                ]}
              />
            ) : (
              // ESQ: para el Coordinador el ámbito viene prefiltrado y no es editable.
              <div className="flex flex-col gap-1.5">
                <span className="font-heading text-xs font-bold text-texto-suave">Ámbito</span>
                <Badge tono="info">Globales + {describirAlcance(actor.territorioIds)}</Badge>
              </div>
            )}
            <FiltroSelect
              etiqueta="Playa objetivo"
              valor={playa}
              onCambiar={setPlaya}
              opciones={[['todas', 'Todas'], ...[1, 2, 3, 4, 5, 6, 7].map((n): [string, string] => [String(n), nombrePlaya(n)])]}
            />
            <FiltroSelect
              etiqueta="Rol objetivo"
              valor={escudo}
              onCambiar={setEscudo}
              opciones={[['todos', 'Todos'], ...Object.entries(ROLES_JUEGO)]}
            />
            <p className="ml-auto text-xs text-texto-suave">
              {filtradas.length} de {visibles.length} misiones
            </p>
          </div>
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
                    {m.ambito === 'global' ? 'Global' : territorioPorId(m.territorioId ?? '')?.nombre}
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
    </CategoriaLayout>
  )
}

function GrupoChips({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 w-20 font-heading text-xs font-bold text-texto-suave">{etiqueta}</span>
      {children}
    </div>
  )
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 font-heading text-xs font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 ${
        activo ? 'border-primario/45 bg-primario/[0.16] text-primario' : 'border-borde bg-surface-sunken text-texto-suave hover:text-grafito'
      }`}
    >
      {children}
    </button>
  )
}
