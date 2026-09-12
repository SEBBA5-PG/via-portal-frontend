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
]
