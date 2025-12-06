import React, { useMemo } from 'react';
import { AnalysisData, MultiplayerMode } from '../types';

interface AnalysisScreenProps {
  data: AnalysisData;
  mpMode: MultiplayerMode;
  onRestart: () => void;
  onMenu: () => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ data, mpMode, onRestart, onMenu }) => {
  
  // --- Graph Logic ---
  const graphPath = useMemo(() => {
    if (data.history.length < 2) return '';
    
    const maxTime = data.totalTime;
    const maxWpm = Math.max(data.peakWpm, 100); // Scale to at least 100
    
    // Function to map data point to SVG coordinates (100x50 viewbox)
    const getCoord = (t: number, w: number) => {
        const x = (t / maxTime) * 100;
        const y = 50 - (w / maxWpm) * 50;
        return `${x},${y}`;
    };

    return data.history.map(p => getCoord(p.time, p.wpm)).join(' ');
  }, [data]);

  const opponentPath = useMemo(() => {
    if (mpMode === MultiplayerMode.SINGLE || data.history.length < 2) return null;
    const maxTime = data.totalTime;
    const maxWpm = Math.max(data.peakWpm, 100); 

    const getCoord = (t: number, w: number) => {
        const x = (t / maxTime) * 100;
        const y = 50 - (w / maxWpm) * 50;
        return `${x},${y}`;
    };

    // Filter points that have opponent data
    return data.history
        .filter(p => p.opponentWpm !== undefined)
        .map(p => getCoord(p.time, p.opponentWpm || 0))
        .join(' ');
  }, [data, mpMode]);

  // --- Heatmap Logic ---
  const renderKeyboard = () => {
    const rows = [
      "qwertyuiop",
      "asdfghjkl",
      "zxcvbnm"
    ];
    
    const maxErrors = Math.max(...Object.values(data.errors), 1);

    return (
      <div className="flex flex-col gap-2 items-center select-none">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-1">
            {row.split('').map(char => {
              const errors = data.errors[char] || 0;
              // Color intensity based on errors
              const intensity = errors / maxErrors; 
              
              let bgClass = 'bg-gray-800 border-gray-600 text-gray-400';
              if (errors > 0) {
                 // Interpolate roughly from yellow to red
                 if (intensity > 0.6) bgClass = 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_red]';
                 else if (intensity > 0.3) bgClass = 'bg-orange-500 border-orange-300 text-white';
                 else bgClass = 'bg-yellow-600 border-yellow-400 text-white';
              }

              return (
                <div key={char} className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded border ${bgClass} font-mono uppercase transition-all`}>
                  {char}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md overflow-y-auto py-8">
      <div className="max-w-5xl w-full mx-4 p-1 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30">
        <div className="bg-gray-900/95 rounded-xl p-8 shadow-2xl">
          
          {/* Header */}
          <div className="flex justify-between items-end mb-8 border-b border-gray-700 pb-4">
            <div>
                <h2 className="text-4xl font-[Orbitron] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">
                    MISSION DEBRIEF
                </h2>
                <p className="text-gray-400 font-mono text-sm mt-1 tracking-widest">
                    DIFFICULTY: <span className="text-cyan-400">{data.difficulty}</span> | TIME: <span className="text-cyan-400">{Math.floor(data.totalTime)}s</span>
                </p>
            </div>
            <div className="text-right">
                <div className="text-5xl font-mono font-bold text-white">{data.avgWpm}</div>
                <div className="text-xs text-cyan-500 uppercase tracking-wider">Avg WPM</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Stats & Graph */}
            <div className="lg:col-span-2 space-y-8">
                {/* Stat Grid */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                        <div className="text-gray-500 text-xs uppercase">Peak Speed</div>
                        <div className="text-2xl font-bold text-cyan-300 font-mono">{data.peakWpm} <span className="text-sm text-gray-500">WPM</span></div>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                        <div className="text-gray-500 text-xs uppercase">Accuracy</div>
                        <div className={`text-2xl font-bold font-mono ${data.accuracy >= 95 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {data.accuracy}%
                        </div>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                        <div className="text-gray-500 text-xs uppercase">Errors</div>
                        <div className="text-2xl font-bold text-red-400 font-mono">
                            {Object.values(data.errors).reduce((a, b) => a + b, 0)}
                        </div>
                    </div>
                </div>

                {/* Graph */}
                <div className="bg-gray-800/30 p-4 rounded border border-gray-700 relative h-64">
                    <h3 className="text-xs uppercase text-gray-500 mb-2 tracking-widest">Velocity History</h3>
                    <div className="absolute top-4 right-4 flex gap-4 text-xs">
                        <div className="flex items-center gap-1"><div className="w-3 h-1 bg-cyan-400"></div> You</div>
                        {mpMode !== MultiplayerMode.SINGLE && <div className="flex items-center gap-1"><div className="w-3 h-1 bg-red-500"></div> Opponent</div>}
                    </div>
                    
                    <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        {/* Grid Lines */}
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#374151" strokeWidth="0.5" />
                        <line x1="0" y1="25" x2="100" y2="25" stroke="#374151" strokeWidth="0.5" strokeDasharray="2" />
                        <line x1="0" y1="0" x2="100" y2="0" stroke="#374151" strokeWidth="0.5" strokeDasharray="2" />

                        {/* Opponent Line */}
                        {opponentPath && (
                            <polyline
                                points={opponentPath}
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="0.8"
                                strokeOpacity="0.6"
                            />
                        )}

                        {/* Player Line */}
                        <polyline
                            points={graphPath}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                        />
                        {/* Area under curve (optional simple fill) */}
                        <polyline
                            points={`0,50 ${graphPath} 100,50`}
                            fill="url(#grad1)"
                            opacity="0.2"
                        />
                        <defs>
                            <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style={{stopColor: '#22d3ee', stopOpacity:1}} />
                                <stop offset="100%" style={{stopColor: '#22d3ee', stopOpacity:0}} />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            </div>

            {/* Right Column: Heatmap & Actions */}
            <div className="flex flex-col justify-between space-y-8">
                <div className="bg-gray-800/30 p-4 rounded border border-gray-700 flex-grow flex flex-col items-center justify-center">
                     <h3 className="text-xs uppercase text-gray-500 mb-6 tracking-widest w-full text-left">Error Heatmap</h3>
                     {renderKeyboard()}
                     <p className="text-xs text-gray-600 mt-4 text-center">Keys highlighted in red indicate frequent errors.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={onMenu}
                        className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-[Orbitron] rounded border border-gray-600 transition-colors uppercase"
                    >
                        Menu
                    </button>
                    <button 
                        onClick={onRestart}
                        className="px-6 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-[Orbitron] rounded shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all uppercase tracking-wider"
                    >
                        Re-Deploy
                    </button>
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};