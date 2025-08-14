// Profile management service - placeholder for future implementation
import { Profile, ProfileManager as IProfileManager } from '../types'

export class ProfileManager implements IProfileManager {
  async createProfile(name: string, icon: string): Promise<Profile> {
    // TODO: Implement in task 2.3
    throw new Error('Not implemented yet')
  }

  async deleteProfile(profileId: string): Promise<void> {
    // TODO: Implement in task 2.3
    throw new Error('Not implemented yet')
  }

  async switchProfile(profileId: string): Promise<void> {
    // TODO: Implement in task 2.3
    throw new Error('Not implemented yet')
  }

  getActiveProfile(): Profile {
    // TODO: Implement in task 2.3
    throw new Error('Not implemented yet')
  }

  getAllProfiles(): Profile[] {
    // TODO: Implement in task 2.3
    return []
  }

  async isolateProfileData(profileId: string): Promise<void> {
    // TODO: Implement in task 2.3
    throw new Error('Not implemented yet')
  }
}