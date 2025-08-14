import React, { useState, useEffect } from 'react'
import { Extension, ExtensionState } from '../types/extension'
import { ExtensionList } from './ExtensionList'
import { ExtensionInstaller } from './ExtensionInstaller'
import { ExtensionSettings } from './ExtensionSettings'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'

interface ExtensionManagerProps {
    profileId: string
    onExtensionToggle: (extensionId: string, enabled: boolean) => void
    onExtensionInstall: (extensionPath: string) => void
    onExtensionUninstall: (extensionId: string) => void
    onExtensionSettings: (extensionId: string, settings: Record<string, any>) => void
}

export const ExtensionManager: React.FC<ExtensionManagerProps> = ({
    profileId,
    onExtensionToggle,
    onExtensionInstall,
    onExtensionUninstall,
    onExtensionSettings
}) => {
    const [extensions, setExtensions] = useState<Extension[]>([])
    const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null)
    const [showInstaller, setShowInstaller] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadExtensions()
    }, [profileId])

    const loadExtensions = async () => {
        try {
            setLoading(true)
            // This would be connected to the ExtensionManager service
            // const extensionManager = getExtensionManager()
            // const profileExtensions = await extensionManager.getExtensionsForProfile(profileId)
            // setExtensions(profileExtensions)

            // Mock data for now
            setExtensions([])
        } catch (error) {
            console.error('Failed to load extensions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleExtensionToggle = async (extensionId: string, enabled: boolean) => {
        try {
            await onExtensionToggle(extensionId, enabled)
            await loadExtensions() // Refresh the list
        } catch (error) {
            console.error('Failed to toggle extension:', error)
        }
    }

    const handleExtensionInstall = async (extensionPath: string) => {
        try {
            await onExtensionInstall(extensionPath)
            await loadExtensions() // Refresh the list
            setShowInstaller(false)
        } catch (error) {
            console.error('Failed to install extension:', error)
        }
    }

    const handleExtensionUninstall = async (extensionId: string) => {
        try {
            await onExtensionUninstall(extensionId)
            await loadExtensions() // Refresh the list
        } catch (error) {
            console.error('Failed to uninstall extension:', error)
        }
    }

    const handleExtensionSettings = async (extensionId: string, settings: Record<string, any>) => {
        try {
            await onExtensionSettings(extensionId, settings)
            setShowSettings(false)
        } catch (error) {
            console.error('Failed to update extension settings:', error)
        }
    }

    const openExtensionSettings = (extension: Extension) => {
        setSelectedExtension(extension)
        setShowSettings(true)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading extensions...</div>
            </div>
        )
    }

    return (
        <div className="extension-manager p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Extensions
                </h2>
                <Button
                    onClick={() => setShowInstaller(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    Install Extension
                </Button>
            </div>

            <ExtensionList
                extensions={extensions}
                onToggle={handleExtensionToggle}
                onUninstall={handleExtensionUninstall}
                onSettings={openExtensionSettings}
            />

            {showInstaller && (
                <Modal
                    isOpen={showInstaller}
                    onClose={() => setShowInstaller(false)}
                    title="Install Extension"
                >
                    <ExtensionInstaller
                        onInstall={handleExtensionInstall}
                        onCancel={() => setShowInstaller(false)}
                    />
                </Modal>
            )}

            {showSettings && selectedExtension && (
                <Modal
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    title={`${selectedExtension.name} Settings`}
                >
                    <ExtensionSettings
                        extension={selectedExtension}
                        profileId={profileId}
                        onSave={handleExtensionSettings}
                        onCancel={() => setShowSettings(false)}
                    />
                </Modal>
            )}
        </div>
    )
}