import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus, GameStats, Difficulty, MultiplayerMode, OpponentStats } from './types';
import { fetchSentences } from './services/geminiService';
import { GameScene } from './components/GameScene';
import { TypingInterface } from './components/TypingInterface';
import { AudioManager } from './components/AudioManager';
import { multiplayer, GameMessage } from './services/multiplayerService';

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

  // Multiplayer
  const [mpMode, setMpMode] = useState<MultiplayerMode>(MultiplayerMode.SINGLE);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [hostIdInput, setHostIdInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [opponentStats, setOpponentStats] = useState<OpponentStats>({ wpm: 0, progress: 0, name: 'Opponent' });
  const [waitingForHostStart, setWaitingForHostStart] = useState(false);

  // Stats Logic Reuse
  const calculateWPM = useCallback(() => {
    if (!startTime) return 0;
    const now = endTime || Date.now();
    const timeInMinutes = (now - startTime) / 1000 / 60;
    if (timeInMinutes <= 0) return 0;
    return Math.round((correctChars / 5) / timeInMinutes);
  }, [startTime, endTime, correctChars]);

  const calculateAccuracy = useCallback(() => {
    if (totalCharsTyped === 0) return 100;
    return Math.round((correctChars / totalCharsTyped) * 100);
  }, [totalCharsTyped, correctChars]);

  const progress = sentences.length > 0 
      ? (currentSentenceIndex + userInput.length / sentences[currentSentenceIndex].length) / sentences.length
      : 0;

  // Sync Multiplayer Data
  useEffect(() => {
    if (status === GameStatus.PLAYING && mpMode !== MultiplayerMode.SINGLE) {
        const interval = setInterval(() => {
            multiplayer.send('UPDATE', {
                wpm: calculateWPM(),
                progress: progress
            });
        }, 500);
        return () => clearInterval(interval);
    }
  }, [status, mpMode, progress, calculateWPM]);

  // Setup Multiplayer Listeners
  useEffect(() => {
    multiplayer.onConnect(() => {
        setIsConnected(true);
        if (mpMode === MultiplayerMode.CLIENT) {
             setWaitingForHostStart(true);
        }
    });

    multiplayer.onData((msg: GameMessage) => {
        switch (msg.type) {
            case 'INIT':
                // Client receives sentences from Host
                if (mpMode === MultiplayerMode.CLIENT) {
                    setSentences(msg.payload.sentences);
                    setDifficulty(msg.payload.difficulty);
                    setWaitingForHostStart(false);
                    // Start Game synced
                    startLocalGame();
                }
                break;
            case 'UPDATE':
                setOpponentStats(prev => ({
                    ...prev,
                    wpm: msg.payload.wpm,
                    progress: msg.payload.progress
                }));
                break;
            case 'FINISH':
                // Handle opponent finish if needed
                break;
        }
    });
  }, [mpMode]);

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

  const initMultiplayer = async (mode: MultiplayerMode) => {
      setMpMode(mode);
      try {
          const id = await multiplayer.initialize(mode === MultiplayerMode.HOST);
          setMyPeerId(id);
      } catch (e) {
          console.error("MP Init failed", e);
          alert("Could not initialize multiplayer server.");
          setMpMode(MultiplayerMode.SINGLE);
      }
  };

  const joinGame = () => {
      if(!hostIdInput) return;
      setMpMode(MultiplayerMode.CLIENT);
      multiplayer.initialize(false).then(() => {
          multiplayer.join(hostIdInput);
      });
  };

  const startGameWithDifficulty = async (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setStatus(GameStatus.LOADING);
    
    // Fetch content
    const data = await fetchSentences(selectedDifficulty);
    setSentences(data);
    
    if (mpMode === MultiplayerMode.HOST) {
        // Send data to client and start
        multiplayer.send('INIT', { sentences: data, difficulty: selectedDifficulty });
    }

    startLocalGame();
  };

  const startLocalGame = () => {
    setStatus(GameStatus.PLAYING);
    setStartTime(Date.now());
    setTimeRemaining(GAME_DURATION);
    setUserInput('');
    setCurrentSentenceIndex(0);
    setTotalCharsTyped(0);
    setCorrectChars(0);
    setEndTime(null);
    setOpponentStats({ wpm: 0, progress: 0, name: 'Opponent' });
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
    
    if(mpMode !== MultiplayerMode.SINGLE) {
        multiplayer.send('FINISH', { wpm: finalWpm });
    }
  };

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
       const nextIndex = (currentSentenceIndex + 1) % sentences.length;
       setCurrentSentenceIndex(nextIndex);
       setUserInput('');
    }
  };

  const stats: GameStats = {
    wpm: calculateWPM(),
    accuracy: calculateAccuracy(),
    progress: progress,
    timeLeft: timeRemaining,
    lastScore: lastGameStats || undefined
  };

  const isMoving = status === GameStatus.PLAYING && stats.wpm > 5;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-sans text-white">
      {/* Audio Manager */}
      <AudioManager wpm={stats.wpm} gameStatus={status} />

      {/* 3D Background Layer */}
      <div className="absolute inset-0 z-0">
        <GameScene 
            wpm={stats.wpm} 
            isMoving={isMoving} 
            multiplayerMode={mpMode} 
            opponentStats={opponentStats}
            progress={progress}
        />
      </div>

      {/* UI Overlay */}
      {status === GameStatus.LOADING && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-bold font-[Orbitron] tracking-widest text-cyan-400">LOADING TRACK DATA...</h2>
             {waitingForHostStart && <p className="text-gray-400 mt-2">Waiting for Host to start race...</p>}
          </div>
        </div>
      )}

      {status === GameStatus.IDLE && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="max-w-4xl w-full p-8 bg-gray-900/80 border border-cyan-500/50 rounded-xl text-center shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            <h1 className="text-5xl md:text-6xl font-bold font-[Orbitron] mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              VELOCITY TYPE
            </h1>
            
            {/* Multiplayer Selection */}
            {mpMode === MultiplayerMode.SINGLE && (
                <div className="mb-8">
                     <p className="text-gray-400 mb-4 font-mono tracking-widest">SELECT GAME MODE</p>
                     <div className="flex gap-4 justify-center">
                         <button 
                            onClick={() => setMpMode(MultiplayerMode.SINGLE)} // Already single
                            className="px-6 py-3 bg-cyan-600 rounded font-[Orbitron] border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                         >
                            SINGLE PLAYER
                         </button>
                         <button 
                            onClick={() => initMultiplayer(MultiplayerMode.HOST)}
                            className="px-6 py-3 bg-transparent border border-gray-500 rounded font-[Orbitron] hover:bg-gray-800 transition"
                         >
                            CREATE SERVER (HOST)
                         </button>
                         <button 
                            onClick={() => setMpMode(MultiplayerMode.CLIENT)}
                            className="px-6 py-3 bg-transparent border border-gray-500 rounded font-[Orbitron] hover:bg-gray-800 transition"
                         >
                            JOIN SERVER
                         </button>
                     </div>
                </div>
            )}

            {mpMode === MultiplayerMode.HOST && (
                <div className="mb-8 p-6 bg-gray-800/50 rounded-lg border border-cyan-500/30">
                    <h3 className="text-xl font-[Orbitron] text-cyan-400 mb-2">SERVER LOBBY</h3>
                    <p className="text-gray-400 mb-4">Share this Server ID with your friend:</p>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <code className="bg-black p-3 rounded border border-gray-600 font-mono text-xl select-all">
                            {myPeerId || 'Generating ID...'}
                        </code>
                        <button onClick={() => {navigator.clipboard.writeText(myPeerId)}} className="p-3 bg-gray-700 rounded hover:bg-gray-600">Copy</button>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="text-sm uppercase tracking-wide">
                            {isConnected ? 'Player 2 Connected' : 'Waiting for Player 2...'}
                        </span>
                    </div>

                    {!isConnected && (
                         <button onClick={() => setMpMode(MultiplayerMode.SINGLE)} className="mt-4 text-xs text-red-400 hover:text-red-300 underline">Cancel</button>
                    )}
                </div>
            )}

             {mpMode === MultiplayerMode.CLIENT && !isConnected && (
                <div className="mb-8 p-6 bg-gray-800/50 rounded-lg border border-cyan-500/30">
                    <h3 className="text-xl font-[Orbitron] text-cyan-400 mb-2">JOIN SERVER</h3>
                    <p className="text-gray-400 mb-4">Enter your friend's Server ID:</p>
                    <div className="flex justify-center gap-2 mb-4">
                        <input 
                            type="text" 
                            value={hostIdInput}
                            onChange={(e) => setHostIdInput(e.target.value)}
                            placeholder="Paste Server ID here"
                            className="bg-black p-3 rounded border border-gray-600 font-mono text-white w-64 focus:border-cyan-500 outline-none"
                        />
                        <button 
                            onClick={joinGame}
                            className="px-6 bg-cyan-600 hover:bg-cyan-500 rounded font-bold font-[Orbitron]"
                        >
                            CONNECT
                        </button>
                    </div>
                     <button onClick={() => setMpMode(MultiplayerMode.SINGLE)} className="mt-2 text-xs text-red-400 hover:text-red-300 underline">Cancel</button>
                </div>
            )}

            {mpMode === MultiplayerMode.CLIENT && isConnected && (
                 <div className="mb-8 p-6 bg-gray-800/50 rounded-lg border border-green-500/30">
                    <h3 className="text-xl font-[Orbitron] text-green-400 mb-2">CONNECTED</h3>
                    <p className="text-gray-300 animate-pulse">Waiting for host to start race...</p>
                 </div>
            )}

            {/* Difficulty Selection - Only show for Single or Host */}
            {(mpMode === MultiplayerMode.SINGLE || (mpMode === MultiplayerMode.HOST && isConnected)) && (
                <div className="animate-fade-in-up">
                    <p className="text-gray-400 mb-4 font-mono tracking-widest">
                        {mpMode === MultiplayerMode.HOST ? 'SELECT DIFFICULTY TO START RACE' : 'SELECT DIFFICULTY'}
                    </p>
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
                </div>
            )}

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
               
               {mpMode !== MultiplayerMode.SINGLE && (
                   <div className="mb-8 p-4 bg-blue-900/30 border border-blue-500/30 rounded">
                        <p className="text-blue-400 text-sm uppercase tracking-wider">Opponent Speed</p>
                        <p className="text-3xl font-bold text-white font-mono mt-1">{opponentStats.wpm} WPM</p>
                   </div>
               )}

               <button 
                  onClick={() => {
                      setStatus(GameStatus.IDLE);
                      setMpMode(MultiplayerMode.SINGLE);
                      multiplayer.cleanup();
                      setIsConnected(false);
                  }}
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
          nextText={sentences[currentSentenceIndex + 1]}
          userInput={userInput}
          onInputChange={handleInputChange}
          stats={stats}
          gameStatus={status}
        />
      )}
      
      {/* MP HUD Indicator */}
      {status === GameStatus.PLAYING && mpMode !== MultiplayerMode.SINGLE && (
          <div className="absolute top-24 right-8 bg-black/60 p-2 rounded border border-blue-500/50 backdrop-blur z-20">
              <div className="text-xs text-blue-400 mb-1">OPPONENT</div>
              <div className="text-xl font-bold font-mono">{opponentStats.wpm} WPM</div>
              <div className="h-1 w-24 bg-gray-800 mt-1">
                  <div className="h-full bg-blue-500 transition-all" style={{width: `${opponentStats.progress * 100}%`}}></div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;