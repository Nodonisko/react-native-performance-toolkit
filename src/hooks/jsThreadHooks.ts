import { JsFpsTracking } from '../hybrids'
import { PerformanceToolkit } from '../hybrids'
import { useEffect, useState } from 'react'

const getJsFpsBuffer = () => JsFpsTracking.getJsFpsBuffer()

const getUiFpsBuffer = () => PerformanceToolkit.getUiFpsBuffer()
const getCpuUsageBuffer = () => PerformanceToolkit.getCpuUsageBuffer()
const getMemoryUsageBuffer = () => PerformanceToolkit.getMemoryUsageBuffer()

const prepareOnChange = (
  bufferGetter: () => ArrayBuffer,
  intervalMs: number = 1000
) => {
  return (callback: (fps: number) => void) => {
    const intervalId = setInterval(() => {
      const buffer = bufferGetter()
      if (!buffer) {
        console.error(`Failed to get buffer.`)
        return
      }
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
