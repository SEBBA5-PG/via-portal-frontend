// PII enmascarada por defecto: solo se revelan los últimos 2 dígitos, sin importar el
// formato de entrada (evita revelar de más por los espacios del número original).
export function enmascararTelefono(tel: string): string {
  const digitos = tel.replace(/\D/g, '')
  return `•••• ${digitos.slice(-2)}`
}
