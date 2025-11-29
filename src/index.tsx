import './specs/TurboPerformanceToolkit'

import { PerformanceToolkit } from './hybrids'

export {
  BoxedJsFpsTracking,
  BoxedPerformanceToolkit,
  JsFpsTracking,
  PerformanceToolkit,
} from './hybrids'

export const getDeviceMaxRefreshRate = () =>
  PerformanceToolkit.getDeviceMaxRefreshRate()

export const getDeviceCurrentRefreshRate = () =>
  PerformanceToolkit.getDeviceCurrentRefreshRate()

export * from './hooks/jsThreadHooks'
