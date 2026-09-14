import type { CuentaAdmin } from '../data/cuentas'
import { apiFetch, ApiError } from './apiClient'

export type LoginBackendResultado = { ok: true; cuenta: CuentaAdmin } | { ok: false; mensaje: string }

export async function loginBackend(cedula: string, pin: string): Promise<LoginBackendResultado> {
  try {
    const { cuenta } = await apiFetch<{ cuenta: CuentaAdmin }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ cedula, pin }),
    })
    return { ok: true, cuenta }
  } catch (e) {
    const mensaje = e instanceof ApiError ? e.message : 'No pudimos conectar con el portal.'
    return { ok: false, mensaje }
  }
}

export async function logoutBackend(): Promise<void> {
  try {
    await apiFetch('/api/logout', { method: 'POST' })
  } catch {
    // Si el logout del backend falla (p. ej. ya sin sesión), igual se limpia la sesión local.
  }
}
