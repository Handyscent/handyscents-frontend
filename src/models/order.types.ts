/** Order form domain types */

export interface OrderFormData {
  orderNumber: string
  creatorName: string
  quantityOrdered: string
  submittedUrl: string
  orderConfirmationLink: string
  message: string
  images: (File | null)[]
}

export const ORDER_FORM_DEFAULTS: OrderFormData = {
  orderNumber: '',
  creatorName: '',
  quantityOrdered: '',
  submittedUrl: '',
  orderConfirmationLink: '',
  message: '',
  images: [null, null, null, null, null],
}

export const MAX_IMAGE_SIZE_MB = 100
export const ACCEPTED_FILE_TYPES = 'image/jpeg,image/png'

/** 2.5" x 3" at 300 DPI */
export const CARD_MIN_WIDTH_PX = 750
export const CARD_MIN_HEIGHT_PX = 900

export interface OrderFormErrors {
  orderNumber?: string
  creatorName?: string
  quantityOrdered?: string
  submittedUrl?: string
  orderConfirmationLink?: string
  message?: string
  images?: (string | undefined)[]
}

export interface ResubmissionFormData {
  orderId: string
  images: (File | null)[]
}

export interface ResubmissionFormErrors {
  orderId?: string
  images?: (string | undefined)[]
}
