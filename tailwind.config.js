/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
        "./src/components/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#e6f3ff',
                    100: '#b3d9ff',
                    200: '#80bfff',
                    300: '#4da6ff',
                    400: '#1a8cff',
                    500: '#0078d4',
                    600: '#0066b3',
                    700: '#005499',
                    800: '#004280',
                    900: '#003066',
                },
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
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', '"Fira Sans"', '"Droid Sans"', '"Helvetica Neue"', 'sans-serif'],
                mono: ['"SF Mono"', 'Monaco', 'Inconsolata', '"Roboto Mono"', '"Source Code Pro"', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-in-out',
                'slide-up': 'slideUp 0.2s ease-out',
                'slide-down': 'slideDown 0.2s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
}