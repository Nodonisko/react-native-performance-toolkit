import type {
  HybridView,
  HybridViewMethods,
  HybridViewProps,
} from 'react-native-nitro-modules'

export interface FpsCounterProps extends HybridViewProps {
  valueBuffer: ArrayBuffer
  updateIntervalMs: number
  label: string
}
export interface FpsCounterMethods extends HybridViewMethods {}

export type FpsCounterView = HybridView<FpsCounterProps, FpsCounterMethods>
