const PREFIX = 'via-portal-demo:'

export function leerJSON<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = localStorage.getItem(PREFIX + clave)
    return crudo ? (JSON.parse(crudo) as T) : porDefecto
  } catch {
    return porDefecto
  }
}

export function escribirJSON<T>(clave: string, valor: T): void {
  localStorage.setItem(PREFIX + clave, JSON.stringify(valor))
}

export function borrarClave(clave: string): void {
  localStorage.removeItem(PREFIX + clave)
}

export function claveCompleta(clave: string): string {
  return PREFIX + clave
}

// Identifica este navegador para "recordar este dispositivo". No es un fingerprint real,
// solo un id aleatorio persistido — suficiente para un demo local.
export function idDeEsteDispositivo(): string {
  const existente = localStorage.getItem(PREFIX + 'deviceId')
  if (existente) return existente
  const nuevo = crypto.randomUUID()
  localStorage.setItem(PREFIX + 'deviceId', nuevo)
  return nuevo
}

// sessionStorage (por pestaña, no compartido) recuerda qué cuenta muestra ESTA pestaña,
// para distinguir "la misma cuenta entró en otra pestaña" (sí cierra) de "otra cuenta entró
// en otra pestaña" (no me afecta) — ambas comparten el mismo localStorage del navegador.
export function leerIdDeSesionDeEstaPestana(): string | null {
  return sessionStorage.getItem(PREFIX + 'currentUserId')
}

export function escribirIdDeSesionDeEstaPestana(userId: string): void {
  sessionStorage.setItem(PREFIX + 'currentUserId', userId)
}

export function borrarIdDeSesionDeEstaPestana(): void {
  sessionStorage.removeItem(PREFIX + 'currentUserId')
}
