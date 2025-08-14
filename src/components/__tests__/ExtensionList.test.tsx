import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExtensionList } from '../ExtensionList'
import { Extension } from '../../types/extension'

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
    writable: true,
    value: vi.fn()
})

describe('ExtensionList', () => {
    const mockExtensions: Extension[] = [
        {
            id: 'ext-1',
            name: 'Test Extension 1',
            version: '1.0.0',
            description: 'A test extension',
            author: 'Test Author',
            manifestVersion: 2,
            permissions: ['tabs', 'storage'],
            icons: { '48': 'icon48.png' },
            isEnabled: true,
            installDate: new Date('2023-01-01')
        },
        {
            id: 'ext-2',
            name: 'Test Extension 2',
            version: '2.0.0',
            description: 'Another test extension',
            author: 'Another Author',
            manifestVersion: 2,
            permissions: ['cookies'],
            icons: {},
            isEnabled: false,
            installDate: new Date('2023-02-01')
        }
    ]

    const mockProps = {
        extensions: mockExtensions,
        onToggle: vi.fn(),
        onUninstall: vi.fn(),
        onSettings: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(window.confirm).mockReturnValue(true)
    })

    it('should render extension list', () => {
        render(<ExtensionList {...mockProps} />)

        expect(screen.getByText('Test Extension 1')).toBeInTheDocument()
        expect(screen.getByText('Test Extension 2')).toBeInTheDocument()
        expect(screen.getByText('v1.0.0')).toBeInTheDocument()
        expect(screen.getByText('v2.0.0')).toBeInTheDocument()
    })

    it('should show empty state when no extensions', () => {
        render(<ExtensionList {...mockProps} extensions={[]} />)

        expect(screen.getByText('No extensions installed for this profile')).toBeInTheDocument()
        expect(screen.getByText('Install extensions to enhance your browsing experience')).toBeInTheDocument()
    })

    it('should display extension details correctly', () => {
        render(<ExtensionList {...mockProps} />)

        expect(screen.getByText('A test extension')).toBeInTheDocument()
        expect(screen.getByText('By Test Author')).toBeInTheDocument()
        expect(screen.getByText('2 permissions')).toBeInTheDocument()
        expect(screen.getByText('1 permissions')).toBeInTheDocument()
    })

    it('should handle extension toggle', () => {
        render(<ExtensionList {...mockProps} />)

        const toggles = screen.getAllByRole('checkbox')
        fireEvent.click(toggles[0]) // Toggle first extension

        expect(mockProps.onToggle).toHaveBeenCalledWith('ext-1', false) // Should disable enabled extension
    })

    it('should handle extension settings', () => {
        render(<ExtensionList {...mockProps} />)

        const settingsButtons = screen.getAllByTitle('Extension Settings')
        fireEvent.click(settingsButtons[0])

        expect(mockProps.onSettings).toHaveBeenCalledWith(mockExtensions[0])
    })

    it('should handle extension uninstall with confirmation', () => {
        render(<ExtensionList {...mockProps} />)

        const uninstallButtons = screen.getAllByTitle('Uninstall Extension')
        fireEvent.click(uninstallButtons[0])

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to uninstall "Test Extension 1"?')
        expect(mockProps.onUninstall).toHaveBeenCalledWith('ext-1')
    })

    it('should not uninstall if user cancels confirmation', () => {
        vi.mocked(window.confirm).mockReturnValue(false)
        render(<ExtensionList {...mockProps} />)

        const uninstallButtons = screen.getAllByTitle('Uninstall Extension')
        fireEvent.click(uninstallButtons[0])

        expect(window.confirm).toHaveBeenCalled()
        expect(mockProps.onUninstall).not.toHaveBeenCalled()
    })

    it('should show correct enabled/disabled status', () => {
        render(<ExtensionList {...mockProps} />)

        const enabledStatus = screen.getAllByText('Enabled')
        const disabledStatus = screen.getAllByText('Disabled')

        expect(enabledStatus).toHaveLength(1)
        expect(disabledStatus).toHaveLength(1)
    })

    it('should display extension icons or fallback', () => {
        render(<ExtensionList {...mockProps} />)

        // First extension has icon
        expect(screen.getByAltText('Test Extension 1')).toBeInTheDocument()

        // Second extension has no icon, should show fallback
        expect(screen.getByText('EXT')).toBeInTheDocument()
    })
})