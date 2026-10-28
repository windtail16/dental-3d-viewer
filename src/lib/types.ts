import type { Vector3 } from 'three';

export type Axis = 'x' | 'y' | 'z';
export type ViewPreset = 'iso' | 'front' | 'top' | 'side';

export interface ModelInfo {
  name: string;
  triangles: number;
  size: { x: number; y: number; z: number }; // mm
}

export interface Measurement {
  id: number;
  a: Vector3;
  b: Vector3;
}

export interface SectionState {
  enabled: boolean;
  axis: Axis;
  /** -1 ~ 1 사이 정규화 위치 (모델 바운딩 박스 기준) */
  offset: number;
  flip: boolean;
}
