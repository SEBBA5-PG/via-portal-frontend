import type { CuentaAdmin } from '../data/cuentas'
import { useAuth } from './authStore'
import { useAdmin } from './adminStore'

// La cuenta administrativa de quien tiene la sesión abierta. Todas las reglas de dominio
// reciben una CuentaAdmin, no el DemoUser de authStore.
export function useCuentaActor(): CuentaAdmin | undefined {
  const auth = useAuth()
  const admin = useAdmin()
  const user = auth.usuarioActual
  return user ? admin.cuentaPorId(user.id) : undefined
}
