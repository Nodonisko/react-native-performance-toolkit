#pragma once

#include <jsi/jsi.h>
#include <ReactCommon/RuntimeExecutor.h>
#include <memory>

namespace margelo::nitro::performancetoolkit {

using namespace facebook;
using namespace facebook::react;

// Platform-agnostic singleton to hold the RuntimeExecutor and device capabilities
// Works on both iOS (via CallInvoker) and Android (via RuntimeExecutor)
// 
// On Android: Initialized by NativePerformanceToolkitModule (TurboModule)
// On iOS: Initialized by PerformanceToolkitModule.mm (TurboModule)
class RuntimeBridgeState {
public:
  static RuntimeBridgeState& get();

  void setRuntimeExecutor(RuntimeExecutor executor);
  const RuntimeExecutor& getRuntimeExecutor();

  // Device capabilities
  void setDeviceRefreshRate(double fps);
  double getDeviceRefreshRate() const;
  double getFrameIntervalMs() const;

private:
  RuntimeBridgeState() = default;
  std::unique_ptr<RuntimeExecutor> _runtimeExecutor;
  double _deviceRefreshRate = 60.0; // Default to 60 FPS
};

} // namespace margelo::nitro::performancetoolkit

