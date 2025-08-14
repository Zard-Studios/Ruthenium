import React from 'react'
import { useTheme } from '../../design-system/ThemeProvider'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'outlined' | 'elevated'
    padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({
    variant = 'default',
    padding = 'md',
    className = '',
    children,
    ...props
}: CardProps) {
    const { tokens } = useTheme()

    const baseStyles = `
    rounded-lg transition-all duration-200 ease-in-out
  `

    const variantStyles = {
        default: `
      bg-white dark:bg-gray-800
      border border-gray-200 dark:border-gray-700
    `,
        outlined: `
      bg-transparent
      border-2 border-gray-300 dark:border-gray-600
    `,
        elevated: `
      bg-white dark:bg-gray-800
      shadow-lg hover:shadow-xl
      border border-gray-100 dark:border-gray-700
    `,
    }

    const paddingStyles = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    }

    const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    ${className}
  `.trim().replace(/\s+/g, ' ')

    return (
        <div className={combinedClassName} {...props}>
            {children}
        </div>
    )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mb-4 ${className}`}>
            {children}
        </div>
    )
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            {children}
        </div>
    )
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${className}`}>
            {children}
        </div>
    )
}