// Cliente HTTP mínimo para hablar con conexion-api (Laravel + Sanctum, cookies de sesión SPA).
// Solo lo usa la puerta de entrada/salida (login/logout) del portal — el resto de PW-04 sigue
// leyendo de los mocks en src/data/, fuera de alcance de este corte.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function leerCookie(nombre: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

// Sanctum exige "pedir" la cookie CSRF antes de cualquier request que mute estado (login,
// logout). La cookie viene encriptada; el valor útil para el header X-XSRF-TOKEN es el mismo
// texto decodificado que el navegador ya trae en la cookie tras esta llamada.
async function asegurarCookieCsrf(): Promise<void> {
  if (leerCookie('XSRF-TOKEN')) return
  await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, { credentials: 'include' })
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const esMutacion = !options.method || options.method !== 'GET'
  if (esMutacion) await asegurarCookieCsrf()

  const xsrf = leerCookie('XSRF-TOKEN')
  const respuesta = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
      ...options.headers,
    },
  })

  const cuerpo = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    const mensaje =
      cuerpo?.errors?.cedula?.[0] ?? cuerpo?.message ?? 'No pudimos completar la solicitud.'
    throw new ApiError(mensaje, respuesta.status)
  }

  return cuerpo as T
}
