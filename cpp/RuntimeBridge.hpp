#pragma once

#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/JRuntimeExecutor.h>
#include <memory>
#include <mutex>

namespace margelo::nitro::performancetoolkit {

using namespace facebook;
using namespace facebook::react;

// Singleton to hold the RuntimeExecutor
class RuntimeBridgeState {
public:
  static RuntimeBridgeState& get();

  void setRuntimeExecutor(RuntimeExecutor executor);
  const RuntimeExecutor& getRuntimeExecutor();

private:
  RuntimeBridgeState() = default;
  std::mutex _mutex;
  std::unique_ptr<RuntimeExecutor> _runtimeExecutor;
};

// JNI HybridClass to bridge Java/Kotlin to C++
struct RuntimeBridge : public jni::HybridClass<RuntimeBridge> {
  static constexpr auto kJavaDescriptor = "Lcom/performancetoolkit/runtime/RuntimeBridge;";

  static void registerNatives();

  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis,
      jni::alias_ref<JRuntimeExecutor::javaobject> runtimeExecutorHolder
  );

  explicit RuntimeBridge(
      jni::alias_ref<jhybridobject> jThis,
      jni::alias_ref<JRuntimeExecutor::javaobject> runtimeExecutorHolder
  );

private:
  RuntimeExecutor _runtimeExecutor;
};

} // namespace margelo::nitro::performancetoolkit

