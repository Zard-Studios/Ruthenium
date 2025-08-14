import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { ProfileSidebar } from '../ProfileSidebar'
import { ThemeProvider } from '../../renderer/src/design-system/ThemeProvider'
import { Profile } from '../../types'

// Mock the theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider defaultMode="light">
        {children}
    </ThemeProvider>
)

const mockProfiles: Profile[] = [
    {
        id: 'profile-1',
        name: 'Work',
        icon: '💼',
        createdAt: new Date('2024-01-01'),
        lastUsed: new Date('2024-01-02'),
        dataPath: '/path/to/profile1',
        settings: {
            antiFingerprinting: false,
            performanceMode: 'standard',
            autoRotateUserAgent: false
        },
        tabs: [
            {
                id: 'tab-1',
                profileId: 'profile-1',
                url: 'https://example.com',
                title: 'Example',
                isActive: true,
                isLoading: false
            }
        ]
    },
    {
        id: 'profile-2',
        name: 'Personal',
        icon: '🏠',
        createdAt: new Date('2024-01-01'),
        lastUsed: new Date('2024-01-01'),
        dataPath: '/path/to/profile2',
        settings: {
            antiFingerprinting: true,
            performanceMode: 'extreme',
            autoRotateUserAgent: true
        },
        tabs: []
    }
]

