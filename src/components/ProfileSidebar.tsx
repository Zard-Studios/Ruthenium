import React, { useState, useRef, useEffect } from 'react'
import { Profile } from '../types'
import { useTheme } from '../renderer/src/design-system/ThemeProvider'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { Modal, ModalBody, ModalFooter } from './ui/Modal'

interface ProfileSidebarProps {
    profiles: Profile[]
    activeProfile?: Profile
    onProfileSwitch: (profileId: string) => void
    onProfileCreate: (name: string, icon: string) => void
    onProfileDelete: (profileId: string) => void
    onProfileSettings?: (profileId: string) => void
}

interface ContextMenuState {
    isOpen: boolean
    profileId: string | null
    x: number
    y: number
}

const PROFILE_ICONS = [
    '👤', '🧑‍💼', '👩‍💻', '🧑‍🎨', '👨‍🔬', '👩‍🏫', '🧑‍⚕️', '👨‍🍳',
    '🎭', '🎨', '🎮', '🎵', '📚', '💼', '🔬', '🏠',
    '🌟', '🚀', '💎', '🔥', '⚡', '🌈', '🎯', '🏆'
]

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
    profiles,
    activeProfile,
    onProfileSwitch,
    onProfileCreate,
    onProfileDelete,
    onProfileSettings
}) => {
    const { tokens, resolvedMode } = useTheme()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        isOpen: false,
        profileId: null,
        x: 0,
        y: 0
    })
    const [newProfileName, setNewProfileName] = useState('')
    const [selectedIcon, setSelectedIcon] = useState(PROFILE_ICONS[0])
    const [isCreating, setIsCreating] = useState(false)
    const contextMenuRef = useRef<HTMLDivElement>(null)
    const nameInputRef = useRef<HTMLInputElement>(null)

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setContextMenu({ isOpen: false, profileId: null, x: 0, y: 0 })
            }
        }

        if (contextMenu.isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [contextMenu.isOpen])

    // Focus name input when modal opens
    useEffect(() => {
        if (isCreateModalOpen && nameInputRef.current) {
            // Use setTimeout to ensure the modal is fully rendered
            setTimeout(() => {
                nameInputRef.current?.focus()
            }, 100)
        }
    }, [isCreateModalOpen])

    const handleProfileClick = (profileId: string) => {
        if (activeProfile?.id !== profileId) {
            onProfileSwitch(profileId)
        }
    }

    const handleProfileRightClick = (event: React.MouseEvent, profileId: string) => {
        event.preventDefault()
        setContextMenu({
            isOpen: true,
            profileId,
            x: event.clientX,
            y: event.clientY
        })
    }

    const handleCreateProfile = async () => {
        if (!newProfileName.trim()) return

        setIsCreating(true)
        try {
            await onProfileCreate(newProfileName.trim(), selectedIcon)
            setIsCreateModalOpen(false)
            setNewProfileName('')
            setSelectedIcon(PROFILE_ICONS[0])
        } catch (error) {
            console.error('Failed to create profile:', error)
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteProfile = (profileId: string) => {
        if (window.confirm('Are you sure you want to delete this profile? All data will be lost.')) {
            onProfileDelete(profileId)
        }
        setContextMenu({ isOpen: false, profileId: null, x: 0, y: 0 })
    }

    const handleSettingsClick = (profileId: string) => {
        onProfileSettings?.(profileId)
        setContextMenu({ isOpen: false, profileId: null, x: 0, y: 0 })
    }

    const getProfileTabCount = (profile: Profile) => {
        return profile.tabs?.length || 0
    }

    return (
        <>
            <div
                className="profile-sidebar flex flex-col h-full w-16 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
                style={{
                    backgroundColor: resolvedMode === 'dark' ? tokens.colors.dark.surface : tokens.colors.light.surface,
                    borderColor: resolvedMode === 'dark' ? tokens.colors.dark.border : tokens.colors.light.border
                }}
            >
                {/* Header with create button */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <IconButton
                        icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        }
                        variant="ghost"
                        size="md"
                        onClick={() => setIsCreateModalOpen(true)}
                        aria-label="Create new profile"
                        title="Create new profile"
                    />
                </div>

                {/* Profile list */}
                <div className="flex-1 overflow-y-auto py-2">
                    {profiles.map((profile) => {
                        const isActive = activeProfile?.id === profile.id
                        const tabCount = getProfileTabCount(profile)

                        return (
                            <div
                                key={profile.id}
                                data-testid="profile-item"
                                className={`
                                    relative mx-2 mb-2 rounded-lg cursor-pointer transition-all duration-200
                                    ${isActive
                                        ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }
                                `}
                                onClick={() => handleProfileClick(profile.id)}
                                onContextMenu={(e) => handleProfileRightClick(e, profile.id)}
                                title={`${profile.name}${tabCount > 0 ? ` (${tabCount} tabs)` : ''}`}
                            >
                                <div className="p-2 flex flex-col items-center">
                                    {/* Profile icon */}
                                    <div className="text-2xl mb-1 select-none">
                                        {profile.icon}
                                    </div>

                                    {/* Profile name (truncated) */}
                                    <div className="text-xs text-center text-gray-700 dark:text-gray-300 font-medium truncate w-full">
                                        {profile.name}
                                    </div>

                                    {/* Tab count indicator */}
                                    {tabCount > 0 && (
                                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                            {tabCount > 9 ? '9+' : tabCount}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu.isOpen && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px]"
                    style={{
                        left: contextMenu.x,
                        top: contextMenu.y,
                        zIndex: tokens.zIndex.popover
                    }}
                >
                    {onProfileSettings && (
                        <button
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            onClick={() => handleSettingsClick(contextMenu.profileId!)}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                        </button>
                    )}
                    <button
                        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        onClick={() => handleDeleteProfile(contextMenu.profileId!)}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>
                </div>
            )}

            {/* Create Profile Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false)
                    setNewProfileName('')
                    setSelectedIcon(PROFILE_ICONS[0])
                }}
                title="Create New Profile"
                size="md"
            >
                <ModalBody>
                    <div className="space-y-4">
                        {/* Profile Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Profile Name
                            </label>
                            <input
                                ref={nameInputRef}
                                type="text"
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                                placeholder="Enter profile name"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                maxLength={50}
                            />
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {newProfileName.length}/50 characters
                            </div>
                        </div>

                        {/* Icon Picker */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Choose Icon
                            </label>
                            <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-600 rounded-lg">
                                {PROFILE_ICONS.map((icon) => (
                                    <button
                                        key={icon}
                                        type="button"
                                        className={`
                                            w-8 h-8 text-lg rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700
                                            ${selectedIcon === icon
                                                ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                                                : ''
                                            }
                                        `}
                                        onClick={() => setSelectedIcon(icon)}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-2xl">{selectedIcon}</div>
                            <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {newProfileName || 'Profile Name'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Preview
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalBody>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setIsCreateModalOpen(false)
                            setNewProfileName('')
                            setSelectedIcon(PROFILE_ICONS[0])
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCreateProfile}
                        disabled={!newProfileName.trim() || isCreating}
                        loading={isCreating}
                    >
                        Create Profile
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    )
}