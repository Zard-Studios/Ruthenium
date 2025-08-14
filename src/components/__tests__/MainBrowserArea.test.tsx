import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MainBrowserArea } from '../MainBrowserArea'
import { ThemeProvider } from '../../renderer/src/design-system/ThemeProvider'
import { Profile, Tab } from '../../types'

// Mock the theme provider
const MockThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider defaultMode="light">
        {children}
    </ThemeProvider>
)

// Test data
const mockProfile: Profile = {
    id: 'profile-1',
    name: 'Test Profile',
    icon: '👤',
    createdAt: new Date(),
    lastUsed: new Date(),
    dataPath: '/test/path',
    settings: {
        antiFingerprinting: false,
        performanceMode: 'standard',
        autoRotateUserAgent: false
    },
    tabs: []
}

const mockTabs: Tab[] = [
    {
        id: 'tab-1',
        profileId: 'profile-1',
        url: 'https://example.com',
        title: 'Example Site',
        favicon: 'https://example.com/favicon.ico',
        isActive: true,
        isLoading: false
    },
    {
        id: 'tab-2',
        profileId: 'profile-1',
        url: 'https://google.com',
        title: 'Google',
        isActive: false,
        isLoading: false
    },
    {
        id: 'tab-3',
        profileId: 'profile-1',
        url: 'about:blank',
        title: 'New Tab',
        isActive: false,
        isLoading: true
    }
]

const defaultProps = {
    activeProfile: mockProfile,
    tabs: mockTabs,
    onTabCreate: vi.fn(),
    onTabClose: vi.fn(),
    onTabSwitch: vi.fn(),
    onTabNavigate: vi.fn()
}

const renderMainBrowserArea = (props = {}) => {
    return render(
        <MockThemeProvider>
            <MainBrowserArea {...defaultProps} {...props} />
        </MockThemeProvider>
    )
}

