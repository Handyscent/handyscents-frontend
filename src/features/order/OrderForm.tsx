import { useState } from 'react'
import { Input } from '../../components/ui/Input'
import { FileUpload } from '../../components/ui/FileUpload'
import type { OrderFormData, OrderFormErrors } from '../../models/order.types'
import {
  CARD_MIN_HEIGHT_PX,
  CARD_MIN_WIDTH_PX,
  MAX_IMAGE_SIZE_MB,
  ORDER_FORM_DEFAULTS,
} from '../../models/order.types'

const URL_REGEX = /^https?:\/\/.+\..+/

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
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

function isValidDimensions(width: number, height: number): boolean {
  const [minW, minH] = width >= height ? [CARD_MIN_HEIGHT_PX, CARD_MIN_WIDTH_PX] : [CARD_MIN_WIDTH_PX, CARD_MIN_HEIGHT_PX]
  return width >= minW && height >= minH
}

async function validateSingleImage(file: File): Promise<{ valid: boolean; message?: string }> {
  const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024
  if (!['image/jpeg', 'image/png'].includes(file.type)) return { valid: false, message: 'JPG or PNG only' }
  if (file.size > maxBytes) return { valid: false, message: `Max ${MAX_IMAGE_SIZE_MB} MB` }
  try {
    const { width, height } = await getImageDimensions(file)
    if (!isValidDimensions(width, height)) return { valid: false, message: 'Min 750×900 px (2.5"×3" @ 300 DPI)' }
    return { valid: true }
  } catch {
    return { valid: false, message: 'Invalid image' }
  }
}

async function validateOrderForm(form: OrderFormData): Promise<OrderFormErrors> {
  const errors: OrderFormErrors = {}
  if (!form.orderNumber?.trim()) errors.orderNumber = 'Order number is required'
  if (!form.creatorName?.trim()) errors.creatorName = 'Creator name is required'
  const qty = Number(form.quantityOrdered)
  if (!form.quantityOrdered?.trim()) errors.quantityOrdered = 'Quantity is required'
  else if (isNaN(qty) || qty < 1) errors.quantityOrdered = 'Enter a valid quantity (min 1)'
  if (!form.submittedUrl?.trim()) errors.submittedUrl = 'Submitted URL is required'
  else if (!URL_REGEX.test(form.submittedUrl)) errors.submittedUrl = 'Enter a valid URL'
  if (!form.orderConfirmationLink?.trim()) errors.orderConfirmationLink = 'Order confirmation link is required'
  else if (!URL_REGEX.test(form.orderConfirmationLink)) errors.orderConfirmationLink = 'Enter a valid URL'
  const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024
  const imageErrors: (string | undefined)[] = []
  for (let i = 0; i < form.images.length; i++) {
    const file = form.images[i]
    if (!file) imageErrors[i] = 'Image is required'
    else if (!['image/jpeg', 'image/png'].includes(file.type)) imageErrors[i] = 'JPG or PNG only'
    else if (file.size > maxBytes) imageErrors[i] = `Max ${MAX_IMAGE_SIZE_MB} MB`
    else {
      try {
        const { width, height } = await getImageDimensions(file)
        if (!isValidDimensions(width, height)) {
          imageErrors[i] = `Min 750×900 px (2.5"×3" @ 300 DPI)`
        }
      } catch {
        imageErrors[i] = 'Invalid image'
      }
    }
  }
  if (imageErrors.some(Boolean)) errors.images = imageErrors
  return errors
}

const FIELD_LABELS: Record<string, string> = {
  orderNumber: 'Order Number',
  creatorName: 'Creator Name',
  quantityOrdered: 'Quantity Ordered',
  submittedUrl: 'Submitted URL',
  orderConfirmationLink: 'Order Confirmation Link',
}

function getErrorList(errors: OrderFormErrors): { field: string; message: string }[] {
  const list: { field: string; message: string }[] = []
  for (const [key, value] of Object.entries(errors)) {
    if (key === 'images' && Array.isArray(value)) {
      value.forEach((msg, i) => {
        if (msg) list.push({ field: `Image ${i + 1}`, message: msg })
      })
    } else if (value) {
      list.push({ field: FIELD_LABELS[key] ?? key, message: value })
    }
  }
  return list
}

