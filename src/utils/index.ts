// Utility functions - placeholder for future implementation

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9)
}

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString()
}

// TODO: Add more utilities as needed in future tasks