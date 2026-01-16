import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Sample, SortOption, SortDirection } from '../types';

interface SampleContextType {
    samples: Sample[];
    folders: string[];
    addFolder: () => Promise<void>;
    isLoading: boolean;
    playSample: (sample: Sample) => void;
    currentSample: Sample | null;
    sortOption: SortOption;
    setSortOption: (option: SortOption) => void;
    sortDirection: SortDirection;
    toggleSortDirection: () => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    addTag: (sampleId: string, tag: string) => void;
    removeTag: (sampleId: string, tag: string) => void;
    filterTags: string[];
    setFilterTags: (tags: string[]) => void;
    allTags: Set<string>;
    removeFolder: (folderPath: string) => Promise<void>;
    selectedFolder: string | null;
    setSelectedFolder: (folderPath: string | null) => void;
    rescanLibrary: () => Promise<void>;
    isRescanning: boolean;
}

const SampleContext = createContext<SampleContextType | undefined>(undefined);

export function SampleProvider({ children }: { children: ReactNode }) {
    const [samples, setSamples] = useState<Sample[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRescanning, setIsRescanning] = useState(false);
    const [currentSample, setCurrentSample] = useState<Sample | null>(null);
    const [sortOption, setSortOption] = useState<SortOption>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [searchQuery, setSearchQuery] = useState('');

    // Load initial data from DB (no scanning)
    useEffect(() => {
        const loadLibrary = async () => {
            setIsLoading(true);
            try {
                // @ts-ignore
                const savedFolders = await window.ipcRenderer.invoke('folders:get');
                setFolders(savedFolders);

                // Load samples from DB - no scanning
                // @ts-ignore
                const savedSamples = await window.ipcRenderer.invoke('samples:get');
                setSamples(savedSamples);
            } catch (error) {
                console.error('Failed to load library:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadLibrary();
    }, []);

    const addFolder = useCallback(async () => {
        try {
            // @ts-ignore - ipcRenderer is exposed via preload
            const folderPath = await window.ipcRenderer.invoke('dialog:openDirectory');
            if (folderPath) {
                if (folders.includes(folderPath)) return;

                setIsLoading(true);

                // Persist logic
                // @ts-ignore
                await window.ipcRenderer.invoke('folders:add', folderPath);

                setFolders(prev => [...prev, folderPath]);

                // @ts-ignore
                console.log('Scanning folder:', folderPath);
                const newSamples: Sample[] = await window.ipcRenderer.invoke('fs:scanFolder', folderPath);
                console.log('Scan result:', newSamples ? newSamples.length : 'null', newSamples);

                if (!newSamples || !Array.isArray(newSamples)) {
                    console.error('Invalid samples returned:', newSamples);
                    return;
                }
                setSamples(prev => [...prev, ...newSamples]);
            }
        } catch (error) {
            console.error('Failed to add folder:', error);
        } finally {
            setIsLoading(false);
        }
    }, [folders]);

    const removeFolder = useCallback(async (folderPath: string) => {
        try {
            setIsLoading(true);
            // @ts-ignore
            await window.ipcRenderer.invoke('folders:remove', folderPath);

            setFolders(prev => prev.filter(f => f !== folderPath));
            // Samples are removed from DB by the handler, reload from DB
            // @ts-ignore
            const updatedSamples = await window.ipcRenderer.invoke('samples:get');
            setSamples(updatedSamples);

            if (selectedFolder === folderPath || selectedFolder?.startsWith(folderPath + '/')) {
                setSelectedFolder(null);
            }
        } catch (error) {
            console.error('Failed to remove folder:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedFolder]);

    const rescanLibrary = useCallback(async () => {
        try {
            setIsRescanning(true);
            // @ts-ignore
            const rescannedSamples = await window.ipcRenderer.invoke('samples:rescan');
            setSamples(rescannedSamples);
        } catch (error) {
            console.error('Failed to rescan library:', error);
        } finally {
            setIsRescanning(false);
        }
    }, []);

    const playSample = useCallback((sample: Sample) => {
        setCurrentSample(sample);
    }, []);

    const toggleSortDirection = useCallback(() => {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    }, []);

    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<Set<string>>(new Set());

    // Update allTags derived state 
    useEffect(() => {
        const tags = new Set<string>();
        samples.forEach(s => s.tags.forEach(t => tags.add(t)));
        setAllTags(tags);
    }, [samples]);

    const addTag = useCallback(async (sampleId: string, tag: string) => {
        const sample = samples.find(s => s.id === sampleId);
        if (!sample) return;

        const newTags = [...sample.tags, tag];

        // Optimistic update
        setSamples(prev => prev.map(s => {
            if (s.id === sampleId && !s.tags.includes(tag)) {
                return { ...s, tags: newTags };
            }
            return s;
        }));

        // Persist
        // @ts-ignore
        await window.ipcRenderer.invoke('tags:update', sample.path, newTags);
    }, [samples]);

    const removeTag = useCallback(async (sampleId: string, tag: string) => {
        const sample = samples.find(s => s.id === sampleId);
        if (!sample) return;

        const newTags = sample.tags.filter(t => t !== tag);

        // Optimistic update
        setSamples(prev => prev.map(s => {
            if (s.id === sampleId) {
                return { ...s, tags: newTags };
            }
            return s;
        }));

        // Persist
        // @ts-ignore
        await window.ipcRenderer.invoke('tags:update', sample.path, newTags);
    }, [samples]);

    const value = {
        samples,
        folders,
        addFolder,
        removeFolder,
        selectedFolder,
        setSelectedFolder,
        isLoading,
        playSample,
        currentSample,
        sortOption,
        setSortOption,
        sortDirection,
        toggleSortDirection,
        searchQuery,
        setSearchQuery,
        addTag,
        removeTag,
        filterTags,
        setFilterTags,
        allTags,
        rescanLibrary,
        isRescanning
    };

    return <SampleContext.Provider value={value}>{children}</SampleContext.Provider>;
}

export function useSamples() {
    const context = useContext(SampleContext);
    if (context === undefined) {
        throw new Error('useSamples must be used within a SampleProvider');
    }
    return context;
}
