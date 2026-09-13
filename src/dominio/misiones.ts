import type { CuentaAdmin } from '../data/cuentas'
import type { UsuarioApp } from '../data/usuariosApp'
import type { Ambito, Mision } from '../data/misiones'
import { alcanza, contieneTerritorio } from './alcance'
import { tienePermiso } from './permisos'

/*
  Reglas de PW-05, puras. Fuentes: PW-05, Catálogo de Permisos categoría 3, wiki/Retos y
  Mecánicas de Juego y el Esquema UI-UX de creación de misiones (ESQ).
*/

// El Coordinador ve las globales y las locales de su territorio. Los borradores ajenos no
// se le muestran: todavía no son de nadie más que de quien los escribe (propuesta del demo).
export function misionesVisiblesPara(actor: CuentaAdmin, misiones: Mision[]): Mision[] {
  return misiones.filter((m) => {
    if (m.ambito === 'local' && !alcanza(actor, m.territorioId)) return false
    if (actor.rol === 'C' && m.estado === 'borrador' && m.creadorId !== actor.id) return false
    return true
  })
}

export function puedeCrearMisiones(actor: CuentaAdmin): boolean {
  return tienePermiso(actor, 'missions:create_global') || tienePermiso(actor, 'missions:create_local')
}

export function ambitosPermitidos(actor: CuentaAdmin): Ambito[] {
  const ambitos: Ambito[] = []
  if (tienePermiso(actor, 'missions:create_global')) ambitos.push('global')
  if (tienePermiso(actor, 'missions:create_local')) ambitos.push('local')
  return ambitos
}

/*
  ESQ Paso 5: Superadmin/Admin ven "Publicar" (→ publicada); el Coordinador ve "Enviar a
  aprobación" (→ pendiente_aprobacion). Se decide por el permiso `missions:publish`, no por el
  rol, para que un override individual cambie el botón de verdad.
*/
export function publicaDirecto(actor: CuentaAdmin): boolean {
  return tienePermiso(actor, 'missions:publish')
}

/*
  "Actividad" = al menos un inscrito o una evidencia. ESQ deja abierto el umbral ("¿1 inscrito
  ya cuenta?"); este demo responde que sí.
*/
export function tieneActividad(m: Mision): boolean {
  return m.inscritos > 0 || m.evidenciasAprobadas + m.evidenciasEnRevision > 0
}

export type NivelEdicion = 'todo' | 'cosmetico' | 'ninguno'

// ESQ §Edición por estado.
export function nivelEdicion(m: Mision): NivelEdicion {
  if (m.estado === 'borrador' || m.estado === 'pendiente_aprobacion') return 'todo'
  // [DECISIÓN BORRADOR] publicada sin actividad se edita entera; con actividad, solo lo
  // cosmético in-place y los cambios de regla van por "Nueva versión".
  if (m.estado === 'publicada') return tieneActividad(m) ? 'cosmetico' : 'todo'
  return 'ninguno'
}

// Campos de regla: los que cambian qué evidencia vale o cuánto paga.
export const CAMPOS_REGLA = ['recompensa', 'evidencia', 'geocerca', 'cupo', 'segmentacion', 'vigencia'] as const

export function puedeEditar(actor: CuentaAdmin, m: Mision): boolean {
  if (m.familia === 'sistema') return false
  if (nivelEdicion(m) === 'ninguno') return false
  if (m.ambito === 'local' && !alcanza(actor, m.territorioId)) return false
  if (actor.rol === 'C') {
    // El Coordinador edita solo lo suyo y solo antes de publicarse (Catálogo: "la suya").
    return (
      m.creadorId === actor.id &&
      (m.estado === 'borrador' || m.estado === 'pendiente_aprobacion') &&
      tienePermiso(actor, 'missions:edit_draft')
    )
  }
  return m.ambito === 'global'
    ? tienePermiso(actor, 'missions:create_global')
    : tienePermiso(actor, 'missions:create_local')
}

export function puedeAprobar(actor: CuentaAdmin, m: Mision): boolean {
  return m.estado === 'pendiente_aprobacion' && publicaDirecto(actor) && alcanza(actor, m.territorioId)
}

// `missions:pause_cancel` es techo fijo: el Coordinador nunca lo alcanza.
function gobiernaMision(actor: CuentaAdmin, m: Mision): boolean {
  return tienePermiso(actor, 'missions:pause_cancel') && alcanza(actor, m.territorioId) && m.familia !== 'sistema'
}

export function puedePausar(actor: CuentaAdmin, m: Mision): boolean {
  return gobiernaMision(actor, m) && m.estado === 'publicada'
}

export function puedeReanudar(actor: CuentaAdmin, m: Mision): boolean {
  return gobiernaMision(actor, m) && m.estado === 'pausada'
}

