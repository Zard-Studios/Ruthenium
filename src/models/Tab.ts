import { Tab as ITab } from '../types'
import { v4 as uuidv4 } from 'uuid'

export class Tab implements ITab {
  public readonly id: string
  public readonly profileId: string
  public url: string
  public title: string
  public favicon?: string
  public isActive: boolean
  public isLoading: boolean

  constructor(
    profileId: string,
    url: string = 'about:blank',
    title: string = 'New Tab',
    id?: string
  ) {
    this.id = id || uuidv4()
    this.profileId = profileId
    this.url = url
    this.title = title
    this.isActive = false
    this.isLoading = false

    this.validate()
  }

  /**
   * Validates the tab data
   * @throws {Error} If validation fails
   */
  public validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Tab ID cannot be empty')
    }

    if (!this.profileId || this.profileId.trim().length === 0) {
      throw new Error('Tab profile ID cannot be empty')
    }

    if (!this.url || this.url.trim().length === 0) {
      throw new Error('Tab URL cannot be empty')
    }

    if (this.title.length > 200) {
      throw new Error('Tab title cannot exceed 200 characters')
    }

    if (!this.isValidUrl(this.url)) {
      throw new Error('Tab URL is not valid')
    }

    if (typeof this.isActive !== 'boolean') {
      throw new Error('Tab isActive must be a boolean')
    }

    if (typeof this.isLoading !== 'boolean') {
      throw new Error('Tab isLoading must be a boolean')
    }
  }

  /**
   * Validates if a URL is valid
   * @param url URL to validate
   * @returns True if valid, false otherwise
   */
  private isValidUrl(url: string): boolean {
    // Allow special browser URLs
    if (url.startsWith('about:') || url.startsWith('chrome:') || url.startsWith('moz-extension:')) {
      return true
    }

    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Updates the tab URL with validation
   * @param newUrl New URL for the tab
   */
  public updateUrl(newUrl: string): void {
    if (!this.isValidUrl(newUrl)) {
      throw new Error('Invalid URL provided')
    }
    this.url = newUrl
    this.isLoading = true
  }

  /**
   * Updates the tab title
   * @param newTitle New title for the tab
   */
  public updateTitle(newTitle: string): void {
    if (newTitle.length > 200) {
      throw new Error('Tab title cannot exceed 200 characters')
    }
    this.title = newTitle
  }

  /**
   * Sets the tab favicon
   * @param faviconUrl URL of the favicon
   */
  public setFavicon(faviconUrl: string): void {
    if (faviconUrl && !this.isValidUrl(faviconUrl)) {
      throw new Error('Invalid favicon URL provided')
    }
    this.favicon = faviconUrl
  }

  /**
   * Sets the loading state of the tab
   * @param loading Whether the tab is loading
   */
  public setLoading(loading: boolean): void {
    this.isLoading = loading
  }

  /**
   * Sets the active state of the tab
   * @param active Whether the tab is active
   */
  public setActive(active: boolean): void {
    this.isActive = active
  }

  /**
   * Converts the tab to a plain object for serialization
   * @returns Plain object representation
   */
  public toJSON(): ITab {
    return {
      id: this.id,
      profileId: this.profileId,
      url: this.url,
      title: this.title,
      favicon: this.favicon,
      isActive: this.isActive,
      isLoading: this.isLoading
    }
  }

  /**
   * Creates a Tab instance from a plain object
   * @param data Plain object data
   * @returns Tab instance
   */
  public static fromJSON(data: ITab): Tab {
    const tab = new Tab(data.profileId, data.url, data.title, data.id)
    tab.favicon = data.favicon
    tab.isActive = data.isActive
    tab.isLoading = data.isLoading
    return tab
  }

  /**
   * Validates a URL without creating a tab instance
   * @param url URL to validate
   * @returns True if valid, false otherwise
   */
  public static isValidUrl(url: string): boolean {
    try {
      // Allow special browser URLs
      if (url.startsWith('about:') || url.startsWith('chrome:') || url.startsWith('moz-extension:')) {
        return true
      }
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}