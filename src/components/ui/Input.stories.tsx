import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'
import { ThemeProvider } from '../../renderer/src/design-system/ThemeProvider'

const meta: Meta<typeof Input> = {
    title: 'UI/Input',
    component: Input,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <ThemeProvider>
                <div className="w-80">
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'filled'],
        },
        disabled: {
            control: 'boolean',
        },
    },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
    args: {
        placeholder: 'Enter text...',
    },
}

export const WithLabel: Story = {
    args: {
        label: 'Email Address',
        placeholder: 'Enter your email',
        type: 'email',
    },
}

export const WithHelperText: Story = {
    args: {
        label: 'Password',
        placeholder: 'Enter password',
        type: 'password',
        helperText: 'Must be at least 8 characters long',
    },
}

export const WithError: Story = {
    args: {
        label: 'Username',
        placeholder: 'Enter username',
        error: 'Username is already taken',
        value: 'invalid-user',
    },
}

export const Filled: Story = {
    args: {
        variant: 'filled',
        label: 'Search',
        placeholder: 'Search profiles...',
    },
}

export const WithLeftIcon: Story = {
    args: {
        label: 'Search',
        placeholder: 'Search...',
        leftIcon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
}

export const WithRightIcon: Story = {
    args: {
        label: 'Password',
        type: 'password',
        placeholder: 'Enter password',
        rightIcon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        ),
    },
}

export const Disabled: Story = {
    args: {
        label: 'Disabled Input',
        placeholder: 'Cannot edit this',
        disabled: true,
        value: 'Disabled value',
    },
}