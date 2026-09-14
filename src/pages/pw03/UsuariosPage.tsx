import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoriaLayout } from '../../components/CategoriaLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EstadoVacio } from '../../components/ui/EstadoVacio'
import { FiltroSelect } from '../../components/ui/FiltroSelect'
import { Modal } from '../../components/ui/Modal'
import { CabeceraSuperficie, Superficie } from '../../components/ui/Superficie'
import { Celda, EncabezadoTabla, FilaTabla, Tabla } from '../../components/ui/Tabla'
import { TextField } from '../../components/ui/TextField'
import { BadgeEstadoUsuario } from './BadgeEstadoUsuario'
import { useAdmin } from '../../state/adminStore'
import { useOperacion } from '../../state/operacionStore'
import { useCuentaActor } from '../../state/useCuentaActor'
import {
  CANALES,
  ESTADOS_CUENTA_APP,
  ROLES_JUEGO,
  nombrePlaya,
  type CanalUsuario,
  type EstadoCuentaApp,
} from '../../data/usuariosApp'
import { nombreDeCuenta } from '../../data/cuentas'
import { formatoFechaHora } from '../../data/auditoria'
import { TERRITORIOS, describirAlcance, territorioPorId } from '../../data/territorios'
import type { SolicitudOperacion } from '../../data/operacion'
import { alcanza, esAlcanceGlobal } from '../../dominio/alcance'
import { tienePermiso } from '../../dominio/permisos'
import { enmascararCedulaApp, puedeVerPII, usuariosVisiblesPara } from '../../dominio/usuarios'

/*
  PW-03 — listado de usuarios de la app.

  PW-03 es andamiaje: pide "el listado con filtros" sin especificarlo. Lo de aquí aplica las
  reglas duras que sí existen — PII enmascarada salvo `users:view_pii`, TerritorialScope que no
  se puede vaciar, exportación anonimizada salvo `export:pii_data` — y deja los filtros
  globales que PW-02 cerró (estado y municipio/territorio) más canal y Playa.
*/

