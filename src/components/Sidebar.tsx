import { useMemo, useState } from 'react';
import { useSamples } from '../context/SampleContext';
import { Folder, Plus, Music, ChevronRight, ChevronDown, Trash2, RefreshCw } from 'lucide-react';
import { buildFolderTree, TreeNode } from '../utils/fileTree';

const TreeItem = ({
    node,
    level,
    selectedFolder,
    onSelect,
    onRemoveRoot
}: {
    node: TreeNode;
    level: number;
    selectedFolder: string | null;
    onSelect: (path: string) => void;
    onRemoveRoot?: (path: string) => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(false); // Default collapsed
    const hasChildren = Object.keys(node.children).length > 0;
    const isExactSelected = selectedFolder === node.path;

    const handleExpandToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <li>
            <div
                className="group"
                onClick={() => onSelect(node.path)}
                style={{
                    paddingLeft: `${level * 12 + 8}px`,
                    paddingRight: '8px',
                    paddingTop: '4px',
                    paddingBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: isExactSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: isExactSelected ? 'rgba(187, 134, 252, 0.1)' : 'transparent',
                    fontSize: '13px',
                    gap: '4px'
                }}
            >
                <div
                    onClick={hasChildren ? handleExpandToggle : undefined}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: hasChildren ? 'pointer' : 'default',
                        width: '16px',
                        justifyContent: 'center'
                    }}
                >
                    {hasChildren && (
                        isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                </div>

                <Folder size={14} fill={isExactSelected ? "currentColor" : "none"} />
                <span style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: isExactSelected ? 600 : 400
                }}>
                    {node.name}
                </span>

                {onRemoveRoot && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRoot(node.path);
                        }}
                        className="remove-btn"
                        style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            display: 'none', // Shown on hover via CSS
                            padding: '2px'
                        }}
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            {hasChildren && isExpanded && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {Object.values(node.children)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(child => (
                            <TreeItem
                                key={child.path}
                                node={child}
                                level={level + 1}
                                selectedFolder={selectedFolder}
                                onSelect={onSelect}
                            />
                        ))
                    }
                </ul>
            )}
        </li>
    );
};

export function Sidebar() {
    const { folders, addFolder, removeFolder, samples, isLoading, selectedFolder, setSelectedFolder, rescanLibrary, isRescanning } = useSamples();

    const tree = useMemo(() => {
        const paths = samples.map(s => s.path);
        const t = buildFolderTree(paths, folders);
        console.log('Sidebar tree:', t, 'Folders:', folders, 'Samples:', samples.length);
        return t;
    }, [samples, folders]);

    const handleRemoveRoot = (path: string) => {
        if (confirm('Remove this folder from library?')) {
            removeFolder(path);
        }
    };

    return (
        <div style={{
            width: '250px',
            backgroundColor: 'var(--color-bg-sidebar)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        }}>
            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Music size={20} color="var(--color-primary)" />
                    Library
                </h2>
            </div>

            <div style={{ padding: 'var(--space-3)' }}>
                <div
                    onClick={() => setSelectedFolder(null)}
                    style={{
                        padding: '8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: selectedFolder === null ? 'rgba(187, 134, 252, 0.1)' : 'transparent',
                        color: selectedFolder === null ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontWeight: selectedFolder === null ? 600 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Music size={16} />
                    All Samples <span style={{ fontSize: '10px', opacity: 0.7 }}>({samples.length})</span>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <h3 style={{
                        padding: '0 var(--space-3)',
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--space-2)',
                        fontWeight: 600
                    }}>
                        Folders
                    </h3>
                    {tree.length === 0 && folders.length === 0 ? (
                        <div style={{ padding: '0 var(--space-3)', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: 'var(--font-size-sm)' }}>
                            No folders added
                        </div>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {tree.map(node => (
                                <TreeItem
                                    key={node.path}
                                    node={node}
                                    level={0}
                                    selectedFolder={selectedFolder}
                                    onSelect={setSelectedFolder}
                                    onRemoveRoot={handleRemoveRoot}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px' }}>
                <button
                    onClick={addFolder}
                    disabled={isLoading || isRescanning}
                    style={{
                        flex: 1,
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-primary)',
                        padding: '10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontWeight: 500,
                        transition: 'background 0.2s',
                        opacity: isLoading || isRescanning ? 0.7 : 1
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#383838'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                >
                    <Plus size={18} />
                    {isLoading ? 'Adding...' : 'Add'}
                </button>
                <button
                    onClick={rescanLibrary}
                    disabled={isLoading || isRescanning}
                    title="Rescan all folders"
                    style={{
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-secondary)',
                        padding: '10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s, color 0.2s',
                        opacity: isLoading || isRescanning ? 0.7 : 1
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#383838';
                        e.currentTarget.style.color = 'var(--color-primary)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                >
                    <RefreshCw size={18} className={isRescanning ? 'spin' : ''} />
                </button>
            </div>
            <style>{`
                li:hover > div > .remove-btn { display: block !important; }
                .remove-btn:hover { color: #ff5555 !important; }
            `}</style>
        </div>
    );
}
