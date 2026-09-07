import { Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Card } from '../components/ui/Card'
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
      <Card className="p-6">
        <p className="mb-1 text-xs uppercase tracking-wide text-cafe-muted">
          {categoria.id} · {categoria.nivel[user.rol] === 'restringido' ? 'Restringido' : 'Completo'}
        </p>
        <h1 className="mb-2 font-heading font-extrabold text-2xl text-cafe">{categoria.nombre}</h1>
        {categoria.restriccion?.[user.rol] && (
          <p className="mb-4 text-sm text-cafe-muted">Tu alcance: {categoria.restriccion[user.rol]}</p>
        )}
        {categoria.bloqueLegal ? (
          <div className="rounded-2xl border border-dashed border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700">
            Bloqueado — pendiente de validación legal (Ley 1581 de protección de datos). El
            backend niega el acceso a resultados para cualquier rol hasta que se asigne
            responsable y se resuelva el bloqueante de M13 Q-0535.
          </div>
        ) : (
          <p className="text-sm text-cafe">
            Próximamente — esta categoría se construye en un paso posterior.
          </p>
        )}
      </Card>
    </AppShell>
  )
}
