const QR_API_BASE = 'https://api.qrserver.com/v1/create-qr-code/'

/**
 * Returns the QR code image URL for a given link (e.g. for display).
 */
export function getQrCodeImageUrl(link: string, size = '200x200'): string {
  const params = new URLSearchParams({ size, data: link })
  return `${QR_API_BASE}?${params.toString()}`
}

/**
 * Fetches QR code image for a link and returns a File for FormData.
 */
export async function getQrCodeFile(link: string, fileName: string): Promise<File> {
  const url = getQrCodeImageUrl(link)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`QR fetch failed: ${res.status} ${res.statusText}`)
  const blob = await res.blob()
  return new File([blob], fileName, { type: blob.type || 'image/png' })
}
