import React from 'react'
import { Extension } from '../types/extension'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'

interface ExtensionListProps {
    extensions: Extension[]
    onToggle: (extensionId: string, enabled: boolean) => void
    onUninstall: (extensionId: string) => void
    onSettings: (extension: Extension) => void
}

export const ExtensionList: React.FC<ExtensionListProps> = ({
    extensions,
    onToggle,
    onUninstall,
    onSettings
}) => {
    if (extensions.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400 mb-4">
                    No extensions installed for this profile
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500">
                    Install extensions to enhance your browsing experience
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {extensions.map((extension) => (
                <ExtensionCard
                    key={extension.id}
                    extension={extension}
                    onToggle={onToggle}
                    onUninstall={onUninstall}
                    onSettings={onSettings}
                />
            ))}
        </div>
    )
}

interface ExtensionCardProps {
    extension: Extension
    onToggle: (extensionId: string, enabled: boolean) => void
    onUninstall: (extensionId: string) => void
    onSettings: (extension: Extension) => void
}

const ExtensionCard: React.FC<ExtensionCardProps> = ({
    extension,
    onToggle,
    onUninstall,
    onSettings
}) => {
    const handleToggle = () => {
        onToggle(extension.id, !extension.isEnabled)
    }

    const handleUninstall = () => {
        if (window.confirm(`Are you sure you want to uninstall "${extension.name}"?`)) {
            onUninstall(extension.id)
        }
    }

    const handleSettings = () => {
        onSettings(extension)
    }
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start space-x-4">
                {/* Extension Icon */}
                <div className="flex-shrink-0">
                    {extension.icons['48'] ? (
                        <img
                            src={extension.icons['48']}
                            alt={extension.name}
                            className="w-12 h-12 rounded-lg"
                        />
                    ) : (
                        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                                EXT
                            </span>
                        </div>
                    )}
                </div>

                {/* Extension Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {extension.name}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            v{extension.version}
                        </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                        {extension.description}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>By {extension.author}</span>
                        <span>•</span>
                        <span>Installed {extension.installDate.toLocaleDateString()}</span>
                        {extension.permissions.length > 0 && (
                            <>
                                <span>•</span>
                                <span>{extension.permissions.length} permissions</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Extension Controls */}
                <div className="flex items-center space-x-2">
                    {/* Enable/Disable Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={extension.isEnabled}
                            onChange={handleToggle}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>

                    {/* Settings Button */}
                    <IconButton
                        onClick={handleSettings}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        title="Extension Settings"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </IconButton>

                    {/* Uninstall Button */}
                    <IconButton
                        onClick={handleUninstall}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        title="Uninstall Extension"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </IconButton>
                </div>
            </div>

            {/* Extension Status */}
            <div className="mt-3 flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${extension.isEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                    {extension.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
            </div>
        </div>
    )
}