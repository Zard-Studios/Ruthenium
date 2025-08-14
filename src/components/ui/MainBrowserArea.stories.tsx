import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { MainBrowserArea } from '../MainBrowserArea'
import { ThemeProvider } from '../../renderer/src/design-system/ThemeProvider'
import { Profile, Tab } from '../../types'

const meta: Meta<typeof MainBrowserArea> = {
    title: 'Components/MainBrowserArea',
    component: MainBrowserArea,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story) => (
            <ThemeProvider defaultMode="light">
                <div style={{ height: '100vh' }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    argTypes: {
        onTabCreate: { action: 'tab created' },
        onTabClose: { action: 'tab closed' },
        onTabSwitch: { action: 'tab switched' },
        onTabNavigate: { action: 'tab navigated' },
    },
}

export default meta
type Story = StoryObj<typeof MainBrowserArea>

// Mock data
const mockProfile: Profile = {
    id: 'profile-1',
    name: 'Work Profile',
    icon: '💼',
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
        url: 'https://github.com',
        title: 'GitHub',
        favicon: 'https://github.com/favicon.ico',
        isActive: true,
        isLoading: false
    },
    {
        id: 'tab-2',
        profileId: 'profile-1',
        url: 'https://stackoverflow.com',
        title: 'Stack Overflow',
        favicon: 'https://stackoverflow.com/favicon.ico',
        isActive: false,
        isLoading: false
    },
    {
        id: 'tab-3',
        profileId: 'profile-1',
        url: 'https://developer.mozilla.org',
        title: 'MDN Web Docs',
        isActive: false,
        isLoading: true
    }
]

const manyTabs: Tab[] = [
    ...mockTabs,
    {
        id: 'tab-4',
        profileId: 'profile-1',
        url: 'https://react.dev',
        title: 'React Documentation',
        isActive: false,
        isLoading: false
    },
    {
        id: 'tab-5',
        profileId: 'profile-1',
        url: 'https://vitejs.dev',
        title: 'Vite',
        isActive: false,
        isLoading: false
    },
    {
        id: 'tab-6',
        profileId: 'profile-1',
        url: 'https://tailwindcss.com',
        title: 'Tailwind CSS',
        isActive: false,
        isLoading: false
    },
    {
        id: 'tab-7',
        profileId: 'profile-1',
        url: 'https://storybook.js.org',
        title: 'Storybook',
        isActive: false,
        isLoading: false
    },
    {
        id: 'tab-8',
        profileId: 'profile-1',
        url: 'https://testing-library.com',
        title: 'Testing Library',
        isActive: false,
        isLoading: false
    }
]

export const Default: Story = {
    args: {
        activeProfile: mockProfile,
        tabs: mockTabs,
    },
}

export const NoTabs: Story = {
    args: {
        activeProfile: mockProfile,
        tabs: [],
    },
}

export const NoProfile: Story = {
    args: {
        activeProfile: undefined,
        tabs: [],
    },
}

export const ManyTabs: Story = {
    args: {
        activeProfile: mockProfile,
        tabs: manyTabs,
    },
}

export const LoadingTab: Story = {
    args: {
        activeProfile: mockProfile,
        tabs: [
            {
                id: 'tab-1',
                profileId: 'profile-1',
                url: 'https://example.com',
                title: 'Loading...',
                isActive: true,
                isLoading: true
            }
        ],
    },
}

export const LongTabTitles: Story = {
    args: {
        activeProfile: mockProfile,
        tabs: [
            {
                id: 'tab-1',
                profileId: 'profile-1',
                url: 'https://example.com',
                title: 'This is a very long tab title that should be truncated to fit in the tab bar',
                isActive: true,
                isLoading: false
            },
            {
                id: 'tab-2',
                profileId: 'profile-1',
                url: 'https://another-example.com',
                title: 'Another extremely long tab title that demonstrates the truncation behavior',
                isActive: false,
                isLoading: false
            }
        ],
    },
}

export const DarkMode: Story = {
    args: {
        activeProfile: mockProfile,
        tabs: mockTabs,
    },
    decorators: [
        (Story) => (
            <ThemeProvider defaultMode="dark">
                <div style={{ height: '100vh' }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
}