import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import { ProfileSidebar } from '../ProfileSidebar'
import { ThemeProvider } from '../../renderer/src/design-system/ThemeProvider'
import { Profile } from '../../types'

const meta: Meta<typeof ProfileSidebar> = {
    title: 'Components/ProfileSidebar',
    component: ProfileSidebar,
    decorators: [
        (Story) => (
            <ThemeProvider defaultMode="light">
                <div style={{ height: '600px', display: 'flex' }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: 'A sidebar component for managing browser profiles with creation, switching, and context menu functionality.',
            },
        },
    },
    argTypes: {
        profiles: {
            description: 'Array of profile objects to display',
        },
        activeProfile: {
            description: 'Currently active profile',
        },
        onProfileSwitch: {
            description: 'Callback when user switches to a different profile',
        },
        onProfileCreate: {
            description: 'Callback when user creates a new profile',
        },
        onProfileDelete: {
            description: 'Callback when user deletes a profile',
        },
        onProfileSettings: {
            description: 'Optional callback when user opens profile settings',
        },
    },
}

export default meta
type Story = StoryObj<typeof ProfileSidebar>

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
            },
            {
                id: 'tab-2',
                profileId: 'profile-1',
                url: 'https://github.com',
                title: 'GitHub',
                isActive: false,
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
    },
    {
        id: 'profile-3',
        name: 'Gaming',
        icon: '🎮',
        createdAt: new Date('2024-01-01'),
        lastUsed: new Date('2024-01-01'),
        dataPath: '/path/to/profile3',
        settings: {
            antiFingerprinting: false,
            performanceMode: 'extreme',
            autoRotateUserAgent: false
        },
        tabs: [
            {
                id: 'tab-3',
                profileId: 'profile-3',
                url: 'https://steam.com',
                title: 'Steam',
                isActive: true,
                isLoading: false
            }
        ]
    },
    {
        id: 'profile-4',
        name: 'Development',
        icon: '👩‍💻',
        createdAt: new Date('2024-01-01'),
        lastUsed: new Date('2024-01-01'),
        dataPath: '/path/to/profile4',
        settings: {
            antiFingerprinting: false,
            performanceMode: 'standard',
            autoRotateUserAgent: false
        },
        tabs: Array.from({ length: 12 }, (_, i) => ({
            id: `tab-dev-${i}`,
            profileId: 'profile-4',
            url: `https://example${i}.com`,
            title: `Dev Tab ${i}`,
            isActive: i === 0,
            isLoading: false
        }))
    }
]

export const Default: Story = {
    args: {
        profiles: mockProfiles,
        activeProfile: mockProfiles[0],
        onProfileSwitch: action('onProfileSwitch'),
        onProfileCreate: action('onProfileCreate'),
        onProfileDelete: action('onProfileDelete'),
        onProfileSettings: action('onProfileSettings'),
    },
}

export const WithoutSettings: Story = {
    args: {
        profiles: mockProfiles,
        activeProfile: mockProfiles[1],
        onProfileSwitch: action('onProfileSwitch'),
        onProfileCreate: action('onProfileCreate'),
        onProfileDelete: action('onProfileDelete'),
        // onProfileSettings is undefined
    },
}

export const EmptyState: Story = {
    args: {
        profiles: [],
        activeProfile: undefined,
        onProfileSwitch: action('onProfileSwitch'),
        onProfileCreate: action('onProfileCreate'),
        onProfileDelete: action('onProfileDelete'),
        onProfileSettings: action('onProfileSettings'),
    },
}

export const SingleProfile: Story = {
    args: {
        profiles: [mockProfiles[0]],
        activeProfile: mockProfiles[0],
        onProfileSwitch: action('onProfileSwitch'),
        onProfileCreate: action('onProfileCreate'),
        onProfileDelete: action('onProfileDelete'),
        onProfileSettings: action('onProfileSettings'),
    },
}

export const ManyTabs: Story = {
    args: {
        profiles: mockProfiles,
        activeProfile: mockProfiles[3], // Development profile with 12 tabs
        onProfileSwitch: action('onProfileSwitch'),
        onProfileCreate: action('onProfileCreate'),
        onProfileDelete: action('onProfileDelete'),
        onProfileSettings: action('onProfileSettings'),
    },
}

export const DarkTheme: Story = {
    decorators: [
        (Story) => (
            <ThemeProvider defaultMode="dark">
                <div style={{ height: '600px', display: 'flex', backgroundColor: '#121212' }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: {
        profiles: mockProfiles,
        activeProfile: mockProfiles[2],
        onProfileSwitch: action('onProfileSwitch'),
        onProfileCreate: action('onProfileCreate'),
        onProfileDelete: action('onProfileDelete'),
        onProfileSettings: action('onProfileSettings'),
    },
}

export const InteractiveDemo: Story = {
    render: (args) => {
        const [profiles, setProfiles] = React.useState(mockProfiles)
        const [activeProfile, setActiveProfile] = React.useState(mockProfiles[0])

        const handleProfileSwitch = (profileId: string) => {
            const profile = profiles.find(p => p.id === profileId)
            if (profile) {
                setActiveProfile(profile)
                action('onProfileSwitch')(profileId)
            }
        }

        const handleProfileCreate = async (name: string, icon: string) => {
            const newProfile: Profile = {
                id: `profile-${Date.now()}`,
                name,
                icon,
                createdAt: new Date(),
                lastUsed: new Date(),
                dataPath: `/path/to/${name.toLowerCase()}`,
                settings: {
                    antiFingerprinting: false,
                    performanceMode: 'standard',
                    autoRotateUserAgent: false
                },
                tabs: []
            }
            setProfiles(prev => [...prev, newProfile])
            setActiveProfile(newProfile)
            action('onProfileCreate')(name, icon)
        }

        const handleProfileDelete = (profileId: string) => {
            setProfiles(prev => prev.filter(p => p.id !== profileId))
            if (activeProfile?.id === profileId) {
                const remainingProfiles = profiles.filter(p => p.id !== profileId)
                setActiveProfile(remainingProfiles[0] || undefined)
            }
            action('onProfileDelete')(profileId)
        }

        return (
            <ProfileSidebar
                profiles={profiles}
                activeProfile={activeProfile}
                onProfileSwitch={handleProfileSwitch}
                onProfileCreate={handleProfileCreate}
                onProfileDelete={handleProfileDelete}
                onProfileSettings={action('onProfileSettings')}
            />
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive demo where you can create, switch, and delete profiles. Try right-clicking on profiles for the context menu.',
            },
        },
    },
}