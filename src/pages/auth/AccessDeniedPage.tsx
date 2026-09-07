import { useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui/Button'

export function AccessDeniedPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const categoria = (location.state as { categoriaNombre?: string } | null)?.categoriaNombre

  return (
    <AuthLayout
      titulo="No tienes permiso"
      subtitulo={categoria ? `Tu rol no tiene acceso a "${categoria}"` : 'Tu rol no alcanza esta sección'}
    >
      <p className="mb-4 text-center text-sm text-cafe-muted">
        Si necesitas entrar aquí, pídele a un Superadministrador que revise tus permisos.
      </p>
      <Button className="w-full" onClick={() => navigate('/home')}>
        Volver al inicio
      </Button>
    </AuthLayout>
  )
}
