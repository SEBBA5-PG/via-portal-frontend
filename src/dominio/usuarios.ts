import type { CuentaAdmin } from '../data/cuentas'
import type { UsuarioApp } from '../data/usuariosApp'
import type { AjusteBalance } from '../data/operacion'
import { alcanza } from './alcance'
import { tienePermiso } from './permisos'

/*
  Reglas de PW-03 (usuarios de la app), puras. Fuentes: PW-03, Catálogo de Permisos
  categoría 1 y wiki/Perfil, Datos Personales y Ciclo de Vida del Usuario.

  Regla que atraviesa todo el archivo: una acción que la cuenta no puede ejecutar NO se
  ofrece deshabilitada — no existe. Los techos fijos (impersonar, bloqueo directo, ajuste de
  balance) "no se renderizan ni como control deshabilitado" (PW-03).
*/

// TerritorialScope: el Coordinador solo ve su territorio.
export function usuariosVisiblesPara(actor: CuentaAdmin, usuarios: UsuarioApp[]): UsuarioApp[] {
  if (!tienePermiso(actor, 'users:view')) return []
  return usuarios.filter((u) => alcanza(actor, u.municipioId))
}

export function puedeVerPII(actor: CuentaAdmin): boolean {
  return tienePermiso(actor, 'users:view_pii')
}

// Ejemplo literal de la wiki: `1.075.***.*89`. En producción esto lo hace el servidor: si el
// dato viaja completo al navegador, ya se filtró (Reglas Transversales de UI §PII).
export function enmascararCedulaApp(cedula: string): string {
  if (cedula.length < 6) return '•••'
  return `${cedula[0]}.${cedula.slice(1, 4)}.***.*${cedula.slice(-2)}`
}

export function enmascararCelularApp(celular: string): string {
  return `${celular.slice(0, 6)} ••• ••${celular.slice(-2)}`
}

export interface AccionesUsuario {
  bloquear: boolean
  solicitarBloqueo: boolean
  desbloquear: boolean
  // Bloqueo por OTP: se levanta solo al cumplirse la hora, nadie lo desbloquea a mano.
  desbloqueoAutomatico: boolean
  impersonar: boolean
  ajustarBalance: boolean
  moderarAlias: boolean
  eliminar: boolean
  fusionar: boolean
}

export function accionesDisponibles(
  actor: CuentaAdmin,
  usuario: UsuarioApp,
  bloqueoYaSolicitado: boolean,
): AccionesUsuario {
  const vivo = usuario.estado !== 'eliminada'
  const bloqueado = usuario.estado === 'bloqueada'
  const enAlcance = alcanza(actor, usuario.municipioId)
  const bloqueaDirecto = tienePermiso(actor, 'users:block')

  return {
    bloquear: enAlcance && vivo && !bloqueado && bloqueaDirecto,
    // El Coordinador solo SOLICITA. Quien puede bloquear directo no ve la solicitud.
    solicitarBloqueo:
      enAlcance &&
      vivo &&
      !bloqueado &&
      !bloqueaDirecto &&
      tienePermiso(actor, 'users:request_block') &&
      !bloqueoYaSolicitado,
    /*
      wiki §Reactivación: el bloqueo por fraude o `bajo_auditoria` lo levanta "exclusivamente un
      Administrador o SuperAdmin". `users:block` es justo el techo que solo tienen esos dos.
    */
    desbloquear:
      enAlcance &&
      bloqueaDirecto &&
      ((bloqueado && usuario.motivoBloqueo !== 'otp') || usuario.estado === 'bajo_auditoria'),
    desbloqueoAutomatico: bloqueado && usuario.motivoBloqueo === 'otp',
    impersonar: vivo && tienePermiso(actor, 'users:impersonate'),
    ajustarBalance: vivo && tienePermiso(actor, 'users:adjust_balance'),
    moderarAlias: enAlcance && vivo && tienePermiso(actor, 'users:moderate_profile'),
    eliminar: enAlcance && vivo && tienePermiso(actor, 'users:delete_account'),
    /*
      La wiki dice que la fusión la ejecuta SuperAdmin o Admin y que la secundaria termina
      `eliminada`. Ningún permiso del catálogo nombra la fusión: se ata a
      `users:delete_account` porque su efecto es eliminar una cuenta. Q-0594 sigue abierta
      ("falta la pantalla y quién ejecuta la fusión").
    */
    fusionar: enAlcance && vivo && tienePermiso(actor, 'users:delete_account'),
  }
}

// Deduplicación por dispositivo (wiki): dos cuentas vivas con el mismo fingerprint.
export function posiblesDuplicados(usuario: UsuarioApp, usuarios: UsuarioApp[]): UsuarioApp[] {
  if (usuario.estado === 'eliminada') return []
  return usuarios.filter(
    (u) => u.id !== usuario.id && u.estado !== 'eliminada' && u.dispositivoId === usuario.dispositivoId,
  )
}

/*
  wiki §Fusión: "se elige como primaria la cuenta con Cédula verificada". El demo no modela
  la verificación de cédula, así que se usa el canal (Usuario Activo, registrado con OTP) y
  después el saldo como desempate. Es una aproximación, no la regla.
*/
export function primariaSugerida(a: UsuarioApp, b: UsuarioApp): UsuarioApp {
  if (a.canal !== b.canal) return a.canal === 'activo' ? a : b
  return a.agatas >= b.agatas ? a : b
}

export function aliasEliminado(id: string): string {
  return `Usuario_Eliminado_${id}`
}

// wiki §Eliminación — siempre soft delete. Esta lista es lo que ve quien confirma.
export const IMPACTO_ELIMINACION = {
  seBorra: ['Nombre legal', 'Celular', 'Dirección y barrio', 'Avatar', 'Tokens y credenciales'],
  seConserva: ['Nodo UUID en la red de referidos', 'Ledger de Ágatas', 'Registro de auditoría', 'Evidencias aprobadas'],
  efectos: [
    'Sale de los rankings de inmediato',
    'Se borran sus evidencias pendientes y rechazadas',
    'Sus recompensas pendientes se cancelan sin reembolso y el saldo se extingue',
    'El alias pasa a Usuario_Eliminado_[id]',
  ],
}

export function puedeFirmarAjuste(actor: CuentaAdmin, ajuste: AjusteBalance): boolean {
  return (
    ajuste.estado === 'pendiente' &&
    actor.id !== ajuste.makerId &&
    tienePermiso(actor, 'users:adjust_balance')
  )
}
