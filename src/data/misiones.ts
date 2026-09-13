import type { RolJuego } from './usuariosApp'

/*
  Misiones — PW-05. PW-05 casi no tiene contenido propio: remite a VIA BRAIN,
  decisiones/cuestionario/abiertos/Esquema UI-UX — Creación de Misiones (borrador).md (en
  estos comentarios, "ESQ"), y a wiki/Retos y Mecánicas de Juego.md para familias y estados.
  Mucho de ESQ está marcado [DECISIÓN BORRADOR]: se implementa tal cual y se señala.
*/

export type Familia = 'digital' | 'territorial' | 'sistema'

export const FAMILIAS: Record<Familia, string> = {
  digital: 'Digital',
  territorial: 'Territorial',
  sistema: 'Sistema',
}

export type Subtipo =
  | 'trivia'
  | 'encuesta'
  | 'racha'
  | 'barrido'
  | 'reunion'
  | 'visita'
  | 'marketing_movil'
  | 'semanal'

export const SUBTIPOS: Record<Subtipo, string> = {
  trivia: 'Trivia',
  encuesta: 'Encuesta',
  racha: 'Racha diaria',
  barrido: 'Barrido',
  reunion: 'Reunión',
  visita: 'Visita',
  marketing_movil: 'Marketing Móvil',
  semanal: 'Semanal del sistema',
}

export const SUBTIPOS_POR_FAMILIA: Record<Familia, Subtipo[]> = {
  digital: ['trivia', 'encuesta', 'racha'],
  territorial: ['barrido', 'reunion', 'visita', 'marketing_movil'],
  sistema: ['semanal'],
}

export type TipoEvidencia = 'foto' | 'gps' | 'qr' | 'formulario'

export const TIPOS_EVIDENCIA: Record<TipoEvidencia, string> = {
  foto: 'Foto (cámara nativa)',
  gps: 'Ubicación GPS',
  qr: 'QR dinámico',
  formulario: 'Formulario',
}

/*
  ESQ Paso 2 Territorial: "el selector de subtipo pre-marca evidencia por defecto". Los pares
  de Reunión (QR+GPS), Visita (GPS+foto) y Marketing Móvil (GPS+foto) vienen de la wiki. Para
  Barrido la fuente no fija evidencia: foto+GPS es propuesta de este demo.
*/
export const EVIDENCIA_SUGERIDA: Partial<Record<Subtipo, TipoEvidencia[]>> = {
  barrido: ['foto', 'gps'],
  reunion: ['qr', 'gps'],
  visita: ['gps', 'foto'],
  marketing_movil: ['gps', 'foto'],
}

// Estados del lado administrativo (wiki §Estados). El usuario de la app nunca ve `borrador`
// ni `pendiente_aprobacion` — ese filtro lo hace el backend.
export type EstadoMision =
  | 'borrador'
  | 'pendiente_aprobacion'
  | 'publicada'
  | 'pausada'
  | 'agotada'
  | 'finalizada'
  | 'cancelada'

