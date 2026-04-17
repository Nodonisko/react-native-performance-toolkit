import { NitroModules } from 'react-native-nitro-modules'
import type { JsFpsTracking as JsFpsTrackingSpec } from './specs/js-fps-tracking.nitro'
import type { PerformanceToolkit as PerformanceToolkitSpec } from './specs/performance-toolkit.nitro'

export const PerformanceToolkit =
  NitroModules.createHybridObject<PerformanceToolkitSpec>('PerformanceToolkit')

export const JsFpsTracking =
  NitroModules.createHybridObject<JsFpsTrackingSpec>('JsFpsTracking')

// The JsFpsTracking hybrid needs a handle to the JS-thread Dispatcher so its
// C++ frame-pacing thread can post per-frame tick lambdas onto the JS thread.
// That handle is captured by calling a tiny raw-JSI method (not part of the
// typed nitro spec) once, here on the JS thread at module-evaluation time.
//
// On a full reload, this module is re-evaluated against the fresh JS runtime
// and the dispatcher is transparently replaced (Nitro keys dispatchers by
// `jsi::Runtime*`, so the old one drops out).
type JsFpsTrackingPrivate = {
  __installJsDispatcher(): void
}
;(JsFpsTracking as unknown as JsFpsTrackingPrivate).__installJsDispatcher()

export const BoxedJsFpsTracking = NitroModules.box(JsFpsTracking)
export const BoxedPerformanceToolkit = NitroModules.box(PerformanceToolkit)
