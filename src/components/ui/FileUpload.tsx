import type { ChangeEvent } from 'react'
import { ACCEPTED_FILE_TYPES, MAX_IMAGE_SIZE_MB } from '../../models/order.types'

interface FileUploadProps {
  label: string
  required?: boolean
  value: File | null
  onChange: (file: File | null) => void
  accept?: string
  maxSizeMb?: number
  error?: string
}

export function FileUpload({
  label,
  required,
  value,
  onChange,
  accept = ACCEPTED_FILE_TYPES,
  maxSizeMb = MAX_IMAGE_SIZE_MB,
  error,
}: FileUploadProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onChange(file)
  }

  return (
    <div className="w-full space-y-2">
      <label className="block text-base font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <p className="text-sm text-gray-500">
        Upload 1 supported file: JPG or PNG. Max {maxSizeMb} MB.
      </p>
      <div
        className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4 ${error ? 'border-red-500' : 'border-gray-200'}`}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="block w-full text-base text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-3 file:text-base file:font-medium file:text-violet-700 hover:file:bg-violet-200 sm:file:py-2"
        />
        {value && (
          <span
            className="max-w-full truncate text-base text-gray-600 sm:max-w-[200px]"
            title={value.name}
          >
            {value.name}
          </span>
        )}
      </div>
    </div>
  )
}
