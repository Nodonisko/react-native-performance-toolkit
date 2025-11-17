package com.performancetoolkit

import android.content.Context
import android.os.Build
import android.util.Log
import android.view.WindowManager
import com.performancetoolkit.NativeTurboPerformanceToolkitSpec
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.RuntimeExecutor
import com.facebook.react.turbomodule.core.interfaces.BindingsInstallerHolder
import com.facebook.react.turbomodule.core.interfaces.TurboModuleWithJSIBindings
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.performancetoolkit.PerformanceToolkitOnLoad

@Suppress("KotlinJniMissingFunction")
class PerformanceToolkitTurboModule(reactContext: ReactApplicationContext) :
  NativeTurboPerformanceToolkitSpec(reactContext), TurboModuleWithJSIBindings {

  @DoNotStrip private var hybridData: HybridData?
  private val runtimeExecutor: RuntimeExecutor

  companion object {
    private const val TAG = "PerformanceToolkitTM"
    const val NAME: String = NativeTurboPerformanceToolkitSpec.NAME

    init {
      try {
        PerformanceToolkitOnLoad.initializeNative()
      } catch (e: Exception) {
        Log.e(TAG, "Error initializing native library", e)
      }
    }
  }

  init {
    val executor = reactContext.catalystInstance?.runtimeExecutor
      ?: throw IllegalStateException("PerformanceToolkit: React Native runtime executor is not available. Please ensure New Architecture is enabled.")

    runtimeExecutor = executor
    val deviceFps = DeviceUtils.getDeviceMaxRefreshRate(reactContext)
    
    try {
      hybridData = initHybrid(runtimeExecutor, deviceFps)
    } catch (e: Exception) {
      Log.e(TAG, "Error initializing PerformanceToolkitTurboModule", e)
      throw e
    }
  }

  override fun invalidate() {
    try {
      hybridData?.resetNative()
      hybridData = null
    } catch (e: Exception) {
      Log.e(TAG, "Error during invalidation", e)
    }
    super.invalidate()
  }

  override fun getBindingsInstaller(): BindingsInstallerHolder = getBindingsInstallerNative()

  @DoNotStrip
  private external fun initHybrid(runtimeExecutor: RuntimeExecutor, deviceRefreshRate: Double): HybridData

  @DoNotStrip
  private external fun getBindingsInstallerNative(): BindingsInstallerHolder
}

