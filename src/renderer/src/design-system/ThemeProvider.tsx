import React, { createContext, useContext, useEffect, useState } from 'react'
import { DESIGN_TOKENS } from './tokens'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
    mode: ThemeMode
    resolvedMode: 'light' | 'dark'
    setMode: (mode: ThemeMode) => void
    tokens: typeof DESIGN_TOKENS
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

interface ThemeProviderProps {
    children: React.ReactNode
    defaultMode?: ThemeMode
}

export function ThemeProvider({ children, defaultMode = 'system' }: ThemeProviderProps) {
    const [mode, setMode] = useState<ThemeMode>(() => {
        // Try to get saved theme from localStorage
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ruthenium-theme')
            if (saved && ['light', 'dark', 'system'].includes(saved)) {
                return saved as ThemeMode
            }
        }
        return defaultMode
    })

    const [systemPrefersDark, setSystemPrefersDark] = useState(false)

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        setSystemPrefersDark(mediaQuery.matches)

        const handleChange = (e: MediaQueryListEvent) => {
            setSystemPrefersDark(e.matches)
        }

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    // Save theme preference to localStorage
    useEffect(() => {
        localStorage.setItem('ruthenium-theme', mode)
    }, [mode])

    // Determine the resolved theme mode
    const resolvedMode: 'light' | 'dark' =
        mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode

    // Apply theme to document root
    useEffect(() => {
        const root = document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(resolvedMode)

        // Set CSS custom properties for the current theme
        const themeColors = DESIGN_TOKENS.colors[resolvedMode]
        Object.entries(themeColors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value)
        })

        // Set other design tokens as CSS custom properties
        Object.entries(DESIGN_TOKENS.spacing).forEach(([key, value]) => {
            root.style.setProperty(`--spacing-${key}`, value)
        })

        Object.entries(DESIGN_TOKENS.borderRadius).forEach(([key, value]) => {
            root.style.setProperty(`--radius-${key}`, value)
        })

        Object.entries(DESIGN_TOKENS.shadows).forEach(([key, value]) => {
            root.style.setProperty(`--shadow-${key}`, value)
        })
    }, [resolvedMode])

    const value: ThemeContextValue = {
        mode,
        resolvedMode,
        setMode,
        tokens: DESIGN_TOKENS,
    }

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}