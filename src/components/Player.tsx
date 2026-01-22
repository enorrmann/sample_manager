import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useSamples } from '../context/SampleContext';
import { Play, Pause, Volume2, SkipBack, Repeat } from 'lucide-react';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

export function Player() {
    const {
        currentSample,
        isLooping,
        setIsLooping,
        loopStart,
        setLoopStart,
        loopEnd,
        setLoopEnd
    } = useSamples();
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        const regions = RegionsPlugin.create();
        regionsRef.current = regions;

        wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#4F4F4F',
            progressColor: '#BB86FC',
            cursorColor: '#BB86FC',
            barWidth: 2,
            barGap: 3,
            barRadius: 3,
            height: 60,
            normalize: false,
            minPxPerSec: 50,
            plugins: [regions]
        });

        wavesurfer.current.on('ready', () => {
            const d = wavesurfer.current?.getDuration() || 0;
            setDuration(d);
            // If loopEnd is 0 or exceeds duration, set it to duration
            if (loopEnd === 0 || loopEnd > d) {
                setLoopEnd(d);
            }
        });

        regions.on('region-updated', (region) => {
            setLoopStart(region.start);
            setLoopEnd(region.end);
        });

        wavesurfer.current.on('play', () => setIsPlaying(true));
        wavesurfer.current.on('pause', () => setIsPlaying(false));

        return () => {
            wavesurfer.current?.destroy();
        };
    }, []);

    useEffect(() => {
        if (!wavesurfer.current) return;
        const media = wavesurfer.current.getMediaElement();
        if (media) media.loop = false; // Disable native loop to use manual gapless logic

        const handleFinish = () => {
            if (!isLooping) {
                setIsPlaying(false);
            } else {
                // Manual fallback for finish event
                if (wavesurfer.current) {
                    wavesurfer.current.setTime(0);
                    wavesurfer.current.play();
                }
            }
        };

        wavesurfer.current.on('finish', handleFinish);
        return () => {
            wavesurfer.current?.un('finish', handleFinish);
        };
    }, [isLooping]);

    // Higher frequency loop check
    useEffect(() => {
        if (!isLooping || !isPlaying || !wavesurfer.current) return;

        let rafId: number;
        const ws = wavesurfer.current;

        const checkLoop = () => {
            if (ws && !ws.getMediaElement().paused) {
                const currentTime = ws.getCurrentTime();
                const endPos = loopEnd > 0 ? loopEnd : ws.getDuration();

                if (endPos > 0 && currentTime >= endPos - 0.08) {
                    ws.setTime(loopStart);
                }
            }
            rafId = requestAnimationFrame(checkLoop);
        };

        rafId = requestAnimationFrame(checkLoop);
        return () => cancelAnimationFrame(rafId);
    }, [isLooping, isPlaying, currentSample, loopStart, loopEnd]);

    // Update region when loop points change
    useEffect(() => {
        if (!regionsRef.current || !duration) return;

        regionsRef.current.clearRegions();
        regionsRef.current.addRegion({
            id: 'loop-region',
            start: loopStart,
            end: loopEnd || duration,
            color: 'rgba(187, 134, 252, 0.2)',
            drag: true,
            resize: true,
        });
    }, [loopStart, loopEnd, duration]);

    useEffect(() => {
        if (!currentSample || !wavesurfer.current) return;

        let objectUrl: string | null = null;

        const loadAudio = async () => {
            const url = `media://${currentSample.path}`;
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                objectUrl = URL.createObjectURL(blob);

                if (wavesurfer.current) {
                    wavesurfer.current.load(objectUrl);

                    wavesurfer.current.once('ready', () => {
                        if (wavesurfer.current) {
                            const media = wavesurfer.current.getMediaElement();
                            if (media) media.loop = false;
                            const d = wavesurfer.current.getDuration();
                            setDuration(d);
                            setLoopStart(0);
                            setLoopEnd(d);
                            wavesurfer.current.play();
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to load audio via blob:", e);
                // Fallback to direct URL if fetch fails
                wavesurfer.current?.load(url);
            }
        };

        loadAudio();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
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
                    {currentSample ? currentSample.path.split(/[/\\]/).pop() : '-'}
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
                    <button
                        onClick={() => setIsLooping(!isLooping)}
                        style={{
                            color: isLooping ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            transition: 'color 0.2s',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <Repeat size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>Start</span>
                        <input
                            type="number"
                            step="0.001"
                            min="0"
                            max={loopEnd}
                            value={loopStart.toFixed(3)}
                            onChange={(e) => setLoopStart(parseFloat(e.target.value) || 0)}
                            style={{
                                width: '60px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                                padding: '2px 4px',
                                borderRadius: '4px'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>End</span>
                        <input
                            type="number"
                            step="0.001"
                            min={loopStart}
                            max={duration}
                            value={loopEnd.toFixed(3)}
                            onChange={(e) => setLoopEnd(parseFloat(e.target.value) || duration)}
                            style={{
                                width: '60px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                                padding: '2px 4px',
                                borderRadius: '4px'
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px' }}>
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
