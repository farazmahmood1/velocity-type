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
}

export interface SentenceData {
  text: string;
}

export interface CarProps {
  speed: number; // 0 to 1 intensity
  tilt: number; // For acceleration/braking effect
  curvature: number; // -1 (left) to 1 (right)
  color?: string;
  lanePosition?: number; // X offset
}

export interface WorldProps {
  speed: number;
  curvature: number;
}

// Augment React's JSX namespace to include Three.js elements
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      cylinderGeometry: any;
      meshStandardMaterial: any;
      boxGeometry: any;
      planeGeometry: any;
      sphereGeometry: any;
      instancedMesh: any;
      meshBasicMaterial: any;
      coneGeometry: any;
      hemisphereLight: any;
      directionalLight: any;
      fog: any;
      shaderMaterial: any;
      circleGeometry: any;
      ambientLight: any;
      pointLight: any;
      spotLight: any;
      primitive: any;
    }
  }
}

// Global augmentation for compatibility
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      cylinderGeometry: any;
      meshStandardMaterial: any;
      boxGeometry: any;
      planeGeometry: any;
      sphereGeometry: any;
      instancedMesh: any;
      meshBasicMaterial: any;
      coneGeometry: any;
      hemisphereLight: any;
      directionalLight: any;
      fog: any;
      shaderMaterial: any;
      circleGeometry: any;
      ambientLight: any;
      pointLight: any;
      spotLight: any;
      primitive: any;
    }
  }
}
