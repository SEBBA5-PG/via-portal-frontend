import { TextField } from '../../../components/ui/TextField'
import { Superficie, CabeceraSuperficie } from '../../../components/ui/Superficie'
import type { Rol } from '../../../data/roles'

/*
  Paso 1 del asistente de alta — Identidad. Extraído tal cual de la sección "1 · Identidad"
  que antes vivía en CrearCuentaPage.tsx: mismos campos, mismos textos de ayuda, mismo objeto
  de errores. Componente controlado: todo el estado y la validación siguen en el padre.
*/

interface Errores {
  nombre?: string
  cedula?: string
  email?: string
  telefonoWhatsapp?: string
}

export function PasoIdentidad({
  nombre,
  setNombre,
  cedula,
  setCedula,
  telefonoWhatsapp,
  setTelefonoWhatsapp,
  email,
  setEmail,
  rol,
  errores,
}: {
  nombre: string
  setNombre: (v: string) => void
  cedula: string
  setCedula: (v: string) => void
  telefonoWhatsapp: string
  setTelefonoWhatsapp: (v: string) => void
  email: string
  setEmail: (v: string) => void
  rol: Rol
  errores: Errores
}) {
  return (
    <Superficie>
      <CabeceraSuperficie
        titulo="1 · Identidad"
        descripcion="La cédula es el identificador de login del portal, no el celular. El correo es el respaldo de recuperación. La mayoría de edad la verifica Recursos Humanos antes del alta: no hay campo de fecha de nacimiento en el sistema."
      />
      <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
        <TextField
          etiqueta="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
          autoComplete="off"
        />
        <TextField
          etiqueta="Cédula de ciudadanía"
          value={cedula}
          onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          error={errores.cedula}
          ayuda="Solo Colombia — el sistema no maneja tipo de documento ni país emisor."
          autoComplete="off"
        />
        <TextField
          etiqueta="Celular"
          value={telefonoWhatsapp}
          onChange={(e) => setTelefonoWhatsapp(e.target.value)}
          error={errores.telefonoWhatsapp}
          ayuda={
            rol === 'C'
              ? 'Para Coordinador queda reservado solo a recuperación de PIN: no hace 2FA.'
              : 'Canal de 2FA en cada login (OTP por WhatsApp).'
          }
          autoComplete="off"
        />
        <TextField
          etiqueta="Correo electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errores.email}
          autoComplete="off"
        />
      </div>
    </Superficie>
  )
}
