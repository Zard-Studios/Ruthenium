import React, { forwardRef } from 'react'
import { useTheme } from '../../renderer/src/design-system/ThemeProvider'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helperText?: string
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({
        label,
        error,
        helperText,
        leftIcon,
        rightIcon,
        className = '',
        ...props
    }, ref) => {
        const { tokens } = useTheme()

        const baseStyles = `
      w-full px-3 py-2 border rounded-lg
      bg-white dark:bg-gray-800
      text-gray-900 dark:text-gray-100
      placeholder-gray-500 dark:placeholder-gray-400
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed
    `

        const errorStyles = error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600'

        const combinedClassName = `
      ${baseStyles}
      ${errorStyles}
      ${leftIcon ? 'pl-10' : ''}
      ${rightIcon ? 'pr-10' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ')

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <div className="text-gray-400 dark:text-gray-500">
                                {leftIcon}
                            </div>
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={combinedClassName}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <div className="text-gray-400 dark:text-gray-500">
                                {rightIcon}
                            </div>
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}
                {helperText && !error && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {helperText}
                    </p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'