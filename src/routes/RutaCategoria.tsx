import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/authStore'
import { categoriaPorId } from '../data/matrizAcceso'

/*
  Guard de una categoría del portal.

  Portal Web — Matriz de Acceso por Rol, regla dura: "Una categoría marcada Oculto desaparece
  del menú Y su ruta es denegada por el backend. La UI que oculta sin que el servidor deniegue
  produce una autorización falsa: basta conocer la URL."

  Este guard corre en el navegador, así que NO es esa denegación — es su equivalente de demo.
  Cuando exista el backend, la comprobación real vive allá y esta se queda solo para evitar
  pintar una pantalla que el servidor va a rechazar.

  Nota de las Reglas Transversales §Cinco estados: una categoría Oculta no muestra la pantalla
  "Sin permiso" — no existe para ese rol. Por eso esto redirige en vez de renderizarla en su
  sitio; la pantalla de sin-permiso queda para lo que falta DENTRO de una categoría visible.
*/
export function RutaCategoria({ categoriaId, children }: { categoriaId: string; children: ReactNode }) {
  const auth = useAuth()
  const user = auth.usuarioActual
  if (!user) return <Navigate to="/login" replace />

  const categoria = categoriaPorId(categoriaId)
  if (!categoria || categoria.nivel[user.rol] === 'oculto') {
    return <Navigate to="/sin-permiso" state={{ categoriaNombre: categoria?.nombre }} replace />
  }

  return <>{children}</>
}
