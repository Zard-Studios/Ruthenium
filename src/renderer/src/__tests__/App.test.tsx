import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

// Mock the electron API
Object.defineProperty(window, 'electronAPI', {
    value: {
        createProfile: vi.fn(),
        deleteProfile: vi.fn(),
        switchProfile: vi.fn(),
        getAllProfiles: vi.fn(),
        createTab: vi.fn(),
        closeTab: vi.fn(),
        navigateTab: vi.fn(),
        onProfileChanged: vi.fn(),
        onTabUpdated: vi.fn()
    }
})

describe('App', () => {
    it('renders the main heading', () => {
        render(<App />)
        expect(screen.getByText('Ruthenium Browser')).toBeInTheDocument()
    })

    it('renders the description', () => {
        render(<App />)
        expect(screen.getByText('Multi-profile Firefox-based browser')).toBeInTheDocument()
    })
})