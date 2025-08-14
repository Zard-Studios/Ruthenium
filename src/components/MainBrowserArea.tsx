import React, { useRef, useEffect, useState } from 'react'
import { Profile, Tab } from '../types'
import { IconButton } from './ui/IconButton'
import { useTheme } from '../renderer/src/design-system/ThemeProvider'

interface MainBrowserAreaProps {
    activeProfile?: Profile
    tabs: Tab[]
    onTabCreate: () => void
    onTabClose: (tabId: string) => void
    onTabSwitch: (tabId: string) => void
    onTabNavigate?: (tabId: string, url: string) => void
}

interface TabItemProps {
    tab: Tab
    isActive: boolean
    onClose: (tabId: string) => void
    onSwitch: (tabId: string) => void
}

const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onClose, onSwitch }) => {
    const { tokens } = useTheme()
    const [isClosing, setIsClosing] = useState(false)

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsClosing(true)
        // Small delay for animation
        setTimeout(() => {
            onClose(tab.id)
        }, 150)
    }

    const handleClick = () => {
        if (!isClosing) {
            onSwitch(tab.id)
        }
    }

    const truncateTitle = (title: string, maxLength: number = 20) => {
        return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title
    }

    return (
        <div
            className={`
                flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] 
                border-r border-gray-200 dark:border-gray-700 cursor-pointer
                transition-all duration-200 ease-in-out group
                ${isActive
                    ? 'bg-white dark:bg-gray-800 border-b-2 border-b-blue-500'
                    : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
                ${isClosing ? 'opacity-50 scale-95' : ''}
            `}
            onClick={handleClick}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClick()
                }
            }}
        >
            {/* Favicon */}
            <div className="flex-shrink-0 w-4 h-4">
                {tab.favicon ? (
                    <img
                        src={tab.favicon}
                        alt=""
                        className="w-4 h-4 rounded-sm"
                        onError={(e) => {
                            // Fallback to default icon on error
                            (e.target as HTMLImageElement).style.display = 'none'
                        }}
                    />
                ) : (
                    <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-sm flex items-center justify-center">
                        <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.499-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.499.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Loading indicator */}
            {tab.isLoading && (
                <div className="flex-shrink-0">
                    <svg className="animate-spin w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                </div>
            )}

            {/* Tab title */}
            <span className={`
                flex-1 text-sm truncate
                ${isActive
                    ? 'text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-600 dark:text-gray-400'
                }
            `}>
                {truncateTitle(tab.title)}
            </span>

            {/* Close button */}
            <IconButton
                variant="ghost"
                size="sm"
                icon={
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                }
                onClick={handleClose}
                aria-label={`Close ${tab.title}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            />
        </div>
    )
}

export const MainBrowserArea: React.FC<MainBrowserAreaProps> = ({
    activeProfile,
    tabs,
    onTabCreate,
    onTabClose,
    onTabSwitch,
    onTabNavigate
}) => {
    const { tokens } = useTheme()
    const tabBarRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const [addressBarValue, setAddressBarValue] = useState('')

    const activeTab = tabs.find(tab => tab.isActive)

    // Update address bar when active tab changes
    useEffect(() => {
        if (activeTab) {
            setAddressBarValue(activeTab.url)
        }
    }, [activeTab])

    // Check scroll state
    const checkScrollState = () => {
        if (tabBarRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabBarRef.current
            setCanScrollLeft(scrollLeft > 0)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
        }
    }

    useEffect(() => {
        checkScrollState()
        const tabBar = tabBarRef.current
        if (tabBar) {
            tabBar.addEventListener('scroll', checkScrollState)
            return () => tabBar.removeEventListener('scroll', checkScrollState)
        }
    }, [tabs])

    // Scroll functions
    const scrollLeft = () => {
        if (tabBarRef.current) {
            tabBarRef.current.scrollBy({ left: -200, behavior: 'smooth' })
        }
    }

    const scrollRight = () => {
        if (tabBarRef.current) {
            tabBarRef.current.scrollBy({ left: 200, behavior: 'smooth' })
        }
    }

    // Handle address bar navigation
    const handleAddressBarSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (activeTab && onTabNavigate && addressBarValue.trim()) {
            let url = addressBarValue.trim()

            // Add protocol if missing
            if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:')) {
                // Check if it looks like a domain
                if (url.includes('.') && !url.includes(' ')) {
                    url = `https://${url}`
                } else {
                    // Treat as search query
                    url = `https://www.google.com/search?q=${encodeURIComponent(url)}`
                }
            }

            onTabNavigate(activeTab.id, url)
        }
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Tab Bar */}
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                {/* Scroll Left Button */}
                {canScrollLeft && (
                    <IconButton
                        variant="ghost"
                        size="sm"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        }
                        onClick={scrollLeft}
                        aria-label="Scroll tabs left"
                        className="flex-shrink-0 mx-1"
                    />
                )}

                {/* Tabs Container */}
                <div
                    ref={tabBarRef}
                    className="flex-1 flex overflow-x-auto scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    role="tablist"
                >
                    {tabs.map(tab => (
                        <TabItem
                            key={tab.id}
                            tab={tab}
                            isActive={tab.isActive}
                            onClose={onTabClose}
                            onSwitch={onTabSwitch}
                        />
                    ))}
                </div>

                {/* Scroll Right Button */}
                {canScrollRight && (
                    <IconButton
                        variant="ghost"
                        size="sm"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        }
                        onClick={scrollRight}
                        aria-label="Scroll tabs right"
                        className="flex-shrink-0 mx-1"
                    />
                )}

                {/* New Tab Button */}
                <IconButton
                    variant="ghost"
                    size="sm"
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    }
                    onClick={onTabCreate}
                    aria-label="Create new tab"
                    className="flex-shrink-0 mx-2"
                />
            </div>

            {/* Address Bar */}
            {activeTab && (
                <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    {/* Navigation Buttons */}
                    <div className="flex gap-1">
                        <IconButton
                            variant="ghost"
                            size="sm"
                            icon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            }
                            aria-label="Go back"
                            disabled // TODO: Implement navigation history
                        />
                        <IconButton
                            variant="ghost"
                            size="sm"
                            icon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            }
                            aria-label="Go forward"
                            disabled // TODO: Implement navigation history
                        />
                        <IconButton
                            variant="ghost"
                            size="sm"
                            icon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            }
                            aria-label="Refresh page"
                            onClick={() => {
                                if (onTabNavigate) {
                                    onTabNavigate(activeTab.id, activeTab.url)
                                }
                            }}
                        />
                    </div>

                    {/* Address Input */}
                    <form onSubmit={handleAddressBarSubmit} className="flex-1">
                        <input
                            type="text"
                            value={addressBarValue}
                            onChange={(e) => setAddressBarValue(e.target.value)}
                            placeholder="Enter URL or search..."
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                     placeholder-gray-500 dark:placeholder-gray-400"
                        />
                    </form>

                    {/* Menu Button */}
                    <IconButton
                        variant="ghost"
                        size="sm"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        }
                        aria-label="Browser menu"
                    />
                </div>
            )}

            {/* Browser Content Area */}
            <div className="flex-1 relative">
                {activeTab ? (
                    <div className="w-full h-full bg-white dark:bg-gray-900">
                        {/* Webview Container - This would be replaced with actual webview in Electron */}
                        <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                            <div className="text-center">
                                <div className="text-4xl mb-4">🌐</div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    Webview Container
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    Current URL: {activeTab.url}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                    This will be replaced with actual browser engine integration
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                        <div className="text-center">
                            <div className="text-6xl mb-4">📂</div>
                            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No tabs open
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {activeProfile ? `Create a new tab for ${activeProfile.name}` : 'Select a profile to start browsing'}
                            </p>
                            {activeProfile && (
                                <button
                                    onClick={onTabCreate}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md
                                             transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    Create New Tab
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}