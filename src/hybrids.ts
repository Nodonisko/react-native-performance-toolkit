import { NitroModules } from 'react-native-nitro-modules'
import type { JsFpsTracking as JsFpsTrackingSpec } from './specs/js-fps-tracking.nitro'
import type { PerformanceToolkit as PerformanceToolkitSpec } from './specs/performance-toolkit.nitro'

export const PerformanceToolkit =
  NitroModules.createHybridObject<PerformanceToolkitSpec>('PerformanceToolkit')

export const JsFpsTracking =
  NitroModules.createHybridObject<JsFpsTrackingSpec>('JsFpsTracking')

export const BoxedJsFpsTracking = NitroModules.box(JsFpsTracking)
export const BoxedPerformanceToolkit = NitroModules.box(PerformanceToolkit)
