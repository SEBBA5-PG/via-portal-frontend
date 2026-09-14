import { useEffect, useState } from 'react'

const QUERY = '(prefers-color-scheme: light)'

function leer(): 'claro' | 'oscuro' {
  return window.matchMedia(QUERY).matches ? 'claro' : 'oscuro'
}

// Modo claro automático del flujo de acceso (2026-09-13): refleja la preferencia de
// esquema de color del sistema operativo, sin ningún selector manual en la UI. Reacciona
// en vivo si el usuario cambia la preferencia del sistema mientras la app está abierta
// (p. ej. el reloj del SO pasa de claro a oscuro a cierta hora).
export function usePrefersColorScheme(): 'claro' | 'oscuro' {
  const [esquema, setEsquema] = useState<'claro' | 'oscuro'>(leer)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setEsquema(mql.matches ? 'claro' : 'oscuro')
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return esquema
}