export function UsuariosPage() {
  const op = useOperacion()
  const admin = useAdmin()
  const actor = useCuentaActor()
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<EstadoCuentaApp | 'todos'>('todos')
  const [canal, setCanal] = useState<CanalUsuario | 'todos'>('todos')
  const [municipio, setMunicipio] = useState('todos')
  const [playa, setPlaya] = useState('todas')
  const [exportando, setExportando] = useState(false)
  const [rechazando, setRechazando] = useState<SolicitudOperacion | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  const visibles = useMemo(() => (actor ? usuariosVisiblesPara(actor, op.usuarios) : []), [actor, op.usuarios])
  const vePII = actor ? puedeVerPII(actor) : false

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return visibles.filter((u) => {
      if (estado !== 'todos' && u.estado !== estado) return false
      if (canal !== 'todos' && u.canal !== canal) return false
      if (municipio !== 'todos' && u.municipioId !== municipio) return false
      if (playa !== 'todas' && u.playa !== Number(playa)) return false
      if (texto) {
        // Buscar por cédula solo con PII visible: si no, la búsqueda misma confirmaría una cédula.
        const coincide =
          u.alias.toLowerCase().includes(texto) ||
          u.nombreLegal.toLowerCase().includes(texto) ||
          (vePII && u.cedula.includes(texto))
        if (!coincide) return false
      }
      return true
    })
  }, [visibles, busqueda, estado, canal, municipio, playa, vePII])

  if (!actor) return null

  const global = esAlcanceGlobal(actor)
  const municipios = TERRITORIOS.filter((t) => t.tipo === 'municipio' && alcanza(actor, t.id))
  const atiendeBloqueos = tienePermiso(actor, 'users:block')
  const pendientesBloqueo = op.solicitudes.filter(
    (s) => s.tipo === 'bloqueo' && s.estado === 'pendiente' && visibles.some((u) => u.id === s.objetivoId),
  )
  const misSolicitudes = op.solicitudes.filter((s) => s.tipo === 'bloqueo' && s.solicitanteId === actor.id)
  const hayFiltros =
    estado !== 'todos' || canal !== 'todos' || municipio !== 'todos' || playa !== 'todas' || busqueda.trim() !== ''
  const aliasDe = (id: string) => op.usuarios.find((u) => u.id === id)?.alias ?? id

  return (
    <CategoriaLayout
      categoria="PW-03 · Usuarios y ciclo de vida"
      titulo="Usuarios de la app"
      descripcion="Personas registradas en la app y la landing. No son las cuentas del portal: esas viven en Roles y permisos."
      acciones={
        tienePermiso(actor, 'users:export') ? (
          <Button variante="ejecutivo-suave" onClick={() => setExportando(true)}>
            Exportar listado
          </Button>
        ) : undefined
      }
    >
      {atiendeBloqueos && pendientesBloqueo.length > 0 && (
        <Superficie className="overflow-hidden">
          <CabeceraSuperficie
            titulo="Bloqueos solicitados por Coordinadores"
            descripcion="El Coordinador Territorial no bloquea directamente: lo pide. Aprobarlo bloquea la cuenta con motivo manual."
            acciones={<Badge tono="alerta">{pendientesBloqueo.length}</Badge>}
          />
          <ul>
            {pendientesBloqueo.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-borde px-6 py-4 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-heading text-sm font-extrabold text-grafito">
                    {aliasDe(s.objetivoId)} · {s.motivo}
                  </p>
                  <p className="mt-1 text-xs text-texto-suave">
                    Pedido por {nombreDeCuenta(s.solicitanteId, admin.cuentas)} · {formatoFechaHora(s.timestamp)}
                  </p>
                  {s.nota && <p className="mt-1 text-xs italic text-grafito/70">"{s.nota}"</p>}
                </div>
                <div className="flex gap-2">
                  <Button variante="ejecutivo-suave" onClick={() => navigate(`/PW-03/usuario/${s.objetivoId}`)}>
                    Ver usuario
                  </Button>
                  <Button
                    variante="ejecutivo-suave"
                    onClick={() => {
                      setRechazando(s)
                      setMotivoRechazo('')
                    }}
                  >
                    Rechazar
                  </Button>
                  <Button variante="ejecutivo" onClick={() => op.resolverSolicitudOperacion(actor.id, s.id, true)}>
                    Bloquear
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Superficie>
      )}

      {!atiendeBloqueos && misSolicitudes.length > 0 && (
        <Superficie tono="panel" className="px-6 py-4">
          <p className="font-heading text-sm font-extrabold text-grafito">Mis solicitudes de bloqueo</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {misSolicitudes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 text-xs text-texto-suave">
                <Badge tono={s.estado === 'pendiente' ? 'pendiente' : s.estado === 'aprobada' ? 'exito' : 'peligro'}>
                  {s.estado === 'pendiente' ? 'Pendiente' : s.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                </Badge>
                <span className="text-grafito/85">{aliasDe(s.objetivoId)}</span> · {s.motivo}
                {s.motivoRechazo && <span className="text-peligro">— {s.motivoRechazo}</span>}
              </li>
            ))}
          </ul>
        </Superficie>
      )}

      <Superficie className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-borde px-6 py-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-xs font-bold text-texto-suave">Buscar</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={vePII ? 'Alias, nombre o cédula' : 'Alias o nombre'}
              className="h-10 w-52 rounded-full border-[1.5px] border-borde bg-surface-sunken px-4 text-sm text-grafito outline-none transition placeholder:text-texto-suave/70 focus:border-primario focus:ring-4 focus:ring-ambar/30"
            />
          </label>
          <FiltroSelect
            etiqueta="Estado"
            valor={estado}
            onCambiar={(v) => setEstado(v as EstadoCuentaApp | 'todos')}
            opciones={[['todos', 'Todos'], ...Object.entries(ESTADOS_CUENTA_APP)]}
          />
          <FiltroSelect
            etiqueta="Canal"
            valor={canal}
            onCambiar={(v) => setCanal(v as CanalUsuario | 'todos')}
            opciones={[['todos', 'Todos'], ...Object.entries(CANALES)]}
          />
          <FiltroSelect
            etiqueta="Municipio"
            valor={municipio}
            onCambiar={setMunicipio}
            opciones={[
              ['todos', global ? 'Todo el país' : 'Todo mi alcance'],
              ...municipios.map((t): [string, string] => [t.id, t.nombre]),
            ]}
          />
          <FiltroSelect
            etiqueta="Playa"
            valor={playa}
            onCambiar={setPlaya}
            opciones={[['todas', 'Todas'], ...[1, 2, 3, 4, 5, 6, 7].map((n): [string, string] => [String(n), nombrePlaya(n)])]}
          />
          <div className="ml-auto flex flex-col items-end gap-1.5">
            {/* Reglas Transversales §Territorial: el alcance "viene aplicado y no es editable" —
                es el alcance de la cuenta, no una preferencia que se pueda vaciar. */}
            {!global && <Badge tono="info">Alcance fijo: {describirAlcance(actor.territorioIds)}</Badge>}
            <p className="text-xs text-texto-suave">
              {filtrados.length} de {visibles.length} usuarios
            </p>
          </div>
        </div>

        {filtrados.length === 0 ? (
          <EstadoVacio
            motivo={hayFiltros ? 'sin-resultados' : 'sin-datos'}
            titulo={hayFiltros ? 'Ningún usuario coincide con tu filtro' : 'No hay usuarios en tu alcance'}
            descripcion={
              hayFiltros
                ? 'Prueba con otro estado, canal o Playa, o limpia la búsqueda.'
                : 'Tu territorio todavía no tiene personas registradas en la app o la landing.'
            }
            accion={
              hayFiltros ? (
                <Button
                  variante="ejecutivo-suave"
                  onClick={() => {
                    setEstado('todos')
                    setCanal('todos')
                    setMunicipio('todos')
                    setPlaya('todas')
                    setBusqueda('')
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Tabla>
            <EncabezadoTabla columnas={['Usuario', 'Cédula', 'Municipio', 'Canal', 'Juego', 'Estado', 'Última actividad']} />
            <tbody>
              {filtrados.map((u) => (
                <FilaTabla key={u.id} etiqueta={`Abrir la ficha de ${u.alias}`} onClick={() => navigate(`/PW-03/usuario/${u.id}`)}>
                  <Celda>
                    <button type="button" className="text-left outline-none focus-visible:ring-4 focus-visible:ring-ambar/40">
                      <span className="block font-heading font-bold text-grafito">{u.alias}</span>
                      <span className="mt-0.5 block text-xs text-texto-suave">
                        {u.estado === 'eliminada' ? '—' : u.nombreLegal}
                      </span>
                    </button>
                  </Celda>
                  <Celda className="font-mono text-xs text-texto-suave">
                    {vePII ? u.cedula : enmascararCedulaApp(u.cedula)}
                  </Celda>
                  <Celda className="text-texto-suave">{territorioPorId(u.municipioId)?.nombre ?? u.municipioId}</Celda>
                  <Celda className="text-texto-suave">{CANALES[u.canal]}</Celda>
                  <Celda>
                    <span className="block text-xs text-grafito/85">{nombrePlaya(u.playa)}</span>
                    <span className="block text-xs text-texto-suave">{ROLES_JUEGO[u.rolJuego]}</span>
                  </Celda>
                  <Celda>
                    <BadgeEstadoUsuario estado={u.estado} />
                  </Celda>
                  <Celda className="text-texto-suave">{u.ultimaActividad}</Celda>
                </FilaTabla>
              ))}
            </tbody>
          </Tabla>
        )}
      </Superficie>

      <Modal
        abierto={exportando}
        titulo="Exportar listado"
        onCerrar={() => setExportando(false)}
        descripcion={`Se exportarán los ${filtrados.length} usuarios del filtro actual. La exportación no bloquea la pantalla: en producción el archivo se avisa cuando está listo.`}
        acciones={
          <Button variante="ejecutivo" onClick={() => setExportando(false)}>
            Entendido
          </Button>
        }
      >
        <p className="text-sm leading-relaxed text-texto-suave">
          {!vePII
            ? 'Tu cuenta exporta solo nombre, sin cédula ni teléfono.'
            : tienePermiso(actor, 'export:pii_data')
              ? 'Tu cuenta tiene export:pii_data: el archivo incluirá cédula y teléfono completos, y la exportación queda registrada.'
              : 'El archivo sale anonimizado — cédula y teléfono enmascarados — porque tu cuenta no tiene export:pii_data.'}
        </p>
        <p className="mt-3 text-xs text-ambar/85">Demo: no se genera ningún archivo.</p>
      </Modal>

      <Modal
        abierto={rechazando !== null}
        titulo="Rechazar la solicitud de bloqueo"
        descripcion="El Coordinador verá el motivo en su bandeja de solicitudes."
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
                if (rechazando) op.resolverSolicitudOperacion(actor.id, rechazando.id, false, motivoRechazo.trim())
                setRechazando(null)
              }}
            >
              Rechazar
            </Button>
          </>
        }
      >
        <TextField etiqueta="Motivo (obligatorio)" value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} />
      </Modal>
    </CategoriaLayout>
  )
}
