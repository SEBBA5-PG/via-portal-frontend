import type { CuentaAdmin } from '../data/cuentas'
import { apiFetch, ApiError } from './apiClient'

// Cliente HTTP de cuentas administrativas (PW-04) contra conexion-api. Mismo patrón que
// authApi.ts: usa apiFetch (CSRF + cookies de sesión ya resueltos ahí), y traduce cualquier
// ApiError en un resultado manejable en vez de dejarlo explotar sin control.

export interface PayloadNuevaCuenta {
  nombre: string
  cedula: string
  email: string
  telefonoWhatsapp: string
  rol: CuentaAdmin['rol']
  territorioIds: string[]
  overrides: Record<string, boolean>
}

export type PayloadEdicionCuenta = Partial<
  Pick<CuentaAdmin, 'nombre' | 'email' | 'telefonoWhatsapp' | 'rol' | 'estado' | 'territorioIds' | 'overrides'>
>

// Normaliza cualquier fallo (de red o de la API) a ApiError, igual que hace authApi.ts al
// envolver sus llamadas — así quien consuma este cliente solo tiene un tipo de error que
// distinguir, nunca una excepción cruda de fetch.
function normalizarError(e: unknown): ApiError {
  if (e instanceof ApiError) return e
  return new ApiError('No pudimos conectar con el portal.', 0)
}

export async function listarCuentasBackend(): Promise<CuentaAdmin[]> {
  try {
    const { cuentas } = await apiFetch<{ cuentas: CuentaAdmin[] }>('/api/cuentas', { method: 'GET' })
    return cuentas
  } catch (e) {
    // Sin cuentas del backend no hay pantalla que pueda seguir funcionando de verdad, pero
    // tampoco es este cliente quien decide qué hacer con eso — devuelve vacío y quien llama
    // (adminStore) decide cómo mostrarlo.
    normalizarError(e)
    return []
  }
}

export async function crearCuentaBackend(
  payload: PayloadNuevaCuenta,
): Promise<{ cuenta: CuentaAdmin; pinTemporal: string }> {
  try {
    return await apiFetch<{ cuenta: CuentaAdmin; pinTemporal: string }>('/api/cuentas', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (e) {
    throw normalizarError(e)
  }
}

export async function editarCuentaBackend(id: string, payload: PayloadEdicionCuenta): Promise<CuentaAdmin> {
  try {
    const { cuenta } = await apiFetch<{ cuenta: CuentaAdmin }>(`/api/cuentas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return cuenta
  } catch (e) {
    throw normalizarError(e)
  }
}
