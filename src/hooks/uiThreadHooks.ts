import { useCallback, useEffect } from 'react'
import { useSharedValue } from 'react-native-reanimated'
import { scheduleOnUI } from 'react-native-worklets'

import { BoxedJsFpsTracking, BoxedPerformanceToolkit } from '../hybrids'

export type CounterType = 'js' | 'ui' | 'cpu' | 'memory'

export const useCounterSharedValue = (type: CounterType) => {
  const fpsValue = useSharedValue(0)
  const internvalId = useSharedValue<ReturnType<typeof setInterval> | null>(
    null
  )

  const updateFps = useCallback(() => {
    'worklet'
    const unboxedJsFps = BoxedJsFpsTracking.unbox()
    const unboxedPerformanceToolkit = BoxedPerformanceToolkit.unbox()

    let buffer = null
    if (type === 'js') {
      buffer = unboxedJsFps.getJsFpsBuffer()
    } else if (type === 'ui') {
      buffer = unboxedPerformanceToolkit.getUiFpsBuffer()
    } else if (type === 'cpu') {
      buffer = unboxedPerformanceToolkit.getCpuUsageBuffer()
    } else if (type === 'memory') {
      buffer = unboxedPerformanceToolkit.getMemoryUsageBuffer()
    }

    if (!buffer) {
      console.error(`Failed to get buffer for type: ${type}`)
      return
    }
    const view = new DataView(buffer)
    fpsValue.value = view.getInt32(0, true)
  }, [type])

  const startUpdateFpsLoop = useCallback(() => {
    'worklet'
    internvalId.value = setInterval(updateFps, 1000)
  }, [updateFps])

  const stopUpdateFpsLoop = useCallback(() => {
    'worklet'
    if (internvalId.value) {
      clearInterval(internvalId.value)
    }
    internvalId.value = null
  }, [internvalId])

  useEffect(() => {
    if (internvalId.value) return
    scheduleOnUI(startUpdateFpsLoop)
    return () => {
      scheduleOnUI(stopUpdateFpsLoop)
    }
  }, [startUpdateFpsLoop, stopUpdateFpsLoop])

  return fpsValue
}

export const useFpsJsSharedValue = () => useCounterSharedValue('js')
export const useFpsUiSharedValue = () => useCounterSharedValue('ui')
export const useFpsCpuSharedValue = () => useCounterSharedValue('cpu')
export const useFpsMemorySharedValue = () => useCounterSharedValue('memory')
