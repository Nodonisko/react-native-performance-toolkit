package com.performancetoolkit

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.margelo.nitro.performancetoolkit.PerformanceToolkitOnLoad

/**
 * Empty ReactPackage that exists purely so React Native's autolinking picks up
 * this library and, via the `init` block below, triggers the Nitro native
 * library load + HybridObject registration. All actual native functionality is
 * exposed through Nitro HybridObjects, not classic NativeModules.
 */
class PerformanceToolkitPackage : BaseReactPackage() {
  init {
    PerformanceToolkitOnLoad.initializeNative()
  }

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider { emptyMap() }
}
