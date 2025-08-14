import React, { forwardRef } from 'react'
import { useTheme } from '../../design-system/ThemeProvider'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    icon: React.ReactNode
    'aria-label': string // Required for accessibility
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({
        variant = 'default',
        size = 'md',
        loading = false,
        icon,
        className = '',
        disabled,
        ...props
    }, ref) => {
        const { tokens } = useTheme()

        const baseStyles = `
      inline-flex items-center justify-center rounded-lg
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${loading ? 'cursor-wait' : ''}
    `

        const variantStyles = {
            default: `
        bg-gray-100 hover:bg-gray-200 active:bg-gray-300
        text-gray-700 border border-transparent
        focus:ring-gray-500
        dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500
        dark:text-gray-300
      `,
            primary: `
        bg-blue-500 hover:bg-blue-600 active:bg-blue-700
        text-white border border-transparent
        focus:ring-blue-500
      `,
            secondary: `
        bg-gray-200 hover:bg-gray-300 active:bg-gray-400
        text-gray-800 border border-transparent
        focus:ring-gray-500
        dark:bg-gray-600 dark:hover:bg-gray-500 dark:active:bg-gray-400
        dark:text-gray-200
      `,
            ghost: `
        bg-transparent hover:bg-gray-100 active:bg-gray-200
        text-gray-600 border border-transparent
        focus:ring-gray-500
        dark:hover:bg-gray-800 dark:active:bg-gray-700
        dark:text-gray-400
      `,
            danger: `
        bg-red-500 hover:bg-red-600 active:bg-red-700
        text-white border border-transparent
        focus:ring-red-500
      `,
        }

        const sizeStyles = {
            sm: 'w-8 h-8 text-sm',
            md: 'w-10 h-10 text-base',
            lg: 'w-12 h-12 text-lg',
        }

        const iconSizeStyles = {
            sm: 'w-4 h-4',
            md: 'w-5 h-5',
            lg: 'w-6 h-6',
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
                {loading ? (
                    <svg
                        className={`animate-spin ${iconSizeStyles[size]}`}
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
                ) : (
                    <div className={iconSizeStyles[size]}>
                        {icon}
                    </div>
                )}
            </button>
        )
    }
)

IconButton.displayName = 'IconButton'