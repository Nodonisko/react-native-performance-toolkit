import { NitroModules } from 'react-native-nitro-modules'
import type {
  PerformanceToolkit as PerformanceToolkitSpec,
  PerformanceStats,
  PerformanceTrackingOptions,
} from './specs/performance-toolkit.nitro'
import type { JsFpsTracking as JsFpsTrackingSpec } from './specs/js-fps-tracking.nitro'

console.log('Hello from index.ts')

export const PerformanceToolkit =
  NitroModules.createHybridObject<PerformanceToolkitSpec>('PerformanceToolkit')

export const JsFpsTracking =
  NitroModules.createHybridObject<JsFpsTrackingSpec>('JsFpsTracking')

export type { PerformanceStats, PerformanceTrackingOptions }
