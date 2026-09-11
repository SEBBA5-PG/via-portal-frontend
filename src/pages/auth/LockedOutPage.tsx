import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
      <AuthLayout
        titulo="Cuenta bloqueada"
        subtitulo="Se agotaron los intentos de PIN por segunda vez."
        acciones={
          <Button variante="ejecutivo" className="w-full" onClick={() => navigate('/login', { replace: true })}>
            Volver al inicio de sesión
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-grafito">
            Esta cuenta necesita revisión manual. Contacta a un <strong>Administrador</strong> o{' '}
            <strong>Superadministrador</strong> para desbloquearla; desde aquí no es posible hacerlo.
          </p>
          {estado.cedula && (
            <>
              <DemoNotice>
                En producción, el desbloqueo lo ejecuta un rol superior desde la ficha del usuario
                (PW-03). Este botón lo simula.
              </DemoNotice>
              <Button
                variante="ejecutivo-suave"
                className="w-full"
                onClick={() => {
                  auth.desbloquearComoAdminDemo(estado.cedula!)
                  navigate('/login', { replace: true })
                }}
              >
                Simular desbloqueo de Administrador
              </Button>
            </>
          )}
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
    <AuthLayout
      titulo="Demasiados intentos"
      subtitulo="Por seguridad, bloqueamos el acceso de esta cuenta temporalmente."
      acciones={
        <Button variante="ejecutivo-suave" className="w-full" onClick={() => navigate('/login', { replace: true })}>
          Volver al inicio de sesión
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-texto-suave">Podrás intentarlo de nuevo en</p>
        <p className="font-heading text-5xl font-extrabold tabular-nums text-grafito">
          {minutos}:{segundos.toString().padStart(2, '0')}
        </p>
        <p className="text-sm leading-6 text-texto-suave">
          Si vuelves a agotar los intentos, la cuenta pasará a bloqueo duro y necesitará desbloqueo
          manual de un Administrador.
        </p>
      </div>
    </AuthLayout>
  )
}
