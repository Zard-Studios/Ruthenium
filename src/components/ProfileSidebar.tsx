// Profile sidebar component - placeholder for future implementation
import React from 'react'
import { Profile } from '../types'

interface ProfileSidebarProps {
    profiles: Profile[]
    activeProfile?: Profile
    onProfileSwitch: (profileId: string) => void
    onProfileCreate: () => void
    onProfileDelete: (profileId: string) => void
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
    profiles,
    activeProfile,
    onProfileSwitch,
    onProfileCreate,
    onProfileDelete
}) => {
    return (
        <div className="profile-sidebar">
            <h3>Profiles</h3>
            {/* TODO: Implement in task 3.2 */}
            <p>Profile sidebar will be implemented in task 3.2</p>
        </div>
    )
}