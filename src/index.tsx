import './specs/TurboPerformanceToolkit'

import React from 'react'
import { UIThreadReanimatedCounter } from './components/UIThreadReanimatedCounter'
import { PerformanceToolkit } from './hybrids'

export {
  BoxedJsFpsTracking,
  BoxedPerformanceToolkit,
  JsFpsTracking,
  PerformanceToolkit,
} from './hybrids'

export const JSFpsCounter = () => {
  return <UIThreadReanimatedCounter label="JS FPS" type="js" />
}

export const UIFpsCounter = () => {
  return <UIThreadReanimatedCounter label="UI FPS" type="ui" />
}

export const CpuUsageCounter = () => {
  return <UIThreadReanimatedCounter label="CPU" type="cpu" />
}
export const MemoryUsageCounter = () => {
  return <UIThreadReanimatedCounter label="RAM" type="memory" />
}

export const getDeviceMaxRefreshRate = () =>
  PerformanceToolkit.getDeviceMaxRefreshRate()

export const getDeviceCurrentRefreshRate = () =>
  PerformanceToolkit.getDeviceCurrentRefreshRate()

export * from './hooks/jsThreadHooks'
