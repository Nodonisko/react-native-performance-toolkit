import React from 'react'
import { UIThreadReanimatedCounter } from './components/UIThreadReanimatedCounter'

// Reanimated-dependent components
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

export { DraggableView } from './components/DraggableView'
export * from './hooks/uiThreadHooks'
