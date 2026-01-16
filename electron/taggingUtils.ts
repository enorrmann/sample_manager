import path from 'node:path';

const COMMON_TAGS: Record<string, string> = {
    'kick': 'Kick',
    'bd': 'Kick',
    'snare': 'Snare',
    'snr': 'Snare',
    'sd': 'Snare',
    'clap': 'Clap',
    'cp': 'Clap',
    'hihat': 'HiHat',
    'hat': 'HiHat',
    'hh': 'HiHat',
    'closed': 'ClosedHat',
    'open': 'OpenHat',
    'oh': 'OpenHat',
    'ch': 'ClosedHat',
    'cymbal': 'Cymbal',
    'crash': 'Crash',
    'ride': 'Ride',
    'tom': 'Tom',
    'tm': 'Tom',
    'perc': 'Percussion',
    'percussion': 'Percussion',
    'shaker': 'Shaker',
    'rim': 'Rim',
    'bass': 'Bass',
    'bs': 'Bass',
    '808': '808',
    'synth': 'Synth',
    'syn': 'Synth',
    'lead': 'Lead',
    'ld': 'Lead',
    'pad': 'Pad',
    'keys': 'Keys',
    'piano': 'Piano',
    'organ': 'Organ',
    'guitar': 'Guitar',
    'gtr': 'Guitar',
    'acoustic': 'Acoustic',
    'string': 'Strings',
    'strings': 'Strings',
    'vocal': 'Vocal',
    'vox': 'Vocal',
    'fx': 'FX',
    'effect': 'FX',
    'uplifter': 'Uplifter',
    'downlifter': 'Downlifter',
    'impact': 'Impact',
    'loop': 'Loop',
    'one': 'OneShot',
    'oneshot': 'OneShot',
    'shot': 'OneShot',
    'atmosphere': 'Atmosphere',
    'drone': 'Drone',
    'texture': 'Texture',
    'foley': 'Foley',
    'ambience': 'Ambience',
    'ambient': 'Ambience',
    'beat': 'Loop',
    'drum': 'Drums',
    'drums': 'Drums',
    'top': 'TopLoop',
    'toploop': 'TopLoop',
    'fill': 'Fill',
    'midi': 'MIDI',
    'wav': '', // Ignore
    'mp3': '', // Ignore
};

const STOP_WORDS = new Set([
    'audio', 'bounce', 'export', 'track', 'render', 'mix', 'master', 'final', 'demo',
    'copy', 'new', 'old', 'v1', 'v2', 'v3', '01', '02', '120', '128', '140', 'bpm', 'key'
]);

export function inferTagsFromFilename(filePath: string): string[] {
    const filename = path.basename(filePath, path.extname(filePath));
    const parentDir = path.basename(path.dirname(filePath));

    // Combine filename and parent directory for broader context
    const sourceString = `${parentDir} ${filename}`;

    // 1. Split by non-alphanumeric separators
    const tokens = sourceString.split(/[\s_\-\.]+/);

    const tags = new Set<string>();

    for (const token of tokens) {
        // Handle CamelCase (e.g. KickDrum -> Kick, Drum)
        // Split by capital letters if they are followed by lowercase
        const subTokens = token.replace(/([A-Z][a-z])/g, ' $1').trim().split(' ');

        for (const subToken of subTokens) {
            const normalized = subToken.toLowerCase();

            // Skip short or numeric
            if (normalized.length < 2) continue;
            if (!isNaN(Number(normalized))) continue;
            if (STOP_WORDS.has(normalized)) continue;

            // Strict check against dictionary
            if (COMMON_TAGS[normalized]) {
                tags.add(COMMON_TAGS[normalized]);
            }
            // intentionally removed the 'else' block to prevent random words from becoming tags
        }
    }

    return Array.from(tags).sort();
}
