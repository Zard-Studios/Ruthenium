import React, { forwardRef } from 'react'
import { useTheme } from '../../renderer/src/design-system/ThemeProvider'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        variant = 'primary',
        size = 'md',
        loading = false,
        leftIcon,
        rightIcon,
        children,
        className = '',
        disabled,
        ...props
    }, ref) => {
        const { tokens } = useTheme()

        const baseStyles = `
      inline-flex items-center justify-center gap-2 font-medium rounded-lg
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${loading ? 'cursor-wait' : ''}
    `

        const variantStyles = {
            primary: `
        bg-blue-500 hover:bg-blue-600 active:bg-blue-700
        text-white border border-transparent
        focus:ring-blue-500
      `,
            secondary: `
        bg-gray-100 hover:bg-gray-200 active:bg-gray-300
        text-gray-900 border border-transparent
        focus:ring-gray-500
        dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-gray-600
        dark:text-gray-100
      `,
            outline: `
        bg-transparent hover:bg-gray-50 active:bg-gray-100
        text-gray-700 border border-gray-300
        focus:ring-gray-500
        dark:hover:bg-gray-800 dark:active:bg-gray-700
        dark:text-gray-300 dark:border-gray-600
      `,
            ghost: `
        bg-transparent hover:bg-gray-100 active:bg-gray-200
        text-gray-700 border border-transparent
        focus:ring-gray-500
        dark:hover:bg-gray-800 dark:active:bg-gray-700
        dark:text-gray-300
      `,
            danger: `
        bg-red-500 hover:bg-red-600 active:bg-red-700
        text-white border border-transparent
        focus:ring-red-500
      `,
        }

        const sizeStyles = {
            sm: 'px-3 py-1.5 text-sm min-h-[32px]',
            md: 'px-4 py-2 text-base min-h-[40px]',
            lg: 'px-6 py-3 text-lg min-h-[48px]',
        }

        const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${className}
    `.trim().replace(/\s+/g, ' ')

        return (
            <button
                ref={ref}
                className={combinedClassName}
                disabled={disabled || loading}
                {...props}
            >
                {loading && (
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                {!loading && leftIcon && leftIcon}
                {children}
                {!loading && rightIcon && rightIcon}
            </button>
        )
    }
)

Button.displayName = 'Button'