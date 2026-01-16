import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useSamples } from '../context/SampleContext';
import { Play, Pause, Volume2, SkipBack } from 'lucide-react';

export function Player() {
    const { currentSample } = useSamples();
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);

    useEffect(() => {
        if (!containerRef.current) return;

        wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#4F4F4F',
            progressColor: '#BB86FC',
            cursorColor: '#BB86FC',
            barWidth: 2,
            barGap: 3,
            barRadius: 3,
            height: 60,
            normalize: true,
            minPxPerSec: 50,
        });

        wavesurfer.current.on('play', () => setIsPlaying(true));
        wavesurfer.current.on('pause', () => setIsPlaying(false));
        wavesurfer.current.on('finish', () => setIsPlaying(false));

        return () => {
            wavesurfer.current?.destroy();
        };
    }, []);

    useEffect(() => {
        if (!currentSample || !wavesurfer.current) return;

        // Load audio file
        // In Electron, we can load local files using the file:// protocol if security allows or we use a custom protocol
        // We use a custom 'media://' protocol to bypass local resource restrictions
        const url = `media://${currentSample.path}`;
        wavesurfer.current.load(url);

        // Auto play on select?
        wavesurfer.current.once('ready', () => {
            wavesurfer.current?.play();
        });

    }, [currentSample]);

    const togglePlay = () => {
        wavesurfer.current?.playPause();
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = parseFloat(e.target.value);
        setVolume(vol);
        wavesurfer.current?.setVolume(vol);
    };

    return (
        <div style={{
            height: '120px',
            backgroundColor: 'var(--color-bg-card)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}>
            {!currentSample && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'var(--color-bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-muted)',
                    zIndex: 10
                }}>
                    Select a sample to play
                </div>
            )}

            {/* Waveform Area */}
            <div style={{ flex: 1, position: 'relative', padding: '10px 0' }}>
                <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            </div>

            {/* Controls */}
            <div style={{
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                gap: '20px',
                borderTop: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-sidebar)',
                opacity: currentSample ? 1 : 0.5,
                pointerEvents: currentSample ? 'auto' : 'none'
            }}>

                <div style={{ width: '200px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '12px', fontWeight: 600 }}>
                    {currentSample?.name || '-'}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                    <button onClick={() => wavesurfer.current?.stop()} style={{ color: 'var(--color-text-primary)' }}>
                        <SkipBack size={20} />
                    </button>
                    <button
                        onClick={togglePlay}
                        style={{
                            backgroundColor: 'var(--color-primary)',
                            color: '#000',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '150px' }}>
                    <Volume2 size={16} color="var(--color-text-muted)" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolume}
                        style={{
                            width: '100%',
                            accentColor: 'var(--color-primary)'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
