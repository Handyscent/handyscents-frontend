import {
  CARD_MIN_HEIGHT_PX,
  CARD_MIN_WIDTH_PX,
  MAX_IMAGE_SIZE_MB,
} from '../../models/order.types'

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

export function isValidDimensions(width: number, height: number): boolean {
  const [minW, minH] =
    width >= height ? [CARD_MIN_HEIGHT_PX, CARD_MIN_WIDTH_PX] : [CARD_MIN_WIDTH_PX, CARD_MIN_HEIGHT_PX]
  return width >= minW && height >= minH
}

export async function validateSingleImage(file: File): Promise<{ valid: boolean; message?: string }> {
  const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024
  if (!['image/jpeg', 'image/png'].includes(file.type)) return { valid: false, message: 'JPG or PNG only' }
  if (file.size > maxBytes) return { valid: false, message: `Max ${MAX_IMAGE_SIZE_MB} MB` }
  try {
    const { width, height } = await getImageDimensions(file)
    if (!isValidDimensions(width, height))
      return { valid: false, message: 'Min 750×900 px (2.5"×3" @ 300 DPI)' }
    return { valid: true }
  } catch {
    return { valid: false, message: 'Invalid image' }
  }
}

/** Auto-rename file to ORDER{orderNum}_Image{n}.{ext} for upload */
export function renameOrderImage(orderNumber: string, imageIndex: number, file: File): File {
  const orderNum = orderNumber.trim().replace(/^#/, '').replace(/\s/g, '') || 'ORDER'
  const ext = file.name.split('.').pop()?.toLowerCase() || (file.type === 'image/png' ? 'png' : 'jpg')
  const name = `ORDER${orderNum}_Image${imageIndex}.${ext}`
  return new File([file], name, { type: file.type })
}