export function puedeCancelar(actor: CuentaAdmin, m: Mision): boolean {
  return gobiernaMision(actor, m) && (m.estado === 'publicada' || m.estado === 'pausada' || m.estado === 'agotada')
}

/*
  PW-05: el Coordinador "solo solicita pausa o cancelación, ni siquiera sobre las suyas".
*/
export function puedeSolicitarPausaCancelacion(actor: CuentaAdmin, m: Mision, yaSolicitada: boolean): boolean {
  return (
    !tienePermiso(actor, 'missions:pause_cancel') &&
    tienePermiso(actor, 'missions:request_pause_cancel') &&
    alcanza(actor, m.territorioId) &&
    (m.estado === 'publicada' || m.estado === 'pausada') &&
    m.familia !== 'sistema' &&
    !yaSolicitada
  )
}

// ESQ §Cancelación: separar lo que se revierte de lo que no.
export function impactoCancelacion(m: Mision): { inscritos: number; enRevision: number; aprobadas: number } {
  return { inscritos: m.inscritos, enRevision: m.evidenciasEnRevision, aprobadas: m.evidenciasAprobadas }
}

/*
  ESQ Paso 3: "≈ N usuarios cumplen estos criterios". Aquí se cuenta sobre los usuarios del
  demo. `Inscrito Activo` queda siempre fuera: "las misiones requieren la app".
*/
export function estimarAudiencia(m: Mision, usuarios: UsuarioApp[]): number {
  return usuarios.filter((u) => {
    if (u.canal !== 'activo' || u.estado !== 'activa') return false
    if (u.playa < m.playaMin) return false
    if (m.playaMax !== null && u.playa > m.playaMax) return false
    if (!m.escudos.includes(u.rolJuego)) return false
    if (m.ambito === 'local' && m.territorioId && !contieneTerritorio(m.territorioId, u.municipioId)) return false
    return true
  }).length
}

export function erroresDePaso(m: Mision, paso: number): string[] {
  const errores: string[] = []
  if (paso === 1) {
    if (m.ambito === 'local' && !m.territorioId) errores.push('Elige el territorio de la misión local.')
  }
  if (paso === 2) {
    if (m.nombre.trim().length < 5) errores.push('El nombre necesita al menos 5 caracteres.')
    if (m.descripcion.trim().length < 10) errores.push('Describe la misión en al menos 10 caracteres.')
    if (!m.subtipo) errores.push('Elige el subtipo.')
    if (m.recompensaAgatas <= 0) errores.push('La recompensa en Ágatas debe ser mayor que cero.')
    if (m.familia === 'territorial' && m.evidencia.length === 0) errores.push('Marca al menos un tipo de evidencia.')
    if (m.requiereCupo && (!m.cupoMaximo || m.cupoMaximo <= 0)) errores.push('Indica el cupo máximo.')
  }
  if (paso === 3) {
    if (m.escudos.length === 0) errores.push('Elige al menos un rol de juego objetivo.')
    if (m.playaMax !== null && m.playaMax < m.playaMin) errores.push('La Playa máxima no puede ser menor que la mínima.')
  }
  if (paso === 4) {
    if (!m.inicio) errores.push('Indica la fecha de inicio.')
    // [DECISIÓN BORRADOR] ESQ Paso 4: la expiración es obligatoria.
    if (!m.expiracion) errores.push('La fecha de expiración es obligatoria.')
    if (m.inicio && m.expiracion && m.expiracion <= m.inicio) errores.push('La expiración debe ser posterior al inicio.')
  }
  return errores
}

export function misionVacia(actor: CuentaAdmin): Mision {
  const ambitos = ambitosPermitidos(actor)
  const local = !ambitos.includes('global')
  const ahora = Date.now()
  return {
    id: '',
    version: 1,
    nombre: '',
    descripcion: '',
    familia: 'digital',
    subtipo: null,
    ambito: local ? 'local' : 'global',
    // ESQ Paso 1: para el Coordinador el ámbito queda "bloqueado a su propio
    // ambito_territorial_id".
    territorioId: local ? (actor.territorioIds[0] ?? null) : null,
    estado: 'borrador',
    creadorId: actor.id,
    fechaCreacion: ahora,
    fechaEdicion: ahora,
    recompensaAgatas: 50,
    evidencia: [],
    requiereCupo: false,
    cupoMaximo: null,
    encuestaVinculada: false,
    playaMin: 1,
    playaMax: null,
    escudos: ['explorador', 'facilitador', 'mentor'],
    inicio: '',
    expiracion: '',
    recordatorio: true,
    recordatorioHoras: 24,
    inscritos: 0,
    evidenciasAprobadas: 0,
    evidenciasEnRevision: 0,
  }
}
