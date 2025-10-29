#include "RuntimeBridge.hpp"

namespace margelo::nitro::performancetoolkit {

// RuntimeBridgeState implementation (platform-agnostic)
RuntimeBridgeState& RuntimeBridgeState::get() {
  static RuntimeBridgeState instance;
  return instance;
}

void RuntimeBridgeState::setRuntimeExecutor(RuntimeExecutor executor) {
  _runtimeExecutor = std::make_unique<RuntimeExecutor>(executor);
}

const RuntimeExecutor& RuntimeBridgeState::getRuntimeExecutor() {
  if (_runtimeExecutor == nullptr) {
    throw std::runtime_error("RuntimeExecutor not initialized in RuntimeBridgeState!");
  }
  return *_runtimeExecutor;
}

void RuntimeBridgeState::setDeviceRefreshRate(double fps) {
  if (fps > 0) {
    _deviceRefreshRate = fps;
  }
}

double RuntimeBridgeState::getDeviceRefreshRate() const {
  return _deviceRefreshRate;
}

double RuntimeBridgeState::getFrameIntervalMs() const {
  return 1000.0 / _deviceRefreshRate;
}

// Android-specific RuntimeBridge has been moved to NativePerformanceToolkitModule
// iOS uses PerformanceToolkitModule.mm to capture the CallInvoker

} // namespace margelo::nitro::performancetoolkit

