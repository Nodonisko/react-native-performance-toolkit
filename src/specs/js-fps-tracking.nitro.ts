import { type HybridObject } from 'react-native-nitro-modules'

export interface JsFpsTracking
  extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  startTracking(onUpdate: (fps: number) => void): void
  stopTracking(): void
}
