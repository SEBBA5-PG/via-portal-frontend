import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui/Button'

export function SessionExpiredPage() {
  const navigate = useNavigate()
  return (
    <AuthLayout
      titulo="Tu sesión expiró"
      subtitulo="Por tu seguridad, cerramos tu sesión por inactividad."
      acciones={
        <Button variante="ejecutivo" className="w-full" onClick={() => navigate('/login', { replace: true })}>
          Volver a iniciar sesión
        </Button>
      }
    />
  )
}
