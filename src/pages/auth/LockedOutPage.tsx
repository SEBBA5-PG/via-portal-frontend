import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/AuthLayout'

export function LockedOutPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const hasta = (location.state as { hasta?: number } | null)?.hasta ?? Date.now()
  const [restanteMs, setRestanteMs] = useState(() => hasta - Date.now())

  useEffect(() => {
    const id = setInterval(() => setRestanteMs(hasta - Date.now()), 1000)
    return () => clearInterval(id)
  }, [hasta])

  useEffect(() => {
    if (restanteMs <= 0) navigate('/login', { replace: true })
  }, [restanteMs, navigate])

  const minutos = Math.max(0, Math.floor(restanteMs / 60_000))
  const segundos = Math.max(0, Math.floor((restanteMs % 60_000) / 1000))

  return (
    <AuthLayout titulo="Demasiados intentos" subtitulo="Por seguridad, bloqueamos el acceso temporalmente">
      <p className="text-center text-sm text-cafe">
        Podrás intentarlo de nuevo en{' '}
        <strong>
          {minutos}:{segundos.toString().padStart(2, '0')}
        </strong>
      </p>
      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm text-cafe-muted underline">
          Volver
        </Link>
      </div>
    </AuthLayout>
  )
}
