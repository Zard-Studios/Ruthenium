import type { Meta, StoryObj } from '@storybook/react'
import { ExtensionList } from '../ExtensionList'
import { Extension } from '../../types/extension'
import { action } from '@storybook/addon-actions'

const mockExtensions: Extension[] = [
    {
        id: 'ext-1',
        name: 'uBlock Origin',
        version: '1.44.4',
        description: 'Finally, an efficient wide-spectrum content blocker. Easy on CPU and memory.',
        author: 'Raymond Hill',
        manifestVersion: 2,
        permissions: ['tabs', 'storage', 'webRequest', 'webRequestBlocking'],
        icons: { '48': 'https://via.placeholder.com/48/4CAF50/FFFFFF?text=uB' },
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
        icons: { '48': 'https://via.placeholder.com/48/2196F3/FFFFFF?text=DR' },
        isEnabled: false,
        installDate: new Date('2023-02-01')
    },
    {
        id: 'ext-3',
        name: 'Bitwarden',
        version: '2023.10.1',
        description: 'A secure and free password manager for all of your devices.',
        author: 'Bitwarden Inc.',
        manifestVersion: 2,
        permissions: ['tabs', 'storage', 'contextMenus', 'notifications'],
        icons: {},
        isEnabled: true,
        installDate: new Date('2023-03-10')
    }
]

const meta: Meta<typeof ExtensionList> = {
    title: 'Components/ExtensionList',
    component: ExtensionList,
    parameters: {
        layout: 'padded',
    },
    args: {
        onToggle: action('extension-toggle'),
        onUninstall: action('extension-uninstall'),
        onSettings: action('extension-settings')
    }
}

export default meta
type Story = StoryObj<typeof ExtensionList>

export const WithExtensions: Story = {
    args: {
        extensions: mockExtensions
    }
}

export const Empty: Story = {
    args: {
        extensions: []
    }
}

export const SingleExtension: Story = {
    args: {
        extensions: [mockExtensions[0]]
    }
}

export const DisabledExtensions: Story = {
    args: {
        extensions: mockExtensions.map(ext => ({ ...ext, isEnabled: false }))
    }
}