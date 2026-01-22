import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Sample, SortOption, SortDirection, SampleSet } from '../types';

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
    addTag: (path: string, tag: string) => void;
    removeTag: (path: string, tag: string) => void;
    filterTags: string[];
    setFilterTags: (tags: string[]) => void;
    allTags: Set<string>;
    removeFolder: (folderPath: string) => Promise<void>;
    selectedFolder: string | null;
    setSelectedFolder: (folderPath: string | null) => void;
    rescanLibrary: () => Promise<void>;
    isRescanning: boolean;
    sets: SampleSet[];
    addSet: (name: string) => Promise<void>;
    removeSet: (id: string) => Promise<void>;
    addSampleToSet: (setId: string, path: string) => Promise<void>;
    removeSampleFromSet: (setId: string, path: string) => Promise<void>;
    selectedSet: string | null;
    setSelectedSet: (id: string | null) => void;
    isLooping: boolean;
    setIsLooping: (loop: boolean) => void;
    loopStart: number;
    setLoopStart: (val: number) => void;
    loopEnd: number;
    setLoopEnd: (val: number) => void;
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
    const [sets, setSets] = useState<SampleSet[]>([]);
    const [selectedSet, setSelectedSet] = useState<string | null>(null);
    const [isLooping, setIsLooping] = useState(false);
    const [loopStart, setLoopStart] = useState(0);
    const [loopEnd, setLoopEnd] = useState(0);

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

                // Load sets
                // @ts-ignore
                const savedSets = await window.ipcRenderer.invoke('sets:get');
                setSets(savedSets);
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

    const addTag = useCallback(async (path: string, tag: string) => {
        const sample = samples.find(s => s.path === path);
        if (!sample) return;

        const newTags = [...sample.tags, tag];

        // Optimistic update
        setSamples(prev => prev.map(s => {
            if (s.path === path && !s.tags.includes(tag)) {
                return { ...s, tags: newTags };
            }
            return s;
        }));

        // Persist
        // @ts-ignore
        await window.ipcRenderer.invoke('tags:update', path, newTags);
    }, [samples]);

    const removeTag = useCallback(async (path: string, tag: string) => {
        const sample = samples.find(s => s.path === path);
        if (!sample) return;

        const newTags = sample.tags.filter(t => t !== tag);

        // Optimistic update
        setSamples(prev => prev.map(s => {
            if (s.path === path) {
                return { ...s, tags: newTags };
            }
            return s;
        }));

        // Persist
        // @ts-ignore
        await window.ipcRenderer.invoke('tags:update', path, newTags);
    }, [samples]);

    const addSet = useCallback(async (name: string) => {
        try {
            // @ts-ignore
            const newSet = await window.ipcRenderer.invoke('sets:create', name);
            setSets(prev => [...prev, newSet]);
        } catch (error) {
            console.error('Failed to create set:', error);
        }
    }, []);

    const removeSet = useCallback(async (id: string) => {
        try {
            // @ts-ignore
            await window.ipcRenderer.invoke('sets:delete', id);
            setSets(prev => prev.filter(s => s.id !== id));
            if (selectedSet === id) {
                setSelectedSet(null);
            }
        } catch (error) {
            console.error('Failed to delete set:', error);
        }
    }, [selectedSet]);

    const addSampleToSet = useCallback(async (setId: string, path: string) => {
        try {
            // @ts-ignore
            const updatedSet = await window.ipcRenderer.invoke('sets:addSample', setId, path);
            setSets(prev => prev.map(s => s.id === setId ? updatedSet : s));
        } catch (error) {
            console.error('Failed to add sample to set:', error);
        }
    }, []);

    const removeSampleFromSet = useCallback(async (setId: string, path: string) => {
        try {
            // @ts-ignore
            const updatedSet = await window.ipcRenderer.invoke('sets:removeSample', setId, path);
            setSets(prev => prev.map(s => s.id === setId ? updatedSet : s));
        } catch (error) {
            console.error('Failed to remove sample from set:', error);
        }
    }, []);

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
        isRescanning,
        sets,
        addSet,
        removeSet,
        addSampleToSet,
        removeSampleFromSet,
        selectedSet,
        setSelectedSet,
        isLooping,
        setIsLooping,
        loopStart,
        setLoopStart,
        loopEnd,
        setLoopEnd
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
