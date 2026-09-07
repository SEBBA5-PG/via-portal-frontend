import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/authStore'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth()
  if (!auth.sesion) return <Navigate to="/login" replace />
  return <>{children}</>
}
