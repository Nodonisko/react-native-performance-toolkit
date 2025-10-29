#include "NativePerformanceToolkitModule.h"

namespace margelo::nitro::performancetoolkit {

PerformanceToolkitModule::PerformanceToolkitModule(
    jni::alias_ref<PerformanceToolkitModule::jhybridobject> /* jThis */,
    jni::alias_ref<react::JRuntimeExecutor::javaobject> runtimeExecutorHolder,
    jdouble deviceRefreshRate
) : _runtimeExecutor(runtimeExecutorHolder->cthis()->get()) {
    RuntimeBridgeState::get().setRuntimeExecutor(_runtimeExecutor);
    RuntimeBridgeState::get().setDeviceRefreshRate(static_cast<double>(deviceRefreshRate));
}

jni::local_ref<PerformanceToolkitModule::jhybriddata> PerformanceToolkitModule::initHybrid(
    jni::alias_ref<PerformanceToolkitModule::jhybridobject> jThis,
    jni::alias_ref<JRuntimeExecutor::javaobject> runtimeExecutorHolder,
    jdouble deviceRefreshRate
) {
    return makeCxxInstance(jThis, runtimeExecutorHolder, deviceRefreshRate);
}

jni::local_ref<BindingsInstallerHolder::javaobject> PerformanceToolkitModule::getBindingsInstallerNative(
    jni::alias_ref<PerformanceToolkitModule::javaobject> /* jThis */
) {
    return BindingsInstallerHolder::newObjectCxxArgs([](jsi::Runtime& /* rt */) {});
}

void PerformanceToolkitModule::registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("initHybrid", PerformanceToolkitModule::initHybrid),
        makeNativeMethod("getBindingsInstallerNative", PerformanceToolkitModule::getBindingsInstallerNative),
    });
}

} // namespace margelo::nitro::performancetoolkit

