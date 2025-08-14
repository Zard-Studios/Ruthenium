import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FirefoxImporter } from '../FirefoxImporter';
import { FirefoxProfileDetector } from '../../services/FirefoxProfileDetector';

// Mock the FirefoxProfileDetector
vi.mock('../../services/FirefoxProfileDetector');

const mockDetector = FirefoxProfileDetector as any;

describe('FirefoxImporter', () => {
    const mockOnClose = vi.fn();
    const mockOnImport = vi.fn();

    const mockInstallations = [
        {
            version: '91.0.1',
            installPath: '/home/user/.mozilla/firefox',
            profiles: [
                {
                    id: 'firefox-profile-0',
                    name: 'default',
                    path: '/home/user/.mozilla/firefox/abc123.default',
                    isDefault: true,
                    isRelative: true,
                },
                {
                    id: 'firefox-profile-1',
                    name: 'work',
                    path: '/home/user/.mozilla/firefox/def456.work',
                    isDefault: false,
                    isRelative: true,
                },
            ],
        },
    ];

    const mockMetadata = {
        lastModified: new Date('2023-01-01'),
        size: 1024000,
        hasBookmarks: true,
        hasHistory: true,
        hasPasswords: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        mockDetector.prototype.detectFirefoxInstallations = vi.fn().mockResolvedValue(mockInstallations);
        mockDetector.prototype.getProfileMetadata = vi.fn().mockResolvedValue(mockMetadata);

        mockOnClose.mockClear();
        mockOnImport.mockClear();
    });

    it('should render loading state initially', async () => {
        // Make detectFirefoxInstallations hang to test loading state
        mockDetector.prototype.detectFirefoxInstallations = vi.fn().mockImplementation(
            () => new Promise(() => { }) // Never resolves
        );

        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        expect(screen.getByText('Scanning for Firefox profiles...')).toBeInTheDocument();
        expect(screen.getByRole('generic', { name: /spinner/i })).toBeInTheDocument();
    });

    it('should display detected Firefox profiles', async () => {
        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Found 1 Firefox installation(s)')).toBeInTheDocument();
        });

        expect(screen.getByText('Firefox 91.0.1')).toBeInTheDocument();
        expect(screen.getByText('/home/user/.mozilla/firefox')).toBeInTheDocument();
        expect(screen.getByText('default')).toBeInTheDocument();
        expect(screen.getByText('work')).toBeInTheDocument();
        expect(screen.getByText('Default')).toBeInTheDocument(); // Default badge
    });

    it('should display profile metadata', async () => {
        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('1000.0 KB')).toBeInTheDocument(); // File size
        });

        expect(screen.getAllByText('Bookmarks')).toHaveLength(2); // Both profiles have bookmarks
        expect(screen.getAllByText('History')).toHaveLength(2); // Both profiles have history
        expect(screen.queryByText('Passwords')).not.toBeInTheDocument(); // No passwords in mock
    });

    it('should handle profile selection', async () => {
        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('default')).toBeInTheDocument();
        });

        const defaultProfileCheckbox = screen.getAllByRole('checkbox')[0];
        const workProfileCheckbox = screen.getAllByRole('checkbox')[1];

        // Initially no profiles selected
        expect(screen.getByText('Import Selected (0)')).toBeInTheDocument();

        // Select default profile
        fireEvent.click(defaultProfileCheckbox);
        expect(screen.getByText('Import Selected (1)')).toBeInTheDocument();

        // Select work profile
        fireEvent.click(workProfileCheckbox);
        expect(screen.getByText('Import Selected (2)')).toBeInTheDocument();

        // Deselect default profile
        fireEvent.click(defaultProfileCheckbox);
        expect(screen.getByText('Import Selected (1)')).toBeInTheDocument();
    });

    it('should handle import action', async () => {
        mockOnImport.mockResolvedValue(undefined);

        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('default')).toBeInTheDocument();
        });

        // Select a profile
        const defaultProfileCheckbox = screen.getAllByRole('checkbox')[0];
        fireEvent.click(defaultProfileCheckbox);

        // Click import
        const importButton = screen.getByText('Import Selected (1)');
        fireEvent.click(importButton);

        await waitFor(() => {
            expect(mockOnImport).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: 'firefox-profile-0',
                    name: 'default',
                    path: '/home/user/.mozilla/firefox/abc123.default',
                }),
            ]);
        });

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle import errors', async () => {
        mockOnImport.mockRejectedValue(new Error('Import failed'));

        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('default')).toBeInTheDocument();
        });

        // Select a profile and import
        const defaultProfileCheckbox = screen.getAllByRole('checkbox')[0];
        fireEvent.click(defaultProfileCheckbox);

        const importButton = screen.getByText('Import Selected (1)');
        fireEvent.click(importButton);

        await waitFor(() => {
            expect(screen.getByText('Import failed')).toBeInTheDocument();
        });

        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should prevent import with no profiles selected', async () => {
        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('default')).toBeInTheDocument();
        });

        // Try to import without selecting profiles
        const importButton = screen.getByText('Import Selected (0)');
        fireEvent.click(importButton);

        await waitFor(() => {
            expect(screen.getByText('Please select at least one profile to import')).toBeInTheDocument();
        });

        expect(mockOnImport).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should handle detection errors', async () => {
        mockDetector.prototype.detectFirefoxInstallations = vi.fn().mockRejectedValue(
            new Error('Detection failed')
        );

        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Detection failed')).toBeInTheDocument();
        });

        expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should handle no Firefox installations found', async () => {
        mockDetector.prototype.detectFirefoxInstallations = vi.fn().mockResolvedValue([]);

        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('No Firefox installations found on this system.')).toBeInTheDocument();
        });

        expect(screen.getByText('Make sure Firefox is installed and has been run at least once.')).toBeInTheDocument();
    });

    it('should handle retry after error', async () => {
        // First call fails, second succeeds
        mockDetector.prototype.detectFirefoxInstallations = vi.fn()
            .mockRejectedValueOnce(new Error('Detection failed'))
            .mockResolvedValueOnce(mockInstallations);

        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Detection failed')).toBeInTheDocument();
        });

        // Click retry
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);

        await waitFor(() => {
            expect(screen.getByText('Found 1 Firefox installation(s)')).toBeInTheDocument();
        });
    });

    it('should not detect profiles when modal is closed', () => {
        render(
            <FirefoxImporter
                isOpen={false}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        expect(mockDetector.prototype.detectFirefoxInstallations).not.toHaveBeenCalled();
    });

    it('should handle profile card clicks', async () => {
        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('default')).toBeInTheDocument();
        });

        // Click on profile card (not checkbox)
        const profileCard = screen.getByText('default').closest('.profile-card');
        fireEvent.click(profileCard!);

        expect(screen.getByText('Import Selected (1)')).toBeInTheDocument();
    });

    it('should format file sizes correctly', async () => {
        const largeMetadata = {
            ...mockMetadata,
            size: 1073741824, // 1 GB
        };

        mockDetector.prototype.getProfileMetadata = vi.fn().mockResolvedValue(largeMetadata);

        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('1.0 GB')).toBeInTheDocument();
        });
    });

    it('should handle metadata loading errors gracefully', async () => {
        mockDetector.prototype.getProfileMetadata = vi.fn().mockRejectedValue(
            new Error('Metadata error')
        );

        render(
            <FirefoxImporter
                isOpen={true}
                onClose={mockOnClose}
                onImport={mockOnImport}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('default')).toBeInTheDocument();
        });

        // Should still show profiles even if metadata fails
        expect(screen.getByText('work')).toBeInTheDocument();
    });
});