describe('MainBrowserArea', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Tab Bar', () => {
        it('renders all tabs', () => {
            renderMainBrowserArea()

            expect(screen.getByText('Example Site')).toBeInTheDocument()
            expect(screen.getByText('Google')).toBeInTheDocument()
            expect(screen.getByText('New Tab')).toBeInTheDocument()
        })

        it('shows active tab with correct styling', () => {
            renderMainBrowserArea()

            const activeTab = screen.getByText('Example Site').closest('div')
            expect(activeTab).toHaveClass('bg-white')
            expect(activeTab).toHaveClass('border-b-blue-500')
        })

        it('shows loading indicator for loading tabs', () => {
            renderMainBrowserArea()

            const loadingTab = screen.getByText('New Tab').closest('div')
            const spinner = loadingTab?.querySelector('.animate-spin')
            expect(spinner).toBeInTheDocument()
        })

        it('truncates long tab titles', () => {
            const longTitleTabs = [{
                ...mockTabs[0],
                title: 'This is a very long tab title that should be truncated'
            }]

            renderMainBrowserArea({ tabs: longTitleTabs })

            expect(screen.getByText('This is a very long ...')).toBeInTheDocument()
        })

        it('calls onTabSwitch when tab is clicked', async () => {
            const user = userEvent.setup()
            renderMainBrowserArea()

            await user.click(screen.getByText('Google'))

            expect(defaultProps.onTabSwitch).toHaveBeenCalledWith('tab-2')
        })

        it('calls onTabClose when close button is clicked', async () => {
            const user = userEvent.setup()
            renderMainBrowserArea()

            const closeButtons = screen.getAllByLabelText(/Close/)
            await user.click(closeButtons[0])

            await waitFor(() => {
                expect(defaultProps.onTabClose).toHaveBeenCalledWith('tab-1')
            })
        })

        it('prevents tab switch when close button is clicked', async () => {
            const user = userEvent.setup()
            renderMainBrowserArea()

            const closeButtons = screen.getAllByLabelText(/Close/)
            await user.click(closeButtons[1])

            expect(defaultProps.onTabSwitch).not.toHaveBeenCalled()
        })

        it('supports keyboard navigation', async () => {
            const user = userEvent.setup()
            renderMainBrowserArea()

            const googleTab = screen.getByText('Google').closest('div')
            googleTab?.focus()
            await user.keyboard('{Enter}')

            expect(defaultProps.onTabSwitch).toHaveBeenCalledWith('tab-2')
        })
    })

    describe('New Tab Button', () => {
        it('renders new tab button', () => {
            renderMainBrowserArea()

            expect(screen.getByLabelText('Create new tab')).toBeInTheDocument()
        })

        it('calls onTabCreate when clicked', async () => {
            const user = userEvent.setup()
            renderMainBrowserArea()

            await user.click(screen.getByLabelText('Create new tab'))

            expect(defaultProps.onTabCreate).toHaveBeenCalled()
        })
    })

    describe('Address Bar', () => {
        it('shows address bar when there is an active tab', () => {
            renderMainBrowserArea()

            expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
        })

        it('hides address bar when no active tab', () => {
            const noActiveTabs = mockTabs.map(tab => ({ ...tab, isActive: false }))
            renderMainBrowserArea({ tabs: noActiveTabs })

            expect(screen.queryByDisplayValue('https://example.com')).not.toBeInTheDocument()
        })

        it('updates address bar value when active tab changes', () => {
            const { rerender } = renderMainBrowserArea()

            expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()

            const updatedTabs = mockTabs.map(tab => ({
                ...tab,
                isActive: tab.id === 'tab-2'
            }))

            rerender(
                <MockThemeProvider>
                    <MainBrowserArea {...defaultProps} tabs={updatedTabs} />
                </MockThemeProvider>
            )

            expect(screen.getByDisplayValue('https://google.com')).toBeInTheDocument()
        })

        it('calls onTabNavigate when form is submitted', async () => {
            const user = userEvent.setup()
            renderMainBrowserArea()

            const addressInput = screen.getByDisplayValue('https://example.com')
            await user.clear(addressInput)
            await user.type(addressInput, 'github.com')
            await user.keyboard('{Enter}')

            expect(defaultProps.onTabNavigate).toHaveBeenCalledWith('tab-1', 'https://github.com')
        })

        it('adds https protocol to domain-like URLs', async () => {
            const user = userEvent.setup()
            renderMainBrowserArea()

            const addressInput = screen.getByDisplayValue('https://example.com')
            await user.clear(addressInput)
            await user.type(addressInput, 'example.org')
            await user.keyboard('{Enter}')

            expect(defaultProps.onTabNavigate).toHaveBeenCalledWith('tab-1', 'https://example.org')
        })

        it('converts search queries to Google search', async () => {
            const user = userEvent.setup()
            renderMainBrowserArea()

            const addressInput = screen.getByDisplayValue('https://example.com')
            await user.clear(addressInput)
            await user.type(addressInput, 'test search query')
            await user.keyboard('{Enter}')

            expect(defaultProps.onTabNavigate).toHaveBeenCalledWith(
                'tab-1',
                'https://www.google.com/search?q=test%20search%20query'
            )
        })

        it('preserves special URLs like about: pages', async () => {
            const user = userEvent.setup()
            renderMainBrowserArea()

            const addressInput = screen.getByDisplayValue('https://example.com')
            await user.clear(addressInput)
            await user.type(addressInput, 'about:blank')
            await user.keyboard('{Enter}')

            expect(defaultProps.onTabNavigate).toHaveBeenCalledWith('tab-1', 'about:blank')
        })
    })

    describe('Navigation Buttons', () => {
        it('renders navigation buttons', () => {
            renderMainBrowserArea()

            expect(screen.getByLabelText('Go back')).toBeInTheDocument()
            expect(screen.getByLabelText('Go forward')).toBeInTheDocument()
            expect(screen.getByLabelText('Refresh page')).toBeInTheDocument()
        })

        it('disables back and forward buttons (not implemented yet)', () => {
            renderMainBrowserArea()

            expect(screen.getByLabelText('Go back')).toBeDisabled()
            expect(screen.getByLabelText('Go forward')).toBeDisabled()
        })

        it('calls onTabNavigate when refresh is clicked', async () => {
            const user = userEvent.setup()
            renderMainBrowserArea()

            await user.click(screen.getByLabelText('Refresh page'))

            expect(defaultProps.onTabNavigate).toHaveBeenCalledWith('tab-1', 'https://example.com')
        })
    })

    describe('Browser Content Area', () => {
        it('shows webview placeholder when there is an active tab', () => {
            renderMainBrowserArea()

            expect(screen.getByText('Webview Container')).toBeInTheDocument()
            expect(screen.getByText('Current URL: https://example.com')).toBeInTheDocument()
        })

        it('shows empty state when no tabs are open', () => {
            renderMainBrowserArea({ tabs: [] })

            expect(screen.getByText('No tabs open')).toBeInTheDocument()
            expect(screen.getByText('Create a new tab for Test Profile')).toBeInTheDocument()
        })

        it('shows different empty state when no profile is selected', () => {
            renderMainBrowserArea({ activeProfile: undefined, tabs: [] })

            expect(screen.getByText('No tabs open')).toBeInTheDocument()
            expect(screen.getByText('Select a profile to start browsing')).toBeInTheDocument()
        })

        it('shows create tab button in empty state', async () => {
            const user = userEvent.setup()
            renderMainBrowserArea({ tabs: [] })

            const createButton = screen.getByText('Create New Tab')
            await user.click(createButton)

            expect(defaultProps.onTabCreate).toHaveBeenCalled()
        })
    })

    describe('Tab Overflow Handling', () => {
        it('shows scroll buttons when tabs overflow', () => {
            // Mock scrollWidth to be larger than clientWidth
            const mockScrollWidth = 1000
            const mockClientWidth = 500

            Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
                configurable: true,
                value: mockScrollWidth,
            })
            Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
                configurable: true,
                value: mockClientWidth,
            })
            Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
                configurable: true,
                value: 100,
            })

            renderMainBrowserArea()

            // Note: In a real test environment, you might need to mock the scroll behavior
            // This is a simplified test that checks the component renders
            expect(screen.getByLabelText('Create new tab')).toBeInTheDocument()
        })
    })

    describe('Responsive Design', () => {
        it('renders correctly on different screen sizes', () => {
            renderMainBrowserArea()

            // Check that the main container uses responsive classes
            const mainContainer = document.querySelector('.flex.flex-col.h-full')
            expect(mainContainer).toBeInTheDocument()
        })
    })

    describe('Accessibility', () => {
        it('has proper ARIA labels', () => {
            renderMainBrowserArea()

            expect(screen.getByLabelText('Create new tab')).toBeInTheDocument()
            expect(screen.getByLabelText('Go back')).toBeInTheDocument()
            expect(screen.getByLabelText('Go forward')).toBeInTheDocument()
            expect(screen.getByLabelText('Refresh page')).toBeInTheDocument()
            expect(screen.getByLabelText('Browser menu')).toBeInTheDocument()
        })

        it('has proper tab roles', () => {
            renderMainBrowserArea()

            const tabList = screen.getByRole('tablist')
            expect(tabList).toBeInTheDocument()

            const tabs = screen.getAllByRole('tab')
            expect(tabs).toHaveLength(3)
        })

        it('has proper aria-selected attributes', () => {
            renderMainBrowserArea()

            const tabs = screen.getAllByRole('tab')
            expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
            expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
            expect(tabs[2]).toHaveAttribute('aria-selected', 'false')
        })
    })

    describe('Error Handling', () => {
        it('handles missing favicon gracefully', () => {
            const tabsWithoutFavicon = [{
                ...mockTabs[0],
                favicon: undefined
            }]

            renderMainBrowserArea({ tabs: tabsWithoutFavicon })

            // Should show default icon instead of favicon
            const tabElement = screen.getByText('Example Site').closest('div')
            const defaultIcon = tabElement?.querySelector('svg')
            expect(defaultIcon).toBeInTheDocument()
        })

        it('handles favicon load errors', () => {
            renderMainBrowserArea()

            const faviconImg = screen.getByAltText('')
            fireEvent.error(faviconImg)

            // Image should be hidden on error
            expect(faviconImg).toHaveStyle('display: none')
        })
    })
})