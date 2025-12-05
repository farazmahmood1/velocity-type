import React, { useEffect, useRef, useState } from 'react';
import { GameStats } from '../types';

interface TypingInterfaceProps {
  targetText: string;
  nextText?: string;
  userInput: string;
  onInputChange: (input: string) => void;
  stats: GameStats;
  gameStatus: string;
}

export const TypingInterface: React.FC<TypingInterfaceProps> = ({
  targetText,
  nextText,
  userInput,
  onInputChange,
  stats,
  gameStatus
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (gameStatus === 'PLAYING' && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 500);
    return () => clearInterval(focusInterval);
  }, [gameStatus]);

  const renderText = () => {
    return targetText.split('').map((char, index) => {
      let color = 'text-gray-400';
      let bgColor = 'bg-transparent';
      
      if (index < userInput.length) {
        if (userInput[index] === char) {
          color = 'text-green-400';
        } else {
          color = 'text-red-500';
          bgColor = 'bg-red-900/30';
        }
      } else if (index === userInput.length) {
        bgColor = 'bg-blue-500/50 animate-pulse'; // Cursor
      }

      return (
        <span key={index} className={`${color} ${bgColor} transition-colors duration-75`}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 pb-12 z-10">
      
      {/* Top HUD */}
      <div className="flex justify-between items-start">
        <div className="bg-black/60 backdrop-blur-md p-4 rounded-lg border-l-4 border-cyan-500 transform skew-x-[-10deg]">
           <div className="transform skew-x-[10deg]">
             <h1 className="text-3xl font-bold text-white font-[Orbitron]">VELOCITY TYPE</h1>
             <p className="text-cyan-400 text-sm tracking-widest">SYSTEM ONLINE</p>
           </div>
        </div>

        <div className="flex gap-4">
             <div className="bg-black/60 backdrop-blur-md p-3 rounded border border-gray-700 text-center min-w-[100px]">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Time</div>
                <div className="text-2xl font-mono text-white font-bold">{Math.floor(stats.timeLeft / 60)}:{(stats.timeLeft % 60).toString().padStart(2, '0')}</div>
             </div>
             <div className="bg-black/60 backdrop-blur-md p-3 rounded border border-gray-700 text-center min-w-[100px]">
                <div className="text-xs text-gray-400 uppercase tracking-wider">WPM</div>
                <div className="text-2xl font-mono text-cyan-400 font-bold">{stats.wpm}</div>
             </div>
             <div className="bg-black/60 backdrop-blur-md p-3 rounded border border-gray-700 text-center min-w-[100px]">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Accuracy</div>
                <div className="text-2xl font-mono text-green-400 font-bold">{stats.accuracy}%</div>
             </div>
        </div>
      </div>

      {/* Main Typing Area */}
      <div className="w-full max-w-4xl mx-auto mb-20 pointer-events-auto">
        <div className="relative bg-black/70 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-2xl">
          {/* Current Line */}
          <p className="font-mono text-xl md:text-2xl leading-relaxed whitespace-pre-wrap select-none mb-4">
            {renderText()}
          </p>
          
          {/* Next Line Preview */}
          {nextText && (
             <div className="border-t border-gray-700 pt-3">
                <p className="font-mono text-lg text-gray-600 truncate opacity-70">
                   {nextText}
                </p>
             </div>
          )}

          <input
            ref={inputRef}
            type="text"
            className="opacity-0 absolute inset-0 w-full h-full cursor-default"
            value={userInput}
            onChange={(e) => onInputChange(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
         <div 
           className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300 ease-out"
           style={{ width: `${stats.progress * 100}%` }}
         />
      </div>
    </div>
  );
};