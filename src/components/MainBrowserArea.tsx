// Main browser area component - placeholder for future implementation
import React from 'react'
import { Profile, Tab } from '../types'

interface MainBrowserAreaProps {
    activeProfile?: Profile
    tabs: Tab[]
    onTabCreate: () => void
    onTabClose: (tabId: string) => void
    onTabSwitch: (tabId: string) => void
}

export const MainBrowserArea: React.FC<MainBrowserAreaProps> = ({
    activeProfile,
    tabs,
    onTabCreate,
    onTabClose,
    onTabSwitch
}) => {
    return (
        <div className="main-browser-area">
            <h3>Browser Area</h3>
            {/* TODO: Implement in task 3.3 */}
            <p>Main browser area will be implemented in task 3.3</p>
        </div>
    )
}