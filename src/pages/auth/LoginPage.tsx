import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/authStore'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { ROLES } from '../../data/roles'
import { TotpSetupStep, WhatsappVerifyStep, TotpChallengeStep } from './LoginWizardSteps'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mostrarCuentasDemo, setMostrarCuentasDemo] = useState(false)

  useEffect(() => {
    if (auth.sesion) navigate('/home', { replace: true })
  }, [auth.sesion, navigate])

  if (auth.pendiente?.tipo === 'totp-setup') return <TotpSetupStep />
  if (auth.pendiente?.tipo === 'whatsapp-verify') return <WhatsappVerifyStep />
  if (auth.pendiente?.tipo === 'totp-challenge') return <TotpChallengeStep />

  function alEnviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const resultado = auth.login(email, password)
    if (!resultado.ok) {
      if (resultado.tipo === 'bloqueado') {
        navigate('/bloqueado', { state: { hasta: resultado.hasta } })
      } else {
        setError(resultado.mensaje)
      }
    }
  }

  return (
    <AuthLayout titulo="Portal administrativo VIA" subtitulo="Inicia sesión con tu cuenta">
      {auth.motivoSalida === 'otro-dispositivo' && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm text-cafe">
          Tu sesión se cerró porque se inició sesión en otro lugar.{' '}
          <button onClick={() => auth.limpiarMotivoSalida()} className="underline font-bold">
            Entendido
          </button>
        </div>
      )}
      <form onSubmit={alEnviar} className="flex flex-col gap-4">
        <TextField
          etiqueta="Correo"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          etiqueta="Contraseña"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit">Iniciar sesión</Button>
      </form>
      <div className="mt-4 text-center">
        <Link to="/recuperar" className="text-sm text-cafe-muted underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <div className="mt-6 border-t border-institucional-sidebar pt-4 text-center">
        <button
          onClick={() => setMostrarCuentasDemo((v) => !v)}
          className="text-xs text-cafe-muted underline"
        >
          {mostrarCuentasDemo ? 'Ocultar' : 'Ver'} cuentas de prueba
        </button>
        {mostrarCuentasDemo && (
          <ul className="mt-2 space-y-1 text-left text-xs text-cafe-muted">
            {auth.usuarios.map((u) => (
              <li key={u.id}>
                <strong>{ROLES[u.rol]}</strong> — {u.email} / {u.password}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AuthLayout>
  )
}
