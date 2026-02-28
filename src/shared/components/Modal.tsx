import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  buttonLabel?: string
  onButtonClick?: () => void
  /** e.g. 'max-h-[80vh]' for scrollable content */
  contentClassName?: string
}

export function Modal({
  open,
  onClose,
  title,
  children,
  buttonLabel = 'OK',
  onButtonClick,
  contentClassName = '',
}: ModalProps) {
  if (!open) return null

  const handleButtonClick = () => {
    (onButtonClick ?? onClose)()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md overflow-auto rounded-xl bg-white p-6 shadow-xl ${contentClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title != null && (
          <div className="mb-4">
            {typeof title === 'string' ? (
              <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            ) : (
              title
            )}
          </div>
        )}
        <div className="text-base text-gray-700">{children}</div>
        <button
          type="button"
          onClick={handleButtonClick}
          className="mt-6 w-full rounded-lg bg-violet-600 px-4 py-3 text-base font-medium text-white hover:bg-violet-700"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}
