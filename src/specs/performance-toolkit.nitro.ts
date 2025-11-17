import { type HybridObject } from 'react-native-nitro-modules'

export interface PerformanceToolkit
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getUiFpsBuffer(): ArrayBuffer
  getCpuUsageBuffer(): ArrayBuffer
  getMemoryUsageBuffer(): ArrayBuffer
  getDeviceMaxRefreshRate(): number
  getDeviceCurrentRefreshRate(): number
}
