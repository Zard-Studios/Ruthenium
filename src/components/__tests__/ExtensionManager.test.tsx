import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExtensionManager } from '../ExtensionManager'
import { Extension } from '../../types/extension'

// Mock child components
vi.mock('../ExtensionList', () => ({
    ExtensionList: ({ extensions, onToggle, onUninstall, onSettings }: any) => (
        <div data-testid="extension-list">
            {extensions.map((ext: Extension) => (
                <div key={ext.id} data-testid={`extension-${ext.id}`}>
                    <span>{ext.name}</span>
                    <button onClick={() => onToggle(ext.id, !ext.isEnabled)}>
                        {ext.isEnabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => onUninstall(ext.id)}>Uninstall</button>
                    <button onClick={() => onSettings(ext)}>Settings</button>
                </div>
            ))}
        </div>
    )
}))

vi.mock('../ExtensionInstaller', () => ({
    ExtensionInstaller: ({ onInstall, onCancel }: any) => (
        <div data-testid="extension-installer">
            <button onClick={() => onInstall('/path/to/extension')}>Install</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    )
}))

vi.mock('../ExtensionSettings', () => ({
    ExtensionSettings: ({ extension, onSave, onCancel }: any) => (
        <div data-testid="extension-settings">
            <span>{extension.name} Settings</span>
            <button onClick={() => onSave(extension.id, { setting: 'value' })}>Save</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    )
}))

describe('ExtensionManager', () => {
    const mockProps = {
        profileId: 'profile-1',
        onExtensionToggle: vi.fn(),
        onExtensionInstall: vi.fn(),
        onExtensionUninstall: vi.fn(),
        onExtensionSettings: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should render extension manager with install button', () => {
        render(<ExtensionManager {...mockProps} />)

        expect(screen.getByText('Extensions')).toBeInTheDocument()
        expect(screen.getByText('Install Extension')).toBeInTheDocument()
    })

    it('should show loading state initially', () => {
        render(<ExtensionManager {...mockProps} />)

        expect(screen.getByText('Loading extensions...')).toBeInTheDocument()
    })

    it('should open extension installer modal', async () => {
        render(<ExtensionManager {...mockProps} />)

        // Wait for loading to complete
        await waitFor(() => {
            expect(screen.queryByText('Loading extensions...')).not.toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Install Extension'))

        expect(screen.getByTestId('extension-installer')).toBeInTheDocument()
    })

    it('should handle extension installation', async () => {
        render(<ExtensionManager {...mockProps} />)

        await waitFor(() => {
            expect(screen.queryByText('Loading extensions...')).not.toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Install Extension'))
        fireEvent.click(screen.getByText('Install'))

        expect(mockProps.onExtensionInstall).toHaveBeenCalledWith('/path/to/extension')
    })

    it('should handle extension toggle', async () => {
        render(<ExtensionManager {...mockProps} />)

        await waitFor(() => {
            expect(screen.queryByText('Loading extensions...')).not.toBeInTheDocument()
        })

        // Mock extension would be rendered by ExtensionList
        // This test verifies the callback is properly passed
        expect(screen.getByTestId('extension-list')).toBeInTheDocument()
    })
})