import { useMemo, useState, useEffect } from 'react';
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
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = Object.keys(node.children).length > 0;
    const isExactSelected = selectedFolder === node.path;

    // Auto-expand if the selected folder is a descendant of this node
    useEffect(() => {
        if (selectedFolder && selectedFolder.startsWith(node.path + '/') && !isExpanded) {
            setIsExpanded(true);
        }
    }, [selectedFolder, node.path]);

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
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    display: 'flex',
                    alignItems: 'flex-start',
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
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word',
                    fontWeight: isExactSelected ? 600 : 400,
                    lineHeight: '1.3'
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
    const [isCreatingSet, setIsCreatingSet] = useState(false);
    const [newSetName, setNewSetName] = useState('');

    const {
        folders,
        addFolder,
        removeFolder,
        samples,
        isLoading,
        selectedFolder,
        setSelectedFolder,
        rescanLibrary,
        isRescanning,
        sets,
        addSet,
        removeSet,
        selectedSet,
        setSelectedSet
    } = useSamples();

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

    const handleAddSet = () => {
        setIsCreatingSet(true);
    };

    const submitNewSet = () => {
        const name = newSetName.trim();
        if (name) {
            addSet(name);
            setNewSetName('');
            setIsCreatingSet(false);
        }
    };

    const handleRemoveSet = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Delete this set?')) {
            removeSet(id);
        }
    };

    const selectFolder = (path: string | null) => {
        setSelectedSet(null);
        setSelectedFolder(path);
    };

    const selectSet = (id: string | null) => {
        setSelectedFolder(null);
        setSelectedSet(id);
    };

    return (
        <div style={{
            width: 'clamp(250px, 20vw, 350px)',
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
                    onClick={() => selectFolder(null)}
                    style={{
                        padding: '8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: (selectedFolder === null && selectedSet === null) ? 'rgba(187, 134, 252, 0.1)' : 'transparent',
                        color: (selectedFolder === null && selectedSet === null) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontWeight: (selectedFolder === null && selectedSet === null) ? 600 : 400,
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
                                    onSelect={(path) => selectFolder(path)}
                                    onRemoveRoot={handleRemoveRoot}
                                />
                            ))}
                        </ul>
                    )}
                </div>

                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 'var(--space-2)' }}>
                        <h3 style={{
                            padding: '0 var(--space-3)',
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            color: 'var(--color-text-muted)',
                            marginBottom: 'var(--space-2)',
                            fontWeight: 600
                        }}>
                            Sets
                        </h3>
                        <button
                            onClick={handleAddSet}
                            style={{ border: 'none', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer', padding: '2px' }}
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {isCreatingSet && (
                        <div style={{ padding: '0 var(--space-3)', marginBottom: 'var(--space-2)' }}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="New set name..."
                                value={newSetName}
                                onChange={(e) => setNewSetName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitNewSet();
                                    if (e.key === 'Escape') {
                                        setIsCreatingSet(false);
                                        setNewSetName('');
                                    }
                                }}
                                onBlur={() => {
                                    if (!newSetName.trim()) setIsCreatingSet(false);
                                }}
                                style={{
                                    width: '100%',
                                    backgroundColor: 'var(--color-bg-surface)',
                                    border: '1px solid var(--color-primary)',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    color: 'var(--color-text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    )}

                    {sets.length === 0 && !isCreatingSet ? (
                        <div style={{ padding: '0 var(--space-3)', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: 'var(--font-size-sm)' }}>
                            No sets created
                        </div>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {sets.map(set => (
                                <li key={set.id}>
                                    <div
                                        className="group"
                                        onClick={() => selectSet(set.id)}
                                        style={{
                                            paddingLeft: '12px',
                                            paddingRight: '8px',
                                            paddingTop: '6px',
                                            paddingBottom: '6px',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            cursor: 'pointer',
                                            color: selectedSet === set.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                            backgroundColor: selectedSet === set.id ? 'rgba(187, 134, 252, 0.1)' : 'transparent',
                                            fontSize: '13px',
                                            gap: '8px'
                                        }}
                                    >
                                        <Music size={14} fill={selectedSet === set.id ? "currentColor" : "none"} />
                                        <span style={{
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            wordBreak: 'break-word',
                                            fontWeight: selectedSet === set.id ? 600 : 400,
                                            lineHeight: '1.3'
                                        }}>
                                            {set.name}
                                        </span>
                                        <button
                                            onClick={(e) => handleRemoveSet(e, set.id)}
                                            className="remove-btn"
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                color: 'var(--color-text-muted)',
                                                cursor: 'pointer',
                                                display: 'none', // Shown on hover via CSS in existing style block
                                                padding: '2px'
                                            }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </li>
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
        </div >
    );
}
