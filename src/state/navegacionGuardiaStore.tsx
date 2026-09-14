import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/*
  Guardia mínima de navegación: un booleano en memoria que dice si hay cambios sin guardar en
  la pantalla activa. Sin persistencia ni storage a propósito — es efímero, vive solo
  mientras la app está abierta, y se reinicia solo (recarga, cierre de pestaña).

  Deliberadamente mínimo: no es un framework de formularios. AppShell lo usa para interceptar
  clics del sidebar (junto con useConfirmarSalida) y las páginas de alta/edición de PW-04
  registran aquí si están "sucias".
*/

interface NavegacionGuardiaContextValue {
  dirty: boolean
  setDirty: (v: boolean) => void
}

const NavegacionGuardiaContext = createContext<NavegacionGuardiaContextValue | null>(null)

export function NavegacionGuardiaProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false)

  const valor = useMemo<NavegacionGuardiaContextValue>(() => ({ dirty, setDirty }), [dirty])

  return <NavegacionGuardiaContext.Provider value={valor}>{children}</NavegacionGuardiaContext.Provider>
}

export function useNavegacionGuardia(): NavegacionGuardiaContextValue {
  const contexto = useContext(NavegacionGuardiaContext)
  if (!contexto) throw new Error('useNavegacionGuardia debe usarse dentro de <NavegacionGuardiaProvider>')
  return contexto
}
