import { Secret, TOTP } from 'otpauth'

const ALGO = 'SHA1'
const DIGITS = 6
const PERIOD = 30

export function generarSecretoTotp(email: string): { base32: string; otpauthUri: string } {
  const totp = new TOTP({
    issuer: 'VIA Portal',
    label: email,
    algorithm: ALGO,
    digits: DIGITS,
    period: PERIOD,
    secret: new Secret({ size: 20 }),
  })
  return { base32: totp.secret.base32, otpauthUri: totp.toString() }
}

export function verificarCodigoTotp(base32Secret: string, codigo: string): boolean {
  const delta = TOTP.validate({
    token: codigo,
    secret: Secret.fromBase32(base32Secret),
    algorithm: ALGO,
    digits: DIGITS,
    period: PERIOD,
    window: 1,
  })
  return delta !== null
}
