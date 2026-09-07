import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../state/authStore'
import { ROLES } from '../data/roles'

function formatoRestante(ms: number): string {
  const horas = Math.floor(ms / 3_600_000)
  const minutos = Math.floor((ms % 3_600_000) / 60_000)
  return `${horas}h ${minutos}m`
}

export function HomePage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const user = auth.usuarioActual
  if (!user || !auth.sesion) return null

  return (
    <AppShell>
      <Card className="p-6 mb-6">
        <h1 className="font-heading font-extrabold text-2xl text-cafe">Hola, {user.nombre.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-cafe-muted">
          {ROLES[user.rol]} · sesión activa por {formatoRestante(auth.sesion.expiraEn - ahora)}
        </p>
        <p className="mt-4 text-sm text-cafe">
          PW-01 (Acceso y sesión) está resuelto. El resto de las 18 categorías del portal se
          construyen una por una — el menú de la izquierda ya refleja la Matriz de Acceso por Rol
          real para tu perfil, aunque su contenido todavía diga "Próximamente".
        </p>
      </Card>

      <Card className="p-6">
        <h2 className="font-heading font-extrabold text-lg text-cafe mb-1">Herramientas de demo</h2>
        <p className="mb-3 text-xs text-cafe-muted">
          Atajos para revisar pantallas que dependen del paso del tiempo o de un error, sin
          esperar o forzarlas a mano.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variante="secundario" onClick={() => navigate('/sesion-expirada')}>
            Ver: sesión expirada
          </Button>
          <Button
            variante="secundario"
            onClick={() => navigate('/bloqueado', { state: { hasta: Date.now() + 15_000 } })}
          >
            Ver: bloqueo por intentos
          </Button>
          <Button
            variante="secundario"
            onClick={() =>
              navigate('/sin-permiso', { state: { categoriaNombre: 'Configuración global del sistema' } })
            }
          >
            Ver: acceso denegado
          </Button>
        </div>
      </Card>
    </AppShell>
  )
}
