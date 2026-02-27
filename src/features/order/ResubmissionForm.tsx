import { useState } from 'react'
import { Input } from '../../components/ui/Input'
import { FileUpload } from '../../components/ui/FileUpload'
import type { ResubmissionFormData, ResubmissionFormErrors } from '../../models/order.types'
import { getImageDimensions, isValidDimensions, renameOrderImage, validateSingleImage } from '../../shared/utils/orderFormUtils'
import { MAX_IMAGE_SIZE_MB } from '../../models/order.types'

const INITIAL_FORM: ResubmissionFormData = {
  orderId: '',
  images: [null, null, null, null, null],
}

async function validateResubmissionForm(
  form: ResubmissionFormData
): Promise<ResubmissionFormErrors> {
  const errors: ResubmissionFormErrors = {}
  if (!form.orderId?.trim()) errors.orderId = 'Order ID is required'
  const imageErrors: (string | undefined)[] = []
  const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024
  for (let i = 0; i < form.images.length; i++) {
    const file = form.images[i]
    if (!file) imageErrors[i] = 'Image is required'
    else if (!['image/jpeg', 'image/png'].includes(file.type)) imageErrors[i] = 'JPG or PNG only'
    else if (file.size > maxBytes) imageErrors[i] = `Max ${MAX_IMAGE_SIZE_MB} MB`
    else {
      try {
        const { width, height } = await getImageDimensions(file)
        if (!isValidDimensions(width, height)) {
          imageErrors[i] = 'Min 750×900 px (2.5"×3" @ 300 DPI)'
        }
      } catch {
        imageErrors[i] = 'Invalid image'
      }
    }
  }
  if (imageErrors.some(Boolean)) errors.images = imageErrors
  return errors
}

function getErrorList(errors: ResubmissionFormErrors): { field: string; message: string }[] {
  const list: { field: string; message: string }[] = []
  if (errors.orderId) list.push({ field: 'Order ID', message: errors.orderId })
  if (errors.images) {
    errors.images.forEach((msg, i) => {
      if (msg) list.push({ field: `Image ${i + 1}`, message: msg })
    })
  }
  return list
}

export function ResubmissionForm() {
  const [errors, setErrors] = useState<ResubmissionFormErrors>({})
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [uploadError, setUploadError] = useState<{ field: string; message: string } | null>(null)
  const [uploadKeys, setUploadKeys] = useState<Record<number, number>>({})
  const [form, setForm] = useState<ResubmissionFormData>(INITIAL_FORM)

  const setImage = (index: number, file: File | null) => {
    setForm((prev) => {
      const next = [...prev.images]
      next[index] = file
      return { ...prev, images: next }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = await validateResubmissionForm(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setShowValidationModal(true)
      return
    }
    const renamedImages = form.images
      .filter((f): f is File => f != null)
      .map((file, i) => renameOrderImage(form.orderId, i + 1, file))
    const payload = { orderId: form.orderId.trim(), images: renamedImages }
    // TODO: API submit resubmission (files named ORDER1234_Image1.jpg etc.)
    console.log('Resubmit', payload)
  }

  const errorList = getErrorList(errors)
  const modalErrors = uploadError ? [uploadError] : errorList

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 px-3 py-6 sm:px-6 sm:py-8 md:px-8">
      {showValidationModal && modalErrors.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setShowValidationModal(false)
            setUploadError(null)
          }}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-red-600">
              {uploadError ? 'Upload error' : 'Validation errors'}
            </h3>
            <p className="mb-4 text-base text-gray-600">
              {uploadError
                ? 'This image does not meet the requirements:'
                : 'Please fix the following before submitting:'}
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
              onClick={() => {
                setShowValidationModal(false)
                setUploadError(null)
              }}
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
            Resubmission form
          </h1>
          <p className="mb-6 text-base text-gray-600">
            Resubmit images for an existing order. Enter the order ID and upload 5 images (same requirements as the main order form).
          </p>

          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-6">
            <div className="md:col-span-2">
              <Input
                label="Order ID"
                required
                value={form.orderId}
                onChange={(e) => {
                  setForm((p) => ({ ...p, orderId: e.target.value }))
                  setErrors((p) => ({ ...p, orderId: undefined }))
                }}
                placeholder="#1005"
                error={errors.orderId}
              />
            </div>

            <div className="min-w-0 pt-2 md:col-span-2 md:pt-4">
              <h2 className="mb-2 text-base font-medium text-gray-600 sm:text-lg">
                Image uploads (5 required)
              </h2>
              <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                <p className="mb-2 text-base font-semibold text-gray-800 sm:text-lg">
                  Upload requirements:
                </p>
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
                Submit resubmission
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
