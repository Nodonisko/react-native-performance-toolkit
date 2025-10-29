#pragma once

#include <ReactCommon/BindingsInstallerHolder.h>
#include <react/jni/JRuntimeExecutor.h>
#include <fbjni/fbjni.h>
#include "RuntimeBridge.hpp"

namespace margelo::nitro::performancetoolkit {

using namespace facebook;
using namespace facebook::react;

struct PerformanceToolkitModule : public jni::HybridClass<PerformanceToolkitModule> {
    static constexpr auto kJavaDescriptor = "Lcom/performancetoolkit/PerformanceToolkitTurboModule;";

    explicit PerformanceToolkitModule(
        jni::alias_ref<jhybridobject> jThis,
        jni::alias_ref<react::JRuntimeExecutor::javaobject> runtimeExecutorHolder,
        jdouble deviceRefreshRate
    );

    static void registerNatives();
    static jni::local_ref<jhybriddata> initHybrid(
        jni::alias_ref<jhybridobject> jThis,
        jni::alias_ref<JRuntimeExecutor::javaobject> runtimeExecutorHolder,
        jdouble deviceRefreshRate
    );
    
    static jni::local_ref<BindingsInstallerHolder::javaobject> getBindingsInstallerNative(
        jni::alias_ref<PerformanceToolkitModule::javaobject> jThis
    );

private:
    RuntimeExecutor _runtimeExecutor;
};

} // namespace margelo::nitro::performancetoolkit

