
import React, { useState, useEffect, useCallback } from 'react';
import { GameStatus, GameStats, Difficulty } from './types';
import { fetchSentences } from './services/geminiService';
import { GameScene } from './components/GameScene';
import { TypingInterface } from './components/TypingInterface';

const GAME_DURATION = 120; // 2 minutes

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  
  // Stats
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [totalCharsTyped, setTotalCharsTyped] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [lastGameStats, setLastGameStats] = useState<{wpm: number, accuracy: number, difficulty: Difficulty} | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === GameStatus.PLAYING && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        const remaining = Math.max(0, GAME_DURATION - elapsed);
        
        setTimeRemaining(Math.ceil(remaining));

        if (remaining <= 0) {
          endGame();
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [status, startTime]);

  const startGameWithDifficulty = async (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setStatus(GameStatus.LOADING);
    
    // Fetch content
    const data = await fetchSentences(selectedDifficulty);
    setSentences(data);
    
    // Start Game
    setStatus(GameStatus.PLAYING);
    setStartTime(Date.now());
    setTimeRemaining(GAME_DURATION);
    setUserInput('');
    setCurrentSentenceIndex(0);
    setTotalCharsTyped(0);
    setCorrectChars(0);
    setEndTime(null);
  };

  const endGame = () => {
    setEndTime(Date.now());
    setStatus(GameStatus.FINISHED);
    
    const finalWpm = calculateWPM();
    const finalAcc = calculateAccuracy();
    
    setLastGameStats({
      wpm: finalWpm,
      accuracy: finalAcc,
      difficulty: difficulty
    });
  };

  const calculateWPM = useCallback(() => {
    if (!startTime) return 0;
    const now = endTime || Date.now();
    const timeInMinutes = (now - startTime) / 1000 / 60;
    if (timeInMinutes <= 0) return 0;
    
    // Standard WPM: (Correct Chars / 5) / Time
    return Math.round((correctChars / 5) / timeInMinutes);
  }, [startTime, endTime, correctChars]);

  const calculateAccuracy = useCallback(() => {
    if (totalCharsTyped === 0) return 100;
    return Math.round((correctChars / totalCharsTyped) * 100);
  }, [totalCharsTyped, correctChars]);

  const handleInputChange = (input: string) => {
    if (status !== GameStatus.PLAYING || sentences.length === 0) return;

    const currentTarget = sentences[currentSentenceIndex];
    
    const diff = input.length - userInput.length;
    if (diff > 0) {
        setTotalCharsTyped(prev => prev + diff);
        const charIndex = input.length - 1;
        if (input[charIndex] === currentTarget[charIndex]) {
            setCorrectChars(prev => prev + 1);
        }
    }

    setUserInput(input);

    if (input === currentTarget) {
       // Sentence completed
       // Advance to next, loop if at end
       const nextIndex = (currentSentenceIndex + 1) % sentences.length;
       setCurrentSentenceIndex(nextIndex);
       setUserInput('');
    }
  };

  const stats: GameStats = {
    wpm: calculateWPM(),
    accuracy: calculateAccuracy(),
    progress: sentences.length > 0 
      ? (currentSentenceIndex + userInput.length / sentences[currentSentenceIndex].length) / sentences.length
      : 0,
    timeLeft: timeRemaining,
    lastScore: lastGameStats || undefined
  };

  const isMoving = status === GameStatus.PLAYING && stats.wpm > 5;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-sans text-white">
      {/* 3D Background Layer */}
      <div className="absolute inset-0 z-0">
        <GameScene wpm={stats.wpm} isMoving={isMoving} />
      </div>

      {/* UI Overlay */}
      {status === GameStatus.LOADING && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-bold font-[Orbitron] tracking-widest text-cyan-400">LOADING TRACK DATA...</h2>
          </div>
        </div>
      )}

      {status === GameStatus.IDLE && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="max-w-2xl w-full p-8 bg-gray-900/80 border border-cyan-500/50 rounded-xl text-center shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            <h1 className="text-5xl md:text-6xl font-bold font-[Orbitron] mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              VELOCITY TYPE
            </h1>
            <p className="text-gray-400 mb-8 font-mono tracking-widest">SELECT DIFFICULTY TO START ENGINE</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {Object.values(Difficulty).map((diff) => (
                    <button
                        key={diff}
                        onClick={() => startGameWithDifficulty(diff)}
                        className={`
                            group relative px-4 py-6 rounded border transition-all duration-300 overflow-hidden
                            ${diff === Difficulty.EASY ? 'border-green-500/50 hover:bg-green-900/30' : ''}
                            ${diff === Difficulty.MEDIUM ? 'border-yellow-500/50 hover:bg-yellow-900/30' : ''}
                            ${diff === Difficulty.HARD ? 'border-orange-500/50 hover:bg-orange-900/30' : ''}
                            ${diff === Difficulty.EXPERT ? 'border-red-500/50 hover:bg-red-900/30' : ''}
                        `}
                    >
                         <span className="relative z-10 font-[Orbitron] font-bold text-lg">{diff}</span>
                         <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 transition-opacity"></div>
                    </button>
                ))}
            </div>

            {lastGameStats && (
              <div className="p-4 bg-gray-800/50 rounded border border-gray-700 backdrop-blur">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs uppercase text-gray-500">Last Run: {lastGameStats.difficulty}</p>
                    <p className="text-xs uppercase text-gray-500">Time: 2:00</p>
                </div>
                <div className="flex justify-around">
                  <div>
                    <span className="block text-3xl font-bold text-white font-mono">{lastGameStats.wpm}</span>
                    <span className="text-xs text-cyan-500 tracking-wider">WPM</span>
                  </div>
                  <div>
                    <span className="block text-3xl font-bold text-white font-mono">{lastGameStats.accuracy}%</span>
                    <span className="text-xs text-green-500 tracking-wider">ACCURACY</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status === GameStatus.FINISHED && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="max-w-lg w-full p-8 bg-gray-900 border-2 border-green-500/50 rounded-xl text-center shadow-2xl">
               <h2 className="text-3xl font-[Orbitron] text-white mb-6">RACE COMPLETE</h2>
               
               <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                     <p className="text-gray-400 text-sm uppercase tracking-wider">Top Speed</p>
                     <p className="text-5xl font-bold text-cyan-400 font-mono mt-2">{stats.wpm}</p>
                     <p className="text-xs text-cyan-600 mt-1">Words Per Minute</p>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                     <p className="text-gray-400 text-sm uppercase tracking-wider">Precision</p>
                     <p className="text-5xl font-bold text-green-400 font-mono mt-2">{stats.accuracy}%</p>
                     <p className="text-xs text-green-600 mt-1">Accuracy</p>
                  </div>
               </div>

               <button 
                  onClick={() => setStatus(GameStatus.IDLE)}
                  className="px-8 py-4 bg-white text-black font-bold font-[Orbitron] rounded hover:bg-cyan-400 transition-colors uppercase tracking-widest w-full"
               >
                  Main Menu
               </button>
            </div>
         </div>
      )}

      {status === GameStatus.PLAYING && (
        <TypingInterface 
          targetText={sentences[currentSentenceIndex] || "Loading..."}
          userInput={userInput}
          onInputChange={handleInputChange}
          stats={stats}
          gameStatus={status}
        />
      )}
    </div>
  );
};

export default App;