export const ESTADOS_MISION: Record<EstadoMision, string> = {
  borrador: 'Borrador',
  // ESQ §Reglas transversales: se distingue de borrador con texto explícito, no solo color.
  pendiente_aprobacion: 'Pendiente de aprobación',
  publicada: 'Publicada',
  pausada: 'Pausada',
  agotada: 'Agotada',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

export type Ambito = 'global' | 'local'

// ESQ §Geocerca: "radio fijo 500 m, no editable" [DECISIÓN BORRADOR]. Es constante del
// sistema (RADIO_GEOCERCA_METROS), no campo de la misión.
export const RADIO_GEOCERCA_METROS = 500

export interface PausaMision {
  motivo: string
  desde: number
  // null = indefinida, se reanuda a mano.
  hasta: string | null
  notificar: boolean
}

export interface Mision {
  id: string
  // Campo `version` (wiki §Gobernanza): la evidencia se evalúa contra las reglas vigentes al
  // momento del envío, así que un cambio de regla con actividad crea versión nueva.
  version: number
  nombre: string
  descripcion: string
  familia: Familia
  subtipo: Subtipo | null
  ambito: Ambito
  // null para misiones globales. Para locales, el territorio del creador.
  territorioId: string | null
  estado: EstadoMision
  creadorId: string
  fechaCreacion: number
  fechaEdicion: number
  recompensaAgatas: number
  evidencia: TipoEvidencia[]
  requiereCupo: boolean
  cupoMaximo: number | null
  // Una Digital que vincula encuesta arrastra el BLOQUEANTE legal de M13 Q-0535 (Ley 1581).
  encuestaVinculada: boolean
  // Segmentación completa: [DECISIÓN BORRADOR] en ESQ Paso 3.
  playaMin: number
  playaMax: number | null
  escudos: RolJuego[]
  inicio: string
  expiracion: string
  recordatorio: boolean
  recordatorioHoras: number
  inscritos: number
  evidenciasAprobadas: number
  evidenciasEnRevision: number
  motivoRechazo?: string
  pausa?: PausaMision
  motivoCancelacion?: string
}

// Catálogos de motivos. ESQ pide catálogo cerrado + "Otro"; los valores concretos no están
// escritos en la bóveda (PW-06 lo lista como pendiente), así que son provisionales.
export const MOTIVOS_RECHAZO_MISION = [
  'Recompensa desproporcionada',
  'Segmentación incorrecta',
  'Evidencia insuficiente para el tipo de misión',
  'Contenido inapropiado o fuera de lineamientos',
  'Duplica una misión existente',
  'Otro',
]

// Los tres primeros salen literal de ESQ §Pausa.
export const MOTIVOS_PAUSA = ['Cupo agotado temporal', 'Revisión de fraude', 'Corrección de reglas', 'Otro']

export const MOTIVOS_CANCELACION = [
  'Evento suspendido',
  'Riesgo de seguridad en el territorio',
  'Fraude detectado',
  'Error en la configuración',
  'Otro',
]

const DIA = 86_400_000
const AHORA = new Date('2026-09-12T09:00:00').getTime()

function base(parcial: Partial<Mision> & Pick<Mision, 'id' | 'nombre' | 'familia' | 'estado' | 'creadorId'>): Mision {
  return {
    version: 1,
    descripcion: 'Descripción de demo para esta misión.',
    subtipo: null,
    ambito: 'global',
    territorioId: null,
    fechaCreacion: AHORA - 10 * DIA,
    fechaEdicion: AHORA - 3 * DIA,
    recompensaAgatas: 50,
    evidencia: [],
    requiereCupo: false,
    cupoMaximo: null,
    encuestaVinculada: false,
    playaMin: 1,
    playaMax: null,
    escudos: ['explorador', 'facilitador', 'mentor'],
    inicio: '2026-09-01T08:00',
    expiracion: '2026-09-30T23:59',
    recordatorio: true,
    recordatorioHoras: 24,
    inscritos: 0,
    evidenciasAprobadas: 0,
    evidenciasEnRevision: 0,
    ...parcial,
  }
}

export const MISIONES_SEED: Mision[] = [
  base({
    id: 'm-01',
    nombre: 'Trivia: conoce tu municipio',
    descripcion: 'Diez preguntas sobre la historia y los servicios de tu municipio.',
    familia: 'digital',
    subtipo: 'trivia',
    estado: 'publicada',
    creadorId: 'u-admin',
    recompensaAgatas: 30,
    inscritos: 1840,
    evidenciasAprobadas: 1520,
  }),
  base({
    id: 'm-02',
    nombre: 'Barrido puerta a puerta en San Mateo',
    descripcion: 'Recorre las manzanas asignadas y registra cada visita con foto y ubicación.',
    familia: 'territorial',
    subtipo: 'barrido',
    ambito: 'local',
    territorioId: 't-soacha',
    estado: 'publicada',
    creadorId: 'u-coordinador',
    recompensaAgatas: 120,
    evidencia: ['foto', 'gps'],
    requiereCupo: true,
    cupoMaximo: 60,
    playaMin: 2,
    inscritos: 41,
    evidenciasAprobadas: 18,
    evidenciasEnRevision: 9,
  }),
  base({
    id: 'm-03',
    nombre: 'Reunión comunitaria La Esperanza',
    descripcion: 'Asiste a la reunión del sábado y escanea el QR del organizador.',
    familia: 'territorial',
    subtipo: 'reunion',
    ambito: 'local',
    territorioId: 't-soacha',
    estado: 'pendiente_aprobacion',
    creadorId: 'u-coordinador',
    recompensaAgatas: 200,
    evidencia: ['qr', 'gps'],
    requiereCupo: true,
    cupoMaximo: 80,
    inicio: '2026-09-20T15:00',
    expiracion: '2026-09-20T19:00',
    fechaCreacion: AHORA - DIA,
    fechaEdicion: AHORA - DIA,
  }),
  base({
    id: 'm-04',
    nombre: 'Racha de 7 días de lectura',
    descripcion: 'Abre la app y lee la nota del día durante siete días seguidos.',
    familia: 'digital',
    subtipo: 'racha',
    estado: 'borrador',
    creadorId: 'u-superadmin',
    recompensaAgatas: 70,
    inscritos: 0,
  }),
  base({
    id: 'm-05',
    nombre: 'Visita a líderes de Medellín',
    descripcion: 'Visita a los líderes de barrio asignados y registra el encuentro.',
    familia: 'territorial',
    subtipo: 'visita',
    ambito: 'local',
    territorioId: 't-medellin',
    estado: 'pausada',
    creadorId: 'c-jorge',
    recompensaAgatas: 150,
    evidencia: ['gps', 'foto'],
    inscritos: 23,
    evidenciasAprobadas: 7,
    evidenciasEnRevision: 4,
    pausa: { motivo: 'Revisión de fraude', desde: AHORA - 2 * DIA, hasta: null, notificar: true },
  }),
  base({
    id: 'm-06',
    nombre: 'Marketing móvil en Barranquilla',
    descripcion: 'Reparte el material impreso en los puntos asignados y fotografíalo.',
    familia: 'territorial',
    subtipo: 'marketing_movil',
    ambito: 'local',
    territorioId: 't-barranquilla',
    estado: 'agotada',
    creadorId: 'u-admin',
    recompensaAgatas: 90,
    evidencia: ['gps', 'foto'],
    requiereCupo: true,
    cupoMaximo: 40,
    inscritos: 40,
    evidenciasAprobadas: 31,
    evidenciasEnRevision: 9,
  }),
  base({
    id: 'm-07',
    nombre: 'Encuesta de percepción de servicios',
    descripcion: 'Responde la encuesta sobre los servicios públicos de tu barrio.',
    familia: 'digital',
    subtipo: 'encuesta',
    estado: 'finalizada',
    creadorId: 'u-superadmin',
    recompensaAgatas: 40,
    encuestaVinculada: true,
    inicio: '2026-07-01T08:00',
    expiracion: '2026-07-31T23:59',
    inscritos: 5210,
    evidenciasAprobadas: 5210,
  }),
  base({
    id: 'm-08',
    nombre: 'Barrido en Cali sur',
    descripcion: 'Barrido cancelado por alteración del orden público.',
    familia: 'territorial',
    subtipo: 'barrido',
    ambito: 'local',
    territorioId: 't-cali',
    estado: 'cancelada',
    creadorId: 'u-admin',
    recompensaAgatas: 110,
    evidencia: ['foto', 'gps'],
    inscritos: 17,
    evidenciasAprobadas: 5,
    motivoCancelacion: 'Riesgo de seguridad en el territorio',
  }),
  base({
    id: 'm-09',
    nombre: 'Misión semanal: invita a un amigo',
    descripcion: 'Generada automáticamente cada lunes. Expira a los 7 días y paga x2.',
    familia: 'sistema',
    subtipo: 'semanal',
    estado: 'publicada',
    creadorId: 'c-root',
    recompensaAgatas: 100,
    inicio: '2026-09-07T00:00',
    expiracion: '2026-09-14T00:00',
    inscritos: 9320,
    evidenciasAprobadas: 2210,
  }),
  base({
    id: 'm-10',
    nombre: 'Punto de encuentro Soacha centro',
    descripcion: 'Borrador de Laura para la jornada de octubre.',
    familia: 'territorial',
    subtipo: 'reunion',
    ambito: 'local',
    territorioId: 't-soacha',
    estado: 'borrador',
    creadorId: 'u-coordinador',
    recompensaAgatas: 150,
    evidencia: ['qr', 'gps'],
    motivoRechazo: 'Recompensa desproporcionada — ajustar a menos de 150 Ágatas.',
  }),
  base({
    id: 'm-11',
    nombre: 'Trivia de la Playa 5',
    descripcion: 'Preguntas avanzadas solo para Facilitadores y Mentores.',
    familia: 'digital',
    subtipo: 'trivia',
    estado: 'publicada',
    creadorId: 'c-candidato',
    recompensaAgatas: 60,
    playaMin: 5,
    escudos: ['facilitador', 'mentor'],
    inscritos: 0,
  }),
]

// Categoría plana del filtro del listado (ESQ §Listado, un solo nivel): Digital · Barrido ·
// Reunión · Visita · Marketing Móvil · Sistema.
export const CATEGORIAS_LISTADO = ['Digital', 'Barrido', 'Reunión', 'Visita', 'Marketing Móvil', 'Sistema']

export function categoriaDeMision(m: Mision): string {
  if (m.familia === 'digital') return 'Digital'
  if (m.familia === 'sistema') return 'Sistema'
  return m.subtipo ? SUBTIPOS[m.subtipo] : 'Territorial'
}

export function tiempoRestante(expiracion: string, ahora: number): string {
  if (!expiracion) return 'Sin fecha de expiración'
  const ms = new Date(expiracion).getTime() - ahora
  if (ms <= 0) return 'Expirada'
  const dias = Math.floor(ms / DIA)
  if (dias >= 1) return `Quedan ${dias} día${dias === 1 ? '' : 's'}`
  return `Quedan ${Math.max(1, Math.floor(ms / 3_600_000))} h`
}
