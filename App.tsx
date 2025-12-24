
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ThreeScene from './components/ThreeScene';
import { AppMode } from './types';

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [uiHidden, setUiHidden] = useState(false);
    const [mode, setMode] = useState<AppMode>(AppMode.TREE);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sceneRef = useRef<any>(null);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'h') {
                setUiHidden(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && sceneRef.current) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result && typeof ev.target.result === 'string') {
                    sceneRef.current.addPhoto(ev.target.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLoaded = useCallback(() => {
        setTimeout(() => setIsLoading(false), 1500);
    }, []);

    return (
        <div className="relative w-full h-screen bg-black">
            {/* 3D Scene */}
            <ThreeScene 
                onLoaded={handleLoaded} 
                ref={sceneRef}
                onModeChange={(newMode) => setMode(newMode)}
            />

            {/* Loading Screen */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-1000">
                    <div className="loader-spinner mb-6"></div>
                    <p className="text-[#d4af37] tracking-[0.3em] font-light text-sm">LOADING HOLIDAY MAGIC</p>
                </div>
            )}

            {/* UI Overlay */}
            <div className={`fixed inset-0 pointer-events-none flex flex-col items-center justify-between py-12 px-8 transition-all duration-700 ${uiHidden ? 'ui-hidden' : ''}`}>
                <h1 className="text-5xl md:text-7xl gold-gradient-text uppercase tracking-widest text-center mt-4 drop-shadow-2xl">
                    Merry Christmas
                </h1>

                <div className="upload-wrapper flex flex-col items-center gap-4 pointer-events-auto">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept="image/*"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="glass-panel px-10 py-4 text-[#fceea7] border border-[#d4af37]/40 rounded-sm uppercase tracking-widest hover:bg-[#d4af37]/10 transition-colors"
                    >
                        Add Memories
                    </button>
                    <div className="text-xs text-[#d4af37]/60 tracking-widest italic">
                        Current Mode: <span className="font-bold text-[#d4af37]">{mode}</span>
                    </div>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-2">
                        Press 'H' to Hide Controls
                    </p>
                </div>
            </div>

            {/* MediaPipe Video Source (Invisible) */}
            <div id="video-container" className="fixed bottom-4 right-4 opacity-0 pointer-events-none w-40 h-30 bg-black/50 overflow-hidden border border-white/10 rounded">
                <video id="webcam" autoPlay playsInline className="w-full h-full object-cover"></video>
                <canvas id="cv-canvas" width="160" height="120" className="absolute inset-0"></canvas>
            </div>
        </div>
    );
};

export default App;
