import { NitroModules } from 'react-native-nitro-modules'
import type { PerformanceToolkit as PerformanceToolkitSpec } from './specs/performance-toolkit.nitro'

export const PerformanceToolkit =
  NitroModules.createHybridObject<PerformanceToolkitSpec>('PerformanceToolkit')