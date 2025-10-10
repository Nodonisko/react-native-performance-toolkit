#include "RuntimeBridge.hpp"

namespace margelo::nitro::performancetoolkit {

// RuntimeBridgeState implementation
RuntimeBridgeState& RuntimeBridgeState::get() {
  static RuntimeBridgeState instance;
  return instance;
}

void RuntimeBridgeState::setRuntimeExecutor(RuntimeExecutor executor) {
  std::lock_guard<std::mutex> lock(_mutex);
  _runtimeExecutor = std::make_unique<RuntimeExecutor>(executor);
}

const RuntimeExecutor& RuntimeBridgeState::getRuntimeExecutor() {
  std::lock_guard<std::mutex> lock(_mutex);
  if (_runtimeExecutor == nullptr) {
    throw std::runtime_error("RuntimeExecutor not initialized in RuntimeBridgeState!");
  }
  return *_runtimeExecutor;
}

// RuntimeBridge implementation
RuntimeBridge::RuntimeBridge(
    jni::alias_ref<jhybridobject> jThis,
    jni::alias_ref<JRuntimeExecutor::javaobject> runtimeExecutorHolder
) : _runtimeExecutor(runtimeExecutorHolder->cthis()->get()) {
  // Store the RuntimeExecutor in the singleton
  RuntimeBridgeState::get().setRuntimeExecutor(_runtimeExecutor);
}

void RuntimeBridge::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", RuntimeBridge::initHybrid),
  });
}

jni::local_ref<RuntimeBridge::jhybriddata> RuntimeBridge::initHybrid(
    jni::alias_ref<jhybridobject> jThis,
    jni::alias_ref<JRuntimeExecutor::javaobject> runtimeExecutorHolder
) {
  return makeCxxInstance(jThis, runtimeExecutorHolder);
}

} // namespace margelo::nitro::performancetoolkit

