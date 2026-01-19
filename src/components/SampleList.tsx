import React, { useMemo, useState } from 'react';
import { useSamples } from '../context/SampleContext';
import { Play, Search, ArrowUpDown, FolderPlus, Check, X } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { FolderBreadcrumb } from './FolderBreadcrumb';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("ErrorBoundary caught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red', overflow: 'auto' }}>
                    <h3>Something went wrong in the list.</h3>
                    <pre>{this.state.error?.toString()}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SampleList() {
    const {
        samples,
        playSample,
        currentSample,
        searchQuery,
        setSearchQuery,
        sortOption,
        setSortOption,
        sortDirection,
        toggleSortDirection,
        addTag,
        removeTag,
        filterTags,
        setFilterTags,
        allTags,
        selectedFolder,
        sets,
        selectedSet
    } = useSamples();

    const [taggingSampleId, setTaggingSampleId] = useState<string | null>(null);

    const filteredAndSortedSamples = useMemo(() => {
        let result = samples;

        // Apply Folder Filter
        if (selectedFolder) {
            console.log('Filtering by folder:', selectedFolder);
            result = result.filter(s => s.path.startsWith(selectedFolder));
        }

        // Apply Set Filter
        if (selectedSet) {
            const currentSet = sets.find(s => s.id === selectedSet);
            if (currentSet) {
                result = result.filter(s => currentSet.sampleIds.includes(s.path));
            }
        }

        // Apply Tag Filter
        if (filterTags.length > 0) {
            result = result.filter(s => filterTags.every(t => s.tags.includes(t)));
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(s => s.name.toLowerCase().includes(q));
        }

        console.log('Filtered samples:', result.length, 'Total:', samples.length);

        return result.sort((a, b) => {
            let valA = a[sortOption];
            let valB = b[sortOption];

            // Handle strings case insensitive
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [samples, searchQuery, sortOption, sortDirection, filterTags, selectedFolder, selectedSet, sets]);

    const toggleFilterTag = (tag: string) => {
        const newTags = filterTags.includes(tag)
            ? filterTags.filter(t => t !== tag)
            : [...filterTags, tag];
        setFilterTags(newTags);
    };

    const SetSelector = ({ sample }: { sample: any }) => {
        const [isOpen, setIsOpen] = useState(false);
        const { sets, addSampleToSet, removeSampleFromSet } = useSamples();

        const toggleSet = (e: React.MouseEvent, setId: string, isInSet: boolean) => {
            e.stopPropagation();
            if (isInSet) {
                removeSampleFromSet(setId, sample.path);
            } else {
                addSampleToSet(setId, sample.path);
            }
        };

        return (
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                    }}
                    className="hover:bg-opacity-10 hover:bg-white"
                >
                    <FolderPlus size={16} />
                </button>

                {isOpen && (
                    <>
                        <div
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                            onClick={() => setIsOpen(false)}
                        />
                        <div style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            backgroundColor: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            padding: '8px 0',
                            zIndex: 999,
                            minWidth: '160px'
                        }}>
                            <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid var(--color-border)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Add to Set</span>
                                <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                                    <X size={12} />
                                </button>
                            </div>
                            {sets.length === 0 ? (
                                <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No sets found</div>
                            ) : (
                                sets.map(s => {
                                    const isInSet = s.sampleIds.includes(sample.path);
                                    return (
                                        <div
                                            key={s.id}
                                            onClick={(e) => toggleSet(e, s.id, isInSet)}
                                            style={{
                                                padding: '8px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                backgroundColor: 'transparent',
                                                transition: 'background 0.2s'
                                            }}
                                            className="hover:bg-opacity-5 hover:bg-white"
                                        >
                                            <div style={{ width: '16px', display: 'flex', alignItems: 'center' }}>
                                                {isInSet && <Check size={14} color="var(--color-primary)" />}
                                            </div>
                                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    // Grid template for columns: # Name Duration Format Tags Actions
    const gridTemplate = '40px 3fr 100px 100px 2fr 40px';

    const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
        const sample = filteredAndSortedSamples[index];
        const isPlaying = currentSample?.id === sample.id;
        const isTagging = taggingSampleId === sample.id;

        return (
            <div
                style={{
                    ...style,
                    display: 'grid',
                    gridTemplateColumns: gridTemplate,
                    padding: '0 16px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    backgroundColor: isPlaying ? 'rgba(187, 134, 252, 0.1)' : 'transparent',
                    color: isPlaying ? 'var(--color-primary)' : 'var(--color-text-primary)',
                    // transition: 'background 0.1s', // remove transition for virt perf
                    alignItems: 'center',
                    // Override default absolute positioning of react-window if needed or just let it be
                }}
                className="sample-row"
                onClick={() => playSample(sample)}
            >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {isPlaying ? <Play size={14} fill="currentColor" /> : <span style={{ color: 'var(--color-text-muted)' }}>{index + 1}</span>}
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sample.name}</div>
                <div style={{ color: 'var(--color-text-secondary)' }}>{formatDuration(sample.duration)}</div>
                <div style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '11px', marginTop: '2px' }}>{sample.extension.replace('.', '')}</div>
                <div style={{ display: 'flex', gap: '4px', overflow: 'hidden', alignItems: 'center', flexWrap: 'wrap', height: '100%' }}>
                    {sample.tags.map(t => (
                        <span
                            key={t}
                            style={{
                                fontSize: '10px',
                                padding: '2px 4px',
                                background: 'var(--color-primary)',
                                color: 'black',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            {t}
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTag(sample.id, t);
                                }}
                                style={{ cursor: 'pointer', opacity: 0.6, fontWeight: 'bold' }}
                            >
                                ×
                            </div>
                        </span>
                    ))}

                    {isTagging ? (
                        <input
                            autoFocus
                            type="text"
                            placeholder="Tag..."
                            style={{
                                width: '60px',
                                padding: '2px 4px',
                                fontSize: '10px',
                                borderRadius: '4px',
                                border: '1px solid var(--color-primary)',
                                background: 'var(--color-bg-surface)',
                                color: 'var(--color-text-primary)',
                                outline: 'none'
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = e.currentTarget.value.trim();
                                    if (val) addTag(sample.id, val);
                                    setTaggingSampleId(null);
                                } else if (e.key === 'Escape') {
                                    setTaggingSampleId(null);
                                }
                            }}
                            onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val) addTag(sample.id, val);
                                setTaggingSampleId(null);
                            }}
                        />
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setTaggingSampleId(sample.id);
                            }}
                            style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer'
                            }}
                            className="hover:bg-opacity-80"
                        >
                            +
                        </button>
                    )}
                </div>

                <div
                    onClick={(e) => e.stopPropagation()}
                >
                    <SetSelector sample={sample} />
                </div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Header / Toolbar */}
            <div style={{
                padding: 'var(--space-3)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backgroundColor: 'var(--color-bg-app)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        position: 'relative',
                        flex: 1,
                        maxWidth: '400px'
                    }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search samples..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                backgroundColor: 'var(--color-bg-surface)',
                                border: '1px solid transparent',
                                borderRadius: '6px',
                                padding: '8px 8px 8px 36px',
                                color: 'var(--color-text-primary)',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'transparent'}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as any)}
                            style={{
                                backgroundColor: 'var(--color-bg-surface)',
                                color: 'var(--color-text-secondary)',
                                border: 'none',
                                padding: '8px',
                                borderRadius: '6px'
                            }}
                        >
                            <option value="name">Name</option>
                            <option value="duration">Duration</option>
                            <option value="size">Size</option>
                            <option value="createdAt">Date</option>
                        </select>
                        <button onClick={toggleSortDirection} style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>
                            <ArrowUpDown size={18} />
                        </button>
                    </div>
                </div>

                {/* Folder Breadcrumb Navigation */}
                <FolderBreadcrumb />

                {/* Tag Filter Bar */}
                {allTags.size > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Filter tags:</span>
                        {Array.from(allTags).sort().map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleFilterTag(tag)}
                                style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    border: `1px solid ${filterTags.includes(tag) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    backgroundColor: filterTags.includes(tag) ? 'rgba(187, 134, 252, 0.1)' : 'transparent',
                                    color: filterTags.includes(tag) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                    cursor: 'pointer'
                                }}
                            >
                                {tag}
                            </button>
                        ))}
                        {filterTags.length > 0 && (
                            <button
                                onClick={() => setFilterTags([])}
                                style={{ fontSize: '11px', color: 'var(--color-text-muted)', textDecoration: 'underline' }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* List Header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: gridTemplate,
                padding: '8px 16px',
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600
            }}>
                <div>#</div>
                <div>Name</div>
                <div>Duration</div>
                <div>Format</div>
                <div>Tags</div>
                <div>Set</div>
            </div>

            {/* List Content */}
            <div style={{ flex: 1, overflowY: 'hidden' }}>
                <ErrorBoundary>
                    <AutoSizer renderProp={({ height, width }: { height: number | undefined; width: number | undefined }) => {
                        if (!height || !width) return null; // Avoid rendering List with 0/undefined dims
                        return (
                            <List
                                height={height}
                                itemCount={filteredAndSortedSamples.length}
                                itemSize={48}
                                width={width}
                            >
                                {Row}
                            </List>
                        );
                    }} />
                </ErrorBoundary>

                {filteredAndSortedSamples.length === 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '60%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'var(--color-text-muted)'
                    }}>
                        No samples found
                    </div>
                )}
            </div>
        </div>
    );
}

// Add CSS to hide scrollbar if cleaner look desired
const style = document.createElement('style');
style.textContent = `
    .sample-row:hover {
        background-color: rgba(255, 255, 255, 0.03) !important;
    }
`;
document.head.appendChild(style);