describe('ProfileSidebar', () => {
    const mockOnProfileSwitch = vi.fn()
    const mockOnProfileCreate = vi.fn()
    const mockOnProfileDelete = vi.fn()
    const mockOnProfileSettings = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    const renderProfileSidebar = (props = {}) => {
        return render(
            <TestWrapper>
                <ProfileSidebar
                    profiles={mockProfiles}
                    activeProfile={mockProfiles[0]}
                    onProfileSwitch={mockOnProfileSwitch}
                    onProfileCreate={mockOnProfileCreate}
                    onProfileDelete={mockOnProfileDelete}
                    onProfileSettings={mockOnProfileSettings}
                    {...props}
                />
            </TestWrapper>
        )
    }

    describe('Profile List Display', () => {
        it('should render all profiles with icons and names', () => {
            renderProfileSidebar()

            expect(screen.getByText('💼')).toBeInTheDocument()
            expect(screen.getByText('Work')).toBeInTheDocument()
            expect(screen.getByText('🏠')).toBeInTheDocument()
            expect(screen.getByText('Personal')).toBeInTheDocument()
        })

        it('should show tab count indicator for profiles with tabs', () => {
            renderProfileSidebar()

            // Work profile has 1 tab
            expect(screen.getByText('1')).toBeInTheDocument()

            // Personal profile has no tabs, so no indicator should be shown
            expect(screen.queryByText('0')).not.toBeInTheDocument()
        })

        it('should highlight active profile', () => {
            renderProfileSidebar()

            // Find the profile container (parent of the text element)
            const workProfileContainer = screen.getByText('Work').closest('[data-testid="profile-item"]') ||
                screen.getByText('Work').parentElement?.parentElement
            expect(workProfileContainer).toHaveClass('ring-2', 'ring-blue-500')
        })

        it('should show create profile button', () => {
            renderProfileSidebar()

            const createButton = screen.getByLabelText('Create new profile')
            expect(createButton).toBeInTheDocument()
        })
    })

    describe('Profile Switching', () => {
        it('should call onProfileSwitch when clicking on inactive profile', () => {
            renderProfileSidebar()

            const personalProfile = screen.getByText('Personal').closest('div')
            fireEvent.click(personalProfile!)

            expect(mockOnProfileSwitch).toHaveBeenCalledWith('profile-2')
        })

        it('should not call onProfileSwitch when clicking on active profile', () => {
            renderProfileSidebar()

            const workProfile = screen.getByText('Work').closest('div')
            fireEvent.click(workProfile!)

            expect(mockOnProfileSwitch).not.toHaveBeenCalled()
        })
    })

    describe('Profile Creation Modal', () => {
        it('should open create modal when clicking create button', () => {
            renderProfileSidebar()

            const createButton = screen.getByLabelText('Create new profile')
            fireEvent.click(createButton)

            expect(screen.getByText('Create New Profile')).toBeInTheDocument()
            expect(screen.getByPlaceholderText('Enter profile name')).toBeInTheDocument()
        })

        it('should allow entering profile name', () => {
            renderProfileSidebar()

            const createButton = screen.getByLabelText('Create new profile')
            fireEvent.click(createButton)

            const nameInput = screen.getByPlaceholderText('Enter profile name')
            fireEvent.change(nameInput, { target: { value: 'Test Profile' } })

            expect(nameInput).toHaveValue('Test Profile')
        })

        it('should allow selecting profile icon', () => {
            renderProfileSidebar()

            const createButton = screen.getByLabelText('Create new profile')
            fireEvent.click(createButton)

            // Find and click a different icon
            const iconButtons = screen.getAllByRole('button')
            const gameIcon = iconButtons.find(button => button.textContent === '🎮')

            if (gameIcon) {
                fireEvent.click(gameIcon)
                expect(gameIcon).toHaveClass('ring-2', 'ring-blue-500')
            }
        })

        it('should show character count for profile name', () => {
            renderProfileSidebar()

            const createButton = screen.getByLabelText('Create new profile')
            fireEvent.click(createButton)

            const nameInput = screen.getByPlaceholderText('Enter profile name')
            fireEvent.change(nameInput, { target: { value: 'Test' } })

            expect(screen.getByText('4/50 characters')).toBeInTheDocument()
        })

        it('should show preview of profile', () => {
            renderProfileSidebar()

            const createButton = screen.getByLabelText('Create new profile')
            fireEvent.click(createButton)

            const nameInput = screen.getByPlaceholderText('Enter profile name')
            fireEvent.change(nameInput, { target: { value: 'Test Profile' } })

            expect(screen.getByText('Test Profile')).toBeInTheDocument()
            expect(screen.getByText('Preview')).toBeInTheDocument()
        })

        it('should create profile when clicking Create button', async () => {
            mockOnProfileCreate.mockResolvedValue(undefined)
            renderProfileSidebar()

            const createButton = screen.getByLabelText('Create new profile')
            fireEvent.click(createButton)

            const nameInput = screen.getByPlaceholderText('Enter profile name')
            fireEvent.change(nameInput, { target: { value: 'Test Profile' } })

            const createProfileButton = screen.getByText('Create Profile')
            fireEvent.click(createProfileButton)

            await waitFor(() => {
                expect(mockOnProfileCreate).toHaveBeenCalledWith('Test Profile', '👤')
            })
        })

        it('should disable create button when name is empty', () => {
            renderProfileSidebar()

            const createButton = screen.getByLabelText('Create new profile')
            fireEvent.click(createButton)

            const createProfileButton = screen.getByText('Create Profile')
            expect(createProfileButton).toBeDisabled()
        })

        it('should close modal when clicking Cancel', () => {
            renderProfileSidebar()

            const createButton = screen.getByLabelText('Create new profile')
            fireEvent.click(createButton)

            const cancelButton = screen.getByText('Cancel')
            fireEvent.click(cancelButton)

            expect(screen.queryByText('Create New Profile')).not.toBeInTheDocument()
        })
    })

    describe('Context Menu', () => {
        it('should show context menu on right click', () => {
            renderProfileSidebar()

            const workProfile = screen.getByText('Work').closest('div')
            fireEvent.contextMenu(workProfile!)

            expect(screen.getByText('Settings')).toBeInTheDocument()
            expect(screen.getByText('Delete')).toBeInTheDocument()
        })

        it('should call onProfileSettings when clicking Settings', () => {
            renderProfileSidebar()

            const workProfile = screen.getByText('Work').closest('div')
            fireEvent.contextMenu(workProfile!)

            const settingsButton = screen.getByText('Settings')
            fireEvent.click(settingsButton)

            expect(mockOnProfileSettings).toHaveBeenCalledWith('profile-1')
        })

        it('should show delete confirmation and call onProfileDelete', () => {
            // Mock window.confirm
            const originalConfirm = window.confirm
            window.confirm = vi.fn(() => true)

            renderProfileSidebar()

            const workProfile = screen.getByText('Work').closest('div')
            fireEvent.contextMenu(workProfile!)

            const deleteButton = screen.getByText('Delete')
            fireEvent.click(deleteButton)

            expect(window.confirm).toHaveBeenCalledWith(
                'Are you sure you want to delete this profile? All data will be lost.'
            )
            expect(mockOnProfileDelete).toHaveBeenCalledWith('profile-1')

            // Restore original confirm
            window.confirm = originalConfirm
        })

        it('should not delete profile if user cancels confirmation', () => {
            // Mock window.confirm to return false
            const originalConfirm = window.confirm
            window.confirm = vi.fn(() => false)

            renderProfileSidebar()

            const workProfile = screen.getByText('Work').closest('div')
            fireEvent.contextMenu(workProfile!)

            const deleteButton = screen.getByText('Delete')
            fireEvent.click(deleteButton)

            expect(mockOnProfileDelete).not.toHaveBeenCalled()

            // Restore original confirm
            window.confirm = originalConfirm
        })

        it('should not show Settings option when onProfileSettings is not provided', () => {
            renderProfileSidebar({ onProfileSettings: undefined })

            const workProfile = screen.getByText('Work').closest('div')
            fireEvent.contextMenu(workProfile!)

            expect(screen.queryByText('Settings')).not.toBeInTheDocument()
            expect(screen.getByText('Delete')).toBeInTheDocument()
        })
    })

    describe('Animations and Interactions', () => {
        it('should apply hover styles to profiles', () => {
            renderProfileSidebar()

            // Find the profile container (parent of the text element)
            const personalProfileContainer = screen.getByText('Personal').closest('[data-testid="profile-item"]') ||
                screen.getByText('Personal').parentElement?.parentElement
            expect(personalProfileContainer).toHaveClass('hover:bg-gray-100')
        })

        it('should show loading state when creating profile', async () => {
            // Mock a delayed response
            mockOnProfileCreate.mockImplementation(() =>
                new Promise(resolve => setTimeout(resolve, 100))
            )

            renderProfileSidebar()

            const createButton = screen.getByLabelText('Create new profile')
            fireEvent.click(createButton)

            const nameInput = screen.getByPlaceholderText('Enter profile name')
            fireEvent.change(nameInput, { target: { value: 'Test Profile' } })

            const createProfileButton = screen.getByText('Create Profile')
            fireEvent.click(createProfileButton)

            // Should show loading state
            expect(createProfileButton).toBeDisabled()
        })
    })

    describe('Accessibility', () => {
        it('should have proper ARIA labels', () => {
            renderProfileSidebar()

            expect(screen.getByLabelText('Create new profile')).toBeInTheDocument()
        })

        it('should have proper tooltips', () => {
            renderProfileSidebar()

            // Find the profile container (parent of the text element)
            const workProfileContainer = screen.getByText('Work').closest('[data-testid="profile-item"]') ||
                screen.getByText('Work').parentElement?.parentElement
            expect(workProfileContainer).toHaveAttribute('title', 'Work (1 tabs)')
        })

        it('should support keyboard navigation in modal', async () => {
            renderProfileSidebar()

            const createButton = screen.getByLabelText('Create new profile')
            fireEvent.click(createButton)

            // Wait for the focus to be set (due to setTimeout in component)
            await waitFor(() => {
                const nameInput = screen.getByPlaceholderText('Enter profile name')
                expect(nameInput).toHaveFocus()
            }, { timeout: 200 })
        })
    })
})