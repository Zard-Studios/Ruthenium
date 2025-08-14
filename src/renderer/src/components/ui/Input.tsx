import React, { forwardRef } from 'react'
import { useTheme } from '../../design-system/ThemeProvider'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helperText?: string
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
    variant?: 'default' | 'filled'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({
        label,
        error,
        helperText,
        leftIcon,
        rightIcon,
        variant = 'default',
        className = '',
        id,
        ...props
    }, ref) => {
        const { tokens } = useTheme()
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

        const baseInputStyles = `
      w-full px-3 py-2 text-base rounded-lg
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      ${leftIcon ? 'pl-10' : ''}
      ${rightIcon ? 'pr-10' : ''}
    `

        const variantStyles = {
            default: `
        bg-white border border-gray-300
        focus:border-blue-500 focus:ring-blue-500
        dark:bg-gray-800 dark:border-gray-600
        dark:text-white dark:focus:border-blue-400
      `,
            filled: `
        bg-gray-100 border border-transparent
        focus:bg-white focus:border-blue-500 focus:ring-blue-500
        dark:bg-gray-700 dark:focus:bg-gray-800
        dark:text-white dark:focus:border-blue-400
      `,
        }

        const errorStyles = error ? `
      border-red-500 focus:border-red-500 focus:ring-red-500
      dark:border-red-400 dark:focus:border-red-400
    ` : ''

        const inputClassName = `
      ${baseInputStyles}
      ${variantStyles[variant]}
      ${errorStyles}
      ${className}
    `.trim().replace(/\s+/g, ' ')

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        {label}
                    </label>
                )}

                <div className="relative">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <div className="h-5 w-5 text-gray-400">
                                {leftIcon}
                            </div>
                        </div>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        className={inputClassName}
                        {...props}
                    />

                    {rightIcon && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <div className="h-5 w-5 text-gray-400">
                                {rightIcon}
                            </div>
                        </div>
                    )}
                </div>

                {(error || helperText) && (
                    <div className="mt-1">
                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        )}
                        {!error && helperText && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {helperText}
                            </p>
                        )}
                    </div>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'