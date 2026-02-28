import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Input } from '../../components/ui/Input'
import { FileUpload } from '../../components/ui/FileUpload'
import type { OrderFormData, OrderFormErrors } from '../../models/order.types'
import {
  MAX_IMAGE_SIZE_MB,
  ORDER_FORM_DEFAULTS,
} from '../../models/order.types'
import {
  getImageDimensions,
  isValidDimensions,
  renameOrderImage,
  validateSingleImage,
} from '../../shared/utils/orderFormUtils'
import { getQrCodeImageUrl } from '../../shared/utils/convertLinkQR'
import { Modal } from '../../shared/components/Modal'

const URL_REGEX = /^https?:\/\/.+\..+/

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
  const [searchParams] = useSearchParams()
  const [errors, setErrors] = useState<OrderFormErrors>({})
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [uploadError, setUploadError] = useState<{ field: string; message: string } | null>(null)
  const [uploadKeys, setUploadKeys] = useState<Record<number, number>>({})
  const [form, setForm] = useState<OrderFormData>(ORDER_FORM_DEFAULTS)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    const prefill: Partial<OrderFormData> = {}

    const orderNumber = searchParams.get('orderNumber') ?? searchParams.get('orderId')
    const creatorName = searchParams.get('creatorName') ?? searchParams.get('creatorFullName')
    const quantityOrdered = searchParams.get('quantityOrdered') ?? searchParams.get('totalItemsInOrder')
    const submittedUrl = searchParams.get('submittedUrl')
    const orderConfirmationLink =
      searchParams.get('orderConfirmationLink') ?? searchParams.get('orderStatusUrl')
    const message = searchParams.get('message')

    if (orderNumber) prefill.orderNumber = orderNumber
    if (creatorName) prefill.creatorName = creatorName
    if (quantityOrdered) prefill.quantityOrdered = quantityOrdered
    if (submittedUrl) prefill.submittedUrl = submittedUrl
    if (orderConfirmationLink) prefill.orderConfirmationLink = orderConfirmationLink
    if (message) prefill.message = message

    if (Object.keys(prefill).length > 0) {
      setForm((p) => ({ ...p, ...prefill }))
    }
  }, [searchParams])

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
    setSubmitResult(null)
    const validationErrors = await validateOrderForm(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setShowValidationModal(true)
      return
    }
    const renamedImages = form.images
      .filter((f): f is File => f != null)
      .map((file, i) => renameOrderImage(form.orderNumber, i + 1, file))

    const formData = new FormData()
    formData.append('orderNumber', form.orderNumber)
    formData.append('creatorName', form.creatorName)
    formData.append('quantityOrdered', form.quantityOrdered)
    formData.append('submittedUrl', form.submittedUrl)
    formData.append('orderConfirmationLink', form.orderConfirmationLink)
    formData.append('message', form.message)
    renamedImages.forEach((file, i) => formData.append(`image${i + 1}`, file))

    formData.append('submittedQr', getQrCodeImageUrl(form.submittedUrl))
    formData.append('confirmationQr', getQrCodeImageUrl(form.orderConfirmationLink))

    const apiBase = import.meta.env.VITE_API_URL ?? ''
    const url = apiBase ? `${apiBase.replace(/\/$/, '')}/orders` : '/api/orders'
    setIsSubmitting(true)
    try {
      const res = await fetch(url, { method: 'POST', body: formData })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok) {
        const msg = data.error ?? `Request failed (${res.status})`
        setSubmitResult({ type: 'error', message: msg })
        setUploadError({ field: 'Submit', message: msg })
        setShowValidationModal(true)
        return
      }
      if (!data.success) {
        const msg = data.error ?? 'Submission failed'
        setSubmitResult({ type: 'error', message: msg })
        setUploadError({ field: 'Submit', message: msg })
        setShowValidationModal(true)
        return
      }
      setUploadError(null)
      setShowValidationModal(false)
      setSubmitResult(null)
      setShowSuccessModal(true)
      setForm(ORDER_FORM_DEFAULTS)
      setErrors({})
      setUploadKeys({})
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setSubmitResult({ type: 'error', message: msg })
      setUploadError({ field: 'Submit', message: msg })
      setShowValidationModal(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const errorList = getErrorList(errors)
  const modalErrors = uploadError ? [{ field: uploadError.field, message: uploadError.message }] : errorList

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 px-3 py-6 sm:px-6 sm:py-8 md:px-8">
      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Upload required Images to complete your release!"
      >
        <p className="mb-3">Your images have been successfully received.</p>
        <p className="mb-3">
          Our team will review your files within 1–2 business days. If any adjustments are needed, we will contact you before production begins.
        </p>
        <p>Thank you for completing your release.</p>
      </Modal>
      <Modal
        open={showValidationModal && modalErrors.length > 0}
        onClose={() => { setShowValidationModal(false); setUploadError(null) }}
        title={
          <h3 className="text-lg font-semibold text-red-600">
            {uploadError ? 'Upload error' : 'Validation errors'}
          </h3>
        }
        contentClassName="max-h-[80vh]"
      >
        <p className="mb-4 text-gray-600">
          {uploadError ? 'This image does not meet the requirements:' : 'Please fix the following before submitting:'}
        </p>
        <ul className="list-inside list-disc space-y-2">
          {modalErrors.map(({ field, message }) => (
            <li key={field}>
              <span className="font-medium">{field}:</span> {message}
            </li>
          ))}
        </ul>
      </Modal>
      <div className="w-full max-w-5xl">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-5 shadow-sm sm:p-6 md:p-8"
        >
          {submitResult?.type === 'error' && (
            <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              <p className="font-medium">Error: {submitResult.message}</p>
            </div>
          )}
          <h1 className="mb-6 text-xl font-semibold text-gray-800 sm:mb-8 sm:text-2xl md:text-3xl">
            Order form {form.orderNumber}
          </h1>

          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-6">
            <div>
              <Input
                label="Order Number"
                required
                value={form.orderNumber}
                disabled
                onChange={(e) => { update('orderNumber', e.target.value); setErrors((p) => ({ ...p, orderNumber: undefined })) }}
                placeholder="Order Number"
                error={errors.orderNumber}
              />
            </div>
            <div>
              <Input
                label="Creator Name"
                required
                value={form.creatorName}
                disabled
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
                disabled
                onChange={(e) => { update('quantityOrdered', e.target.value); setErrors((p) => ({ ...p, quantityOrdered: undefined })) }}
                placeholder="Enter quantity ordered"
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
                placeholder="Your website URL"
                error={errors.submittedUrl}
              />
            </div>
            <div className="min-w-0 md:col-span-2">
              <Input
                label="Order Confirmation Link"
                required
                type="url"
                value={form.orderConfirmationLink}
                disabled
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
                placeholder="Message (e.g. Honda Civic Car, etc. If nothing, leave blank)"
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
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-base sm:text-lg font-medium text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 active:bg-violet-800 disabled:pointer-events-none disabled:opacity-70 sm:w-auto sm:min-w-[140px] sm:px-6"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="opacity-25"
                      />
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        className="opacity-75"
                      />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
