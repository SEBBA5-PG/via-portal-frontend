import type { Rol } from './roles'

// Cuentas ficticias para el demo. Ningún dato aquí es de una persona real. Sus credenciales
// NO se muestran en la UI: están documentadas en VIA BRAIN, en
// decisiones/portal-web/Portal Web — Cuentas de prueba del demo.md
export interface DemoUser {
  id: string
  nombre: string
  cedula: string
  pin: string
  rol: Rol
  email: string
  telefonoWhatsapp: string
  // true si esta cuenta viene de conexion-api (backend real), no de SEED_USERS. El PIN se
  // cachea aquí solo para el bookkeeping local de 2FA/sesión — la validación del PIN en sí
  // siempre vuelve a pasar por loginBackend, nunca por comparación local (ver authStore.login).
  origenBackend?: boolean
}

export const SEED_USERS: DemoUser[] = [
  {
    id: 'u-superadmin',
    nombre: 'María Fernanda Rojas',
    cedula: '1000000001',
    pin: '246810',
    rol: 'S',
    email: 'maria.rojas@demo.via',
    telefonoWhatsapp: '+57 300 111 2233',
  },
  {
    id: 'u-admin',
    nombre: 'Andrés Camilo Pérez',
    cedula: '1000000002',
    pin: '135790',
    rol: 'A',
    email: 'andres.perez@demo.via',
    telefonoWhatsapp: '+57 300 222 3344',
  },
  {
    id: 'u-coordinador',
    nombre: 'Laura Medina',
    cedula: '1000000003',
    pin: '975310',
    rol: 'C',
    email: 'laura.medina@demo.via',
    telefonoWhatsapp: '+57 300 333 4455',
  },
  {
    /*
      Segundo Superadministrador, agregado el 2026-09-12 con PW-04. Sin él la Doble Firma es
      indemostrable: el Maker no puede ser el Checker, así que con una sola cuenta S ninguna
      ampliación de permiso se puede aprobar nunca en el demo.

      No es una cuenta cualquiera — es el caso de origen de M02 Q-0050 escrito literal: un
      Superadministrador que aprueba decisiones sensibles pero tiene recortados los permisos
      operativos técnicos, "por seguridad y por no tener el conocimiento para ejercerlos".
      Su recorte vive en cuentas.ts como overrides.

      PENDIENTE: falta la línea correspondiente en VIA BRAIN,
      decisiones/portal-web/Portal Web — Cuentas de prueba del demo.md
    */
    id: 'c-candidato',
    nombre: 'Sofía Restrepo Guzmán',
    cedula: '1000000004',
    pin: '864202',
    rol: 'S',
    email: 'sofia.restrepo@demo.via',
    telefonoWhatsapp: '+57 300 444 5566',
  },
]
