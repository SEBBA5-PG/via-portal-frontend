import achira from '../../assets/playas/1-achira.webp'
import sanjuanera from '../../assets/playas/2-sanjuanera.webp'
import arroz from '../../assets/playas/3-arroz.webp'
import tilapia from '../../assets/playas/4-tilapia.webp'
import cafe from '../../assets/playas/5-cafe.webp'
import macizo from '../../assets/playas/6-macizo.webp'
import huila from '../../assets/playas/7-huila.webp'

/**
 * Las 7 playas del recorrido, en orden canónico de ascenso (1 → 7).
 *
 * Fuente única declarada: `fuentes/pilares/1 PILAR.md` §3 "Matriz de Progresión
 * Territorial" ("Cualquier cambio... debe editarse EXCLUSIVAMENTE en este archivo"),
 * ratificada en la decisión cerrada M07 Q-0278. Los nombres son los canónicos de
 * `wiki/Canon.md`: "Sanjuanera" en una sola palabra, y la playa 7 es "Huila" a secas —
 * el Nevado del Huila es el PUNTO_CUMBRE geográfico, no el nombre del nivel.
 *
 * `fill` es el hex de la playa. `stroke` es el tono oscuro derivado que `2 PILAR.md`
 * declara en los classDef del mapa; se usa como base del gradiente para que la isla
 * (que ya viene con los colores claros de su playa) resalte contra el fondo.
 *
 * Importar las 7 aquí NO descarga las 7: Vite solo emite una URL por asset. La descarga
 * la dispara el <img> al montarse, y AscensoPlayas monta como mucho dos a la vez.
 */
export interface Playa {
  nivel: number
  nombre: string
  fill: string
  stroke: string
  src: string
}

export const PLAYAS: Playa[] = [
  { nivel: 1, nombre: 'Achira', fill: '#D4911A', stroke: '#9E660E', src: achira },
  { nivel: 2, nombre: 'Sanjuanera', fill: '#6C00A8', stroke: '#4A0072', src: sanjuanera },
  { nivel: 3, nombre: 'Arroz', fill: '#4A8C3F', stroke: '#2E5926', src: arroz },
  { nivel: 4, nombre: 'Tilapia', fill: '#18BDAB', stroke: '#108275', src: tilapia },
  { nivel: 5, nombre: 'Café', fill: '#6B3A1F', stroke: '#422413', src: cafe },
  { nivel: 6, nombre: 'Macizo', fill: '#3A4A7A', stroke: '#242E4C', src: macizo },
  // La 7 es el único caso con dos colores: 1 PILAR.md da #C4531C como hex, pero su columna
  // estética dice "Blanco, gris y destellos celestes". 2 PILAR.md lo resuelve con
  // `classDef huila fill:#EAECEE, stroke:#C4531C` — nieve de ambiente, terracota de acento.
  { nivel: 7, nombre: 'Huila', fill: '#EAECEE', stroke: '#C4531C', src: huila },
]

/**
 * Gradiente de ambiente de una playa: más claro abajo (la orilla) y casi negro arriba (el
 * cielo), de modo que el ascenso se lea como ganar altura.
 *
 * Va deliberadamente oscuro. Las ilustraciones son brillantes y saturadas, y traen los
 * mismos colores de su playa: un fondo con el `fill` a plena intensidad las hace desaparecer
 * por falta de separación (isla ocre sobre fondo ocre). Oscureciendo la base, la isla resalta
 * y el matiz de la playa sigue tiñendo toda la escena.
 *
 * Los tonos profundos se derivan aquí con `color-mix` en vez de guardarse en los datos: la
 * bóveda solo documenta fill y stroke, y oscurecer es una decisión de presentación, no un
 * dato canónico que debamos inventarle a la fuente.
 */
export function gradienteDe(playa: Playa): string {
  // La orilla mezcla los dos tonos canónicos de la playa antes de oscurecer. No es adorno:
  // el `fill` de Huila es #EAECEE, casi blanco, y usado solo dejaba esa playa mucho más
  // clara que las otras seis — un salto a pantalla pálida a mitad del recorrido. Mezclarlo
  // con su `stroke` la nivela sin inventarle a la fuente un color que no declara, y de paso
  // le devuelve la terracota del atardecer sobre el nevado.
  const orilla = `color-mix(in oklab, ${playa.fill} 62%, ${playa.stroke})`
  return [
    'radial-gradient(135% 105% at 50% 120%,',
    `color-mix(in oklab, ${orilla} 74%, #140e09) 0%,`,
    `color-mix(in oklab, ${playa.stroke} 62%, #140e09) 46%,`,
    `color-mix(in oklab, ${playa.stroke} 20%, #0c0806) 100%)`,
  ].join(' ')
}
