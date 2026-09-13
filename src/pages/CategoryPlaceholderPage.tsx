import { Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge } from '../components/ui/Badge'
import { Superficie } from '../components/ui/Superficie'
import { useAuth } from '../state/authStore'
import { categoriaPorId } from '../data/matrizAcceso'

export function CategoryPlaceholderPage() {
  const { categoriaId } = useParams()
  const auth = useAuth()
  const user = auth.usuarioActual
  if (!user) return null

  const categoria = categoriaId ? categoriaPorId(categoriaId) : undefined

  // Regla dura de la Matriz de Acceso: ocultar no es autorizar. Si la categoría no existe o
  // está Oculta para este rol, el "backend" (aquí, este guard) la niega igual que la UI.
  if (!categoria || categoria.nivel[user.rol] === 'oculto') {
    return <Navigate to="/sin-permiso" state={{ categoriaNombre: categoria?.nombre }} replace />
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-wide text-texto-suave">
            {categoria.id} ·{' '}
            {categoria.nivel[user.rol] === 'restringido' ? 'Restringido' : 'Completo'}
          </p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-grafito">
            {categoria.nombre}
          </h1>
          {categoria.restriccion?.[user.rol] && (
            <p className="mt-2 text-sm text-texto-suave">Tu alcance: {categoria.restriccion[user.rol]}</p>
          )}
        </header>

        {categoria.bloqueLegal ? (
          <Superficie className="border-red-400/25 px-6 py-5">
            <Badge tono="peligro">Bloqueante legal</Badge>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-red-200">
              Pendiente de validación legal (Ley 1581 de protección de datos). El backend niega el
              acceso a resultados para cualquier rol hasta que se asigne responsable y se resuelva
              el bloqueante de M13 Q-0535.
            </p>
          </Superficie>
        ) : (
          <Superficie className="px-6 py-5">
            <p className="text-sm text-texto-suave">
              Próximamente — esta categoría se construye en un paso posterior.
            </p>
          </Superficie>
        )}
      </div>
    </AppShell>
  )
}
