import React, { useState, useEffect } from 'react'
import { Extension } from '../types/extension'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

interface ExtensionSettingsProps {
    extension: Extension
    profileId: string
    onSave: (extensionId: string, settings: Record<string, any>) => void
    onCancel: () => void
}

export const ExtensionSettings: React.FC<ExtensionSettingsProps> = ({
    extension,
    profileId,
    onSave,
    onCancel
}) => {
    const [settings, setSettings] = useState<Record<string, any>>({})
    const [permissions, setPermissions] = useState<string[]>(extension.permissions)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadExtensionSettings()
    }, [extension.id, profileId])

    const loadExtensionSettings = async () => {
        try {
            setLoading(true)
            // This would load extension settings from the ExtensionManager
            // const extensionManager = getExtensionManager()
            // const extensionState = await extensionManager.getExtensionState(profileId, extension.id)
            // setSettings(extensionState?.settings || {})
            // setPermissions(extensionState?.permissions || extension.permissions)

            // Mock settings for now
            setSettings({
                autoUpdate: true,
                notifications: false,
                customSetting: 'default value'
            })
        } catch (error) {
            console.error('Failed to load extension settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = () => {
        onSave(extension.id, {
            ...settings,
            permissions
        })
    }

    const handleSettingChange = (key: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }))
    }

    const handlePermissionToggle = (permission: string) => {
        setPermissions(prev =>
            prev.includes(permission)
                ? prev.filter(p => p !== permission)
                : [...prev, permission]
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">Loading settings...</div>
            </div>
        )
    }
    return (
        <div className="space-y-6">
            {/* Extension Info */}
            <div className="flex items-center space-x-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                {extension.icons['48'] && (
                    <img
                        src={extension.icons['48']}
                        alt={extension.name}
                        className="w-12 h-12 rounded-lg"
                    />
                )}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {extension.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Version {extension.version} by {extension.author}
                    </p>
                </div>
            </div>

            {/* General Settings */}
            <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    General Settings
                </h4>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Auto Update
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Automatically update this extension when new versions are available
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoUpdate || false}
                                onChange={(e) => handleSettingChange('autoUpdate', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Notifications
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Allow this extension to show notifications
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.notifications || false}
                                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Custom Setting
                        </label>
                        <Input
                            type="text"
                            value={settings.customSetting || ''}
                            onChange={(e) => handleSettingChange('customSetting', e.target.value)}
                            placeholder="Enter custom value..."
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Permissions */}
            <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Permissions
                </h4>
                <div className="space-y-2">
                    {getAvailablePermissions().map((permission) => (
                        <div key={permission} className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {getPermissionDisplayName(permission)}
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {getPermissionDescription(permission)}
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={permissions.includes(permission)}
                                    onChange={() => handlePermissionToggle(permission)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                    onClick={onCancel}
                    variant="outline"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    Save Settings
                </Button>
            </div>
        </div>
    )

    function getAvailablePermissions(): string[] {
        return [
            'tabs',
            'storage',
            'activeTab',
            'cookies',
            'history',
            'bookmarks',
            'notifications',
            'contextMenus',
            'webRequest'
        ]
    }

    function getPermissionDisplayName(permission: string): string {
        const names: Record<string, string> = {
            tabs: 'Access Browser Tabs',
            storage: 'Store Data Locally',
            activeTab: 'Access Active Tab',
            cookies: 'Access Cookies',
            history: 'Access Browsing History',
            bookmarks: 'Access Bookmarks',
            notifications: 'Show Notifications',
            contextMenus: 'Add Context Menus',
            webRequest: 'Monitor Web Requests'
        }
        return names[permission] || permission
    }

    function getPermissionDescription(permission: string): string {
        const descriptions: Record<string, string> = {
            tabs: 'Read and modify browser tabs',
            storage: 'Store and retrieve extension data',
            activeTab: 'Access content of the active tab',
            cookies: 'Read and modify cookies',
            history: 'Read and modify browsing history',
            bookmarks: 'Read and modify bookmarks',
            notifications: 'Display desktop notifications',
            contextMenus: 'Add items to context menus',
            webRequest: 'Monitor and modify web requests'
        }
        return descriptions[permission] || 'Extension permission'
    }
}