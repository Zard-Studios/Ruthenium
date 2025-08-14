import type { Meta, StoryObj } from '@storybook/react'
import { ExtensionManager } from '../ExtensionManager'
import { action } from '@storybook/addon-actions'

const meta: Meta<typeof ExtensionManager> = {
    title: 'Components/ExtensionManager',
    component: ExtensionManager,
    parameters: {
        layout: 'padded',
    },
    args: {
        profileId: 'profile-1',
        onExtensionToggle: action('extension-toggle'),
        onExtensionInstall: action('extension-install'),
        onExtensionUninstall: action('extension-uninstall'),
        onExtensionSettings: action('extension-settings')
    }
}

export default meta
type Story = StoryObj<typeof ExtensionManager>

export const Default: Story = {}

export const WithMockData: Story = {
    parameters: {
        mockData: {
            extensions: [
                {
                    id: 'ext-1',
                    name: 'uBlock Origin',
                    version: '1.44.4',
                    description: 'Finally, an efficient wide-spectrum content blocker. Easy on CPU and memory.',
                    author: 'Raymond Hill',
                    manifestVersion: 2,
                    permissions: ['tabs', 'storage', 'webRequest'],
                    icons: { '48': 'https://via.placeholder.com/48' },
                    isEnabled: true,
                    installDate: new Date('2023-01-15')
                },
                {
                    id: 'ext-2',
                    name: 'Dark Reader',
                    version: '4.9.58',
                    description: 'Dark mode for every website. Take care of your eyes, use dark theme for night and daily browsing.',
                    author: 'Dark Reader Ltd',
                    manifestVersion: 2,
                    permissions: ['activeTab', 'storage'],
                    icons: { '48': 'https://via.placeholder.com/48' },
                    isEnabled: false,
                    installDate: new Date('2023-02-01')
                }
            ]
        }
    }
}