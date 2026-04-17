#pragma once

#include "HybridJsFpsTrackingSpec.hpp"

#include <NitroModules/Dispatcher.hpp>

#include <jsi/jsi.h>

#include <memory>
#include <mutex>

namespace margelo::nitro::performancetoolkit {

class JsFpsTracker;

/**
 * JS FPS tracker hybrid.
 *
 * Instead of grabbing a `RuntimeExecutor` via a separate TurboModule, this uses
 * Nitro's own `Dispatcher` (which wraps the same React Native `CallInvoker`
 * under the hood — see `CallInvokerDispatcher::runAsync`). We expose a tiny
 * raw JSI method `__installJsDispatcher` that JS calls once on the JS thread
 * during module evaluation; that method receives `jsi::Runtime&` and fetches
 * the runtime's global `Dispatcher` so we can post C++ lambdas onto the JS
 * thread for every frame tick.
 */
class HybridJsFpsTracking : public HybridJsFpsTrackingSpec {
public:
  HybridJsFpsTracking();
  ~HybridJsFpsTracking() override;

  std::shared_ptr<ArrayBuffer> getJsFpsBuffer() override;

protected:
  void loadHybridMethods() override;

private:
  /**
   * Raw JSI method called once from JS (on the JS runtime) to hand us the
   * Dispatcher we need to post per-tick lambdas onto the JS thread.
   */
  jsi::Value installJsDispatcher(jsi::Runtime& runtime,
                                 const jsi::Value& thisValue,
                                 const jsi::Value* args,
                                 size_t count);

  void tryStart();

  std::weak_ptr<Dispatcher> _jsDispatcher;
  std::shared_ptr<JsFpsTracker> _tracker;
  std::shared_ptr<ArrayBuffer> _fpsBuffer;
  std::mutex _startMutex;
};

} // namespace margelo::nitro::performancetoolkit
