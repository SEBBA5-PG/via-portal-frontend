import type { ReactNode } from 'react'
import { CategoriaLayout, type Solapa } from '../../components/CategoriaLayout'
import { useAdmin } from '../../state/adminStore'
import { useCuentaActor } from '../../state/useCuentaActor'
import { pendientesParaFirmar, tienePermiso } from '../../dominio/permisos'

// Envoltorio de PW-04. La bandeja solo aparece para quien realmente puede firmar algo —
// mostrarla vacía a un Administrador sería prometer una capacidad que la wiki le niega.
export function PW04Layout({
  titulo,
  descripcion,
  acciones,
  children,
}: {
  titulo: string
  descripcion?: ReactNode
  acciones?: ReactNode
  children: ReactNode
}) {
  const admin = useAdmin()
  const cuentaActor = useCuentaActor()

  const solapas: Solapa[] = [{ to: '/PW-04', etiqueta: 'Cuentas administrativas', fin: true }]
  if (cuentaActor && tienePermiso(cuentaActor, 'permissions:edit')) {
    solapas.push({
      to: '/PW-04/solicitudes',
      etiqueta: 'Doble Firma',
      contador: pendientesParaFirmar(admin.solicitudes, cuentaActor).length,
    })
  }

  return (
    <CategoriaLayout
      categoria="PW-04 · Roles y permisos"
      titulo={titulo}
      descripcion={descripcion}
      acciones={acciones}
      solapas={solapas}
    >
      {children}
    </CategoriaLayout>
  )
}
