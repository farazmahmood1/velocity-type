import React from 'react';

export enum GameStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  EXPERT = 'EXPERT'
}

export enum MultiplayerMode {
  SINGLE = 'SINGLE',
  HOST = 'HOST',
  CLIENT = 'CLIENT'
}

// We simplified to just one main model, so we don't need a union type anymore
export type CarModel = string; 

export interface GameStats {
  wpm: number;
  accuracy: number;
  progress: number; // 0 to 1
  timeLeft: number;
  lastScore?: {
    wpm: number;
    accuracy: number;
    difficulty: Difficulty;
  };
}

export interface OpponentStats {
  wpm: number;
  progress: number;
  name: string;
  carModel?: CarModel;
}

export interface SentenceData {
  text: string;
}

export interface CarProps {
  speed: number; // 0 to 1 intensity
  tilt: number; // For acceleration/braking effect
  curvature: number; // For banking
  lanePosition?: number; // X offset
  modelType?: CarModel;
  isBraking?: boolean;
}

export interface WorldProps {
  speed: number;
  curvature: number;
  isBraking?: boolean;
}

export interface HistoryPoint {
  time: number;
  wpm: number;
  opponentWpm?: number;
}

export interface AnalysisData {
  history: HistoryPoint[];
  errors: Record<string, number>; // char -> count
  avgWpm: number;
  peakWpm: number;
  totalTime: number;
  accuracy: number;
  difficulty: Difficulty;
}
