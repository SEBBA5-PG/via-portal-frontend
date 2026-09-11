export type Rol = 'S' | 'A' | 'C'

// Operador Logístico salió del Portal Web (VIA BRAIN, 2026-09-11): sus funciones migran a
// un sistema de entregas y logística independiente. Ya no hace login aquí.
export const ROLES: Record<Rol, string> = {
  S: 'Superadministrador',
  A: 'Administrador',
  C: 'Coordinador Territorial',
}

// PW-01: 2FA (OTP vía WhatsApp Business, único canal) es exclusivo de S y A — M03 Q-0106.
export function requiere2FA(rol: Rol): boolean {
  return rol === 'S' || rol === 'A'
}
