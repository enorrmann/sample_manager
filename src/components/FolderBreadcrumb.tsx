import { useMemo, useState, useRef, useEffect } from 'react';
import { useSamples } from '../context/SampleContext';
import { ChevronRight, Folder, Home, ChevronDown } from 'lucide-react';

interface BreadcrumbSegment {
    name: string;
    path: string;
}

export function FolderBreadcrumb() {
    const { selectedFolder, setSelectedFolder, folders, samples } = useSamples();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Build breadcrumb segments from selected folder
    const segments = useMemo((): BreadcrumbSegment[] => {
        if (!selectedFolder) return [];

        // Find which root folder contains this path
        const rootFolder = folders.find(f => selectedFolder.startsWith(f));
        if (!rootFolder) return [];

        const relativePath = selectedFolder.slice(rootFolder.length);
        const parts = relativePath.split('/').filter(Boolean);

        const result: BreadcrumbSegment[] = [
            { name: rootFolder.split('/').pop() || rootFolder, path: rootFolder }
        ];

        let currentPath = rootFolder;
        for (const part of parts) {
            currentPath = `${currentPath}/${part}`;
            result.push({ name: part, path: currentPath });
        }

        return result;
    }, [selectedFolder, folders]);

    // Get available subfolders for current selection (for dropdown)
    const subfolders = useMemo(() => {
        const currentPath = selectedFolder || '';
        const subfoldersSet = new Set<string>();

        samples.forEach(sample => {
            const sampleDir = sample.path.substring(0, sample.path.lastIndexOf('/'));

            if (currentPath === '' || sampleDir.startsWith(currentPath + '/')) {
                // Get the next level folder after currentPath
                const remaining = currentPath === '' ? sampleDir : sampleDir.slice(currentPath.length + 1);
                const nextPart = remaining.split('/')[0];
                if (nextPart) {
                    const fullPath = currentPath ? `${currentPath}/${nextPart}` : nextPart;
                    subfoldersSet.add(fullPath);
                }
            }
        });

        return Array.from(subfoldersSet).sort().map(path => ({
            path,
            name: path.split('/').pop() || path
        }));
    }, [samples, selectedFolder]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 12px',
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: '6px',
            fontSize: '13px',
            position: 'relative',
            minWidth: '200px',
            maxWidth: '500px'
        }}>
            {/* Home / All samples button */}
            <button
                onClick={() => setSelectedFolder(null)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    background: selectedFolder === null ? 'rgba(187, 134, 252, 0.2)' : 'transparent',
                    color: selectedFolder === null ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                }}
                onMouseOver={(e) => {
                    if (selectedFolder !== null) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseOut={(e) => {
                    if (selectedFolder !== null) e.currentTarget.style.background = 'transparent';
                }}
            >
                <Home size={14} />
                <span>All</span>
            </button>

            {/* Breadcrumb segments */}
            {segments.map((segment, index) => (
                <div key={segment.path} style={{ display: 'flex', alignItems: 'center' }}>
                    <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', margin: '0 2px' }} />
                    <button
                        onClick={() => setSelectedFolder(segment.path)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            background: index === segments.length - 1 ? 'rgba(187, 134, 252, 0.2)' : 'transparent',
                            color: index === segments.length - 1 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            maxWidth: '150px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseOver={(e) => {
                            if (index !== segments.length - 1) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }}
                        onMouseOut={(e) => {
                            if (index !== segments.length - 1) e.currentTarget.style.background = 'transparent';
                        }}
                        title={segment.path}
                    >
                        <Folder size={12} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{segment.name}</span>
                    </button>
                </div>
            ))}

            {/* Dropdown button for subfolders */}
            {subfolders.length > 0 && (
                <div ref={dropdownRef} style={{ position: 'relative', marginLeft: 'auto' }}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--color-border)',
                            background: dropdownOpen ? 'rgba(187, 134, 252, 0.1)' : 'transparent',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'background 0.15s'
                        }}
                    >
                        <span>Subfolders</span>
                        <ChevronDown size={12} style={{
                            transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.15s'
                        }} />
                    </button>

                    {dropdownOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '4px',
                            backgroundColor: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            zIndex: 100,
                            minWidth: '180px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}>
                            {subfolders.map(subfolder => (
                                <button
                                    key={subfolder.path}
                                    onClick={() => {
                                        setSelectedFolder(subfolder.path);
                                        setDropdownOpen(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--color-text-secondary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '13px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(187, 134, 252, 0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Folder size={14} />
                                    <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {subfolder.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
