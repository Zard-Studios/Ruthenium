import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'
import { Button } from './Button'
import { Input } from './Input'
import { ThemeProvider } from '../../renderer/src/design-system/ThemeProvider'

const meta: Meta<typeof Modal> = {
    title: 'UI/Modal',
    component: Modal,
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
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg', 'xl'],
        },
        closeOnOverlayClick: {
            control: 'boolean',
        },
        closeOnEscape: {
            control: 'boolean',
        },
    },
}

export default meta
type Story = StoryObj<typeof meta>

// Wrapper component to handle modal state
function ModalWrapper(args: any) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div>
            <Button onClick={() => setIsOpen(true)}>
                Open Modal
            </Button>
            <Modal
                {...args}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </div>
    )
}

export const Default: Story = {
    render: (args) => <ModalWrapper {...args} />,
    args: {
        title: 'Modal Title',
        children: (
            <div>
                <p>This is a basic modal with some content.</p>
            </div>
        ),
    },
}

export const WithForm: Story = {
    render: (args) => <ModalWrapper {...args} />,
    args: {
        title: 'Create New Profile',
        children: (
            <div className="space-y-4">
                <Input
                    label="Profile Name"
                    placeholder="Enter profile name"
                />
                <Input
                    label="Description"
                    placeholder="Optional description"
                />
                <ModalFooter>
                    <Button variant="outline">
                        Cancel
                    </Button>
                    <Button variant="primary">
                        Create Profile
                    </Button>
                </ModalFooter>
            </div>
        ),
    },
}

export const Large: Story = {
    render: (args) => <ModalWrapper {...args} />,
    args: {
        title: 'Large Modal',
        size: 'lg',
        children: (
            <div>
                <p>This is a large modal with more space for content.</p>
                <p>You can put more complex layouts and components here.</p>
            </div>
        ),
    },
}

export const Small: Story = {
    render: (args) => <ModalWrapper {...args} />,
    args: {
        title: 'Confirm Action',
        size: 'sm',
        children: (
            <div>
                <ModalBody>
                    <p>Are you sure you want to delete this profile?</p>
                </ModalBody>
                <ModalFooter>
                    <Button variant="outline">
                        Cancel
                    </Button>
                    <Button variant="danger">
                        Delete
                    </Button>
                </ModalFooter>
            </div>
        ),
    },
}

export const NoCloseOnOverlay: Story = {
    render: (args) => <ModalWrapper {...args} />,
    args: {
        title: 'Important Modal',
        closeOnOverlayClick: false,
        closeOnEscape: false,
        children: (
            <div>
                <p>This modal cannot be closed by clicking outside or pressing escape.</p>
                <ModalFooter>
                    <Button variant="primary">
                        I Understand
                    </Button>
                </ModalFooter>
            </div>
        ),
    },
}