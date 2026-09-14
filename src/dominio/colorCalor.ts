// Escala de color compartida por el croquis esquemático y el mapa geográfico real: interpola
// entre el tinte más claro y el acento primario del portal según la intensidad (0 a 1),
// mismo criterio "más usuarios = más saturado" que un choropleth de censo.
export function colorIntensidad(intensidad: number): string {
  if (intensidad <= 0) return '#e8ecf4' // --color-surface-sunken
  const claro = { r: 227, g: 230, b: 253 } // --color-primario-tint
  const oscuro = { r: 47, g: 59, b: 196 } // --color-primario-600
  const t = Math.min(1, Math.max(0.12, intensidad))
  const mezclar = (a: number, b: number) => Math.round(a + (b - a) * t)
  return `rgb(${mezclar(claro.r, oscuro.r)}, ${mezclar(claro.g, oscuro.g)}, ${mezclar(claro.b, oscuro.b)})`
}
