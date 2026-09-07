import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrImage({ value, size = 200 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    QRCode.toDataURL(value, { width: size, margin: 1 }).then((url) => {
      if (!cancelado) setDataUrl(url)
    })
    return () => {
      cancelado = true
    }
  }, [value, size])

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="animate-pulse rounded-2xl bg-institucional-sidebar"
      />
    )
  }
  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt="Código QR para configurar el segundo factor"
      className="rounded-2xl"
    />
  )
}
