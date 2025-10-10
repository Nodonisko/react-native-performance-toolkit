import { type HybridObject } from 'react-native-nitro-modules'

export type PerformanceStats = {
  uiFps: number
  framesDropped: number
  stutters: number
  usedRam: number
  usedCpu: number
}

export interface PerformanceTrackingOptions {
  withCpu?: boolean
  updateIntervalMs?: number
}

export interface PerformanceToolkit
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  startTracking(
    onUpdate: (stats: PerformanceStats) => void,
    options?: PerformanceTrackingOptions
  ): void
  stopTracking(): void
  isTracking(): boolean
}