export function OrderForm() {
  const [errors, setErrors] = useState<OrderFormErrors>({})
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [uploadError, setUploadError] = useState<{ field: string; message: string } | null>(null)
  const [uploadKeys, setUploadKeys] = useState<Record<number, number>>({})
  const [form, setForm] = useState<OrderFormData>({
    ...ORDER_FORM_DEFAULTS,
    orderNumber: '#1005',
    creatorName: 'April Fadel Tyra Ratke-Cronin',
    quantityOrdered: '100',
    submittedUrl: '',
    orderConfirmationLink: 'https://invitational-test-app.myshopify.com/64',
    message: '',
  })

  const update = <K extends keyof OrderFormData>(key: K, value: OrderFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const setImage = (index: number, file: File | null) => {
    setForm((prev) => {
      const next = [...prev.images]
      next[index] = file
      return { ...prev, images: next }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = await validateOrderForm(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setShowValidationModal(true)
      return
    }
    // TODO: API submit
    console.log('Submit', form)
  }

  const errorList = getErrorList(errors)
  const modalErrors = uploadError ? [{ field: uploadError.field, message: uploadError.message }] : errorList

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 px-3 py-6 sm:px-6 sm:py-8 md:px-8">
      {showValidationModal && modalErrors.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => { setShowValidationModal(false); setUploadError(null) }}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-red-600">
              {uploadError ? 'Upload error' : 'Validation errors'}
            </h3>
            <p className="mb-4 text-base text-gray-600">
              {uploadError ? 'This image does not meet the requirements:' : 'Please fix the following before submitting:'}
            </p>
            <ul className="mb-6 list-inside list-disc space-y-2 text-base text-gray-700">
              {modalErrors.map(({ field, message }) => (
                <li key={field}>
                  <span className="font-medium">{field}:</span> {message}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => { setShowValidationModal(false); setUploadError(null) }}
              className="w-full rounded-lg bg-violet-600 px-4 py-3 text-base font-medium text-white hover:bg-violet-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
      <div className="w-full max-w-5xl">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-5 shadow-sm sm:p-6 md:p-8"
        >
          <h1 className="mb-6 text-xl font-semibold text-gray-800 sm:mb-8 sm:text-2xl md:text-3xl">
            Order form {form.orderNumber}
          </h1>

          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-6">
            <div>
              <Input
                label="Order Number"
                required
                value={form.orderNumber}
                onChange={(e) => { update('orderNumber', e.target.value); setErrors((p) => ({ ...p, orderNumber: undefined })) }}
                placeholder="#1005"
                error={errors.orderNumber}
              />
            </div>
            <div>
              <Input
                label="Creator Name"
                required
                value={form.creatorName}
                onChange={(e) => { update('creatorName', e.target.value); setErrors((p) => ({ ...p, creatorName: undefined })) }}
                placeholder="Creator name"
                error={errors.creatorName}
              />
            </div>
            <div>
              <Input
                label="Quantity Ordered"
                required
                type="number"
                min={1}
                value={form.quantityOrdered}
                onChange={(e) => { update('quantityOrdered', e.target.value); setErrors((p) => ({ ...p, quantityOrdered: undefined })) }}
                placeholder="100"
                error={errors.quantityOrdered}
              />
            </div>
            <div>
              <Input
                label="Submitted URL (Your Website)"
                required
                type="url"
                value={form.submittedUrl}
                onChange={(e) => { update('submittedUrl', e.target.value); setErrors((p) => ({ ...p, submittedUrl: undefined })) }}
                placeholder="Your answer"
                error={errors.submittedUrl}
              />
            </div>
            <div className="min-w-0 md:col-span-2">
              <Input
                label="Order Confirmation Link"
                required
                type="url"
                value={form.orderConfirmationLink}
                onChange={(e) => { update('orderConfirmationLink', e.target.value); setErrors((p) => ({ ...p, orderConfirmationLink: undefined })) }}
                placeholder="https://..."
                error={errors.orderConfirmationLink}
              />
            </div>
            <div className="min-w-0 md:col-span-2">
              <Input
                label="Message (e.g. Favorite Car, Music)"
                multiline
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
                placeholder="Your answer"
              />
            </div>

            <div className="min-w-0 pt-2 md:col-span-2 md:pt-4">
              <h2 className="mb-2 text-base font-medium text-gray-600 sm:text-lg">
                Image uploads
              </h2>
              <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                <p className="mb-2 text-base font-semibold text-gray-800 sm:text-lg">Upload requirements:</p>
                <ul className="list-inside list-disc space-y-1 text-base text-gray-600">
                  <li>Five images required</li>
                  <li>Minimum 300 DPI</li>
                  <li>JPG or PNG format</li>
                  <li>Clean framing to prevent cropping issues</li>
                  <li>Final card size is 2.5&quot; x 3&quot;</li>
                </ul>
              </div>
            </div>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5 ${n === 5 ? 'md:col-span-2' : 'md:col-span-1'}`}
              >
                <FileUpload
                  key={`image-${n}-${uploadKeys[n] ?? 0}`}
                  label={`Image ${n}`}
                  required
                  value={form.images[n - 1]}
                  onChange={async (file) => {
                    if (!file) {
                      setImage(n - 1, null)
                      setErrors((p) => ({ ...p, images: undefined }))
                      return
                    }
                    const result = await validateSingleImage(file)
                    if (result.valid) {
                      setImage(n - 1, file)
                      setErrors((p) => ({ ...p, images: undefined }))
                    } else {
                      setImage(n - 1, null)
                      setUploadKeys((p) => ({ ...p, [n]: (p[n] ?? 0) + 1 }))
                      setErrors((p) => {
                        const arr: (string | undefined)[] = [...(p.images ?? Array(5))].slice(0, 5)
                        arr[n - 1] = result.message
                        return { ...p, images: arr }
                      })
                      setUploadError({ field: `Image ${n}`, message: result.message! })
                      setShowValidationModal(true)
                    }
                  }}
                  error={errors.images?.[n - 1]}
                />
              </div>
            ))}

            <div className="min-w-0 pt-6 md:col-span-2 md:pt-8">
              <button
                type="submit"
                className="w-full rounded-lg bg-violet-600 px-4 py-3 text-base sm:text-lg font-medium text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 active:bg-violet-800 sm:w-auto sm:min-w-[140px] sm:px-6"
              >
                Submit
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
