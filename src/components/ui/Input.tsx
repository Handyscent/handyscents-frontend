import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string
  required?: boolean
  multiline?: boolean
  error?: string
}

export function Input({
  label,
  required,
  multiline,
  error,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id ?? label.replace(/\s+/g, '-').toLowerCase()
  const baseClass =
    'w-full rounded-lg border bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed px-3 py-2.5 text-base sm:text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 sm:py-2.5 min-h-[44px] sm:min-h-0'
  const borderClass = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-violet-500 focus:ring-violet-500'

  if (multiline) {
    const textareaProps = { ...(props as InputHTMLAttributes<HTMLInputElement>) }
    delete textareaProps.type
    return (
      <div className="w-full">
        <label htmlFor={inputId} className="mb-1 block text-base font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        <textarea
          id={inputId}
          className={`${baseClass} ${borderClass} min-h-[80px] resize-y py-3 sm:py-2 ${className}`}
          {...(textareaProps as InputHTMLAttributes<HTMLTextAreaElement>)}
        />
      </div>
    )
  }

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1 block text-base font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={inputId}
        className={`${baseClass} ${borderClass} ${className}`}
        {...(props as InputHTMLAttributes<HTMLInputElement>)}
      />
    </div>
  )
}
