import React, { useEffect, useRef } from 'react';
import { GameStatus } from '../types';

interface AudioManagerProps {
  wpm: number;
  gameStatus: GameStatus;
}

export const AudioManager: React.FC<AudioManagerProps> = ({ wpm, gameStatus }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Engine Oscs
  const osc1Ref = useRef<OscillatorNode | null>(null); // Fundamental (Sawtooth)
  const osc2Ref = useRef<OscillatorNode | null>(null); // Sub-harmonic (Sine)
  const osc3Ref = useRef<OscillatorNode | null>(null); // High Detune (Sawtooth)
  const engineGainRef = useRef<GainNode | null>(null);
  
  // Tire/Road Noise
  const roadNoiseRef = useRef<AudioBufferSourceNode | null>(null);
  const roadFilterRef = useRef<BiquadFilterNode | null>(null);
  const roadGainRef = useRef<GainNode | null>(null);

  const isPlaying = gameStatus === GameStatus.PLAYING;
  
  const speed = Math.min(wpm / 100, 1.5);

  useEffect(() => {
    const initAudio = () => {
      if (audioCtxRef.current) return;

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // --- Engine Synthesis ---
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);
      engineGainRef.current = masterGain;

      // Osc 1: Main Rumble (Sawtooth)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 60;
      const osc1Gain = ctx.createGain();
      osc1Gain.gain.value = 0.5;
      osc1.connect(osc1Gain);
      osc1Gain.connect(masterGain);
      osc1Ref.current = osc1;

      // Osc 2: Sub Bass (Sine)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 30; // Half of main
      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = 0.8;
      osc2.connect(osc2Gain);
      osc2Gain.connect(masterGain);
      osc2Ref.current = osc2;

      // Osc 3: Texture (Sawtooth Detuned)
      const osc3 = ctx.createOscillator();
      osc3.type = 'sawtooth';
      osc3.frequency.value = 61; // Slightly detuned
      const osc3Gain = ctx.createGain();
      osc3Gain.gain.value = 0.3;
      osc3.connect(osc3Gain);
      osc3Gain.connect(masterGain);
      osc3Ref.current = osc3;

      osc1.start();
      osc2.start();
      osc3.start();

      // --- Road Noise (White Noise) ---
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      const rGain = ctx.createGain();
      rGain.gain.value = 0;

      noise.connect(filter);
      filter.connect(rGain);
      rGain.connect(ctx.destination);
      
      noise.start();
      
      roadNoiseRef.current = noise;
      roadFilterRef.current = filter;
      roadGainRef.current = rGain;
    };

    if (isPlaying) {
      if (!audioCtxRef.current) {
        initAudio();
      }
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const rampTime = 0.1;

    if (isPlaying) {
      // --- Engine Simulation ---
      // Base RPM approx 800 (idle) to 6000 (redline)
      // Mapped to Hz: 60Hz idle, up to ~400Hz
      
      // We simulate gear shifts roughly by modulo or just a smooth curve
      // Let's do a smooth powerful curve
      const baseFreq = 60 + (speed * 200);
      
      // Add some "wobble" to simulate uneven firing
      const wobble = Math.sin(now * 15) * 2;

      osc1Ref.current?.frequency.setTargetAtTime(baseFreq + wobble, now, rampTime);
      osc2Ref.current?.frequency.setTargetAtTime((baseFreq + wobble) / 2, now, rampTime);
      osc3Ref.current?.frequency.setTargetAtTime((baseFreq + wobble) * 1.01, now, rampTime);

      // Volume increases with load/speed
      const vol = 0.1 + (speed * 0.2);
      engineGainRef.current?.gain.setTargetAtTime(vol, now, rampTime);

      // --- Road Noise ---
      // Filter opens with speed
      const noiseFreq = 200 + (speed * 4000);
      roadFilterRef.current?.frequency.setTargetAtTime(noiseFreq, now, rampTime);
      
      const noiseVol = 0.05 + (speed * 0.5);
      roadGainRef.current?.gain.setTargetAtTime(noiseVol, now, rampTime);

    } else {
      engineGainRef.current?.gain.setTargetAtTime(0, now, 0.5);
      roadGainRef.current?.gain.setTargetAtTime(0, now, 0.5);
    }
  }, [speed, isPlaying]);

  return null;
};