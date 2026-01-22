import { dialog, ipcMain, app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { inferTagsFromFilename } from './taggingUtils';

const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.aiff', '.flac', '.ogg', '.m4a']);

type Sample = {
    path: string;
    tags: string[];
};

async function getFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const stack = [dir];

    while (stack.length > 0) {
        const currentPath = stack.pop()!;
        try {
            const dirents = await fs.readdir(currentPath, { withFileTypes: true });
            for (const dirent of dirents) {
                const res = path.resolve(currentPath, dirent.name);
                if (dirent.isDirectory()) {
                    stack.push(res);
                } else {
                    files.push(res);
                }
            }
        } catch (e) {
            console.error(`Error reading directory ${currentPath}:`, e);
        }
    }
    return files;
}

export async function registerHandlers() {
    ipcMain.handle('dialog:openDirectory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory'],
        });
        if (canceled) {
            return null;
        }
        return filePaths[0];
    });

    const dbPath = path.join(app.getPath('userData'), 'tags.json');
    let tagsDb: Record<string, string[]> = {};

    // Load DB
    try {
        const data = await fs.readFile(dbPath, 'utf-8');
        tagsDb = JSON.parse(data);
    } catch (e) {
        // DB doesn't exist or is invalid, start fresh
    }

    const saveDb = async () => {
        try {
            await fs.writeFile(dbPath, JSON.stringify(tagsDb, null, 2));
        } catch (e) {
            console.error('Failed to save tags DB:', e);
        }
    };

    ipcMain.handle('tags:update', async (_, filePath: string, tags: string[]) => {
        tagsDb[filePath] = tags;
        await saveDb();
        return true;
    });

    const foldersDbPath = path.join(app.getPath('userData'), 'folders.json');
    let foldersDb: string[] = [];

    // Load Folders DB
    try {
        const data = await fs.readFile(foldersDbPath, 'utf-8');
        foldersDb = JSON.parse(data);
    } catch (e) {
        // DB doesn't exist
    }

    const saveFoldersDb = async () => {
        try {
            await fs.writeFile(foldersDbPath, JSON.stringify(foldersDb, null, 2));
        } catch (e) {
            console.error('Failed to save folders DB:', e);
        }
    };

    // Samples DB - persists scanned samples by folder
    const samplesDbPath = path.join(app.getPath('userData'), 'samples.json');
    let samplesDb: Record<string, Sample[]> = {};

    // Load Samples DB
    try {
        const data = await fs.readFile(samplesDbPath, 'utf-8');
        samplesDb = JSON.parse(data);
    } catch (e) {
        // DB doesn't exist
    }

    const saveSamplesDb = async () => {
        try {
            await fs.writeFile(samplesDbPath, JSON.stringify(samplesDb, null, 2));
        } catch (e) {
            console.error('Failed to save samples DB:', e);
        }
    };

    ipcMain.handle('folders:get', async () => {
        return foldersDb;
    });

    ipcMain.handle('folders:add', async (_, folderPath: string) => {
        if (!foldersDb.includes(folderPath)) {
            foldersDb.push(folderPath);
            await saveFoldersDb();
        }
        return foldersDb;
    });

    ipcMain.handle('folders:remove', async (_, folderPath: string) => {
        foldersDb = foldersDb.filter(f => f !== folderPath);
        await saveFoldersDb();

        // Also remove samples for this folder from DB
        delete samplesDb[folderPath];
        await saveSamplesDb();

        return foldersDb;
    });

    // Get all persisted samples (no scanning)
    ipcMain.handle('samples:get', async () => {
        console.log('[Backend] samples:get - fetching persisted samples from DB');
        const allSamples: Sample[] = [];
        for (const folder of foldersDb) {
            const folderSamples = samplesDb[folder] || [];
            // Reconstruct absolute paths
            const mappedSamples = folderSamples.map(s => ({
                ...s,
                path: path.join(folder, s.path)
            }));
            for (const s of mappedSamples) {
                allSamples.push(s);
            }
        }
        return allSamples;
    });

    // Rescan all folders and update DB
    ipcMain.handle('samples:rescan', async () => {
        const allSamples: Sample[] = [];

        for (const folderPath of foldersDb) {
            try {
                const samples = await scanFolder(folderPath);
                samplesDb[folderPath] = samples;

                // Reconstruct absolute paths for return
                const mappedSamples = samples.map(s => ({
                    ...s,
                    path: path.join(folderPath, s.path)
                }));
                for (const s of mappedSamples) {
                    allSamples.push(s);
                }
            } catch (error) {
                console.error(`Error rescanning folder ${folderPath}:`, error);
            }
        }

        await saveSamplesDb();
        return allSamples;
    });

    // Helper function to scan a folder
    async function scanFolder(folderPath: string): Promise<Sample[]> {
        console.log(`[Backend] scanFolder - scanning filesystem: ${folderPath}`);
        const allFiles = await getFiles(folderPath);
        const audioFiles = allFiles.filter((filePath) => {
            const ext = path.extname(filePath).toLowerCase();
            return AUDIO_EXTENSIONS.has(ext);
        });

        const samples: Sample[] = [];

        for (const filePath of audioFiles) {
            try {
                let tags = tagsDb[filePath] || [];

                if (tags.length === 0) {
                    tags = inferTagsFromFilename(filePath);
                }

                samples.push({
                    path: path.relative(folderPath, filePath),
                    tags
                });
            } catch (e) {
                console.error(`Error processing file ${filePath}`, e);
            }
        }

        return samples;
    }

    // Sets DB
    const setsDbPath = path.join(app.getPath('userData'), 'sets.json');
    let setsDb: Record<string, { id: string, name: string, sampleIds: string[] }> = {};

    try {
        const data = await fs.readFile(setsDbPath, 'utf-8');
        setsDb = JSON.parse(data);
    } catch (e) {
        // DB doesn't exist
    }

    const saveSetsDb = async () => {
        try {
            await fs.writeFile(setsDbPath, JSON.stringify(setsDb, null, 2));
        } catch (e) {
            console.error('Failed to save sets DB:', e);
        }
    };

    ipcMain.handle('sets:get', async () => {
        return Object.values(setsDb);
    });

    ipcMain.handle('sets:create', async (_, name: string) => {
        const id = path.basename(name) + '-' + Date.now(); // Simple ID for sets is still fine, but we could use just name if we want. Let's keep a unique ID for sets themselves.
        setsDb[id] = { id, name, sampleIds: [] };
        await saveSetsDb();
        return setsDb[id];
    });

    ipcMain.handle('sets:delete', async (_, setId: string) => {
        delete setsDb[setId];
        await saveSetsDb();
        return true;
    });

    ipcMain.handle('sets:addSample', async (_, setId: string, sampleId: string) => {
        if (setsDb[setId] && !setsDb[setId].sampleIds.includes(sampleId)) {
            setsDb[setId].sampleIds.push(sampleId);
            await saveSetsDb();
        }
        return setsDb[setId];
    });

    ipcMain.handle('sets:removeSample', async (_, setId: string, sampleId: string) => {
        if (setsDb[setId]) {
            setsDb[setId].sampleIds = setsDb[setId].sampleIds.filter(id => id !== sampleId);
            await saveSetsDb();
        }
        return setsDb[setId];
    });

    // Scan a single folder and persist to DB
    ipcMain.handle('fs:scanFolder', async (_, folderPath: string) => {
        try {
            const samples = await scanFolder(folderPath);
            // Persist to samples DB (already contains relative paths)
            samplesDb[folderPath] = samples;
            await saveSamplesDb();

            // Reconstruct absolute paths for frontend
            return samples.map(s => ({
                ...s,
                path: path.join(folderPath, s.path)
            }));
        } catch (error) {
            console.error('Error scanning folder:', error);
            throw error;
        }
    });
}
