#ifdef RCT_NEW_ARCH_ENABLED

#import "PerformanceToolkitModule.h"

#import <React/RCTLog.h>
#import <ReactCommon/CallInvoker.h>
#import <UIKit/UIKit.h>

#include "RuntimeBridge.hpp"

using namespace facebook::react;
using namespace margelo::nitro::performancetoolkit;

@implementation PerformanceToolkitModule

RCT_EXPORT_MODULE(PerformanceToolkit)

- (NSArray<NSString *> *)supportedEvents {
  return @[];
}

- (void)installJSIBindingsWithRuntime:(jsi::Runtime&)runtime
                              callInvoker:(const std::shared_ptr<CallInvoker>&)callInvoker {
  RCTLogInfo(@"[PerformanceToolkitModule] installJSIBindingsWithRuntime called - runtime ptr: %p", &runtime);
  
  if (callInvoker == nullptr) {
    RCTLogWarn(@"[PerformanceToolkitModule] CallInvoker not available; skipping RuntimeExecutor registration.");
    return;
  }

  // Runtime and CallInvoker are owned by the React bridge and share the same lifetime
  // IMPORTANT: We must update the executor on every call to support hot reload
  // On hot reload, a new runtime is created and we need to update the executor to point to it
  std::weak_ptr<CallInvoker> weakInvoker = callInvoker;
  jsi::Runtime* runtimePtr = &runtime;
  RCTLogInfo(@"[PerformanceToolkitModule] Registering RuntimeExecutor for runtime ptr: %p", runtimePtr);

  RuntimeExecutor executor = [weakInvoker, runtimePtr](std::function<void(jsi::Runtime&)> &&task) {
    auto invoker = weakInvoker.lock();
    if (!invoker) {
      return;
    }
    
    // Move task directly without extra heap allocation (fix for issue #13)
    invoker->invokeAsync([runtimePtr, task = std::move(task)]() mutable {
      task(*runtimePtr);
    });
  };

  RuntimeBridgeState::get().setRuntimeExecutor(executor);
  
  // Set device refresh rate (this is safe to call multiple times)
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    double deviceFps = (double)UIScreen.mainScreen.maximumFramesPerSecond;
    RuntimeBridgeState::get().setDeviceRefreshRate(deviceFps);
    RCTLogInfo(@"[PerformanceToolkitModule] Device refresh rate set to %.1f FPS", deviceFps);
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams&)params {
  return std::make_shared<NativeTurboPerformanceToolkitSpecJSI>(params);
}

@end

#endif


