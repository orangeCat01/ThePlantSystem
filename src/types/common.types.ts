export type SceneName = 'solar' | 'galaxy';

export type CameraMode =
  | 'FREE'
  | 'FOCUSING'
  | 'FOLLOWING'
  | 'RESETTING'
  | 'TELESCOPE'
  | 'MISSION_FOLLOW';

/** 深空观察模式（Phase 2.17 ~ 2.21）。 */
export type ObservationMode =
  | 'SOLAR_SYSTEM'
  | 'STELLAR_VIEW'
  | 'CONSTELLATION_VIEW'
  | 'FREE_EXPLORATION'
  | 'STAR_CATALOG'
  | 'NIGHT_OBSERVATION'
  | 'TELESCOPE';

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
