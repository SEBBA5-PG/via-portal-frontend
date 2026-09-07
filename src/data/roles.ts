export type Rol = 'S' | 'A' | 'C' | 'O'

export const ROLES: Record<Rol, string> = {
  S: 'Superadministrador',
  A: 'Administrador',
  C: 'Coordinador Territorial',
  O: 'Operador Logístico',
}

// PW-01: 2FA (TOTP) es exclusivo de S y A — M03 Q-0106.
export function requiere2FA(rol: Rol): boolean {
  return rol === 'S' || rol === 'A'
}
