import type { Rol } from './roles'

// Operador Logístico salió del Portal Web (VIA BRAIN, 2026-09-11) — esta matriz ya no tiene
// columna O. Sus antiguas restricciones de entrega/stock local viven ahora en el sistema de
// entregas y logística independiente, fuera de este proyecto.
export type Nivel = 'completo' | 'restringido' | 'oculto'

export interface Categoria {
  id: string
  numero: number
  nombre: string
  // Agrupación en bloques del menú (Operación · Economía · Gobierno · Sistema).
  // Es una propuesta de este demo para organizar el menú de S/A — el documento fuente
  // (Portal Web — Matriz de Acceso por Rol) pide la agrupación pero no fija los bloques.
  bloque: 'Operación' | 'Economía' | 'Gobierno' | 'Sistema'
  nivel: Record<Rol, Nivel>
  restriccion?: Partial<Record<Rol, string>>
  // Categoría 12: BLOQUEANTE legal (M13 Q-0535, Ley 1581) — el acceso a resultados se
  // niega para cualquier rol aunque el permiso figure activo.
  bloqueLegal?: boolean
}

export const CATEGORIAS: Categoria[] = [
  {
    id: 'PW-02',
    numero: 2,
    nombre: 'Home y dashboard',
    bloque: 'Operación',
    nivel: { S: 'completo', A: 'completo', C: 'restringido' },
    restriccion: { C: 'Su territorio' },
  },
  {
    id: 'PW-03',
    numero: 3,
    nombre: 'Usuarios y ciclo de vida',
    bloque: 'Operación',
    nivel: { S: 'completo', A: 'restringido', C: 'restringido' },
    restriccion: {
      A: 'Sin impersonar, sin ajustar balance',
      C: 'Su territorio, PII enmascarada, solo solicitar bloqueo',
    },
  },
  {
    id: 'PW-04',
    numero: 4,
    nombre: 'Roles y permisos',
    bloque: 'Gobierno',
    nivel: { S: 'completo', A: 'restringido', C: 'oculto' },
    restriccion: { A: 'Asigna/revoca solo roles inferiores; no edita permisos' },
  },
  {
    id: 'PW-05',
    numero: 5,
    nombre: 'Misiones',
    bloque: 'Operación',
    nivel: { S: 'completo', A: 'completo', C: 'restringido' },
    restriccion: { C: 'Crea local (pendiente de aprobación); solo solicita pausa/cancelación' },
  },
  {
    id: 'PW-06',
    numero: 6,
    nombre: 'Evidencias',
    bloque: 'Operación',
    nivel: { S: 'completo', A: 'completo', C: 'restringido' },
    restriccion: { C: 'Su jurisdicción' },
  },
  {
    id: 'PW-07',
    numero: 7,
    nombre: 'Eventos y operación de campo',
    bloque: 'Operación',
    nivel: { S: 'completo', A: 'completo', C: 'restringido' },
    restriccion: {
      C: 'Crea local y publica; solo solicita cancelación',
    },
  },
  {
    id: 'PW-08',
    numero: 8,
    nombre: 'Recompensas, inventario, canjes y entrega',
    bloque: 'Operación',
    nivel: { S: 'completo', A: 'completo', C: 'restringido' },
    restriccion: {
      C: 'Entrega en su municipio, reporta stock local',
    },
  },
  {
    id: 'PW-09',
    numero: 9,
    nombre: 'Economía y ledger',
    bloque: 'Economía',
    nivel: { S: 'completo', A: 'restringido', C: 'restringido' },
    restriccion: { A: 'Ve el ledger, no ajusta', C: 'Su territorio, agregado' },
  },
  {
    id: 'PW-10',
    numero: 10,
    nombre: 'Playas, Escudo y Ranking',
    bloque: 'Economía',
    nivel: { S: 'completo', A: 'restringido', C: 'oculto' },
    restriccion: { A: 'Ve desglose y excluye; no cambia umbrales ni fórmula' },
  },
  {
    id: 'PW-11',
    numero: 11,
    nombre: 'Referidos y red de crecimiento',
    bloque: 'Economía',
    nivel: { S: 'completo', A: 'completo', C: 'restringido' },
    restriccion: { C: 'Su rama territorial, solo lectura' },
  },
  {
    id: 'PW-12',
    numero: 12,
    nombre: 'Encuestas y formularios',
    bloque: 'Gobierno',
    nivel: { S: 'completo', A: 'completo', C: 'restringido' },
    restriccion: { C: 'Crea; resultados sin confirmar' },
    bloqueLegal: true,
  },
  {
    id: 'PW-13',
    numero: 13,
    nombre: 'Contenido (CMS técnico)',
    bloque: 'Sistema',
    nivel: { S: 'completo', A: 'completo', C: 'oculto' },
  },
  {
    id: 'PW-14',
    numero: 14,
    nombre: 'Notificaciones y mensajería',
    bloque: 'Operación',
    nivel: { S: 'completo', A: 'completo', C: 'restringido' },
    restriccion: { C: 'Solo solicitar envío' },
  },
  {
    id: 'PW-15',
    numero: 15,
    nombre: 'Seguridad y antifraude',
    bloque: 'Gobierno',
    nivel: { S: 'completo', A: 'completo', C: 'restringido' },
    restriccion: { C: 'Ve señales de su jurisdicción, no revierte' },
  },
  {
    id: 'PW-16',
    numero: 16,
    nombre: 'Auditoría y trazabilidad',
    bloque: 'Gobierno',
    nivel: { S: 'completo', A: 'oculto', C: 'oculto' },
    restriccion: { S: 'Exclusivo' },
  },
  {
    id: 'PW-17',
    numero: 17,
    nombre: 'Reportes y exportaciones',
    bloque: 'Economía',
    nivel: { S: 'completo', A: 'completo', C: 'restringido' },
    restriccion: { A: 'PII condicionada', C: 'Solo nombre, sin PII' },
  },
  {
    id: 'PW-18',
    numero: 18,
    nombre: 'Configuración global del sistema',
    bloque: 'Sistema',
    nivel: { S: 'completo', A: 'oculto', C: 'oculto' },
    restriccion: { S: 'Con Doble Firma' },
  },
]

export function categoriasVisiblesPara(rol: Rol): Categoria[] {
  return CATEGORIAS.filter((c) => c.nivel[rol] !== 'oculto')
}

export function categoriaPorId(id: string): Categoria | undefined {
  return CATEGORIAS.find((c) => c.id === id)
}
