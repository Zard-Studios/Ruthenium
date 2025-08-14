import React, { useState } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

interface ExtensionInstallerProps {
    onInstall: (extensionPath: string) => void
    onCancel: () => void
}

export const ExtensionInstaller: React.FC<ExtensionInstallerProps> = ({
    onInstall,
    onCancel
}) => {
    const [installMethod, setInstallMethod] = useState<'local' | 'firefox-addons' | 'url'>('local')
    const [extensionPath, setExtensionPath] = useState('')
    const [extensionUrl, setExtensionUrl] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [installing, setInstalling] = useState(false)

    const handleInstall = async () => {
        if (installing) return

        try {
            setInstalling(true)

            let installPath = ''

            switch (installMethod) {
                case 'local':
                    installPath = extensionPath
                    break
                case 'url':
                    // Download extension from URL first
                    installPath = await downloadExtension(extensionUrl)
                    break
                case 'firefox-addons':
                    // Search and install from Firefox Add-ons
                    installPath = await installFromFirefoxAddons(searchQuery)
                    break
            }

            if (installPath) {
                await onInstall(installPath)
            }
        } catch (error) {
            console.error('Installation failed:', error)
            alert('Failed to install extension. Please try again.')
        } finally {
            setInstalling(false)
        }
    }

    const downloadExtension = async (url: string): Promise<string> => {
        // This would implement downloading extension from URL
        // For now, just return the URL as path
        return url
    }

    const installFromFirefoxAddons = async (query: string): Promise<string> => {
        // This would implement searching and downloading from Firefox Add-ons
        // For now, just return empty string
        throw new Error('Firefox Add-ons installation not yet implemented')
    }

    const handleFileSelect = () => {
        // Create file input element
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.xpi,.zip'
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
                setExtensionPath(file.path || file.name)
            }
        }
        input.click()
    }
    return (
        <div className="space-y-6">
            {/* Installation Method Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Installation Method
                </label>
                <div className="space-y-2">
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="installMethod"
                            value="local"
                            checked={installMethod === 'local'}
                            onChange={(e) => setInstallMethod(e.target.value as any)}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Install from local file (.xpi or .zip)
                        </span>
                    </label>

                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="installMethod"
                            value="url"
                            checked={installMethod === 'url'}
                            onChange={(e) => setInstallMethod(e.target.value as any)}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Install from URL
                        </span>
                    </label>

                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="installMethod"
                            value="firefox-addons"
                            checked={installMethod === 'firefox-addons'}
                            onChange={(e) => setInstallMethod(e.target.value as any)}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Search Firefox Add-ons
                        </span>
                    </label>
                </div>
            </div>

            {/* Installation Form */}
            <div>
                {installMethod === 'local' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Extension File
                        </label>
                        <div className="flex space-x-2">
                            <Input
                                type="text"
                                value={extensionPath}
                                onChange={(e) => setExtensionPath(e.target.value)}
                                placeholder="Select extension file..."
                                className="flex-1"
                                readOnly
                            />
                            <Button
                                onClick={handleFileSelect}
                                variant="outline"
                                className="px-4"
                            >
                                Browse
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Supported formats: .xpi, .zip
                        </p>
                    </div>
                )}

                {installMethod === 'url' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Extension URL
                        </label>
                        <Input
                            type="url"
                            value={extensionUrl}
                            onChange={(e) => setExtensionUrl(e.target.value)}
                            placeholder="https://example.com/extension.xpi"
                            className="w-full"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Direct link to extension file (.xpi or .zip)
                        </p>
                    </div>
                )}

                {installMethod === 'firefox-addons' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Search Extensions
                        </label>
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Firefox Add-ons..."
                            className="w-full"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Search and install extensions from Firefox Add-ons repository
                        </p>
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                ⚠️ Firefox Add-ons integration is coming soon
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                    onClick={onCancel}
                    variant="outline"
                    disabled={installing}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleInstall}
                    disabled={installing || !getInstallPath()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {installing ? 'Installing...' : 'Install Extension'}
                </Button>
            </div>
        </div>
    )

    function getInstallPath(): string {
        switch (installMethod) {
            case 'local':
                return extensionPath
            case 'url':
                return extensionUrl
            case 'firefox-addons':
                return searchQuery
            default:
                return ''
        }
    }
}