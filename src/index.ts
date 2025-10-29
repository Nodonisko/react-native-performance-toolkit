import { getHostComponent, NitroModules } from 'react-native-nitro-modules'
import './specs/TurboPerformanceToolkit'
import type { PerformanceToolkit as PerformanceToolkitSpec } from './specs/performance-toolkit.nitro'
import type { JsFpsTracking as JsFpsTrackingSpec } from './specs/js-fps-tracking.nitro'
import type {
  FpsCounterMethods,
  FpsCounterProps,
} from './specs/FpsCounterView.nitro'
import FpsCounterViewConfig from '../nitrogen/generated/shared/json/FpsCounterViewConfig.json'
import { useEffect, useState } from 'react'

export const PerformanceToolkit =
  NitroModules.createHybridObject<PerformanceToolkitSpec>('PerformanceToolkit')

export const JsFpsTracking =
  NitroModules.createHybridObject<JsFpsTrackingSpec>('JsFpsTracking')

export const getJsFpsBuffer = () => JsFpsTracking.getJsFpsBuffer()

export const getUiFpsBuffer = () => PerformanceToolkit.getUiFpsBuffer()
export const getCpuUsageBuffer = () => PerformanceToolkit.getCpuUsageBuffer()
export const getMemoryUsageBuffer = () =>
  PerformanceToolkit.getMemoryUsageBuffer()

export const BoxedJsFpsTracking = NitroModules.box(JsFpsTracking)
export const BoxedPerformanceToolkit = NitroModules.box(PerformanceToolkit)

export const FpsCounterView = getHostComponent<
  FpsCounterProps,
  FpsCounterMethods
>('FpsCounterView', () => FpsCounterViewConfig)

const prepareOnChange = (
  bufferGetter: () => ArrayBuffer,
  intervalMs: number = 1000
) => {
  return (callback: (fps: number) => void) => {
    const intervalId = setInterval(() => {
      const buffer = bufferGetter()
      const view = new DataView(buffer)
      callback(view.getInt32(0, true)) // true = littleEndian
    }, intervalMs)

    return () => {
      clearInterval(intervalId)
    }
  }
}

export const onFpsJsChange = prepareOnChange(getJsFpsBuffer)
export const onFpsUiChange = prepareOnChange(getUiFpsBuffer)
export const onCpuChange = prepareOnChange(getCpuUsageBuffer)
export const onMemoryChange = prepareOnChange(getMemoryUsageBuffer)

export const useFpsJs = () => {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const unsubscribe = onFpsJsChange(setValue)
    return unsubscribe
  }, [])
  return value
}

export const useFpsUi = () => {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const unsubscribe = onFpsUiChange(setValue)
    return unsubscribe
  }, [])
  return value
}

export const useCpuUsage = () => {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const unsubscribe = onCpuChange(setValue)
    return unsubscribe
  }, [])
  return value
}

export const useMemoryUsage = () => {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const unsubscribe = onMemoryChange(setValue)
    return unsubscribe
  }, [])
  return value
}
