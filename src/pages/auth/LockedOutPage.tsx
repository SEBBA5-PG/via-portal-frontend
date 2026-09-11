import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/authStore'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui/Button'
import { DemoNotice } from '../../components/ui/DemoNotice'

export function LockedOutPage() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const estado = location.state as { hasta?: number; duro?: boolean; cedula?: string } | null

  if (estado?.duro) {
    return (
      <AuthLayout titulo="Cuenta bloqueada" subtitulo="Se agotaron los intentos por segunda vez">
        <p className="text-center text-sm text-cafe">
          Esta cuenta necesita revisión manual. Contacta a un <strong>Administrador</strong> o{' '}
          <strong>Superadministrador</strong> para desbloquearla — no hay auto-desbloqueo desde
          aquí (PW-01).
        </p>
        {estado.cedula && (
          <div className="mt-4">
            <DemoNotice>
              En producción, el desbloqueo lo ejecuta un rol superior desde la ficha del
              usuario (PW-03). Este botón lo simula.
            </DemoNotice>
            <Button
              variante="secundario"
              className="mt-3 w-full"
              onClick={() => {
                auth.desbloquearComoAdminDemo(estado.cedula!)
                navigate('/login', { replace: true })
              }}
            >
              Simular desbloqueo de Administrador
            </Button>
          </div>
        )}
        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-cafe-muted underline">
            Volver
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return <BloqueoTemporal hasta={estado?.hasta ?? Date.now()} />
}

function BloqueoTemporal({ hasta }: { hasta: number }) {
  const navigate = useNavigate()
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
      <p className="mt-2 text-center text-xs text-cafe-muted">
        Si agotas los intentos de nuevo al volver a intentarlo, la cuenta pasa a bloqueo duro y
        necesitará desbloqueo manual (PW-01).
      </p>
      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm text-cafe-muted underline">
          Volver
        </Link>
      </div>
    </AuthLayout>
  )
}
