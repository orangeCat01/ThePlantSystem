export type SceneName = 'solar' | 'galaxy';

export type CameraMode = 'FREE' | 'FOCUSING' | 'FOLLOWING' | 'RESETTING';

export type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SerializableError {
  code: string;
  message: string;
  recoverable: boolean;
  source?: string;
}

export interface LoadingState {
  active: boolean;
  progress: number;
  message: string;
}
