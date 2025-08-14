import React, { useState, useEffect } from 'react';
import { FirefoxProfileDetector, FirefoxInstallation, FirefoxProfile } from '../services/FirefoxProfileDetector';
import { FirefoxDataImporter, ImportProgress, ImportResult } from '../services/FirefoxDataImporter';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Card } from './ui/Card';

interface FirefoxImporterProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (profiles: FirefoxProfile[], importResults: ImportResult[]) => Promise<void>;
}

interface ProfileWithMetadata extends FirefoxProfile {
    metadata?: {
        lastModified: Date;
        size: number;
        hasBookmarks: boolean;
        hasHistory: boolean;
        hasPasswords: boolean;
    };
}

export const FirefoxImporter: React.FC<FirefoxImporterProps> = ({
    isOpen,
    onClose,
    onImport,
}) => {
    const [installations, setInstallations] = useState<FirefoxInstallation[]>([]);
    const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [profilesWithMetadata, setProfilesWithMetadata] = useState<ProfileWithMetadata[]>([]);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
    const [importResults, setImportResults] = useState<ImportResult[]>([]);

    const detector = new FirefoxProfileDetector();
    const dataImporter = new FirefoxDataImporter((progress) => setImportProgress(progress));

    useEffect(() => {
        if (isOpen) {
            detectFirefoxProfiles();
        }
    }, [isOpen]);

    const detectFirefoxProfiles = async () => {
        setLoading(true);
        setError(null);

        try {
            const detectedInstallations = await detector.detectFirefoxInstallations();
            setInstallations(detectedInstallations);

            // Load metadata for all profiles
            const allProfiles = detectedInstallations.flatMap(inst => inst.profiles);
            const profilesWithMeta = await Promise.all(
                allProfiles.map(async (profile) => {
                    try {
                        const metadata = await detector.getProfileMetadata(profile.path);
                        return { ...profile, metadata };
                    } catch (error) {
                        console.warn(`Failed to load metadata for profile ${profile.name}:`, error);
                        return profile;
                    }
                })
            );

            setProfilesWithMetadata(profilesWithMeta);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to detect Firefox profiles');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileToggle = (profileId: string) => {
        const newSelected = new Set(selectedProfiles);
        if (newSelected.has(profileId)) {
            newSelected.delete(profileId);
        } else {
            newSelected.add(profileId);
        }
        setSelectedProfiles(newSelected);
    };

    const handleImport = async () => {
        const profilesToImport = profilesWithMetadata.filter(profile =>
            selectedProfiles.has(profile.id)
        );

        if (profilesToImport.length === 0) {
            setError('Please select at least one profile to import');
            return;
        }

        try {
            setImporting(true);
            setImportProgress(null);
            setError(null);

            const results: ImportResult[] = [];

            for (let i = 0; i < profilesToImport.length; i++) {
                const profile = profilesToImport[i];

                // Update overall progress
                const overallProgress = Math.floor((i / profilesToImport.length) * 100);
                setImportProgress({
                    stage: 'bookmarks',
                    progress: overallProgress,
                    message: `Importing profile ${i + 1} of ${profilesToImport.length}: ${profile.name}`,
                });

                try {
                    // Validate profile before importing
                    const validation = await dataImporter.validateProfile(profile.path);
                    if (!validation.isValid) {
                        throw new Error(`Profile validation failed: ${validation.errors.join(', ')}`);
                    }

                    // Import profile data
                    const result = await dataImporter.importProfile(profile);
                    results.push(result);
                } catch (profileError) {
                    console.error(`Failed to import profile ${profile.name}:`, profileError);
                    setError(`Failed to import profile "${profile.name}": ${profileError instanceof Error ? profileError.message : 'Unknown error'}`);
                    return;
                }
            }

            setImportResults(results);
            await onImport(profilesToImport, results);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import profiles');
        } finally {
            setImporting(false);
            setImportProgress(null);
        }
    };

    const formatFileSize = (bytes: number): string => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import from Firefox">
            <div className="firefox-importer">
                {loading && (
                    <div className="loading-state">
                        <div className="spinner" />
                        <p>Scanning for Firefox profiles...</p>
                    </div>
                )}

                {importing && (
                    <div className="import-progress">
                        <div className="progress-header">
                            <h3>Importing Firefox Data</h3>
                            {importProgress && (
                                <div className="progress-details">
                                    <p className="progress-message">{importProgress.message}</p>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${importProgress.progress}%` }}
                                        />
                                    </div>
                                    <div className="progress-stats">
                                        <span className="progress-stage">Stage: {importProgress.stage}</span>
                                        <span className="progress-percent">{importProgress.progress}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        <p>{error}</p>
                        <Button onClick={detectFirefoxProfiles} variant="secondary">
                            Retry
                        </Button>
                    </div>
                )}

                {!loading && !error && installations.length === 0 && (
                    <div className="no-profiles">
                        <p>No Firefox installations found on this system.</p>
                        <p>Make sure Firefox is installed and has been run at least once.</p>
                    </div>
                )}

                {!loading && installations.length > 0 && (
                    <div className="profiles-list">
                        <h3>Found {installations.length} Firefox installation(s)</h3>

                        {installations.map((installation, instIndex) => (
                            <div key={instIndex} className="installation-group">
                                <h4>Firefox {installation.version}</h4>
                                <p className="installation-path">{installation.installPath}</p>

                                <div className="profiles-grid">
                                    {installation.profiles.map((profile) => {
                                        const profileWithMeta = profilesWithMetadata.find(p => p.id === profile.id);
                                        const isSelected = selectedProfiles.has(profile.id);

                                        return (
                                            <Card
                                                key={profile.id}
                                                className={`profile-card ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleProfileToggle(profile.id)}
                                            >
                                                <div className="profile-header">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleProfileToggle(profile.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <h5>{profile.name}</h5>
                                                    {profile.isDefault && (
                                                        <span className="default-badge">Default</span>
                                                    )}
                                                </div>

                                                <div className="profile-details">
                                                    <p className="profile-path">{profile.path}</p>

                                                    {profileWithMeta?.metadata && (
                                                        <div className="profile-metadata">
                                                            <div className="metadata-row">
                                                                <span>Last used:</span>
                                                                <span>{formatDate(profileWithMeta.metadata.lastModified)}</span>
                                                            </div>
                                                            <div className="metadata-row">
                                                                <span>Size:</span>
                                                                <span>{formatFileSize(profileWithMeta.metadata.size)}</span>
                                                            </div>
                                                            <div className="data-indicators">
                                                                {profileWithMeta.metadata.hasBookmarks && (
                                                                    <span className="data-badge">Bookmarks</span>
                                                                )}
                                                                {profileWithMeta.metadata.hasHistory && (
                                                                    <span className="data-badge">History</span>
                                                                )}
                                                                {profileWithMeta.metadata.hasPasswords && (
                                                                    <span className="data-badge">Passwords</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="modal-actions">
                    <Button onClick={onClose} variant="secondary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={selectedProfiles.size === 0 || loading || importing}
                    >
                        {importing ? 'Importing...' : `Import Selected (${selectedProfiles.size})`}
                    </Button>
                </div>
            </div>

            <style jsx>{`
        .firefox-importer {
          max-width: 800px;
          max-height: 600px;
          overflow-y: auto;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #0078d4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          text-align: center;
          padding: 2rem;
          color: #d13438;
        }

        .no-profiles {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        .installation-group {
          margin-bottom: 2rem;
        }

        .installation-group h4 {
          margin: 0 0 0.5rem 0;
          color: #0078d4;
        }

        .installation-path {
          font-size: 0.875rem;
          color: #666;
          margin-bottom: 1rem;
        }

        .profiles-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        }

        .profile-card {
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .profile-card:hover {
          border-color: #0078d4;
        }

        .profile-card.selected {
          border-color: #0078d4;
          background-color: #f0f8ff;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .profile-header h5 {
          margin: 0;
          flex: 1;
        }

        .default-badge {
          background: #107c10;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .profile-path {
          font-size: 0.875rem;
          color: #666;
          margin-bottom: 0.5rem;
          word-break: break-all;
        }

        .profile-metadata {
          font-size: 0.875rem;
        }

        .metadata-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }

        .data-indicators {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 0.5rem;
        }

        .data-badge {
          background: #e1f5fe;
          color: #0277bd;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .import-progress {
          padding: 2rem;
          text-align: center;
        }

        .progress-header h3 {
          margin: 0 0 1rem 0;
          color: #0078d4;
        }

        .progress-message {
          margin-bottom: 1rem;
          color: #666;
          font-size: 0.875rem;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #0078d4, #106ebe);
          transition: width 0.3s ease;
          border-radius: 4px;
        }

        .progress-stats {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #666;
        }

        .progress-stage {
          text-transform: capitalize;
        }

        .progress-percent {
          font-weight: 600;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
      `}</style>
        </Modal>
    );
};