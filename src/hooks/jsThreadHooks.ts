import { JsFpsTracking } from '../hybrids'
import { PerformanceToolkit } from '../hybrids'
import { useEffect, useState } from 'react'

const getJsFpsBuffer = () => JsFpsTracking.getJsFpsBuffer()

const getUiFpsBuffer = () => PerformanceToolkit.getUiFpsBuffer()
const getCpuUsageBuffer = () => PerformanceToolkit.getCpuUsageBuffer()
const getMemoryUsageBuffer = () => PerformanceToolkit.getMemoryUsageBuffer()

const getValueFromBuffer = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer)
  return view.getInt32(0, true) // true = littleEndian
}

export type ExtendedMemoryUsage = {
  /** Primary memory usage in MB: phys_footprint on iOS and PSS on Android. */
  memoryUsageMb: number
  /**
   * Resident set size in KB. Populated on iOS from `task_vm_info.resident_size`.
   * Returns `0` on platforms that only expose the 4-byte primary memory buffer.
   */
  residentSizeKb: number
  /**
   * VM region count. Populated on iOS from `task_vm_info.region_count`.
   * Returns `0` on platforms that only expose the 4-byte primary memory buffer.
   */
  regionCount: number
}

/**
 * Read the extended iOS memory buffer layout:
 *   offset  0 : int32   phys_footprint (MB)
 *   offset  8 : float64 resident_size  (KB)
 *   offset 16 : float64 region_count   (count)
 *
 * On Android (and older library versions) the buffer is only 4 bytes, so the extra
 * fields are returned as `0`. `getMemoryUsage()` remains the primary API and
 * continues to return the Int32 at offset 0.
 */
export const getExtendedMemoryUsage = (): ExtendedMemoryUsage => {
  const buffer = getMemoryUsageBuffer()
  const view = new DataView(buffer)
  return {
    memoryUsageMb: view.byteLength >= 4 ? view.getInt32(0, true) : 0,
    residentSizeKb: view.byteLength >= 16 ? view.getFloat64(8, true) : 0,
    regionCount: view.byteLength >= 24 ? view.getFloat64(16, true) : 0,
  }
}

export const getJsFps = () => getValueFromBuffer(getJsFpsBuffer())
export const getUiFps = () => getValueFromBuffer(getUiFpsBuffer())
export const getCpuUsage = () => getValueFromBuffer(getCpuUsageBuffer())
export const getMemoryUsage = () => getValueFromBuffer(getMemoryUsageBuffer())

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
      callback(getValueFromBuffer(buffer))
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
