import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { ThemeProvider } from '../../renderer/src/design-system/ThemeProvider'

const meta: Meta<typeof Button> = {
    title: 'UI/Button',
    component: Button,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <ThemeProvider>
                <Story />
            </ThemeProvider>
        ),
    ],
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        loading: {
            control: 'boolean',
        },
        disabled: {
            control: 'boolean',
        },
    },
}

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
    args: {
        variant: 'primary',
        children: 'Button',
    },
}

export const Secondary: Story = {
    args: {
        variant: 'secondary',
        children: 'Button',
    },
}

export const Outline: Story = {
    args: {
        variant: 'outline',
        children: 'Button',
    },
}

export const Ghost: Story = {
    args: {
        variant: 'ghost',
        children: 'Button',
    },
}

export const Danger: Story = {
    args: {
        variant: 'danger',
        children: 'Button',
    },
}

export const Small: Story = {
    args: {
        size: 'sm',
        children: 'Small Button',
    },
}

export const Large: Story = {
    args: {
        size: 'lg',
        children: 'Large Button',
    },
}

export const Loading: Story = {
    args: {
        loading: true,
        children: 'Loading...',
    },
}

export const Disabled: Story = {
    args: {
        disabled: true,
        children: 'Disabled',
    },
}

export const WithIcons: Story = {
    args: {
        leftIcon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
        ),
        children: 'Add Item',
    },
}