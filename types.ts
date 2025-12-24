
// Add missing THREE import to resolve namespace errors in the ParticleState interface
import * as THREE from 'three';

export enum AppMode {
    TREE = 'TREE',
    SCATTER = 'SCATTER',
    FOCUS = 'FOCUS'
}

export interface HandData {
    x: number;
    y: number;
    pinch: boolean;
    fist: boolean;
    open: boolean;
}

export interface ParticleState {
    type: 'BOX' | 'SPHERE' | 'CANDY' | 'PHOTO';
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
    targetPosition: THREE.Vector3;
    targetRotation: THREE.Euler;
    targetScale: THREE.Vector3;
    velocity: THREE.Vector3;
}
