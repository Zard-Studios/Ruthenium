import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../../renderer/src/design-system/ThemeProvider'

export interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl'
    closeOnOverlayClick?: boolean
    closeOnEscape?: boolean
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    closeOnOverlayClick = true,
    closeOnEscape = true,
}: ModalProps) {
    const { tokens } = useTheme()
    const modalRef = useRef<HTMLDivElement>(null)
    const previousActiveElement = useRef<HTMLElement | null>(null)

    // Handle escape key
    useEffect(() => {
        if (!closeOnEscape) return

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose, closeOnEscape])

    // Handle focus management
    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement as HTMLElement
            modalRef.current?.focus()
        } else {
            previousActiveElement.current?.focus()
        }
    }, [isOpen])

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen) return null

    const sizeStyles = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    }

    const handleOverlayClick = (event: React.MouseEvent) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) {
            onClose()
        }
    }

    const modalContent = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ zIndex: tokens.zIndex.modal }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={handleOverlayClick}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className={`
          relative w-full ${sizeStyles[size]} max-h-[90vh] overflow-hidden
          bg-white dark:bg-gray-800 rounded-xl shadow-2xl
          transform transition-all duration-200 ease-out
        `}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                tabIndex={-1}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2
                            id="modal-title"
                            className="text-xl font-semibold text-gray-900 dark:text-white"
                        >
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="
                p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100
                dark:hover:text-gray-300 dark:hover:bg-gray-700
                transition-colors duration-200
              "
                            aria-label="Close modal"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {children}
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}

// Modal components for common patterns
export function ModalHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-4">
            {children}
        </div>
    )
}

export function ModalBody({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-6">
            {children}
        </div>
    )
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {children}
        </div>
    )
}