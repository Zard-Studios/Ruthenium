/**
 * Design tokens for Ruthenium Browser
 * Based on modern design principles with support for dark/light themes
 */

export const DESIGN_TOKENS = {
  colors: {
    // Primary brand colors
    primary: {
      50: '#e6f3ff',
      100: '#b3d9ff',
      200: '#80bfff',
      300: '#4da6ff',
      400: '#1a8cff',
      500: '#0078d4', // Main brand color
      600: '#0066b3',
      700: '#005499',
      800: '#004280',
      900: '#003066',
    },
    
    // Secondary accent colors
    secondary: {
      50: '#f0f2ff',
      100: '#d6dcff',
      200: '#bcc6ff',
      300: '#a2b0ff',
      400: '#889aff',
      500: '#6b73ff',
      600: '#5a62e6',
      700: '#4951cc',
      800: '#3840b3',
      900: '#272f99',
    },
    
    // Semantic colors
    success: {
      50: '#e6f7e6',
      100: '#b3e6b3',
      200: '#80d580',
      300: '#4dc44d',
      400: '#1ab31a',
      500: '#107c10',
      600: '#0e6b0e',
      700: '#0c5a0c',
      800: '#0a490a',
      900: '#083808',
    },
    
    warning: {
      50: '#fff4e6',
      100: '#ffe0b3',
      200: '#ffcc80',
      300: '#ffb84d',
      400: '#ffa41a',
      500: '#ff8c00',
      600: '#e67a00',
      700: '#cc6800',
      800: '#b35600',
      900: '#994400',
    },
    
    error: {
      50: '#ffeaea',
      100: '#ffbfbf',
      200: '#ff9494',
      300: '#ff6969',
      400: '#ff3e3e',
      500: '#d13438',
      600: '#b82d31',
      700: '#9f262a',
      800: '#861f23',
      900: '#6d181c',
    },
    
    // Neutral grays
    gray: {
      50: '#f8f9fa',
      100: '#f1f3f4',
      200: '#e8eaed',
      300: '#dadce0',
      400: '#bdc1c6',
      500: '#9aa0a6',
      600: '#80868b',
      700: '#5f6368',
      800: '#3c4043',
      900: '#202124',
    },
    
    // Theme-specific colors
    light: {
      background: '#ffffff',
      surface: '#f8f9fa',
      surfaceVariant: '#f1f3f4',
      onBackground: '#202124',
      onSurface: '#3c4043',
      onSurfaceVariant: '#5f6368',
      border: '#dadce0',
      borderVariant: '#e8eaed',
    },
    
    dark: {
      background: '#121212',
      surface: '#1e1e1e',
      surfaceVariant: '#2d2d2d',
      onBackground: '#ffffff',
      onSurface: '#e0e0e0',
      onSurfaceVariant: '#a0a0a0',
      border: '#404040',
      borderVariant: '#333333',
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px',
  },
  
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },
  
  typography: {
    fontFamily: {
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
      mono: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", monospace',
    },
    
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px',
    },
    
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  
  transitions: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
    },
    
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const

export type DesignTokens = typeof DESIGN_TOKENS