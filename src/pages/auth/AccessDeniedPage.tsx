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
      subtitulo={categoria ? `Tu rol no tiene acceso a "${categoria}".` : 'Tu rol no alcanza esta sección.'}
      acciones={
        <Button variante="ejecutivo" className="w-full" onClick={() => navigate('/home')}>
          Volver al inicio
        </Button>
      }
    >
      <p className="text-sm leading-6 text-grafito">
        Si necesitas entrar aquí, pídele a un Superadministrador que revise tus permisos.
      </p>
    </AuthLayout>
  )
}
