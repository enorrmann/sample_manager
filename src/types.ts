export type Sample = {
    path: string;
    tags: string[];
};

export type SortOption = 'name' | 'size' | 'duration' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export type SampleSet = {
    id: string;
    name: string;
    sampleIds: string[]; // Store paths or IDs. Based on current handlers, path is used as a unique identifier in tagsDb.
};
